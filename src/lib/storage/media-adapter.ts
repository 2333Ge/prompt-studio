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

export const mediaStorageAdapter: MediaStorageAdapter = new LocalMediaStorageAdapter();
