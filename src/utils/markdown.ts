import { marked } from 'marked';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import type { Comment } from '../stores/commentStore';

// Configure marked for GFM
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Create Turndown instance
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  fence: '```',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
});

// Add GFM support
turndownService.use(gfm);

// Custom rule for comment marks
turndownService.addRule('commentMark', {
  filter: (node) => {
    return (
      node.nodeName === 'SPAN' &&
      node.hasAttribute('data-comment-id')
    );
  },
  replacement: (content, node) => {
    const element = node as HTMLElement;
    const commentId = element.getAttribute('data-comment-id');
    return `<!--MDEDIT_COMMENT_START:${commentId}-->${content}<!--MDEDIT_COMMENT_END:${commentId}-->`;
  },
});

// Custom rule for mermaid blocks
turndownService.addRule('mermaidBlock', {
  filter: (node) => {
    return node.nodeName === 'DIV' &&
      (node as HTMLElement).getAttribute('data-type') === 'mermaid';
  },
  replacement: (_content, node) => {
    const element = node as HTMLElement;
    const code = element.getAttribute('data-code') || '';
    return `\n\`\`\`mermaid\n${code}\n\`\`\`\n`;
  },
});

// Custom rule for task list items
turndownService.addRule('taskListItem', {
  filter: (node) => {
    return (
      node.nodeName === 'LI' &&
      (node as HTMLElement).getAttribute('data-type') === 'taskItem'
    );
  },
  replacement: (content, node) => {
    const element = node as HTMLElement;
    const checked = element.getAttribute('data-checked') === 'true';
    return `- [${checked ? 'x' : ' '}] ${content.trim()}\n`;
  },
});

// Custom rule for underline
turndownService.addRule('underline', {
  filter: ['u'],
  replacement: (content) => `<u>${content}</u>`,
});

/**
 * Escape a string for safe use in an HTML attribute value.
 * Also encodes newlines so the attribute stays on a single line
 * (required for marked's HTML block parser to handle the tag correctly).
 */
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;')
    .replace(/\r/g, '&#13;');
}

/**
 * Apply a transform function only to text segments outside fenced code blocks.
 * Code blocks are returned as-is so that preprocessing regexes don't modify
 * content inside ``` ... ``` regions.
 */
function transformOutsideCodeBlocks(
  text: string,
  transform: (segment: string) => string
): string {
  const result: string[] = [];
  // Match fenced code blocks: opening ``` (with optional language) through closing ```
  const codeBlockRegex = /^(`{3,})([^\n]*)\n([\s\S]*?)\n\1\s*$/gm;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Transform non-code segment before this code block
    if (match.index > lastIndex) {
      result.push(transform(text.slice(lastIndex, match.index)));
    }
    // Keep code block as-is
    result.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // Transform remaining non-code segment
  if (lastIndex < text.length) {
    result.push(transform(text.slice(lastIndex)));
  }

  return result.join('');
}

/**
 * Convert markdown to HTML, handling comment markers and special syntax
 */
export function markdownToHtml(markdown: string): string {
  // Step 1: Convert mermaid code blocks to divs (targets ```mermaid specifically)
  let processed = markdown.replace(
    /```\s*mermaid\s*\n([\s\S]*?)\n?```/gi,
    (_match, code) => {
      // Escape all HTML-special chars so <br/>, <|-- etc. in mermaid code
      // don't break the HTML parser when placed inside an attribute
      const escapedCode = escapeHtmlAttr(code.trim());
      return `<div data-type="mermaid" data-code="${escapedCode}">mermaid</div>`;
    }
  );

  // Step 2: Apply comment and task preprocessing only outside remaining code blocks
  processed = transformOutsideCodeBlocks(processed, (segment) => {
    // Convert comment markers to spans
    segment = segment.replace(
      /<!--MDEDIT_COMMENT_START:([^>]+)-->([\s\S]*?)<!--MDEDIT_COMMENT_END:\1-->/g,
      (_match, id, content) => {
        const safeId = escapeHtmlAttr(id);
        return `<span data-comment-id="${safeId}" class="comment-highlight">${content}</span>`;
      }
    );

    // Handle task list items
    segment = segment.replace(
      /^- \[([ xX])\] (.*)$/gm,
      (_match, checked, content) => {
        const isChecked = checked.toLowerCase() === 'x';
        return `<li data-type="taskItem" data-checked="${isChecked}">${content}</li>`;
      }
    );

    return segment;
  });

  // Step 3: Convert markdown to HTML
  const html = marked.parse(processed) as string;

  return html;
}

/**
 * Convert HTML to markdown, preserving comment markers and special elements
 */
export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}

/**
 * Extract comment data from markdown
 */
export function extractCommentsFromMarkdown(markdown: string): {
  markdown: string;
  comments: Comment[];
} {
  const commentsMatch = markdown.match(
    /<!--MDEDIT_COMMENTS_DATA\n([\s\S]*?)\nMDEDIT_COMMENTS_DATA-->/
  );

  if (!commentsMatch) {
    return { markdown, comments: [] };
  }

  try {
    const commentsJson = commentsMatch[1];
    // Use a reviver to strip prototype-pollution keys (__proto__, constructor, prototype)
    const comments = JSON.parse(commentsJson, (key, value) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        return undefined;
      }
      return value;
    });

    if (!Array.isArray(comments)) {
      return { markdown, comments: [] };
    }

    // Convert date strings to Date objects
    const processedComments = comments.map((comment: Comment) => ({
      ...comment,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
      resolvedAt: comment.resolvedAt ? new Date(comment.resolvedAt) : null,
      taskDueDate: comment.taskDueDate ? new Date(comment.taskDueDate) : null,
      replies: comment.replies.map((reply: Comment['replies'][0]) => ({
        ...reply,
        createdAt: new Date(reply.createdAt),
      })),
    }));

    // Remove comments data block from markdown
    const cleanMarkdown = markdown
      .replace(/\n*<!--MDEDIT_COMMENTS_DATA\n[\s\S]*?\nMDEDIT_COMMENTS_DATA-->\n*$/, '')
      .trim();

    return { markdown: cleanMarkdown, comments: processedComments };
  } catch (error) {
    console.error('Failed to parse comments data:', error);
    return { markdown, comments: [] };
  }
}

/**
 * Embed comment data in markdown
 */
export function embedCommentsInMarkdown(markdown: string, comments: Comment[]): string {
  if (!comments || comments.length === 0) {
    return markdown;
  }

  // Prepare comments for serialization
  const commentsData = comments.map((comment) => ({
    ...comment,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    resolvedAt: comment.resolvedAt?.toISOString() || null,
    taskDueDate: comment.taskDueDate?.toISOString() || null,
    replies: comment.replies.map((reply) => ({
      ...reply,
      createdAt: reply.createdAt.toISOString(),
    })),
  }));

  const commentsJson = JSON.stringify(commentsData, null, 2);

  return `${markdown.trim()}\n\n<!--MDEDIT_COMMENTS_DATA\n${commentsJson}\nMDEDIT_COMMENTS_DATA-->`;
}

/**
 * Extract all comment IDs from markdown
 */
export function extractCommentIds(markdown: string): string[] {
  const ids: string[] = [];
  const regex = /<!--MDEDIT_COMMENT_START:([^>]+)-->/g;
  let match;

  while ((match = regex.exec(markdown)) !== null) {
    ids.push(match[1]);
  }

  return ids;
}

/**
 * Check if markdown contains any comments
 */
export function hasComments(markdown: string): boolean {
  return /<!--MDEDIT_COMMENT_START:/.test(markdown);
}

/**
 * Remove a specific comment's markers from markdown
 */
export function removeCommentMarkers(markdown: string, commentId: string): string {
  const escapedId = commentId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(
    `<!--MDEDIT_COMMENT_START:${escapedId}-->([\\s\\S]*?)<!--MDEDIT_COMMENT_END:${escapedId}-->`,
    'g'
  );
  return markdown.replace(regex, '$1');
}
