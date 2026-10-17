import { ProjectSchema, type Project, type Source } from '@roompilot/domain';
import type { TranslationKey } from './translations';

export class ApiError extends Error {
  constructor(public readonly key: TranslationKey) { super(key); }
}

export async function recognize(file: File): Promise<{ project: Project; warnings: string[] }> {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/recognize', { method: 'POST', body: form });
  const body: unknown = await response.json();
  if (!response.ok) throw new ApiError(response.status === 503 ? 'recognitionUnavailable' : 'recognitionFailed');
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
