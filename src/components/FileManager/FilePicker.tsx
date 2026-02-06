import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Tab,
  TabList,
  makeStyles,
  Input,
  Field,
} from '@fluentui/react-components';
import { Cloud24Regular, Folder24Regular, Save24Regular } from '@fluentui/react-icons';
import { OneDrivePicker } from './OneDrivePicker';
import { LocalFilePicker, FSAFileHandle } from './LocalFilePicker';
import type { GetTokenFn } from '../../services/graphService';
import type { FileInfo } from '../../stores/fileStore';

export type { FSAFileHandle };

const useStyles = makeStyles({
  content: {
    minHeight: '400px',
    display: 'flex',
    flexDirection: 'column',
  },
  tabContent: {
    flex: 1,
    marginTop: '16px',
    overflow: 'hidden',
  },
  saveAsSection: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  saveAsInput: {
    maxWidth: '300px',
  },
});

type TabValue = 'onedrive' | 'local';
type Mode = 'open' | 'save';

interface FilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileOpen: (content: string, fileName: string, filePath: string, fileId?: string, fileHandle?: FSAFileHandle) => void;
  onFileSave: () => string; // Returns content to save
  getToken: GetTokenFn;
  isAuthenticated: boolean;
  currentFile: FileInfo | null;
  initialMode?: Mode;
}

export function FilePicker({
  open,
  onOpenChange,
  onFileOpen,
  onFileSave,
  getToken,
  isAuthenticated,
  currentFile,
  initialMode = 'open',
}: FilePickerProps) {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = useState<TabValue>('onedrive');
  const [mode, setMode] = useState<Mode>(initialMode);
  const [saveFileName, setSaveFileName] = useState('');

  // Sync mode with initialMode when dialog opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      if (initialMode === 'save' && currentFile) {
        setSaveFileName(currentFile.name);
      }
    }
  }, [open, initialMode, currentFile]);

  const handleOpenModeChange = useCallback((newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'save' && currentFile) {
      setSaveFileName(currentFile.name);
    }
  }, [currentFile]);

  const handleOneDriveFileSelect = useCallback(
    (content: string, fileName: string, filePath: string, fileId?: string) => {
      onFileOpen(content, fileName, filePath, fileId, undefined);
      onOpenChange(false);
    },
    [onFileOpen, onOpenChange]
  );

  const handleLocalFileSelect = useCallback(
    (content: string, fileName: string, filePath: string, fileHandle?: FSAFileHandle) => {
      onFileOpen(content, fileName, filePath, undefined, fileHandle);
      onOpenChange(false);
    },
    [onFileOpen, onOpenChange]
  );

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setMode('open');
    setSaveFileName('');
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={(_, data) => onOpenChange(data.open)}>
      <DialogSurface style={{ maxWidth: '700px', width: '90vw' }}>
        <DialogTitle>{mode === 'open' ? 'Open File' : 'Save File'}</DialogTitle>
        <DialogBody>
          <DialogContent className={styles.content}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <Button
                appearance={mode === 'open' ? 'primary' : 'secondary'}
                onClick={() => handleOpenModeChange('open')}
              >
                Open
              </Button>
              <Button
                appearance={mode === 'save' ? 'primary' : 'secondary'}
                onClick={() => handleOpenModeChange('save')}
                icon={<Save24Regular />}
              >
                Save As
              </Button>
            </div>

            <TabList
              selectedValue={selectedTab}
              onTabSelect={(_, data) => setSelectedTab(data.value as TabValue)}
            >
              <Tab value="onedrive" icon={<Cloud24Regular />}>
                OneDrive
              </Tab>
              <Tab value="local" icon={<Folder24Regular />}>
                Local Files
              </Tab>
            </TabList>

            <div className={styles.tabContent}>
              {mode === 'save' && (
                <div className={styles.saveAsSection}>
                  <Field label="File name">
                    <Input
                      className={styles.saveAsInput}
                      value={saveFileName}
                      onChange={(_, data) => setSaveFileName(data.value)}
                      placeholder="Enter file name..."
                    />
                  </Field>
                </div>
              )}

              {selectedTab === 'onedrive' ? (
                <OneDrivePicker
                  mode={mode}
                  onFileSelect={handleOneDriveFileSelect}
                  onFileSave={onFileSave}
                  getToken={getToken}
                  isAuthenticated={isAuthenticated}
                  saveFileName={saveFileName}
                />
              ) : (
                <LocalFilePicker
                  mode={mode}
                  onFileSelect={handleLocalFileSelect}
                  onFileSave={onFileSave}
                  saveFileName={saveFileName}
                />
              )}
            </div>
          </DialogContent>
        </DialogBody>
        <DialogActions>
          <Button appearance="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
}
