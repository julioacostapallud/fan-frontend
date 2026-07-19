import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MAX_PROCESSED_IMAGE_BYTES } from './constants';

function mockImage(width: number, height: number) {
  class MockImage {
    width = width;
    height = height;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_v: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  vi.stubGlobal('Image', MockImage);
}

describe('processImageFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:mock');
    URL.revokeObjectURL = vi.fn();
  });

  it('rechaza imágenes demasiado grandes después de procesar', async () => {
    mockImage(2000, 2000);

    const hugeBlob = new Blob([new Uint8Array(MAX_PROCESSED_IMAGE_BYTES + 10_000)], {
      type: 'image/jpeg',
    });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => {
      cb(hugeBlob);
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

    const { processImageFile } = await import('./image');
    const file = new File([hugeBlob], 'big.jpg', { type: 'image/jpeg' });

    await expect(processImageFile(file)).rejects.toThrow(/supera el límite/);
  });

  it('comprime y acepta una imagen dentro del límite', async () => {
    mockImage(800, 600);

    const smallBlob = new Blob([new Uint8Array(12_000)], { type: 'image/jpeg' });

    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => {
      cb(smallBlob);
    }) as unknown as typeof HTMLCanvasElement.prototype.toBlob;

    class MockFileReader {
      result: string | ArrayBuffer | null = null;
      onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
      onerror: (() => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/jpeg;base64,abcd';
        queueMicrotask(() =>
          this.onload?.({} as ProgressEvent<FileReader>),
        );
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    const { processImageFile } = await import('./image');
    const file = new File([smallBlob], 'ok.jpg', { type: 'image/jpeg' });
    const result = await processImageFile(file);
    expect(result.base64).toBe('abcd');
    expect(result.byteSize).toBe(12_000);
  });
});
