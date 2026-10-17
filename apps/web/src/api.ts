import { ProjectSchema, type Project, type Source } from '@roompilot/domain';
import type { TranslationKey } from './translations';

export class ApiError extends Error {
  constructor(public readonly key: TranslationKey) { super(key); }
}

export const PROVIDER_IDS = ['openai', 'gemini', 'openrouter'] as const;
export type ProviderId = typeof PROVIDER_IDS[number];
export const PROVIDER_NAMES: Record<ProviderId, string> = { openai: 'OpenAI', gemini: 'Google Gemini', openrouter: 'OpenRouter' };
export interface ProviderStatus { id: ProviderId; configured: boolean; model: string | null }
export interface ProviderHealth { defaultProvider: ProviderId; providers: ProviderStatus[] }
const providerErrors: Record<string, TranslationKey> = {
  provider_unconfigured: 'recognitionUnavailable', provider_auth: 'providerAuth', provider_quota: 'providerQuota',
  provider_rate_limit: 'providerRateLimit', recognition_timeout: 'recognitionTimeout', invalid_result: 'recognitionInvalid',
};

export async function recognize(file: File, provider: ProviderId = 'openai'): Promise<{ project: Project; warnings: string[] }> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch(`/api/recognize?provider=${encodeURIComponent(provider)}`, { method: 'POST', body: form });
  const body: unknown = await response.json();
  if (!response.ok) {
    const code = typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string' ? body.code : '';
    throw new ApiError(Object.hasOwn(providerErrors, code) ? providerErrors[code] : response.status === 503 ? 'recognitionUnavailable' : 'recognitionFailed');
  }
  if (typeof body !== 'object' || body === null || !('project' in body)) throw new ApiError('recognitionFailed');
  return { project: ProjectSchema.parse(body.project), warnings: 'warnings' in body && Array.isArray(body.warnings) ? body.warnings.filter((item): item is string => typeof item === 'string') : [] };
}

export async function decodeSource(dataUrl: string): Promise<Source> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 20_000_000) throw new ApiError('imageTooLarge');
  const ratio = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
  const context = canvas.getContext('2d');
  if (!context) throw new ApiError('canvasUnsupported');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { dataUrl: canvas.toDataURL('image/png'), width: canvas.width, height: canvas.height };
}

export async function readImage(file: File): Promise<Source> {
  if (file.size > 10 * 1024 * 1024) throw new ApiError('imageSize');
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => bytes[i] === byte);
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (!png && !jpeg) throw new ApiError('invalidImageType');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(`data:image/${png ? 'png' : 'jpeg'};base64,${String(reader.result).split(',')[1]}`);
    reader.onerror = () => reject(new ApiError('imageReadFailed'));
    reader.readAsDataURL(file);
  });
  try { return await decodeSource(dataUrl); } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('imageDamaged');
  }
}

export async function verifyImportedSource(source: Source): Promise<void> {
  const image = new Image();
  image.src = source.dataUrl;
  await image.decode();
  if (image.naturalWidth !== source.width || image.naturalHeight !== source.height) throw new ApiError('imageDimensionMismatch');
}
