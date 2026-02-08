import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type AuthProvider = 'microsoft' | 'google';

export interface Author {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider?: AuthProvider;
}

export interface Reply {
  id: string;
  text: string;
  author: Author;
  createdAt: Date;
  mentions: Author[];
}

export interface Comment {
  id: string;
  text: string;
  author: Author;
  createdAt: Date;
  updatedAt: Date;
  resolved: boolean;
  resolvedBy: Author | null;
  resolvedAt: Date | null;
  replies: Reply[];
  assignedTo: Author | null;
  taskDueDate: Date | null;
  taskCompleted: boolean;
  todoTaskId: string | null;
  mentions: Author[];
  quotedText: string;
}

interface CommentInput {
  text?: string;
  quotedText?: string;
  mentions?: Author[];
  assignedTo?: Author | null;
  taskDueDate?: Date | null;
}

interface CommentStore {
  comments: Record<string, Comment>;
  currentUser: Author | null;
  showResolved: boolean;

  // Actions
  setCurrentUser: (user: Author | null) => void;
  setShowResolved: (show: boolean) => void;

  create: (input: CommentInput) => Comment;
  update: (id: string, updates: Partial<Comment>) => void;
  delete: (id: string) => void;
  get: (id: string) => Comment | undefined;
  getAll: () => Comment[];

  resolve: (id: string) => void;
  unresolve: (id: string) => void;

  addReply: (commentId: string, text: string, mentions?: Author[]) => Reply | null;
  deleteReply: (commentId: string, replyId: string) => void;

  assignTask: (id: string, assignee: Author, dueDate?: Date) => void;
  completeTask: (id: string) => void;
  uncompleteTask: (id: string) => void;

  loadComments: (comments: Comment[]) => void;
  toJSON: () => Comment[];
  clear: () => void;
}

const defaultAuthor: Author = {
  id: 'anonymous',
  name: 'Anonymous',
  email: '',
};

export const useCommentStore = create<CommentStore>((set, get) => ({
  comments: {},
  currentUser: null,
  showResolved: false,

  setCurrentUser: (user) => set({ currentUser: user }),
  setShowResolved: (show) => set({ showResolved: show }),

  create: (input) => {
    const state = get();
    const author = state.currentUser || defaultAuthor;
    const now = new Date();

    const comment: Comment = {
      id: uuidv4(),
      text: input.text || '',
      author,
      createdAt: now,
      updatedAt: now,
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      replies: [],
      assignedTo: input.assignedTo || null,
      taskDueDate: input.taskDueDate || null,
      taskCompleted: false,
      todoTaskId: null,
      mentions: input.mentions || [],
      quotedText: input.quotedText || '',
    };

    set((state) => ({
      comments: { ...state.comments, [comment.id]: comment },
    }));

    return comment;
  },

  update: (id, updates) => {
    set((state) => {
      const comment = state.comments[id];
      if (!comment) return state;

      return {
        comments: {
          ...state.comments,
          [id]: {
            ...comment,
            ...updates,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  delete: (id) => {
    set((state) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [id]: _removed, ...rest } = state.comments;
      return { comments: rest };
    });
  },

  get: (id) => get().comments[id],

  getAll: () => Object.values(get().comments),

  resolve: (id) => {
    const state = get();
    const author = state.currentUser || defaultAuthor;

    set((state) => {
      const comment = state.comments[id];
      if (!comment) return state;

      return {
        comments: {
          ...state.comments,
          [id]: {
            ...comment,
            resolved: true,
            resolvedBy: author,
            resolvedAt: new Date(),
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  unresolve: (id) => {
    set((state) => {
      const comment = state.comments[id];
      if (!comment) return state;

      return {
        comments: {
          ...state.comments,
          [id]: {
            ...comment,
            resolved: false,
            resolvedBy: null,
            resolvedAt: null,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  addReply: (commentId, text, mentions = []) => {
    const state = get();
    const author = state.currentUser || defaultAuthor;
    const comment = state.comments[commentId];

    if (!comment) return null;

    const reply: Reply = {
      id: uuidv4(),
      text,
      author,
      createdAt: new Date(),
      mentions,
    };

    set((state) => ({
      comments: {
        ...state.comments,
        [commentId]: {
          ...comment,
          replies: [...comment.replies, reply],
          updatedAt: new Date(),
        },
      },
    }));

    return reply;
  },

  deleteReply: (commentId, replyId) => {
    set((state) => {
      const comment = state.comments[commentId];
      if (!comment) return state;

      return {
        comments: {
          ...state.comments,
          [commentId]: {
            ...comment,
            replies: comment.replies.filter((r) => r.id !== replyId),
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  assignTask: (id, assignee, dueDate) => {
    set((state) => {
      const comment = state.comments[id];
      if (!comment) return state;

      return {
        comments: {
          ...state.comments,
          [id]: {
            ...comment,
            assignedTo: assignee,
            taskDueDate: dueDate || null,
            taskCompleted: false,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  completeTask: (id) => {
    set((state) => {
      const comment = state.comments[id];
      if (!comment) return state;

      return {
        comments: {
          ...state.comments,
          [id]: {
            ...comment,
            taskCompleted: true,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  uncompleteTask: (id) => {
    set((state) => {
      const comment = state.comments[id];
      if (!comment) return state;

      return {
        comments: {
          ...state.comments,
          [id]: {
            ...comment,
            taskCompleted: false,
            updatedAt: new Date(),
          },
        },
      };
    });
  },

  loadComments: (comments) => {
    const commentsMap: Record<string, Comment> = {};
    for (const comment of comments) {
      // Convert date strings to Date objects if needed
      commentsMap[comment.id] = {
        ...comment,
        createdAt: new Date(comment.createdAt),
        updatedAt: new Date(comment.updatedAt),
        resolvedAt: comment.resolvedAt ? new Date(comment.resolvedAt) : null,
        taskDueDate: comment.taskDueDate ? new Date(comment.taskDueDate) : null,
        replies: comment.replies.map((reply) => ({
          ...reply,
          createdAt: new Date(reply.createdAt),
        })),
      };
    }
    set({ comments: commentsMap });
  },

  toJSON: () => Object.values(get().comments),

  clear: () => set({ comments: {} }),
}));
