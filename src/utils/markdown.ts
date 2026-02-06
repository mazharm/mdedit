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
 * Convert markdown to HTML, handling comment markers and special syntax
 */
export function markdownToHtml(markdown: string): string {
  // Pre-process: Convert comment markers to spans
  let processed = markdown.replace(
    /<!--MDEDIT_COMMENT_START:([^>]+)-->([\s\S]*?)<!--MDEDIT_COMMENT_END:\1-->/g,
    (_match, id, content) => {
      return `<span data-comment-id="${id}" class="comment-highlight">${content}</span>`;
    }
  );

  // Pre-process: Convert mermaid code blocks to divs
  // Handle various formats: ```mermaid, ``` mermaid, with/without trailing newline
  // Add placeholder content so turndown doesn't skip empty divs
  processed = processed.replace(
    /```\s*mermaid\s*\n([\s\S]*?)\n?```/gi,
    (_match, code) => {
      // Only escape quotes for HTML attribute
      const escapedCode = code.trim().replace(/"/g, '&quot;');
      return `<div data-type="mermaid" data-code="${escapedCode}">mermaid</div>`;
    }
  );

  // Pre-process: Handle task list items
  processed = processed.replace(
    /^- \[([ xX])\] (.*)$/gm,
    (_match, checked, content) => {
      const isChecked = checked.toLowerCase() === 'x';
      return `<li data-type="taskItem" data-checked="${isChecked}">${content}</li>`;
    }
  );

  // Convert markdown to HTML
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
    const comments = JSON.parse(commentsJson);

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
