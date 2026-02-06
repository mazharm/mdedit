import React, { useState, useEffect, useCallback } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Spinner,
  Input,
} from '@fluentui/react-components';
import {
  Folder24Regular,
  Document24Regular,
  ArrowLeft24Regular,
  Search24Regular,
  Save24Regular,
} from '@fluentui/react-icons';
import {
  listRootFiles,
  listFolderFiles,
  getFileContent,
  saveFile,
  createFileInFolder,
  searchFiles,
  DriveFile,
} from '../../services/oneDriveService';
import type { GetTokenFn } from '../../services/graphService';
import { useFileStore } from '../../stores/fileStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: '300px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    overflow: 'hidden',
  },
  breadcrumbItem: {
    cursor: 'pointer',
    color: tokens.colorBrandForeground1,
    '&:hover': {
      textDecoration: 'underline',
    },
  },
  searchInput: {
    width: '200px',
  },
  fileList: {
    flex: 1,
    overflow: 'auto',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    cursor: 'pointer',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  fileItemSelected: {
    backgroundColor: tokens.colorBrandBackground2,
  },
  fileIcon: {
    flexShrink: 0,
  },
  fileInfo: {
    flex: 1,
    overflow: 'hidden',
  },
  fileName: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  fileMeta: {
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
  },
  error: {
    textAlign: 'center',
    padding: '32px',
    color: tokens.colorPaletteRedForeground1,
  },
  notAuthenticated: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    gap: '16px',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '12px',
  },
  recentSection: {
    marginBottom: '12px',
    padding: '8px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  recentHeader: {
    marginBottom: '8px',
  },
  recentList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  recentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    cursor: 'pointer',
    fontSize: '12px',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
});

type Mode = 'open' | 'save';

interface BreadcrumbItem {
  id: string | null;
  name: string;
}

interface OneDrivePickerProps {
  mode: Mode;
  onFileSelect: (content: string, fileName: string, filePath: string, fileId?: string) => void;
  onFileSave: () => string;
  getToken: GetTokenFn;
  isAuthenticated: boolean;
  saveFileName?: string;
}

export function OneDrivePicker({
  mode,
  onFileSelect,
  onFileSave,
  getToken,
  isAuthenticated,
  saveFileName = '',
}: OneDrivePickerProps) {
  const styles = useStyles();
  const { recentFiles } = useFileStore();

  const [files, setFiles] = useState<DriveFile[]>([]);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: null, name: 'OneDrive' }]);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter recent files for OneDrive only
  const oneDriveRecentFiles = recentFiles.filter((f) => f.source === 'onedrive' && f.id);

  // Handle opening a recent file
  const handleOpenRecentFile = useCallback(async (fileId: string, fileName: string, filePath: string) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const content = await getFileContent(getToken, fileId);
      onFileSelect(content, fileName, filePath, fileId);
    } catch (err) {
      console.error('Failed to open recent file:', err);
      setError('Failed to open file. It may have been moved or deleted.');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getToken, onFileSelect]);

  // Load files
  const loadFiles = useCallback(
    async (folderId: string | null) => {
      if (!isAuthenticated) return;

      setIsLoading(true);
      setError(null);

      try {
        const fileList = folderId
          ? await listFolderFiles(getToken, folderId)
          : await listRootFiles(getToken);

        // Filter for markdown files and folders
        const filtered = fileList.filter(
          (f) => f.isFolder || f.name.endsWith('.md') || f.name.endsWith('.markdown')
        );

        setFiles(filtered);
      } catch (err) {
        console.error('Failed to load files:', err);
        setError('Failed to load files. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [getToken, isAuthenticated]
  );

  // Initial load
  useEffect(() => {
    if (isAuthenticated) {
      loadFiles(null);
    }
  }, [isAuthenticated, loadFiles]);

  // Search files
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const results = await searchFiles(getToken, searchQuery);
      setFiles(results);
      setBreadcrumb([{ id: null, name: 'Search Results' }]);
    } catch (err) {
      console.error('Failed to search files:', err);
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, getToken, isAuthenticated]);

  // Navigate to folder
  const handleFolderClick = useCallback(
    (folder: DriveFile) => {
      setBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
      setSelectedFile(null);
      loadFiles(folder.id);
    },
    [loadFiles]
  );

  // Navigate breadcrumb
  const handleBreadcrumbClick = useCallback(
    (index: number) => {
      const item = breadcrumb[index];
      setBreadcrumb((prev) => prev.slice(0, index + 1));
      setSelectedFile(null);
      loadFiles(item.id);
    },
    [breadcrumb, loadFiles]
  );

  // Go back
  const handleBack = useCallback(() => {
    if (breadcrumb.length > 1) {
      handleBreadcrumbClick(breadcrumb.length - 2);
    }
  }, [breadcrumb, handleBreadcrumbClick]);

  // Open file - can accept a file directly or use selectedFile
  const handleOpenFile = useCallback(async (file?: DriveFile) => {
    const fileToOpen = file || selectedFile;
    if (!fileToOpen || fileToOpen.isFolder) return;

    setIsLoading(true);
    try {
      const content = await getFileContent(getToken, fileToOpen.id);
      onFileSelect(content, fileToOpen.name, fileToOpen.webUrl, fileToOpen.id);
    } catch (err) {
      console.error('Failed to open file:', err);
      setError('Failed to open file. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, getToken, onFileSelect]);

  // Save file
  const handleSaveFile = useCallback(async () => {
    if (!saveFileName.trim()) return;

    setIsSaving(true);
    setError(null);

    try {
      const content = onFileSave();
      const currentFolderId = breadcrumb[breadcrumb.length - 1].id;

      // If a file is selected, save to that file
      // Otherwise, create a new file in current folder
      if (selectedFile && !selectedFile.isFolder) {
        await saveFile(getToken, selectedFile.id, content);
        onFileSelect(content, selectedFile.name, selectedFile.webUrl, selectedFile.id);
      } else {
        const folderId = currentFolderId || 'root';
        const newFile = await createFileInFolder(getToken, folderId, saveFileName, content);
        onFileSelect(content, newFile.name, newFile.webUrl, newFile.id);
      }
    } catch (err) {
      console.error('Failed to save file:', err);
      setError('Failed to save file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [saveFileName, selectedFile, breadcrumb, getToken, onFileSave, onFileSelect]);

  // File click handler
  const handleFileClick = useCallback(
    (file: DriveFile) => {
      if (file.isFolder) {
        handleFolderClick(file);
      } else {
        setSelectedFile(file);
      }
    },
    [handleFolderClick]
  );

  // File double click handler
  const handleFileDoubleClick = useCallback(
    (file: DriveFile) => {
      if (!file.isFolder && mode === 'open') {
        setSelectedFile(file);
        handleOpenFile(file); // Pass file directly to avoid race condition
      }
    },
    [mode, handleOpenFile]
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  if (!isAuthenticated) {
    return (
      <div className={styles.notAuthenticated}>
        <Text>Sign in to access your OneDrive files</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {breadcrumb.length > 1 && (
          <Button icon={<ArrowLeft24Regular />} appearance="subtle" onClick={handleBack} />
        )}

        <div className={styles.breadcrumb}>
          {breadcrumb.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <Text>/</Text>}
              <Text
                className={styles.breadcrumbItem}
                onClick={() => handleBreadcrumbClick(index)}
              >
                {item.name}
              </Text>
            </React.Fragment>
          ))}
        </div>

        <Input
          className={styles.searchInput}
          placeholder="Search..."
          value={searchQuery}
          onChange={(_, data) => setSearchQuery(data.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          contentAfter={
            <Button
              icon={<Search24Regular />}
              appearance="subtle"
              size="small"
              onClick={handleSearch}
            />
          }
        />
      </div>

      {/* Recent OneDrive files */}
      {mode === 'open' && oneDriveRecentFiles.length > 0 && (
        <div className={styles.recentSection}>
          <Text className={styles.recentHeader} weight="semibold" size={200}>
            Recent Files
          </Text>
          <div className={styles.recentList}>
            {oneDriveRecentFiles.slice(0, 5).map((file) => (
              <div
                key={file.id}
                className={styles.recentItem}
                onClick={() => handleOpenRecentFile(file.id!, file.name, file.path)}
              >
                <Document24Regular style={{ fontSize: 16 }} />
                <span>{file.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <Spinner label="Loading files..." />
        </div>
      ) : error ? (
        <div className={styles.error}>
          <Text>{error}</Text>
          <Button onClick={() => loadFiles(breadcrumb[breadcrumb.length - 1].id)}>
            Retry
          </Button>
        </div>
      ) : (
        <div className={styles.fileList}>
          {files.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <Text>No markdown files found</Text>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className={`${styles.fileItem} ${
                  selectedFile?.id === file.id ? styles.fileItemSelected : ''
                }`}
                onClick={() => handleFileClick(file)}
                onDoubleClick={() => handleFileDoubleClick(file)}
              >
                <div className={styles.fileIcon}>
                  {file.isFolder ? (
                    <Folder24Regular primaryFill={tokens.colorBrandForeground1} />
                  ) : (
                    <Document24Regular />
                  )}
                </div>
                <div className={styles.fileInfo}>
                  <Text className={styles.fileName} weight="semibold">
                    {file.name}
                  </Text>
                  <Text className={styles.fileMeta}>
                    {!file.isFolder && formatFileSize(file.size)} · {formatDate(file.lastModified)}
                  </Text>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className={styles.actions}>
        {mode === 'open' ? (
          <Button
            appearance="primary"
            onClick={() => handleOpenFile()}
            disabled={!selectedFile || selectedFile.isFolder}
          >
            Open
          </Button>
        ) : (
          <Button
            appearance="primary"
            icon={<Save24Regular />}
            onClick={handleSaveFile}
            disabled={!saveFileName.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        )}
      </div>
    </div>
  );
}
