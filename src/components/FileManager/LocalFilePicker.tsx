import { useState, useCallback, useRef } from 'react';
import {
  makeStyles,
  shorthands,
  tokens,
  Text,
  Button,
  mergeClasses,
  Spinner,
} from '@fluentui/react-components';
import {
  FolderOpen24Regular,
  Save24Regular,
  Document24Regular,
} from '@fluentui/react-icons';
import { useFileStore } from '../../stores/fileStore';
import { storeFileHandle, getFileHandle, requestPermissionAndRead } from '../../utils/fileHandleStore';
import { isInVSCode, sendRequest } from '../../utils/vscodeApi';

// File System Access API types (prefixed to avoid conflicts with built-in types)
interface FSAFilePickerAcceptType {
  description: string;
  accept: Record<string, string[]>;
}

interface FSAOpenFilePickerOptions {
  types?: FSAFilePickerAcceptType[];
  multiple?: boolean;
}

interface FSASaveFilePickerOptions {
  suggestedName?: string;
  types?: FSAFilePickerAcceptType[];
}

export interface FSAFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FSAWritableFileStream>;
}

interface FSAWritableFileStream {
  write(data: string | Blob | ArrayBuffer): Promise<void>;
  close(): Promise<void>;
}

interface WindowWithFSA {
  showOpenFilePicker(options?: FSAOpenFilePickerOptions): Promise<FSAFileHandle[]>;
  showSaveFilePicker(options?: FSASaveFilePickerOptions): Promise<FSAFileHandle>;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    minHeight: '300px',
    ...shorthands.gap('24px'),
    ...shorthands.padding('32px'),
  },
  dropZone: {
    width: '100%',
    maxWidth: '400px',
    ...shorthands.padding('48px', '32px'),
    ...shorthands.border('2px', 'dashed', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusLarge),
    textAlign: 'center' as const,
    cursor: 'pointer',
    transitionProperty: 'all',
    transitionDuration: '0.2s',
  },
  dropZoneActive: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    backgroundColor: tokens.colorBrandBackground2,
  },
  icon: {
    marginBottom: '16px',
    color: tokens.colorBrandForeground1,
  },
  buttons: {
    display: 'flex',
    ...shorthands.gap('12px'),
  },
  recentFiles: {
    width: '100%',
    maxWidth: '400px',
    marginTop: '16px',
  },
  recentHeader: {
    marginBottom: '8px',
  },
  recentList: {
    ...shorthands.border('1px', 'solid', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.overflow('hidden'),
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    ...shorthands.gap('8px'),
    ...shorthands.padding('12px'),
    cursor: 'pointer',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  recentFileName: {
    ...shorthands.flex(1),
    ...shorthands.overflow('hidden'),
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  hiddenInput: {
    display: 'none',
  },
  notSupported: {
    textAlign: 'center' as const,
    color: tokens.colorNeutralForeground3,
  },
});

type Mode = 'open' | 'save';

interface LocalFilePickerProps {
  mode: Mode;
  onFileSelect: (content: string, fileName: string, filePath: string, fileHandle?: FSAFileHandle) => void;
  onFileSave: () => string;
  saveFileName?: string;
}

// Check if File System Access API is supported and usable
// Note: The API exists in iframes but throws SecurityError when called
const isFileSystemAccessSupported = (() => {
  // API must exist
  if (!('showOpenFilePicker' in window)) return false;
  // Not usable in iframes (Teams embeds in iframe)
  try {
    if (window.self !== window.top) return false;
  } catch {
    // Cross-origin iframe - definitely not supported
    return false;
  }
  return true;
})();

export function LocalFilePicker({
  mode,
  onFileSelect,
  onFileSave,
  saveFileName = 'untitled.md',
}: LocalFilePickerProps) {
  const styles = useStyles();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { recentFiles } = useFileStore();

  // Handle file open with File System Access API
  const handleOpenWithFSA = useCallback(async () => {
    try {
      const [fileHandle] = await (window as unknown as WindowWithFSA).showOpenFilePicker({
        types: [
          {
            description: 'Markdown files',
            accept: {
              'text/markdown': ['.md', '.markdown'],
            },
          },
        ],
        multiple: false,
      });

      const file = await fileHandle.getFile();
      const content = await file.text();

      // Store the file handle for later access
      await storeFileHandle(file.name, fileHandle as unknown as FileSystemFileHandle);

      onFileSelect(content, file.name, file.name, fileHandle);
    } catch (err) {
      // User cancelled or error
      console.log('File open cancelled or failed:', err);
    }
  }, [onFileSelect]);

  // Handle opening a recent file using stored handle
  const handleOpenRecentFile = useCallback(async (fileName: string) => {
    if (!isFileSystemAccessSupported) {
      fileInputRef.current?.click();
      return;
    }

    setIsLoading(true);
    try {
      const handle = await getFileHandle(fileName);

      if (!handle) {
        await handleOpenWithFSA();
        return;
      }

      const result = await requestPermissionAndRead(handle);

      if (!result) {
        await handleOpenWithFSA();
        return;
      }

      await storeFileHandle(fileName, result.handle);
      onFileSelect(result.content, fileName, fileName, result.handle as unknown as FSAFileHandle);
    } catch (err) {
      console.error('Failed to open recent file:', err);
      await handleOpenWithFSA();
    } finally {
      setIsLoading(false);
    }
  }, [onFileSelect, handleOpenWithFSA]);

  // Handle file save with File System Access API
  const handleSaveWithFSA = useCallback(async () => {
    try {
      const fileHandle = await (window as unknown as WindowWithFSA).showSaveFilePicker({
        suggestedName: saveFileName,
        types: [
          {
            description: 'Markdown file',
            accept: {
              'text/markdown': ['.md'],
            },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      const content = onFileSave();
      await writable.write(content);
      await writable.close();

      const file = await fileHandle.getFile();

      // Store the file handle for later access
      await storeFileHandle(file.name, fileHandle as unknown as FileSystemFileHandle);

      onFileSelect(content, file.name, file.name, fileHandle);
    } catch (err) {
      // User cancelled or error
      console.log('File save cancelled or failed:', err);
    }
  }, [saveFileName, onFileSave, onFileSelect]);

  // Fallback: Handle file open with input element
  const handleOpenWithInput = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileSelect(content, file.name, file.name);
      };
      reader.readAsText(file);
    },
    [onFileSelect]
  );

  // Fallback: Handle file save with download
  const handleSaveWithDownload = useCallback(() => {
    const content = onFileSave();
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = saveFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onFileSelect(content, saveFileName, saveFileName);
  }, [saveFileName, onFileSave, onFileSelect]);

  // Handle file open via VS Code extension host
  const handleOpenWithVSCode = useCallback(async () => {
    try {
      const response = await sendRequest<{
        type: 'fileOpened';
        content: string;
        fileName: string;
        filePath: string;
        requestId: string;
      }>({ type: 'openFile' }, 'fileOpened');
      onFileSelect(response.content, response.fileName, response.filePath);
    } catch (err) {
      console.log('VS Code file open cancelled or failed:', err);
    }
  }, [onFileSelect]);

  // Handle file save via VS Code extension host
  const handleSaveWithVSCode = useCallback(async () => {
    try {
      const content = onFileSave();
      await sendRequest<{
        type: 'fileSaved';
        success: boolean;
        filePath: string;
        fileName: string;
        requestId: string;
      }>({ type: 'saveFileAs', content, suggestedName: saveFileName }, 'fileSaved');
    } catch (err) {
      console.log('VS Code file save cancelled or failed:', err);
    }
  }, [onFileSave, saveFileName]);

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (!file || (!file.name.endsWith('.md') && !file.name.endsWith('.markdown'))) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onFileSelect(content, file.name, file.name);
      };
      reader.readAsText(file);
    },
    [onFileSelect]
  );

  const localRecentFiles = recentFiles.filter((f) => f.source === 'local');

  return (
    <div className={styles.container}>
      {mode === 'open' ? (
        <>
          <div
            className={mergeClasses(styles.dropZone, isDragging && styles.dropZoneActive)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() =>
              isInVSCode()
                ? handleOpenWithVSCode()
                : isFileSystemAccessSupported
                  ? handleOpenWithFSA()
                  : fileInputRef.current?.click()
            }
          >
            <FolderOpen24Regular className={styles.icon} style={{ fontSize: 48 }} />
            <Text size={400} weight="semibold" block>
              Drop a file here
            </Text>
            <Text size={200}>or click to browse</Text>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown"
            onChange={handleOpenWithInput}
            className={styles.hiddenInput}
          />

          {localRecentFiles.length > 0 && (
            <div className={styles.recentFiles}>
              <Text className={styles.recentHeader} weight="semibold" size={300}>
                Recent Files
              </Text>
              {isLoading && (
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <Spinner size="tiny" label="Opening file..." />
                </div>
              )}
              <div className={styles.recentList}>
                {localRecentFiles.slice(0, 5).map((file, index) => (
                  <div
                    key={index}
                    className={styles.recentItem}
                    onClick={() => handleOpenRecentFile(file.name)}
                    title="Click to open"
                  >
                    <Document24Regular />
                    <Text className={styles.recentFileName}>{file.name}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.dropZone}>
            <Save24Regular className={styles.icon} style={{ fontSize: 48 }} />
            <Text size={400} weight="semibold" block>
              Save as: {saveFileName}
            </Text>
            <Text size={200}>
              {isInVSCode() || isFileSystemAccessSupported
                ? 'Click the button below to choose a location'
                : 'Click the button below to download'}
            </Text>
          </div>

          <div className={styles.buttons}>
            <Button
              appearance="primary"
              icon={<Save24Regular />}
              onClick={
                isInVSCode()
                  ? handleSaveWithVSCode
                  : isFileSystemAccessSupported
                    ? handleSaveWithFSA
                    : handleSaveWithDownload
              }
            >
              {isInVSCode() || isFileSystemAccessSupported ? 'Save to Disk' : 'Download'}
            </Button>
          </div>

          {!isInVSCode() && !isFileSystemAccessSupported && (
            <Text className={styles.notSupported} size={200}>
              Note: Your browser doesn't support saving files directly. The file will be
              downloaded instead.
            </Text>
          )}
        </>
      )}
    </div>
  );
}
