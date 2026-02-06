import { create } from 'zustand';

export interface FileInfo {
  name: string;
  path: string;
  id?: string; // OneDrive file ID
  source?: 'onedrive' | 'local';
}

interface RecentFile extends FileInfo {
  lastOpened: Date;
}

interface FileStore {
  currentFile: FileInfo | null;
  recentFiles: RecentFile[];
  isDirty: boolean;

  setCurrentFile: (file: FileInfo | null) => void;
  setIsDirty: (dirty: boolean) => void;
  addToRecent: (file: FileInfo) => void;
  clearRecent: () => void;
}

const RECENT_FILES_KEY = 'mdedit-teams-recent-files';
const MAX_RECENT_FILES = 10;

function loadRecentFiles(): RecentFile[] {
  try {
    const stored = localStorage.getItem(RECENT_FILES_KEY);
    if (stored) {
      const files = JSON.parse(stored);
      return files.map((f: RecentFile) => ({
        ...f,
        lastOpened: new Date(f.lastOpened),
      }));
    }
  } catch {
    // Ignore errors
  }
  return [];
}

function saveRecentFiles(files: RecentFile[]): void {
  try {
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(files));
  } catch {
    // Ignore errors
  }
}

export const useFileStore = create<FileStore>((set, get) => ({
  currentFile: null,
  recentFiles: loadRecentFiles(),
  isDirty: false,

  setCurrentFile: (file) => {
    set({ currentFile: file, isDirty: false });
    if (file) {
      get().addToRecent(file);
    }
  },

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  addToRecent: (file) => {
    set((state) => {
      // Remove existing entry if present
      const filtered = state.recentFiles.filter(
        (f) => f.path !== file.path || f.id !== file.id
      );

      // Add new entry at the beginning
      const updated: RecentFile[] = [
        { ...file, lastOpened: new Date() },
        ...filtered,
      ].slice(0, MAX_RECENT_FILES);

      saveRecentFiles(updated);

      return { recentFiles: updated };
    });
  },

  clearRecent: () => {
    localStorage.removeItem(RECENT_FILES_KEY);
    set({ recentFiles: [] });
  },
}));
