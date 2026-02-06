import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import React from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import mermaid from 'mermaid';

// Initialize mermaid
let mermaidInitialized = false;
function initMermaid() {
  if (mermaidInitialized) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'strict', // Use strict mode to prevent XSS attacks
    fontFamily: 'inherit',
  });
  mermaidInitialized = true;
}

// Sanitize SVG by stripping <script> tags and event handler attributes
function sanitizeSvg(svg: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');

  // Remove all script elements
  doc.querySelectorAll('script').forEach((el) => el.remove());

  // Remove event handler attributes (onclick, onload, onerror, etc.)
  const allElements = doc.querySelectorAll('*');
  allElements.forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    }
    // Remove javascript: URLs from href/xlink:href
    const href = el.getAttribute('href') || el.getAttribute('xlink:href');
    if (href && href.trim().toLowerCase().startsWith('javascript:')) {
      el.removeAttribute('href');
      el.removeAttribute('xlink:href');
    }
  });

  return new XMLSerializer().serializeToString(doc.documentElement);
}

export interface MermaidBlockOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaidBlock: {
      insertMermaid: (code?: string) => ReturnType;
    };
  }
}

// Generate unique IDs for mermaid diagrams
let mermaidCounter = 0;
function getMermaidId(): string {
  return `mermaid-${Date.now()}-${++mermaidCounter}`;
}

// Mermaid NodeView Component
function MermaidComponent({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const [isEditing, setIsEditing] = React.useState(!node.attrs.code);
  const [error, setError] = React.useState<string | null>(null);
  const [svg, setSvg] = React.useState<string>('');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const code = node.attrs.code || '';

  // Render mermaid diagram
  React.useEffect(() => {
    if (isEditing || !code) return;

    initMermaid();

    const renderDiagram = async () => {
      try {
        const id = getMermaidId();
        const { svg: renderedSvg } = await mermaid.render(id, code);
        setSvg(sanitizeSvg(renderedSvg));
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to render diagram');
        setSvg('');
      }
    };

    renderDiagram();
  }, [code, isEditing]);

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      // Insert tab character
      textarea.value = value.substring(0, start) + '  ' + value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 2;

      updateAttributes({ code: textarea.value });
    }
  };

  const handleSave = () => {
    if (textareaRef.current) {
      updateAttributes({ code: textareaRef.current.value });
    }
    setIsEditing(false);
  };

  return (
    <NodeViewWrapper className="mermaid-block" data-type="mermaid">
      <div className="mermaid-toolbar">
        {isEditing ? (
          <button onClick={handleSave} className="mermaid-btn">
            Preview
          </button>
        ) : (
          <button onClick={() => setIsEditing(true)} className="mermaid-btn">
            Edit
          </button>
        )}
        <button onClick={deleteNode} className="mermaid-btn mermaid-btn-danger">
          Delete
        </button>
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          className="mermaid-source"
          defaultValue={code}
          onChange={(e) => updateAttributes({ code: e.target.value })}
          onKeyDown={handleKeyDown}
          placeholder="Enter mermaid diagram code..."
        />
      ) : (
        <div className="mermaid-preview">
          {error ? (
            <div className="mermaid-error">{error}</div>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          )}
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const MermaidBlock = Node.create<MermaidBlockOptions>({
  name: 'mermaidBlock',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-code') || '',
        renderHTML: (attributes) => {
          return {
            'data-code': attributes.code,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'mermaid',
      }),
      'mermaid-placeholder', // Content so turndown doesn't skip this empty div
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent);
  },

  addCommands() {
    return {
      insertMermaid:
        (code?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              code: code || 'graph TD\n  A[Start] --> B[End]',
            },
          });
        },
    };
  },
});
