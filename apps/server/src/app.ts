import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import sharp from 'sharp';
import { createProject, RecognitionSchema, type Source } from '@roompilot/domain';
import { readConfig, recognizeImage, RecognitionError, type RecognitionConfig, type RecognitionProvider } from './recognition';

const MAX_UPLOAD = 10 * 1024 * 1024;
const MAX_PIXELS = 20_000_000;

export interface BuildAppOptions { provider?: RecognitionProvider; config?: RecognitionConfig }

export function buildApp({ provider, config = readConfig() }: BuildAppOptions = {}) {
  const app = Fastify({ logger: false, bodyLimit: MAX_UPLOAD + 16_384, requestTimeout: 60_000 });
  app.register(multipart, { limits: { fileSize: MAX_UPLOAD, files: 1, fields: 0, parts: 1, headerPairs: 100 } });
  const configured = Boolean(provider || (config.apiKey?.trim() && config.model?.trim()));
  const allowedOrigins = new Set(config.frontendOrigin ? [config.frontendOrigin] : ['http://127.0.0.1:5173', 'http://localhost:5173']);
  const invoke: RecognitionProvider = provider ?? ((image, signal) => recognizeImage(image, config, signal));
  let busy = false;

  // No errors from dependencies are logged or returned: they can include private images or credentials.
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof RecognitionError) return reply.code(error.statusCode).send({ error: error.message });
    const failure = error as { statusCode?: number; code?: string };
    if (failure.statusCode === 413 || failure.code === 'FST_REQ_FILE_TOO_LARGE' || failure.code === 'FST_ERR_CTP_BODY_TOO_LARGE') return reply.code(413).send({ error: 'Изображение превышает предел 10 МиБ.' });
    return reply.code(400).send({ error: 'Не удалось прочитать загрузку. Выберите один файл PNG или JPEG.' });
  });
  app.get('/api/health', async () => ({ status: 'ok', recognitionConfigured: configured }));

  app.post('/api/recognize', { onRequest: async (request, reply) => {
    if (!request.headers.origin || !allowedOrigins.has(request.headers.origin)) return reply.code(403).send({ error: 'Распознавание доступно только из локального интерфейса RoomPilot.' });
    if (!configured) return reply.code(503).send({ error: 'Распознавание не настроено: укажите ключ и модель на сервере.' });
  } }, async (request, reply) => {
    if (busy) return reply.code(429).header('Retry-After', '2').send({ error: 'Другой план уже распознаётся. Дождитесь завершения.' });
    busy = true;
    try {
      if (!request.isMultipart()) throw new RecognitionError(400, 'Ожидается один файл PNG или JPEG.');
      let image: Source | undefined;
      // Consume the entire form before any provider call, so extra files/parts cannot spend credit.
      for await (const part of request.parts()) {
        if (part.type !== 'file' || part.fieldname !== 'file' || image) throw new RecognitionError(400, 'Ожидается один файл в поле file.');
        const bytes = await part.toBuffer();
        if (part.file.truncated || bytes.byteLength > MAX_UPLOAD) throw new RecognitionError(413, 'Изображение превышает предел 10 МиБ.');
        image = await normalizeImage(bytes, part.mimetype);
      }
      if (!image) throw new RecognitionError(400, 'Выберите файл PNG или JPEG.');
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => { controller.abort(); reject(new RecognitionError(504, 'Истекло время ожидания распознавания. Повторите запрос.')); }, config.requestTimeoutMs ?? 45_000);
        });
        const result = await Promise.race([invoke(image, controller.signal), timeout]);
        const recognition = RecognitionSchema.parse(result);
        const project = createProject(image, recognition);
        return { project, warnings: recognition.warnings };
      } catch (error) {
        if (error instanceof RecognitionError) throw error;
        throw new RecognitionError(502, 'Не удалось получить корректный ответ провайдера. Проверьте настройки или повторите запрос.');
      } finally { if (timer) clearTimeout(timer); }
    } finally { busy = false; }
  });
  return app;
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
