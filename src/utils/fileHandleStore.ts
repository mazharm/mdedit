// IndexedDB store for persisting file handles across sessions
// File handles can be stored in IndexedDB and permission re-requested later

// Augment FileSystemFileHandle with Permission API methods
// These are part of the File System Access API but not yet in standard TS lib
interface FileSystemPermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemFileHandleWithPermissions extends FileSystemFileHandle {
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>;
}

const DB_NAME = 'mdedit-file-handles';
const STORE_NAME = 'handles';
const DB_VERSION = 1;

interface StoredHandle {
  key: string; // file path/name as key
  handle: FileSystemFileHandle;
  name: string;
  lastAccessed: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });

  return dbPromise;
}

export async function storeFileHandle(name: string, handle: FileSystemFileHandle): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const entry: StoredHandle = {
      key: name,
      handle,
      name,
      lastAccessed: Date.now(),
    };

    store.put(entry);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to store file handle:', err);
  }
}

export async function getFileHandle(name: string): Promise<FileSystemFileHandle | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(name);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result as StoredHandle | undefined;
        resolve(result?.handle || null);
      };
    });
  } catch (err) {
    console.error('Failed to get file handle:', err);
    return null;
  }
}

export async function removeFileHandle(name: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(name);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to remove file handle:', err);
  }
}

export async function requestPermissionAndRead(
  handle: FileSystemFileHandle
): Promise<{ content: string; handle: FileSystemFileHandle } | null> {
  try {
    // Cast to extended interface for Permission API methods
    const extHandle = handle as FileSystemFileHandleWithPermissions;
    // Check if we already have permission
    const options: FileSystemPermissionDescriptor = { mode: 'readwrite' };
    let permission = await extHandle.queryPermission(options);

    if (permission !== 'granted') {
      // Request permission - this requires user interaction
      permission = await extHandle.requestPermission(options);
    }

    if (permission !== 'granted') {
      return null;
    }

    // Read the file
    const file = await handle.getFile();
    const content = await file.text();

    return { content, handle };
  } catch (err) {
    console.error('Failed to read file:', err);
    return null;
  }
}
