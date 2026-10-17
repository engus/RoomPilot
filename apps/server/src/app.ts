import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import sharp from 'sharp';
import { ApartmentBriefOrNullSchema, applyDetectedOpenings, createProject, ProjectSchema, RecognitionSchema, type ApartmentBrief, type Source } from '@roompilot/domain';
import { credentialsFor, isProviderId, providerConfigured, PROVIDER_IDS, readConfig, recognizeImage, recognizeOpenings, RecognitionError, type ProviderId, type RecognitionConfig, type RecognitionProvider } from './recognition';

const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

export interface BuildAppOptions { provider?: RecognitionProvider; providers?: Partial<Record<ProviderId, RecognitionProvider>>; config?: RecognitionConfig }

export function buildApp({ provider, providers = {}, config = readConfig() }: BuildAppOptions = {}) {
  const app = Fastify({ logger: false, bodyLimit: MAX_UPLOAD + 16_384, requestTimeout: 60_000 });
  app.register(multipart, { limits: { fileSize: MAX_UPLOAD, files: 1, fields: 1, fieldSize: 2048, parts: 2, headerPairs: 100 } });
  const overrides = { ...providers, ...(provider ? { openai: provider } : {}) };
  const defaultProvider = config.defaultProvider ?? 'openai';
  const configured = (id: ProviderId) => Boolean(overrides[id] || providerConfigured(config, id));
  const allowedOrigins = new Set(config.frontendOrigin ? [config.frontendOrigin] : ['http://127.0.0.1:5173', 'http://localhost:5173']);
  let busy = false;

  // No errors from dependencies are logged or returned: they can include private images or credentials.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof RecognitionError) return reply.code(error.statusCode).send({ error: error.message, code: error.code });
    const failure = error as { statusCode?: number; code?: string };
    if (failure.code === 'FST_FIELDS_LIMIT' || failure.code === 'FST_PARTS_LIMIT') return reply.code(400).send({ error: 'Upload one image and one optional apartment brief.', code: 'invalid_brief' });
    if (failure.statusCode === 413 || failure.code === 'FST_REQ_FILE_TOO_LARGE' || failure.code === 'FST_ERR_CTP_BODY_TOO_LARGE') return reply.code(413).send({ error: 'Изображение превышает предел 10 МиБ.' });
    return reply.code(400).send({ error: 'Не удалось прочитать загрузку. Выберите один файл PNG или JPEG.' });
  });
  app.get('/api/health', async () => ({
    status: 'ok', recognitionConfigured: configured(defaultProvider), defaultProvider,
    providers: PROVIDER_IDS.map(id => ({ id, configured: configured(id), model: credentialsFor(config, id).model?.trim() || null })),
  }));

  app.post<{ Querystring: { provider?: string } }>('/api/recognize', { onRequest: async (request, reply) => {
    if (!request.headers.origin || !allowedOrigins.has(request.headers.origin)) return reply.code(403).send({ error: 'Распознавание доступно только из локального интерфейса RoomPilot.' });
    const selected = request.query.provider ?? defaultProvider;
    if (!isProviderId(selected)) throw new RecognitionError(400, 'Unknown recognition provider.', 'invalid_provider');
    if (!configured(selected)) throw new RecognitionError(503, 'Configure the selected provider key and model on the server.', 'provider_unconfigured');
  } }, async (request, reply) => {
    if (busy) return reply.code(429).header('Retry-After', '2').send({ error: 'Другой план уже распознаётся. Дождитесь завершения.' });
    busy = true;
    try {
      if (!request.isMultipart()) throw new RecognitionError(400, 'Ожидается один файл PNG или JPEG.');
      let image: Source | undefined;
      let apartmentBrief: ApartmentBrief | null = null;
      let briefSeen = false;
      // Consume the entire form before any provider call, so extra files/parts cannot spend credit.
      for await (const part of request.parts()) {
        if (part.type === 'field') {
          if (part.fieldname !== 'apartmentBrief' || briefSeen || part.valueTruncated || typeof part.value !== 'string') throw new RecognitionError(400, 'Invalid apartment brief.', 'invalid_brief');
          briefSeen = true;
          try { apartmentBrief = ApartmentBriefOrNullSchema.parse(JSON.parse(part.value)); }
          catch { throw new RecognitionError(400, 'Invalid apartment brief.', 'invalid_brief'); }
          continue;
        }
        if (part.type !== 'file' || part.fieldname !== 'file' || image) throw new RecognitionError(400, 'Ожидается один файл в поле file.');
        const bytes = await part.toBuffer();
        if (part.file.truncated || bytes.byteLength > MAX_UPLOAD) throw new RecognitionError(413, 'Изображение превышает предел 10 МиБ.');
        image = await normalizeImage(bytes, part.mimetype);
      }
      if (!image) throw new RecognitionError(400, 'Выберите файл PNG или JPEG.');
      const selected = request.query.provider ?? defaultProvider;
      if (!isProviderId(selected)) throw new RecognitionError(400, 'Unknown recognition provider.', 'invalid_provider');
      const invoke: RecognitionProvider = overrides[selected] ?? ((source, signal, brief) => recognizeImage(source, config, signal, selected, brief));
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new RecognitionError(504, 'Истекло время ожидания распознавания. Повторите запрос.', 'recognition_timeout')); }, config.requestTimeoutMs ?? 45_000);
        });
        const result = await Promise.race([invoke(image, controller.signal, apartmentBrief), timeout]);
        const recognition = RecognitionSchema.parse(result);
        const base = { ...createProject(image, recognition), apartmentBrief };
        const converted = applyDetectedOpenings(base, recognition.openings ?? []);
        return { project: converted.project, warnings: [...recognition.warnings, ...(recognition.openings ? converted.warnings : [])] };
      } catch (error) {
        if (error instanceof RecognitionError) throw error;
        throw new RecognitionError(502, 'Не удалось получить корректный ответ провайдера. Проверьте настройки или повторите запрос.');
      } finally { if (timer) clearTimeout(timer); }
    } finally { busy = false; }
  });
  app.post<{ Body: { project?: unknown } }>('/api/recognize-openings', {
    bodyLimit: 20 * 1024 * 1024,
    onRequest: async (request, reply) => {
      if (!request.headers.origin || !allowedOrigins.has(request.headers.origin)) return reply.code(403).send({ error: 'Recognition requires the local RoomPilot interface.' });
      if (!providerConfigured(config, 'openrouter')) throw new RecognitionError(503, 'Configure OpenRouter on the server.', 'provider_unconfigured');
    },
  }, async (request, reply) => {
    if (busy) return reply.code(429).header('Retry-After', '2').send({ error: 'Another recognition is running.' });
    busy = true;
    try {
      const parsed = ProjectSchema.safeParse(request.body?.project);
      if (!parsed.success || !parsed.data.rooms.length) throw new RecognitionError(400, 'A valid project with rooms is required.');
      const project = parsed.data;
      await verifyEmbeddedImage(project.source);
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new RecognitionError(504, 'Recognition timed out.', 'recognition_timeout')); }, config.requestTimeoutMs ?? 45_000);
        });
        const recognition = await Promise.race([recognizeOpenings(project, config, controller.signal), timeout]);
        const result = applyDetectedOpenings(project, recognition.openings);
        return { project: result.project, warnings: [...recognition.warnings, ...result.warnings] };
      } finally { if (timer) clearTimeout(timer); }
    } finally { busy = false; }
  });
  return app;
}

async function verifyEmbeddedImage(source: Source): Promise<void> {
  try {
    const bytes = Buffer.from(source.dataUrl.split(',')[1]!, 'base64');
    if (bytes.length > MAX_UPLOAD) throw new Error('Image too large.');
    const image = sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['png', 'jpeg'].includes(metadata.format ?? '') || !source.dataUrl.startsWith(`data:image/${metadata.format};`) || metadata.width !== source.width || metadata.height !== source.height || (metadata.pages ?? 1) > 1 || (metadata.orientation ?? 1) !== 1) throw new Error('Image mismatch.');
    // Decode without rotating or resizing: existing polygons use these exact pixels.
    await image.png().toBuffer();
  } catch { throw new RecognitionError(400, 'The embedded image is invalid or does not match its dimensions.'); }
}

async function normalizeImage(bytes: Buffer, mime: string): Promise<Source> {
  if (!['image/png', 'image/jpeg'].includes(mime)) throw new RecognitionError(415, 'Поддерживаются только PNG и JPEG.');
  try {
    // Metadata first lets us distinguish decoded-size rejection from a corrupt image.
    const metadata = await sharp(bytes, { limitInputPixels: false }).metadata();
    if (!['png', 'jpeg'].includes(metadata.format ?? '') || `image/${metadata.format}` !== mime) throw new RecognitionError(415, 'Тип изображения не совпадает с его содержимым.');
    if (!metadata.width || !metadata.height) throw new RecognitionError(400, 'Не удалось определить размер изображения.');
    if (metadata.width * metadata.height > MAX_PIXELS) throw new RecognitionError(413, 'Изображение содержит больше 20 миллионов пикселей.');
    if ((metadata.pages ?? 1) > 1) throw new RecognitionError(415, 'Используйте одно неподвижное изображение.');
    const { data, info } = await sharp(bytes, { limitInputPixels: MAX_PIXELS, failOn: 'warning' }).rotate().resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true }).png().toBuffer({ resolveWithObject: true });
    return { dataUrl: `data:image/png;base64,${data.toString('base64')}`, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof RecognitionError) throw error;
    throw new RecognitionError(400, 'Файл повреждён или не является изображением PNG/JPEG.');
  }
}
