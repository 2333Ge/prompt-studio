export interface MediaItem {
  id: string;
  url: string;
  name: string;
  createdAt: string;
}

export interface MediaStorageAdapter {
  upload(file: File): Promise<string>;
  list(prefix?: string): Promise<MediaItem[]>;
  delete?(id: string): Promise<void>;
}

export class LocalMediaStorageAdapter implements MediaStorageAdapter {
  async upload(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async list(): Promise<MediaItem[]> {
    return [];
  }
}

/** Placeholder for future Cloudflare R2 integration via Next.js API routes. */
export class CloudflareR2StorageAdapter implements MediaStorageAdapter {
  async upload(): Promise<string> {
    throw new Error("Cloudflare R2 adapter is not configured yet");
  }

  async list(): Promise<MediaItem[]> {
    return [];
  }
}

export const mediaStorageAdapter: MediaStorageAdapter = new LocalMediaStorageAdapter();

export const IMAGE_URL_PATTERN = /https?:\/\/[^\s"'<>]+\.(?:png|jpe?g|gif|webp|avif)(?:\?[^\s"'<>]*)?/gi;

export function extractImageUrls(text: string): string[] {
  return Array.from(new Set(text.match(IMAGE_URL_PATTERN) ?? []));
}
