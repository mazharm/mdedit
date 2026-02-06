import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentMark: {
      setComment: (id: string) => ReturnType;
      unsetComment: () => ReturnType;
      resolveComment: (id: string) => ReturnType;
      unresolveComment: (id: string) => ReturnType;
      removeCommentMark: (id: string) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: 'commentMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => {
          if (!attributes.commentId) {
            return {};
          }
          return {
            'data-comment-id': attributes.commentId,
          };
        },
      },
      resolved: {
        default: false,
        parseHTML: (element) => element.classList.contains('resolved'),
        renderHTML: () => {
          return {};
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes, mark }) {
    const classes = ['comment-highlight'];
    if (mark.attrs.resolved) {
      classes.push('resolved');
    }

    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: classes.join(' '),
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (id: string) =>
        ({ commands }) => {
          return commands.setMark(this.name, { commentId: id, resolved: false });
        },

      unsetComment:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },

      resolveComment:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.commentId === id) {
                found = true;
                if (dispatch) {
                  const newMark = mark.type.create({
                    ...mark.attrs,
                    resolved: true,
                  });
                  tr.removeMark(pos, pos + node.nodeSize, mark);
                  tr.addMark(pos, pos + node.nodeSize, newMark);
                }
              }
            });
          });

          return found;
        },

      unresolveComment:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.commentId === id) {
                found = true;
                if (dispatch) {
                  const newMark = mark.type.create({
                    ...mark.attrs,
                    resolved: false,
                  });
                  tr.removeMark(pos, pos + node.nodeSize, mark);
                  tr.addMark(pos, pos + node.nodeSize, newMark);
                }
              }
            });
          });

          return found;
        },

      removeCommentMark:
        (id: string) =>
        ({ tr, state, dispatch }) => {
          const { doc } = state;
          let found = false;

          doc.descendants((node, pos) => {
            node.marks.forEach((mark) => {
              if (mark.type.name === this.name && mark.attrs.commentId === id) {
                found = true;
                if (dispatch) {
                  tr.removeMark(pos, pos + node.nodeSize, mark);
                }
              }
            });
          });

          return found;
        },
    };
  },
});
