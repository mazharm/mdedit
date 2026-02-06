import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import { makeStyles, tokens, Divider } from '@fluentui/react-components';
import { Comment24Regular } from '@fluentui/react-icons';
import { CommentMark } from '../../extensions/CommentMark';
import { MermaidBlock } from '../../extensions/MermaidBlock';
import { markdownToHtml, htmlToMarkdown } from '../../utils/markdown';
import type { WysiwygEditorRef } from '../../stores/editorStore';

const lowlight = createLowlight(common);

const useStyles = makeStyles({
  container: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: tokens.colorNeutralBackground1,
    position: 'relative',
  },
  editor: {
    height: '100%',
    '& .ProseMirror': {
      minHeight: '100%',
      outline: 'none',
      padding: '1rem',
    },
  },
  contextMenuBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 9998,
  },
  contextMenu: {
    position: 'fixed',
    zIndex: 9999,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow16,
    padding: '4px 0',
    minWidth: '180px',
  },
  contextMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    color: tokens.colorNeutralForeground1,
    border: 'none',
    background: 'none',
    width: '100%',
    textAlign: 'left',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  contextMenuIcon: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
    width: '20px',
    height: '20px',
    fontSize: '16px',
  },
  spellSuggestion: {
    fontWeight: 600,
    color: tokens.colorBrandForeground1,
  },
  divider: {
    margin: '4px 0',
  },
});

interface WysiwygEditorProps {
  onChange?: (markdown: string) => void;
  onAddComment?: () => void;
}

interface SelectionState {
  text: string;
  from: number;
  to: number;
}

interface SpellSuggestion {
  word: string;
  from: number;
  to: number;
}

export const WysiwygEditor = forwardRef<WysiwygEditorRef, WysiwygEditorProps>(
  ({ onChange, onAddComment }, ref) => {
    const styles = useStyles();
    const lastSelectionRef = useRef<SelectionState | null>(null);
    const [contextMenuOpen, setContextMenuOpen] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
    const [misspelledWord, setMisspelledWord] = useState<SpellSuggestion | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          codeBlock: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            rel: 'noopener noreferrer',
            target: '_blank',
          },
        }),
        Image.configure({
          allowBase64: true,
          HTMLAttributes: {
            class: 'editor-image',
          },
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableCell,
        TableHeader,
        TaskList,
        TaskItem.configure({
          nested: true,
          HTMLAttributes: {
            class: 'task-item',
          },
        }),
        Placeholder.configure({
          placeholder: 'Start writing...',
        }),
        CodeBlockLowlight.configure({
          lowlight,
        }),
        CommentMark,
        MermaidBlock,
      ],
      content: '',
      editorProps: {
        attributes: {
          spellcheck: 'true',
        },
      },
      onUpdate: ({ editor }) => {
        if (onChange) {
          const html = editor.getHTML();
          const markdown = htmlToMarkdown(html);
          onChange(markdown);
        }
      },
      onSelectionUpdate: ({ editor }) => {
        const { from, to } = editor.state.selection;
        if (from !== to) {
          const text = editor.state.doc.textBetween(from, to, '\n');
          lastSelectionRef.current = { text, from, to };
        }
      },
    });

    // Detect if the right-clicked element is a misspelled word
    const detectMisspelledWord = useCallback((target: HTMLElement): SpellSuggestion | null => {
      if (!editor) return null;

      // Check if the clicked element or its parent has a spellcheck error
      // Browsers mark misspelled words with a red underline via the native spellchecker
      // We can detect this by checking if the target is inside the editor and
      // looking at the word at the click position

      // Get the word under the cursor from the editor's ProseMirror state
      const editorView = editor.view;
      const pos = editorView.posAtDOM(target, 0);
      if (pos === undefined || pos < 0) return null;

      const $pos = editor.state.doc.resolve(pos);
      const node = $pos.parent;
      if (!node.isTextblock) return null;

      const textContent = node.textContent;
      const offset = $pos.parentOffset;

      // Find word boundaries
      let wordStart = offset;
      while (wordStart > 0 && !/\s/.test(textContent[wordStart - 1])) {
        wordStart--;
      }
      let wordEnd = offset;
      while (wordEnd < textContent.length && !/\s/.test(textContent[wordEnd])) {
        wordEnd++;
      }

      if (wordStart === wordEnd) return null;

      const word = textContent.slice(wordStart, wordEnd);
      const absoluteStart = $pos.start() + wordStart;
      const absoluteEnd = $pos.start() + wordEnd;

      return { word, from: absoluteStart, to: absoluteEnd };
    }, [editor]);

    // Handle right-click context menu
    const handleContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Detect misspelled word at click position
      const spell = detectMisspelledWord(e.target as HTMLElement);
      setMisspelledWord(spell);

      // Position the menu, clamping to viewport
      const x = Math.min(e.clientX, window.innerWidth - 200);
      const y = Math.min(e.clientY, window.innerHeight - 200);
      setContextMenuPosition({ x, y });
      setContextMenuOpen(true);
    }, [detectMisspelledWord]);

    // Close context menu
    const closeContextMenu = useCallback(() => {
      setContextMenuOpen(false);
      setMisspelledWord(null);
    }, []);

    // Handle add comment from context menu
    const handleContextMenuAddComment = useCallback(() => {
      closeContextMenu();
      if (onAddComment) {
        // Small delay to let the menu close before processing
        requestAnimationFrame(() => {
          onAddComment();
        });
      }
    }, [onAddComment, closeContextMenu]);

    // Handle replacing misspelled word with a suggestion (delete the word)
    const handleDeleteWord = useCallback(() => {
      if (!editor || !misspelledWord) return;
      editor.chain()
        .focus()
        .setTextSelection({ from: misspelledWord.from, to: misspelledWord.to })
        .deleteSelection()
        .run();
      closeContextMenu();
    }, [editor, misspelledWord, closeContextMenu]);

    // Handle ignoring the misspelled word
    const handleIgnoreSpelling = useCallback(() => {
      closeContextMenu();
    }, [closeContextMenu]);

    // Keep stored selection when editor blurs
    useEffect(() => {
      if (!editor) return;
      const handleBlur = () => {
        // Keep the last selection when blur happens
      };
      editor.on('blur', handleBlur);
      return () => {
        editor.off('blur', handleBlur);
      };
    }, [editor]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        setMarkdown: (markdown: string) => {
          if (editor) {
            const html = markdownToHtml(markdown);
            editor.commands.setContent(html, false);
          }
        },
        getMarkdown: () => {
          if (editor) {
            const html = editor.getHTML();
            return htmlToMarkdown(html);
          }
          return '';
        },
        addComment: (id: string, from?: number, to?: number) => {
          if (editor) {
            if (from !== undefined && to !== undefined) {
              editor.chain().focus().setTextSelection({ from, to }).setComment(id).run();
            } else {
              editor.chain().focus().setComment(id).run();
            }
          }
        },
        removeComment: (id: string) => {
          if (editor) {
            editor.commands.removeCommentMark(id);
          }
        },
        resolveComment: (id: string) => {
          if (editor) {
            editor.commands.resolveComment(id);
          }
        },
        unresolveComment: (id: string) => {
          if (editor) {
            editor.commands.unresolveComment(id);
          }
        },
        scrollToComment: (id: string) => {
          if (editor) {
            const { doc } = editor.state;
            let targetPos: number | null = null;

            doc.descendants((node, pos) => {
              node.marks.forEach((mark) => {
                if (mark.type.name === 'commentMark' && mark.attrs.commentId === id) {
                  targetPos = pos;
                }
              });
            });

            if (targetPos !== null) {
              editor.commands.setTextSelection(targetPos);
              editor.commands.scrollIntoView();

              const commentElement = document.querySelector(
                `[data-comment-id="${id}"]`
              );
              if (commentElement) {
                commentElement.classList.add('active');
                setTimeout(() => {
                  commentElement.classList.remove('active');
                }, 2000);
              }
            }
          }
        },
        getSelection: () => {
          if (editor) {
            const { from, to } = editor.state.selection;
            if (from !== to) {
              const text = editor.state.doc.textBetween(from, to, '\n');
              return { text, from, to };
            }
            return lastSelectionRef.current;
          }
          return lastSelectionRef.current;
        },
        getSelectionOrWord: () => {
          if (!editor) return null;

          const { from, to } = editor.state.selection;

          if (from !== to) {
            const text = editor.state.doc.textBetween(from, to, '\n');
            return { text, from, to };
          }

          if (lastSelectionRef.current) {
            return lastSelectionRef.current;
          }

          const $pos = editor.state.doc.resolve(from);
          const node = $pos.parent;
          if (!node.isTextblock) return null;

          const textContent = node.textContent;
          const offset = $pos.parentOffset;

          let wordStart = offset;
          while (wordStart > 0 && !/\s/.test(textContent[wordStart - 1])) {
            wordStart--;
          }
          let wordEnd = offset;
          while (wordEnd < textContent.length && !/\s/.test(textContent[wordEnd])) {
            wordEnd++;
          }

          if (wordStart === wordEnd) return null;

          const word = textContent.slice(wordStart, wordEnd);
          const absoluteStart = $pos.start() + wordStart;
          const absoluteEnd = $pos.start() + wordEnd;

          return { text: word, from: absoluteStart, to: absoluteEnd };
        },
        getCursorPosition: () => {
          if (editor) {
            const { from } = editor.state.selection;
            return from;
          }
          return null;
        },
        executeCommand: (command: string, options?: unknown) => {
          if (!editor) return;

          switch (command) {
            case 'bold':
              editor.chain().focus().toggleBold().run();
              break;
            case 'italic':
              editor.chain().focus().toggleItalic().run();
              break;
            case 'underline':
              editor.chain().focus().toggleUnderline().run();
              break;
            case 'strike':
              editor.chain().focus().toggleStrike().run();
              break;
            case 'code':
              editor.chain().focus().toggleCode().run();
              break;
            case 'codeBlock':
              editor.chain().focus().toggleCodeBlock().run();
              break;
            case 'bulletList':
              editor.chain().focus().toggleBulletList().run();
              break;
            case 'orderedList':
              editor.chain().focus().toggleOrderedList().run();
              break;
            case 'taskList':
              editor.chain().focus().toggleTaskList().run();
              break;
            case 'blockquote':
              editor.chain().focus().toggleBlockquote().run();
              break;
            case 'heading': {
              const level = (options as { level?: number })?.level || 1;
              editor
                .chain()
                .focus()
                .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
                .run();
              break;
            }
            case 'horizontalRule':
              editor.chain().focus().setHorizontalRule().run();
              break;
            case 'link': {
              const url = (options as { url?: string })?.url;
              if (url) {
                editor.chain().focus().setLink({ href: url }).run();
              } else {
                editor.chain().focus().unsetLink().run();
              }
              break;
            }
            case 'image': {
              const src = (options as { src?: string })?.src;
              if (src) {
                editor.chain().focus().setImage({ src }).run();
              }
              break;
            }
            case 'table':
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run();
              break;
            case 'mermaid': {
              const mermaidCode = (options as { code?: string })?.code;
              editor.chain().focus().insertMermaid(mermaidCode).run();
              break;
            }
            case 'undo':
              editor.chain().focus().undo().run();
              break;
            case 'redo':
              editor.chain().focus().redo().run();
              break;
          }
        },
        focus: () => {
          editor?.commands.focus();
        },
      }),
      [editor]
    );

    return (
      <div
        ref={containerRef}
        className={styles.container}
        onContextMenu={handleContextMenu}
      >
        <EditorContent editor={editor} className={styles.editor} />

        {/* Custom Context Menu */}
        {contextMenuOpen && (
          <>
            {/* Invisible backdrop to catch clicks outside */}
            <div
              className={styles.contextMenuBackdrop}
              onClick={closeContextMenu}
              onContextMenu={(e) => { e.preventDefault(); closeContextMenu(); }}
            />
            <div
              className={styles.contextMenu}
              style={{ left: contextMenuPosition.x, top: contextMenuPosition.y }}
            >
              {/* Misspelled word section */}
              {misspelledWord && (
                <>
                  <div style={{ padding: '4px 12px', fontSize: '12px', color: tokens.colorNeutralForeground3 }}>
                    "{misspelledWord.word}"
                  </div>
                  <button
                    className={styles.contextMenuItem}
                    onClick={handleDeleteWord}
                  >
                    <span className={styles.contextMenuIcon}>✕</span>
                    Delete word
                  </button>
                  <button
                    className={styles.contextMenuItem}
                    onClick={handleIgnoreSpelling}
                  >
                    <span className={styles.contextMenuIcon}>→</span>
                    Ignore
                  </button>
                  <Divider className={styles.divider} />
                </>
              )}

              {/* Add Comment */}
              <button
                className={styles.contextMenuItem}
                onClick={handleContextMenuAddComment}
              >
                <span className={styles.contextMenuIcon}>
                  <Comment24Regular style={{ fontSize: '16px' }} />
                </span>
                Add Comment
              </button>
            </div>
          </>
        )}
      </div>
    );
  }
);

WysiwygEditor.displayName = 'WysiwygEditor';
