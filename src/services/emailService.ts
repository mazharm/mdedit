import type { GetTokenFn } from './graphService';
import { graphPost } from './graphService';
import type { Author } from '../stores/commentStore';

interface CommentNotification {
  quotedText?: string;
  commentText: string;
  author: Author;
  mentions?: Author[];
  assignedTo?: Author | null;
  parentCommentText?: string;
  documentName: string;
}

export async function sendCommentNotification(
  getToken: GetTokenFn,
  notification: CommentNotification
): Promise<void> {
  const recipients: { emailAddress: { address: string; name: string } }[] = [];

  if (notification.mentions) {
    for (const person of notification.mentions) {
      if (person.email) {
        recipients.push({
          emailAddress: { address: person.email, name: person.name },
        });
      }
    }
  }

  if (notification.assignedTo?.email) {
    const already = recipients.some(
      (r) => r.emailAddress.address === notification.assignedTo!.email
    );
    if (!already) {
      recipients.push({
        emailAddress: {
          address: notification.assignedTo.email,
          name: notification.assignedTo.name,
        },
      });
    }
  }

  if (recipients.length === 0) return;

  const subject = `Comment on "${notification.documentName}"`;

  let body = '';
  if (notification.parentCommentText) {
    body += `<p>Reply to: <em>${escapeHtml(notification.parentCommentText)}</em></p>`;
  }
  if (notification.quotedText) {
    body += `<blockquote>${escapeHtml(notification.quotedText)}</blockquote>`;
  }
  body += `<p><strong>${escapeHtml(notification.author.name)}</strong>: ${escapeHtml(notification.commentText)}</p>`;

  await graphPost(getToken, '/me/sendMail', {
    message: {
      subject,
      body: { contentType: 'HTML', content: body },
      toRecipients: recipients,
    },
  });
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
