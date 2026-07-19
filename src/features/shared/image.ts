import {
  IMAGE_MAX_EDGE,
  IMAGE_QUALITY,
  MAX_PROCESSED_IMAGE_BYTES,
} from './constants';

export interface ProcessedImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/webp';
  byteSize: number;
  width: number;
  height: number;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('No se pudo comprimir la imagen'));
        else resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Error al convertir la imagen'));
    reader.readAsDataURL(blob);
  });
}

export async function processImageFile(file: File): Promise<ProcessedImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }

  const img = await loadImage(file);
  const scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo procesar la imagen');
  ctx.drawImage(img, 0, 0, width, height);

  const preferWebp = typeof canvas.toDataURL === 'function';
  let mimeType: 'image/jpeg' | 'image/webp' = 'image/jpeg';
  let blob = await canvasToBlob(canvas, 'image/jpeg', IMAGE_QUALITY);

  if (preferWebp) {
    try {
      const webp = await canvasToBlob(canvas, 'image/webp', IMAGE_QUALITY);
      if (webp.size < blob.size) {
        blob = webp;
        mimeType = 'image/webp';
      }
    } catch {
      // keep jpeg
    }
  }

  if (blob.size > MAX_PROCESSED_IMAGE_BYTES) {
    throw new Error(
      `La imagen procesada pesa ${(blob.size / 1024).toFixed(0)} KB y supera el límite de ${(MAX_PROCESSED_IMAGE_BYTES / 1024).toFixed(0)} KB. Probá con otra foto.`,
    );
  }

  const base64 = await blobToBase64(blob);
  return { base64, mimeType, byteSize: blob.size, width, height };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}
