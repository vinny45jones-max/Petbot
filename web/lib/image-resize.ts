export interface Dimensions { width: number; height: number }

export function computeResizeDimensions(width: number, height: number, maxSide: number): Dimensions {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Ресайз File через canvas до maxSide по длинной стороне. Только в браузере.
 * Возвращает новый File (jpeg) либо исходный, если ресайз не нужен/не удался.
 */
export async function resizeImageFile(file: File, maxSide = 1600, quality = 0.85): Promise<File> {
  if (typeof document === 'undefined' || !file.type.startsWith('image/')) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const { width, height } = computeResizeDimensions(bitmap.width, bitmap.height, maxSide);
  if (width === bitmap.width && height === bitmap.height) return file;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
}
