import React, { RefObject, useState, useCallback } from 'react';
import {
  ToolbarButton,
  ToolbarDivider,
  ToolbarGroup,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Button,
  Tooltip,
  Avatar,
  makeStyles,
  tokens,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Input,
  Field,
  Text,
} from '@fluentui/react-components';
import {
  TextBold24Regular,
  TextItalic24Regular,
  TextUnderline24Regular,
  TextStrikethrough24Regular,
  Code24Regular,
  TextBulletList24Regular,
  TextNumberListLtr24Regular,
  TaskListSquareLtr24Regular,
  TextQuote24Regular,
  LineHorizontal124Regular,
  Link24Regular,
  Image24Regular,
  Table24Regular,
  DocumentAdd24Regular,
  FolderOpen24Regular,
  Save24Regular,
  SaveEdit24Regular,
  SplitHorizontal24Regular,
  TextEditStyle24Regular,
  Code24Filled,
  SignOut24Regular,
  Person24Regular,
  ChevronDown24Regular,
  Organization24Regular,
} from '@fluentui/react-icons';
import type { WysiwygEditorRef } from '../../stores/editorStore';
import type { FileInfo } from '../../stores/fileStore';

const useStyles = makeStyles({
  toolbar: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: '4px 8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
  },
  spacer: {
    flex: 1,
  },
  dirty: {
    color: tokens.colorPaletteRedForeground1,
  },
  viewModeGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    padding: '2px',
  },
  viewModeButton: {
    minWidth: 'auto',
    padding: '4px 8px',
  },
  viewModeActive: {
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    '&:hover': {
      backgroundColor: tokens.colorBrandBackgroundHover,
      color: tokens.colorNeutralForegroundOnBrand,
    },
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
});

type ViewMode = 'wysiwyg' | 'split' | 'markdown';

interface User {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  avatar?: string;
}

interface ToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onNewFile: () => void;
  onOpenFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  isAuthenticated: boolean;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  currentFile: FileInfo | null;
  isDirty: boolean;
  isSaving?: boolean;
  hasFileHandle?: boolean;
  wysiwygRef: RefObject<WysiwygEditorRef>;
}

export function Toolbar({
  viewMode,
  onViewModeChange,
  onNewFile,
  onOpenFile,
  onSaveFile,
  onSaveAsFile,
  isAuthenticated,
  user,
  onSignIn,
  onSignOut,
  currentFile,
  isDirty,
  isSaving = false,
  hasFileHandle = false,
  wysiwygRef,
}: ToolbarProps) {
  const styles = useStyles();

  // Dialog state for link insertion
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Dialog state for image insertion
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const executeCommand = useCallback((command: string, options?: unknown) => {
    wysiwygRef.current?.executeCommand(command, options);
  }, [wysiwygRef]);

  const handleInsertLink = useCallback(() => {
    if (linkUrl) {
      executeCommand('link', { url: linkUrl });
    }
    setLinkUrl('');
    setLinkDialogOpen(false);
  }, [linkUrl, executeCommand]);

  const handleInsertImage = useCallback(() => {
    if (imageUrl) {
      executeCommand('image', { src: imageUrl });
    }
    setImageUrl('');
    setImageDialogOpen(false);
  }, [imageUrl, executeCommand]);

  return (
    <div className={styles.toolbar}>
      {/* File operations */}
      <ToolbarGroup>
        <Tooltip content="New file" relationship="label">
          <ToolbarButton icon={<DocumentAdd24Regular />} onClick={onNewFile} />
        </Tooltip>
        <Tooltip content="Open file" relationship="label">
          <ToolbarButton icon={<FolderOpen24Regular />} onClick={onOpenFile} />
        </Tooltip>
        <Tooltip content={currentFile ? `Save${isDirty ? ' *' : ''}: ${currentFile.name}` : (hasFileHandle ? "Save" : "Save As")} relationship="label">
          <ToolbarButton
            icon={<Save24Regular />}
            onClick={onSaveFile}
            disabled={isSaving}
          />
        </Tooltip>
        <Tooltip content={currentFile ? `Save As: ${currentFile.name}` : "Save As"} relationship="label">
          <ToolbarButton
            icon={<SaveEdit24Regular />}
            onClick={onSaveAsFile}
            disabled={isSaving}
          />
        </Tooltip>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Text formatting */}
      <ToolbarGroup>
        <Tooltip content="Bold (Ctrl+B)" relationship="label">
          <ToolbarButton icon={<TextBold24Regular />} onClick={() => executeCommand('bold')} />
        </Tooltip>
        <Tooltip content="Italic (Ctrl+I)" relationship="label">
          <ToolbarButton icon={<TextItalic24Regular />} onClick={() => executeCommand('italic')} />
        </Tooltip>
        <Tooltip content="Underline (Ctrl+U)" relationship="label">
          <ToolbarButton
            icon={<TextUnderline24Regular />}
            onClick={() => executeCommand('underline')}
          />
        </Tooltip>
        <Tooltip content="Strikethrough" relationship="label">
          <ToolbarButton
            icon={<TextStrikethrough24Regular />}
            onClick={() => executeCommand('strike')}
          />
        </Tooltip>
        <Tooltip content="Inline code" relationship="label">
          <ToolbarButton icon={<Code24Regular />} onClick={() => executeCommand('code')} />
        </Tooltip>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Headings */}
      <Menu>
        <MenuTrigger disableButtonEnhancement>
          <Tooltip content="Headings" relationship="label">
            <ToolbarButton icon={<ChevronDown24Regular />}>Heading</ToolbarButton>
          </Tooltip>
        </MenuTrigger>
        <MenuPopover>
          <MenuList>
            <MenuItem onClick={() => executeCommand('heading', { level: 1 })}>Heading 1</MenuItem>
            <MenuItem onClick={() => executeCommand('heading', { level: 2 })}>Heading 2</MenuItem>
            <MenuItem onClick={() => executeCommand('heading', { level: 3 })}>Heading 3</MenuItem>
            <MenuItem onClick={() => executeCommand('heading', { level: 4 })}>Heading 4</MenuItem>
            <MenuItem onClick={() => executeCommand('heading', { level: 5 })}>Heading 5</MenuItem>
            <MenuItem onClick={() => executeCommand('heading', { level: 6 })}>Heading 6</MenuItem>
          </MenuList>
        </MenuPopover>
      </Menu>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarGroup>
        <Tooltip content="Bullet list" relationship="label">
          <ToolbarButton
            icon={<TextBulletList24Regular />}
            onClick={() => executeCommand('bulletList')}
          />
        </Tooltip>
        <Tooltip content="Numbered list" relationship="label">
          <ToolbarButton
            icon={<TextNumberListLtr24Regular />}
            onClick={() => executeCommand('orderedList')}
          />
        </Tooltip>
        <Tooltip content="Task list" relationship="label">
          <ToolbarButton
            icon={<TaskListSquareLtr24Regular />}
            onClick={() => executeCommand('taskList')}
          />
        </Tooltip>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Block elements */}
      <ToolbarGroup>
        <Tooltip content="Quote" relationship="label">
          <ToolbarButton
            icon={<TextQuote24Regular />}
            onClick={() => executeCommand('blockquote')}
          />
        </Tooltip>
        <Tooltip content="Code block" relationship="label">
          <ToolbarButton icon={<Code24Filled />} onClick={() => executeCommand('codeBlock')} />
        </Tooltip>
        <Tooltip content="Horizontal rule" relationship="label">
          <ToolbarButton
            icon={<LineHorizontal124Regular />}
            onClick={() => executeCommand('horizontalRule')}
          />
        </Tooltip>
      </ToolbarGroup>

      <ToolbarDivider />

      {/* Insert */}
      <ToolbarGroup>
        <Tooltip content="Insert link" relationship="label">
          <ToolbarButton
            icon={<Link24Regular />}
            onClick={() => setLinkDialogOpen(true)}
          />
        </Tooltip>
        <Tooltip content="Insert image" relationship="label">
          <ToolbarButton
            icon={<Image24Regular />}
            onClick={() => setImageDialogOpen(true)}
          />
        </Tooltip>
        <Tooltip content="Insert table" relationship="label">
          <ToolbarButton icon={<Table24Regular />} onClick={() => executeCommand('table')} />
        </Tooltip>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Tooltip content="Insert Mermaid diagram" relationship="label">
              <ToolbarButton icon={<Organization24Regular />} />
            </Tooltip>
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => executeCommand('mermaid')}>Flowchart</MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'sequenceDiagram\n    participant A as Alice\n    participant B as Bob\n    A->>B: Hello Bob!\n    B->>A: Hi Alice!',
                  })
                }
              >
                Sequence Diagram
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'classDiagram\n    class Animal {\n        +String name\n        +makeSound()\n    }\n    class Dog {\n        +bark()\n    }\n    Animal <|-- Dog',
                  })
                }
              >
                Class Diagram
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'stateDiagram-v2\n    [*] --> Idle\n    Idle --> Processing: Start\n    Processing --> Done: Complete\n    Done --> [*]',
                  })
                }
              >
                State Diagram
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'erDiagram\n    CUSTOMER ||--o{ ORDER : places\n    ORDER ||--|{ LINE-ITEM : contains\n    PRODUCT ||--o{ LINE-ITEM : includes',
                  })
                }
              >
                ER Diagram
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'journey\n    title My working day\n    section Go to work\n      Make tea: 5: Me\n      Go upstairs: 3: Me\n      Do work: 1: Me, Cat\n    section Go home\n      Go downstairs: 5: Me\n      Sit down: 5: Me',
                  })
                }
              >
                User Journey
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'gantt\n    title Project Schedule\n    dateFormat YYYY-MM-DD\n    section Planning\n        Research: a1, 2024-01-01, 7d\n        Design: a2, after a1, 5d\n    section Development\n        Coding: a3, after a2, 14d\n        Testing: a4, after a3, 7d',
                  })
                }
              >
                Gantt Chart
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'pie title Distribution\n    "Category A" : 40\n    "Category B" : 30\n    "Category C" : 20\n    "Category D" : 10',
                  })
                }
              >
                Pie Chart
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'gitGraph\n    commit\n    commit\n    branch develop\n    checkout develop\n    commit\n    commit\n    checkout main\n    merge develop\n    commit',
                  })
                }
              >
                Git Graph
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'mindmap\n  root((Central Idea))\n    Topic A\n      Subtopic 1\n      Subtopic 2\n    Topic B\n      Subtopic 3\n      Subtopic 4\n    Topic C',
                  })
                }
              >
                Mindmap
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'timeline\n    title History of Events\n    2020 : Event One\n    2021 : Event Two\n         : Event Three\n    2022 : Event Four',
                  })
                }
              >
                Timeline
              </MenuItem>
              <MenuItem
                onClick={() =>
                  wysiwygRef.current?.executeCommand('mermaid', {
                    code: 'quadrantChart\n    title Reach and engagement\n    x-axis Low Reach --> High Reach\n    y-axis Low Engagement --> High Engagement\n    quadrant-1 Expand\n    quadrant-2 Promote\n    quadrant-3 Re-evaluate\n    quadrant-4 Improve\n    Campaign A: [0.3, 0.6]\n    Campaign B: [0.45, 0.23]\n    Campaign C: [0.7, 0.8]',
                  })
                }
              >
                Quadrant Chart
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </ToolbarGroup>

      <div className={styles.spacer} />

      {/* View mode */}
      <div className={styles.viewModeGroup}>
        <Tooltip content="Rich text editor" relationship="label">
          <Button
            size="small"
            appearance={viewMode === 'wysiwyg' ? 'primary' : 'subtle'}
            className={styles.viewModeButton}
            icon={<TextEditStyle24Regular />}
            onClick={() => onViewModeChange('wysiwyg')}
          />
        </Tooltip>
        <Tooltip content="Split view" relationship="label">
          <Button
            size="small"
            appearance={viewMode === 'split' ? 'primary' : 'subtle'}
            className={styles.viewModeButton}
            icon={<SplitHorizontal24Regular />}
            onClick={() => onViewModeChange('split')}
          />
        </Tooltip>
        <Tooltip content="Markdown editor" relationship="label">
          <Button
            size="small"
            appearance={viewMode === 'markdown' ? 'primary' : 'subtle'}
            className={styles.viewModeButton}
            icon={<Code24Regular />}
            onClick={() => onViewModeChange('markdown')}
          />
        </Tooltip>
      </div>

      <ToolbarDivider />

      {/* User section */}
      <div className={styles.userSection}>
        {isAuthenticated && user ? (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <div className={styles.userInfo}>
                <Avatar
                  name={user.displayName}
                  image={user.avatar ? { src: user.avatar } : undefined}
                  size={28}
                />
              </div>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem disabled>
                  <Text weight="semibold">{user.displayName}</Text>
                </MenuItem>
                <MenuItem disabled>
                  <Text size={200}>{user.mail || user.userPrincipalName}</Text>
                </MenuItem>
                <MenuItem icon={<SignOut24Regular />} onClick={onSignOut}>
                  Sign out
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        ) : (
          <Tooltip content="Sign in" relationship="label">
            <Button appearance="primary" icon={<Person24Regular />} onClick={onSignIn} />
          </Tooltip>
        )}
      </div>

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={(_, data) => setLinkDialogOpen(data.open)}>
        <DialogSurface>
          <DialogTitle>Insert Link</DialogTitle>
          <DialogBody>
            <DialogContent>
              <Field label="URL">
                <Input
                  value={linkUrl}
                  onChange={(_, data) => setLinkUrl(data.value)}
                  placeholder="https://example.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleInsertLink()}
                />
              </Field>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => { setLinkUrl(''); setLinkDialogOpen(false); }}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleInsertLink}>
              Insert
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>

      {/* Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={(_, data) => setImageDialogOpen(data.open)}>
        <DialogSurface>
          <DialogTitle>Insert Image</DialogTitle>
          <DialogBody>
            <DialogContent>
              <Field label="Image URL">
                <Input
                  value={imageUrl}
                  onChange={(_, data) => setImageUrl(data.value)}
                  placeholder="https://example.com/image.png"
                  onKeyDown={(e) => e.key === 'Enter' && handleInsertImage()}
                />
              </Field>
            </DialogContent>
          </DialogBody>
          <DialogActions>
            <Button appearance="secondary" onClick={() => { setImageUrl(''); setImageDialogOpen(false); }}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleInsertImage}>
              Insert
            </Button>
          </DialogActions>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
