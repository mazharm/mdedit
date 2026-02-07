import type { Comment, Author } from '../stores/commentStore';
import type { Person } from './peopleService';

/**
 * Extract unique authors from a set of comments (including reply authors).
 * Returns them as Person objects suitable for @mention search.
 */
export function extractKnownAuthors(comments: Comment[]): Person[] {
  const seen = new Map<string, Person>();

  for (const comment of comments) {
    addAuthor(seen, comment.author);
    for (const reply of comment.replies) {
      addAuthor(seen, reply.author);
    }
    for (const mention of comment.mentions || []) {
      addAuthor(seen, mention);
    }
    if (comment.assignedTo) {
      addAuthor(seen, comment.assignedTo);
    }
  }

  return Array.from(seen.values());
}

function addAuthor(seen: Map<string, Person>, author: Author): void {
  if (author.id === 'anonymous' || seen.has(author.id)) return;
  seen.set(author.id, {
    id: author.id,
    name: author.name,
    email: author.email,
    avatar: author.avatar,
  });
}

/**
 * Search local authors by name or email prefix match.
 */
export function searchLocalAuthors(authors: Person[], query: string): Person[] {
  if (!query || query.length < 1) return [];
  const lower = query.toLowerCase();
  return authors.filter(
    (a) =>
      a.name.toLowerCase().includes(lower) ||
      a.email.toLowerCase().includes(lower)
  );
}
