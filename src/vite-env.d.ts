/// <reference types="vite/client" />

interface Window {
  showOpenFilePicker?: (options?: {
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
    multiple?: boolean;
  }) => Promise<FileSystemFileHandle[]>;

  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | ArrayBuffer | ArrayBufferView | Blob): Promise<void>;
  close(): Promise<void>;
}
