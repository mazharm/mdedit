import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { oneDark } from '@codemirror/theme-one-dark';
import { makeStyles } from '@fluentui/react-components';
import type { MarkdownEditorRef } from '../../stores/editorStore';

const useStyles = makeStyles({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#282c34', // One Dark background
    display: 'flex',
    flexDirection: 'column',
  },
  editor: {
    flex: 1,
    overflow: 'auto',
    '& .cm-editor': {
      height: '100%',
    },
    '& .cm-scroller': {
      fontFamily: "'Consolas', 'Monaco', 'Andale Mono', 'Ubuntu Mono', monospace",
      fontSize: '14px',
      lineHeight: '1.6',
    },
    '& .cm-content': {
      padding: '1rem',
    },
  },
});

interface MarkdownEditorProps {
  onChange?: (content: string) => void;
}

export const MarkdownEditor = forwardRef<MarkdownEditorRef, MarkdownEditorProps>(
  ({ onChange }, ref) => {
    const styles = useStyles();
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isUpdatingRef = useRef(false);
    const onChangeRef = useRef(onChange);

    // Keep onChange ref up to date
    useEffect(() => {
      onChangeRef.current = onChange;
    }, [onChange]);

    // Stable callback that uses the ref
    const handleChange = useCallback((content: string) => {
      if (onChangeRef.current) {
        onChangeRef.current(content);
      }
    }, []);

    // Initialize CodeMirror - only run once
    useEffect(() => {
      if (!containerRef.current || viewRef.current) return;

      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged && !isUpdatingRef.current) {
          const content = update.state.doc.toString();
          handleChange(content);
        }
      });

      const extensions: Extension[] = [
        lineNumbers(),
        highlightActiveLine(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
        }),
        syntaxHighlighting(defaultHighlightStyle),
        oneDark,
        EditorView.lineWrapping,
        updateListener,
      ];

      const state = EditorState.create({
        doc: '',
        extensions,
      });

      viewRef.current = new EditorView({
        state,
        parent: containerRef.current,
      });

      return () => {
        viewRef.current?.destroy();
        viewRef.current = null;
      };
    }, [handleChange]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        setContent: (content: string) => {
          if (viewRef.current) {
            isUpdatingRef.current = true;
            const currentContent = viewRef.current.state.doc.toString();

            if (currentContent !== content) {
              viewRef.current.dispatch({
                changes: {
                  from: 0,
                  to: viewRef.current.state.doc.length,
                  insert: content,
                },
              });
            }

            isUpdatingRef.current = false;
          }
        },
        getContent: () => {
          if (viewRef.current) {
            return viewRef.current.state.doc.toString();
          }
          return '';
        },
        focus: () => {
          viewRef.current?.focus();
        },
      }),
      []
    );

    return (
      <div className={styles.container}>
        <div ref={containerRef} className={styles.editor} />
      </div>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';
