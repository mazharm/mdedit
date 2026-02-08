import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Avatar,
  Checkbox,
  Tooltip,
  Badge,
} from '@fluentui/react-components';
import {
  Delete24Regular,
  Checkmark24Regular,
  ArrowUndo24Regular,
  Send24Regular,
  TaskListSquareLtr24Regular,
  ChevronRight24Regular,
  PersonAdd24Regular,
  CheckmarkCircle24Regular,
} from '@fluentui/react-icons';
import { people } from '@microsoft/teams-js';
import { useCommentStore, Comment } from '../../stores/commentStore';
import { MentionPicker } from './MentionPicker';
import { createTask } from '../../services/todoService';
import type { Person } from '../../services/peopleService';
import type { GetTokenFn } from '../../services/graphService';
import type { AuthCapabilities } from '../../hooks/useAuth';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  list: {
    flex: 1,
    overflow: 'auto',
    padding: '8px',
  },
  comment: {
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    padding: '12px',
    marginBottom: '8px',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground2Hover,
    },
  },
  commentResolved: {
    opacity: 0.7,
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  commentAuthor: {
    flex: 1,
  },
  commentActions: {
    display: 'flex',
    gap: '4px',
  },
  commentQuote: {
    backgroundColor: tokens.colorNeutralBackground3,
    borderLeft: `3px solid ${tokens.colorBrandBackground}`,
    padding: '8px',
    marginBottom: '8px',
    borderRadius: '0 4px 4px 0',
    fontStyle: 'italic',
    fontSize: '12px',
  },
  commentText: {
    marginBottom: '8px',
    whiteSpace: 'pre-wrap',
  },
  commentMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: tokens.colorNeutralForeground3,
  },
  replies: {
    marginTop: '8px',
    paddingLeft: '16px',
    borderLeft: `2px solid ${tokens.colorNeutralStroke1}`,
  },
  reply: {
    padding: '8px 0',
  },
  replyHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  replyInput: {
    marginTop: '8px',
    display: 'flex',
    gap: '8px',
  },
  editArea: {
    marginBottom: '8px',
  },
  mention: {
    color: tokens.colorBrandForeground1,
    fontWeight: 600,
  },
  taskInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: '8px',
  },
  assignSuggestion: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    marginTop: '4px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '32px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

interface CommentSidebarProps {
  onCommentClick: (id: string) => void;
  onCommentDelete?: (id: string) => void;
  onCommentResolve?: (id: string) => void;
  onCommentUnresolve?: (id: string) => void;
  isAuthenticated: boolean;
  getToken: GetTokenFn;
  onCollapse?: () => void;
  capabilities?: AuthCapabilities;
  localAuthors?: Person[];
  isInTeams?: boolean;
  focusCommentId?: string | null;
  onFocusHandled?: () => void;
}

export function CommentSidebar({
  onCommentClick,
  onCommentDelete,
  onCommentResolve,
  onCommentUnresolve,
  isAuthenticated,
  getToken,
  onCollapse,
  capabilities,
  localAuthors,
  isInTeams = false,
  focusCommentId,
  onFocusHandled,
}: CommentSidebarProps) {
  const styles = useStyles();
  const {
    comments,
    showResolved,
    setShowResolved,
    resolve,
    unresolve,
    delete: deleteComment,
    update,
    addReply,
    completeTask,
    uncompleteTask,
  } = useCommentStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [mentions, setMentions] = useState<Person[]>([]);
  const [replyMentions, setReplyMentions] = useState<Person[]>([]);
  const [assignee, setAssignee] = useState<Person | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // When a new comment is created, auto-enter edit mode and focus
  useEffect(() => {
    if (focusCommentId && comments[focusCommentId]) {
      const comment = comments[focusCommentId];
      setEditingId(comment.id);
      setEditText(comment.text);
      setMentions(comment.mentions || []);
      setAssignee(comment.assignedTo || null);
      // Focus the textarea after render
      requestAnimationFrame(() => {
        editTextareaRef.current?.focus();
      });
      // Clear the focus request so it can be re-triggered
      onFocusHandled?.();
    }
  }, [focusCommentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const commentsArray = Object.values(comments);
  const filteredComments = showResolved
    ? commentsArray
    : commentsArray.filter((c) => !c.resolved);

  const handleCommentClick = useCallback(
    (comment: Comment) => {
      onCommentClick(comment.id);
    },
    [onCommentClick]
  );

  const handleStartEdit = useCallback((comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
    setMentions(comment.mentions || []);
    setAssignee(comment.assignedTo || null);
  }, []);

  const handleSaveEdit = useCallback(
    async (commentId: string) => {
      update(commentId, {
        text: editText,
        mentions,
        assignedTo: assignee,
      });

      // Create task if assignee is set (only for providers with Todo API access)
      if (assignee && isAuthenticated && capabilities?.canUseTodoTasks) {
        try {
          const comment = comments[commentId];
          await createTask(getToken, {
            title: editText.substring(0, 50) || 'Comment task',
            body: comment?.quotedText
              ? `Selected text: "${comment.quotedText}"\n\nComment: ${editText}`
              : editText,
          });
        } catch (error) {
          console.error('Failed to create task:', error);
        }
      }

      setEditingId(null);
      setEditText('');
      setMentions([]);
      setAssignee(null);
    },
    [editText, mentions, assignee, update, comments, isAuthenticated, getToken, capabilities]
  );

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
    setMentions([]);
    setAssignee(null);
  }, []);

  const handleStartReply = useCallback((commentId: string) => {
    setReplyingTo(commentId);
    setReplyText('');
    setReplyMentions([]);
  }, []);

  const handleSendReply = useCallback(
    (commentId: string) => {
      if (replyText.trim()) {
        addReply(commentId, replyText, replyMentions);
        setReplyingTo(null);
        setReplyText('');
        setReplyMentions([]);
      }
    },
    [replyText, replyMentions, addReply]
  );

  const handleMentionSelect = useCallback((person: Person) => {
    setMentions((prev) => [...prev, person]);
  }, []);

  const handleReplyMentionSelect = useCallback((person: Person) => {
    setReplyMentions((prev) => [...prev, person]);
  }, []);

  const handleReplyAndResolve = useCallback(
    (commentId: string) => {
      if (replyText.trim()) {
        addReply(commentId, replyText, replyMentions);
      }
      completeTask(commentId);
      resolve(commentId);
      onCommentResolve?.(commentId);
      setReplyingTo(null);
      setReplyText('');
      setReplyMentions([]);
    },
    [replyText, replyMentions, addReply, completeTask, resolve, onCommentResolve]
  );

  const handleAssign = useCallback(
    async (commentId: string) => {
      if (isInTeams && people.isSupported()) {
        try {
          const selected = await people.selectPeople({ singleSelect: true, title: 'Assign to' });
          if (selected && selected.length > 0) {
            const person = selected[0];
            const assigneeAuthor = {
              id: person.objectId,
              name: person.displayName || 'Unknown',
              email: person.email || '',
            };
            update(commentId, { assignedTo: assigneeAuthor });
          }
        } catch (err) {
          console.error('Teams people picker failed:', err);
        }
      } else {
        // For web: start editing the comment so user can use MentionPicker to set assignee
        const comment = comments[commentId];
        if (comment) {
          handleStartEdit(comment);
        }
      }
    },
    [isInTeams, update, comments, handleStartEdit]
  );

  const dateFormatter = React.useMemo(
    () => new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    []
  );
  const formatDate = (date: Date) => dateFormatter.format(date);

  const renderMentions = (text: string, mentionList: Person[]): React.ReactNode => {
    if (!mentionList?.length) return text;

    // Build a pattern that matches any of the mentions
    const mentionNames = mentionList.map((m) => m.name);
    const escapedNames = mentionNames.map((name) =>
      name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    );
    const pattern = new RegExp(`(@(?:${escapedNames.join('|')}))`, 'g');

    // Split text by mentions and render each part
    const parts = text.split(pattern);
    const mentionSet = new Set(mentionNames.map((n) => `@${n}`));

    return (
      <>
        {parts.map((part, index) =>
          mentionSet.has(part) ? (
            <span key={index} className={styles.mention}>
              {part}
            </span>
          ) : (
            <React.Fragment key={index}>{part}</React.Fragment>
          )
        )}
      </>
    );
  };

  if (filteredComments.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            {onCollapse && (
              <Tooltip content="Hide comments" relationship="label">
                <Button
                  icon={<ChevronRight24Regular />}
                  appearance="subtle"
                  size="small"
                  onClick={onCollapse}
                />
              </Tooltip>
            )}
            <Text weight="semibold">Comments</Text>
            <Badge appearance="filled" color="informative">
              0
            </Badge>
          </div>
          <Checkbox
            label="Show resolved"
            checked={showResolved}
            onChange={(_, data) => setShowResolved(!!data.checked)}
          />
        </div>

        <div className={styles.emptyState}>
          <Text size={400}>No comments yet</Text>
          <Text size={200}>Select text and click "Add comment" to start a discussion</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {onCollapse && (
            <Tooltip content="Hide comments" relationship="label">
              <Button
                icon={<ChevronRight24Regular />}
                appearance="subtle"
                size="small"
                onClick={onCollapse}
              />
            </Tooltip>
          )}
          <Text weight="semibold">Comments</Text>
          <Badge appearance="filled" color="informative">
            {filteredComments.length}
          </Badge>
        </div>
        <Checkbox
          label="Show resolved"
          checked={showResolved}
          onChange={(_, data) => setShowResolved(!!data.checked)}
        />
      </div>

      <div className={styles.list}>
        {filteredComments.map((comment) => (
          <div
            key={comment.id}
            className={`${styles.comment} ${comment.resolved ? styles.commentResolved : ''}`}
            onClick={() => handleCommentClick(comment)}
          >
            <div className={styles.commentHeader}>
              <Avatar
                name={comment.author.name}
                image={comment.author.avatar ? { src: comment.author.avatar } : undefined}
                size={28}
              />
              <div className={styles.commentAuthor}>
                <Text weight="semibold" size={200}>
                  {comment.author.name}
                </Text>
                <Text size={100} style={{ marginLeft: 8 }}>
                  {formatDate(comment.createdAt)}
                </Text>
              </div>
              <div className={styles.commentActions} onClick={(e) => e.stopPropagation()}>
                {comment.resolved ? (
                  <Tooltip content="Unresolve" relationship="label">
                    <Button
                      icon={<ArrowUndo24Regular />}
                      size="small"
                      appearance="subtle"
                      onClick={() => { unresolve(comment.id); onCommentUnresolve?.(comment.id); }}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip content="Resolve" relationship="label">
                    <Button
                      icon={<Checkmark24Regular />}
                      size="small"
                      appearance="subtle"
                      onClick={() => { resolve(comment.id); onCommentResolve?.(comment.id); }}
                    />
                  </Tooltip>
                )}
                {!comment.assignedTo && (
                  <Tooltip content="Assign" relationship="label">
                    <Button
                      icon={<PersonAdd24Regular />}
                      size="small"
                      appearance="subtle"
                      onClick={() => handleAssign(comment.id)}
                    />
                  </Tooltip>
                )}
                <Tooltip content="Delete" relationship="label">
                  <Button
                    icon={<Delete24Regular />}
                    size="small"
                    appearance="subtle"
                    onClick={() => { onCommentDelete?.(comment.id); deleteComment(comment.id); }}
                  />
                </Tooltip>
              </div>
            </div>

            {comment.quotedText && (
              <div className={styles.commentQuote}>"{comment.quotedText}"</div>
            )}

            {editingId === comment.id ? (
              <div className={styles.editArea} onClick={(e) => e.stopPropagation()}>
                <MentionPicker
                  value={editText}
                  onChange={setEditText}
                  onMentionSelect={handleMentionSelect}
                  getToken={getToken}
                  isAuthenticated={isAuthenticated}
                  canUsePeopleSearch={capabilities?.canUsePeopleSearch}
                  localAuthors={localAuthors}
                  isInTeams={isInTeams}
                  inputRef={editTextareaRef}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <Button
                    size="small"
                    appearance="primary"
                    onClick={() => handleSaveEdit(comment.id)}
                  >
                    Save
                  </Button>
                  <Button size="small" appearance="subtle" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.commentText} onClick={() => handleStartEdit(comment)}>
                  {renderMentions(comment.text, comment.mentions) || <Text italic>Click to add comment text...</Text>}
                </div>

                {!comment.assignedTo && comment.mentions?.length > 0 && (
                  <div className={styles.assignSuggestion}>
                    {comment.mentions.map((person) => (
                      <Tooltip key={person.id} content={`Assign to ${person.name}`} relationship="label">
                        <Button
                          size="small"
                          appearance="subtle"
                          icon={<PersonAdd24Regular />}
                          onClick={(e) => {
                            e.stopPropagation();
                            update(comment.id, { assignedTo: person });
                          }}
                        >
                          Assign to {person.name}
                        </Button>
                      </Tooltip>
                    ))}
                  </div>
                )}

                {comment.assignedTo && (
                  <div className={styles.taskInfo}>
                    <TaskListSquareLtr24Regular />
                    <Checkbox
                      checked={comment.taskCompleted}
                      onChange={(_, data) =>
                        data.checked ? completeTask(comment.id) : uncompleteTask(comment.id)
                      }
                    />
                    <Text size={200}>Assigned to {comment.assignedTo.name}</Text>
                    {comment.taskDueDate && (
                      <Text size={200}>
                        · Due {formatDate(comment.taskDueDate)}
                      </Text>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Replies */}
            {comment.replies.length > 0 && (
              <div className={styles.replies}>
                {comment.replies.map((reply) => (
                  <div key={reply.id} className={styles.reply}>
                    <div className={styles.replyHeader}>
                      <Avatar name={reply.author.name} size={20} />
                      <Text weight="semibold" size={200}>
                        {reply.author.name}
                      </Text>
                      <Text size={100}>{formatDate(reply.createdAt)}</Text>
                    </div>
                    <Text size={200}>{renderMentions(reply.text, reply.mentions)}</Text>
                  </div>
                ))}
              </div>
            )}

            {/* Reply input */}
            {replyingTo === comment.id ? (
              <div className={styles.replyInput} onClick={(e) => e.stopPropagation()}>
                <div style={{ flex: 1 }}>
                  <MentionPicker
                    value={replyText}
                    onChange={setReplyText}
                    onMentionSelect={handleReplyMentionSelect}
                    getToken={getToken}
                    isAuthenticated={isAuthenticated}
                    canUsePeopleSearch={capabilities?.canUsePeopleSearch}
                    localAuthors={localAuthors}
                    isInTeams={isInTeams}
                    placeholder="Write a reply... (@ to mention)"
                  />
                </div>
                <Button
                  icon={<Send24Regular />}
                  appearance="primary"
                  onClick={() => handleSendReply(comment.id)}
                />
                {comment.assignedTo && !comment.taskCompleted && !comment.resolved && (
                  <Tooltip content="Reply & resolve task" relationship="label">
                    <Button
                      icon={<CheckmarkCircle24Regular />}
                      appearance="primary"
                      onClick={() => handleReplyAndResolve(comment.id)}
                    />
                  </Tooltip>
                )}
              </div>
            ) : (
              <Button
                size="small"
                appearance="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartReply(comment.id);
                }}
              >
                Reply
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
