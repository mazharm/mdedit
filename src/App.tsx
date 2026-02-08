import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  FluentProvider,
  webLightTheme,
  webDarkTheme,
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  Spinner,
  Text,
  Button,
  makeStyles,
  tokens,
  Tooltip,
} from '@fluentui/react-components';
import { ChevronLeft24Regular } from '@fluentui/react-icons';
import { useTeamsContext } from './hooks/useTeamsContext';
import { useAuth } from './hooks/useAuth';
import { SplitPane } from './components/Editor/SplitPane';
import { Toolbar } from './components/Editor/Toolbar';
import { WysiwygEditor } from './components/Editor/WysiwygEditor';
import { MarkdownEditor } from './components/Editor/MarkdownEditor';
import { CommentSidebar } from './components/Comments/CommentSidebar';
import { FilePicker } from './components/FileManager/FilePicker';
import { SignInDialog } from './components/Auth/SignInDialog';
import { useCommentStore } from './stores/commentStore';
import { useFileStore } from './stores/fileStore';
import { extractCommentsFromMarkdown, embedCommentsInMarkdown } from './utils/markdown';
import { saveFile } from './services/oneDriveService';
import { extractKnownAuthors } from './services/localPeopleService';
import type { FSAFileHandle } from './components/FileManager/FilePicker';
import type { WysiwygEditorRef, MarkdownEditorRef } from './stores/editorStore';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  editorArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebar: {
    width: '320px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  sidebarCollapsed: {
    width: '40px',
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '8px',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px',
  },
  error: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    gap: '16px',
    padding: '32px',
    textAlign: 'center',
  },
});

type ViewMode = 'wysiwyg' | 'split' | 'markdown';

function AppContent() {
  const styles = useStyles();
  const { isInitialized, initError } = useTeamsContext();
  const {
    user,
    isAuthenticated,
    capabilities,
    activeProvider,
    isInTeams,
    getToken,
    signInWithMicrosoft,
    signInWithGoogle,
    signOut,
  } = useAuth();

  const [viewMode, setViewMode] = useState<ViewMode>('wysiwyg');
  const [showComments, setShowComments] = useState(true);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [filePickerMode, setFilePickerMode] = useState<'open' | 'save'>('open');
  const [showSignInDialog, setShowSignInDialog] = useState(false);
  const isUpdatingRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [markdown, setMarkdown] = useState('');
  const [localFileHandle, setLocalFileHandle] = useState<FSAFileHandle | null>(null);
  const [focusCommentId, setFocusCommentId] = useState<string | null>(null);

  const wysiwygRef = useRef<WysiwygEditorRef>(null);
  const markdownRef = useRef<MarkdownEditorRef>(null);

  const { comments, loadComments, setCurrentUser } = useCommentStore();
  const { currentFile, setCurrentFile, isDirty, setIsDirty } = useFileStore();

  // Derive local authors from comments for @mention fallback
  const localAuthors = useMemo(() => {
    return extractKnownAuthors(Object.values(comments));
  }, [comments]);

  // Set current user when authenticated
  useEffect(() => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.displayName,
        email: user.mail || user.userPrincipalName,
        avatar: user.avatar,
        provider: user.provider,
      });
    }
  }, [user, setCurrentUser]);

  // Handle WYSIWYG editor changes
  const handleWysiwygChange = useCallback(
    (newMarkdown: string) => {
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;
      setMarkdown(newMarkdown);
      if (markdownRef.current) {
        markdownRef.current.setContent(newMarkdown);
      }
      setIsDirty(true);
      isUpdatingRef.current = false;
    },
    [setIsDirty]
  );

  // Handle Markdown editor changes
  const handleMarkdownChange = useCallback(
    (newMarkdown: string) => {
      if (isUpdatingRef.current) return;
      isUpdatingRef.current = true;
      setMarkdown(newMarkdown);
      if (wysiwygRef.current) {
        wysiwygRef.current.setMarkdown(newMarkdown);
      }
      setIsDirty(true);
      isUpdatingRef.current = false;
    },
    [setIsDirty]
  );

  // Handle file open
  const handleFileOpen = useCallback(
    (content: string, fileName: string, filePath: string, fileId?: string, fileHandle?: FSAFileHandle) => {
      const { markdown: cleanMarkdown, comments: fileComments } = extractCommentsFromMarkdown(content);
      setMarkdown(cleanMarkdown);

      // Update both editors
      if (wysiwygRef.current) {
        wysiwygRef.current.setMarkdown(cleanMarkdown);
      }
      if (markdownRef.current) {
        markdownRef.current.setContent(cleanMarkdown);
      }

      loadComments(fileComments);
      setCurrentFile({
        name: fileName,
        path: filePath,
        id: fileId,
        source: fileId ? 'onedrive' : (fileHandle ? 'local' : undefined)
      });
      setLocalFileHandle(fileHandle || null);
      setIsDirty(false);
      setShowFilePicker(false);
    },
    [loadComments, setCurrentFile, setIsDirty]
  );

  // Get content for saving
  const getContentForSave = useCallback(() => {
    const commentsArray = Object.values(comments);
    return embedCommentsInMarkdown(markdown, commentsArray);
  }, [markdown, comments]);

  // Handle direct save (save to current file)
  const handleSaveFile = useCallback(async () => {
    // Get fresh state from store to avoid stale closure
    const file = useFileStore.getState().currentFile;
    const content = getContentForSave();

    // Try to save to OneDrive (only if Microsoft auth and OneDrive capable)
    if (file?.id && file.source === 'onedrive' && isAuthenticated && capabilities.canUseOneDrive) {
      setIsSaving(true);
      try {
        await saveFile(getToken, file.id, content);
        useFileStore.getState().setIsDirty(false);
        return;
      } catch (err) {
        console.error('Failed to save to OneDrive:', err);
      } finally {
        setIsSaving(false);
      }
    }

    // Try to save to local file using File System Access API
    if (localFileHandle && file?.source === 'local') {
      setIsSaving(true);
      try {
        const writable = await localFileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        useFileStore.getState().setIsDirty(false);
        return;
      } catch (err) {
        console.error('Failed to save local file:', err);
      } finally {
        setIsSaving(false);
      }
    }

    // No valid file to save to - open Save As dialog
    setFilePickerMode('save');
    setShowFilePicker(true);
  }, [isAuthenticated, capabilities.canUseOneDrive, getToken, getContentForSave, localFileHandle]);

  // Keyboard shortcut: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveFile]);

  // Warn about unsaved changes before closing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (useFileStore.getState().isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Handle Save As
  const handleSaveAsFile = useCallback(() => {
    setFilePickerMode('save');
    setShowFilePicker(true);
  }, []);

  // Handle new file
  const handleNewFile = useCallback(() => {
    setMarkdown('');
    if (wysiwygRef.current) {
      wysiwygRef.current.setMarkdown('');
    }
    if (markdownRef.current) {
      markdownRef.current.setContent('');
    }
    loadComments([]);
    setCurrentFile(null);
    setLocalFileHandle(null);
    setIsDirty(false);
  }, [loadComments, setCurrentFile, setIsDirty]);

  // Handle comment click (scroll to comment in editor)
  const handleCommentClick = useCallback(
    (commentId: string) => {
      if (wysiwygRef.current) {
        wysiwygRef.current.scrollToComment(commentId);
      }
    },
    []
  );

  // Handle comment deletion (remove mark from editor + sync markdown)
  const handleCommentDelete = useCallback(
    (commentId: string) => {
      if (wysiwygRef.current) {
        wysiwygRef.current.removeComment(commentId);
      }
    },
    []
  );

  // Handle comment resolve (update mark in editor)
  const handleCommentResolve = useCallback(
    (commentId: string) => {
      if (wysiwygRef.current) {
        wysiwygRef.current.resolveComment(commentId);
      }
    },
    []
  );

  // Handle comment unresolve (update mark in editor)
  const handleCommentUnresolve = useCallback(
    (commentId: string) => {
      if (wysiwygRef.current) {
        wysiwygRef.current.unresolveComment(commentId);
      }
    },
    []
  );

  // Handle add comment from selection or current word
  const handleAddComment = useCallback(() => {
    if (wysiwygRef.current) {
      // Try to get selection or the word at cursor position
      const selection = wysiwygRef.current.getSelectionOrWord();
      if (selection && selection.text) {
        const comment = useCommentStore.getState().create({
          quotedText: selection.text,
        });
        // Pass from/to positions to restore selection before applying mark
        wysiwygRef.current.addComment(comment.id, selection.from, selection.to);
        // Ensure sidebar is visible and focus the new comment for editing
        setShowComments(true);
        setFocusCommentId(comment.id);
      }
    }
  }, []);

  // Open sign-in dialog
  const handleOpenSignIn = useCallback(() => {
    setShowSignInDialog(true);
  }, []);

  // Loading state
  if (!isInitialized) {
    return (
      <div className={styles.loading}>
        <Spinner size="large" />
        <Text>Initializing...</Text>
      </div>
    );
  }

  // Error state
  if (initError) {
    return (
      <div className={styles.error}>
        <Text size={500} weight="semibold">
          Failed to initialize
        </Text>
        <Text>{initError}</Text>
        <Button appearance="primary" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Toolbar
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewFile={handleNewFile}
        onOpenFile={() => { setFilePickerMode('open'); setShowFilePicker(true); }}
        onSaveFile={handleSaveFile}
        onSaveAsFile={handleSaveAsFile}
        isSaving={isSaving}
        isAuthenticated={isAuthenticated}
        user={user}
        onSignIn={handleOpenSignIn}
        onSignOut={signOut}
        activeProvider={activeProvider}
        isInTeams={isInTeams}
        currentFile={currentFile}
        isDirty={isDirty}
        hasFileHandle={!!localFileHandle || !!currentFile?.id}
        wysiwygRef={wysiwygRef}
      />

      <div className={styles.main}>
        <div className={styles.editorArea}>
          <SplitPane
            viewMode={viewMode}
            leftPane={<WysiwygEditor ref={wysiwygRef} onChange={handleWysiwygChange} onAddComment={handleAddComment} />}
            rightPane={<MarkdownEditor ref={markdownRef} onChange={handleMarkdownChange} />}
          />
        </div>

        {showComments ? (
          <div className={styles.sidebar}>
            <CommentSidebar
              onCommentClick={handleCommentClick}
              onCommentDelete={handleCommentDelete}
              onCommentResolve={handleCommentResolve}
              onCommentUnresolve={handleCommentUnresolve}
              isAuthenticated={isAuthenticated}
              getToken={getToken}
              onCollapse={() => setShowComments(false)}
              capabilities={capabilities}
              localAuthors={localAuthors}
              isInTeams={isInTeams}
              focusCommentId={focusCommentId}
              onFocusHandled={() => setFocusCommentId(null)}
            />
          </div>
        ) : (
          <div className={styles.sidebarCollapsed}>
            <Tooltip content="Show comments" relationship="label">
              <Button
                icon={<ChevronLeft24Regular />}
                appearance="subtle"
                size="small"
                onClick={() => setShowComments(true)}
              />
            </Tooltip>
          </div>
        )}
      </div>

      <FilePicker
        open={showFilePicker}
        onOpenChange={setShowFilePicker}
        onFileOpen={handleFileOpen}
        onFileSave={getContentForSave}
        getToken={getToken}
        isAuthenticated={isAuthenticated}
        currentFile={currentFile}
        initialMode={filePickerMode}
        capabilities={capabilities}
      />

      <SignInDialog
        open={showSignInDialog}
        onOpenChange={setShowSignInDialog}
        onSignInWithMicrosoft={signInWithMicrosoft}
        onSignInWithGoogle={signInWithGoogle}
        googleEnabled={!!GOOGLE_CLIENT_ID && !isInTeams}
      />
    </div>
  );
}

export default function App() {
  const { context, theme } = useTeamsContext();

  // Determine Fluent UI theme based on Teams theme
  const getFluentTheme = () => {
    if (!context) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? webDarkTheme : webLightTheme;
    }

    switch (theme) {
      case 'dark':
        return teamsDarkTheme;
      case 'contrast':
        return teamsHighContrastTheme;
      default:
        return teamsLightTheme;
    }
  };

  return (
    <FluentProvider theme={getFluentTheme()}>
      <AppContent />
    </FluentProvider>
  );
}
