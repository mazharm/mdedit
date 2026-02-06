/**
 * Editor type definitions
 *
 * These interfaces define the imperative handle APIs for the WYSIWYG and Markdown editors.
 * The actual refs are managed by components using React's useRef hook.
 */

export interface WysiwygEditorRef {
  setMarkdown: (markdown: string) => void;
  getMarkdown: () => string;
  addComment: (id: string, from?: number, to?: number) => void;
  getSelectionOrWord: () => { text: string; from: number; to: number } | null;
  getCursorPosition: () => number | null;
  removeComment: (id: string) => void;
  resolveComment: (id: string) => void;
  unresolveComment: (id: string) => void;
  scrollToComment: (id: string) => void;
  getSelection: () => { text: string; from: number; to: number } | null;
  executeCommand: (command: string, options?: unknown) => void;
  focus: () => void;
}

export interface MarkdownEditorRef {
  setContent: (content: string) => void;
  getContent: () => string;
  focus: () => void;
}
