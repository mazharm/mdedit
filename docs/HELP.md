# MDEdit Teams - User Guide

## Getting Started

MDEdit is a full-featured Markdown editor that runs as a personal tab inside Microsoft Teams. It combines a visual rich-text editor with a raw Markdown code editor, so you can write and format documents whichever way you prefer.

### Signing In

Click the **Sign In** button in the top-right corner of the toolbar to connect with your Microsoft 365 account. Signing in enables:

- Saving and opening files from OneDrive
- @mentioning colleagues in comments
- Creating Microsoft To-Do tasks from comments

You can use MDEdit without signing in for local file editing with basic comment functionality.

---

## Editor Modes

MDEdit offers three view modes, switchable via the view toggle in the toolbar:

| Mode | Description |
|------|-------------|
| **Rich Text** | Visual WYSIWYG editor - what you see is what you get |
| **Split** | Side-by-side view with rich text on the left and raw Markdown on the right |
| **Markdown** | Raw Markdown code editor with syntax highlighting |

In **Split** mode, changes in either editor are instantly reflected in the other. You can drag the divider to resize the panes.

---

## Text Formatting

### Toolbar Buttons

| Button | Action | Keyboard Shortcut |
|--------|--------|-------------------|
| **B** | Bold | `Ctrl+B` |
| *I* | Italic | `Ctrl+I` |
| U | Underline | `Ctrl+U` |
| ~~S~~ | Strikethrough | - |
| `</>` | Inline code | `Ctrl+E` |

### Headings

Click the **Heading** dropdown in the toolbar to insert headings (H1 through H6).

### Lists

| Button | Type |
|--------|------|
| Bullet list | Unordered list with dashes |
| Numbered list | Ordered list with numbers |
| Task list | Checklist with checkboxes |

### Block Elements

| Button | Element |
|--------|---------|
| Quote | Block quote with left border |
| Code block | Fenced code block with syntax highlighting |
| Horizontal rule | Horizontal divider line |

---

## Inserting Content

### Links

1. Click the **Link** button in the toolbar
2. Enter the URL in the dialog
3. Click **Insert**

To remove a link, select the linked text and click the Link button again.

### Images

1. Click the **Image** button in the toolbar
2. Enter the image URL
3. Click **Insert**

Images are displayed inline and scale to fit the editor width.

### Tables

Click the **Table** button to insert a 3x3 table with a header row. Once inserted, you can:

- Click cells to edit them
- Use Tab to move between cells
- Select cells for formatting

### Mermaid Diagrams

MDEdit supports Mermaid diagrams for creating visual charts and graphs. Click the **diagram** button in the toolbar and choose from:

- **Flowchart** - Process flows and decision trees
- **Sequence Diagram** - Interaction between systems/people
- **Class Diagram** - Object-oriented class relationships
- **State Diagram** - State machine transitions
- **ER Diagram** - Entity-relationship models
- **User Journey** - User experience maps
- **Gantt Chart** - Project timelines
- **Pie Chart** - Data distribution
- **Git Graph** - Branch/merge visualization
- **Mindmap** - Idea hierarchies
- **Timeline** - Chronological events
- **Quadrant Chart** - 2D categorization

Each diagram block has:
- **Edit** mode: Write Mermaid syntax in a code editor
- **Preview** mode: See the rendered diagram
- **Delete** button: Remove the diagram

---

## File Management

### Creating a New File

Click the **New File** button (or use `Ctrl+N` if no shortcut conflict). This clears the editor and any comments.

### Opening Files

Click the **Open File** button to open the file picker. You have two options:

#### OneDrive

1. Switch to the **OneDrive** tab
2. Browse through your folders (only `.md` and `.markdown` files are shown)
3. Click a file to select it, then click **Open**
4. Or double-click a file to open it immediately
5. Use the search bar to find files by name

**Recent files** appear at the top of the OneDrive picker for quick access.

#### Local Files

1. Switch to the **Local Files** tab
2. Click the drop zone or drag and drop a `.md` file
3. Recently opened local files appear below for quick reopening

### Saving Files

| Action | Description |
|--------|-------------|
| **Save** (`Ctrl+S`) | Saves to the current file (OneDrive or local) |
| **Save As** | Opens the file picker to save to a new location |

If no file is currently open, **Save** will open the **Save As** dialog.

The toolbar shows the current file name and a `*` indicator when there are unsaved changes. A confirmation prompt appears if you try to close the tab with unsaved changes.

---

## Comments

Comments let you annotate specific text selections for review and collaboration.

### Adding a Comment

1. **Select text** in the rich text editor
2. Right-click and choose **Add Comment** from the context menu
3. The selected text is highlighted in yellow
4. The comment appears in the right sidebar

If no text is selected, the word under your cursor is automatically selected.

### Working with Comments

In the **Comments** sidebar:

- **Click** a comment to scroll to its highlighted text in the editor
- **Click the comment text** to edit it
- **Reply** to start a threaded conversation
- **Resolve** (checkmark) to mark a comment as addressed
- **Delete** (trash icon) to remove a comment
- **Show resolved** checkbox to toggle visibility of resolved comments

### @Mentions

When editing a comment or reply, type `@` followed by a name to search for colleagues:

1. Type `@john` to search
2. Use arrow keys to navigate results
3. Press **Enter** to insert the mention
4. Mentioned users appear highlighted in blue

Requires sign-in to search the organization directory.

### Task Assignment

When editing a comment, you can assign it as a task. This creates a corresponding task in your **Microsoft To-Do** app under the "MDEdit Comments" list.

### Comment Storage

Comments are saved directly inside your Markdown files as specially formatted HTML comments. This means:

- Comments travel with the file
- No external database needed
- Other Markdown editors will ignore the comment data
- Comment highlights are preserved across sessions

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file |
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+U` | Underline |
| `Ctrl+E` | Inline code |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Tab` (in code/mermaid) | Indent |

---

## Tips and Tricks

1. **Quick file switching**: Use the recent files list in the file picker to quickly reopen previously edited files.

2. **Mermaid editing**: Write your diagram code first, then click **Preview** to see the result. Click **Edit** to go back and make changes.

3. **Split mode for learning**: Use split mode to see how Markdown syntax corresponds to the formatted output in real time.

4. **Drag and drop**: Drop a `.md` file directly onto the local file picker to open it instantly.

5. **Comments in collaboration**: Use comments and @mentions to discuss specific parts of a document with your team, then resolve them when addressed.

6. **Offline editing**: Local file editing works without an internet connection. OneDrive features require connectivity.

---

## Troubleshooting

### "Failed to initialize"
- Refresh the page
- Ensure you're accessing MDEdit through Microsoft Teams or a supported browser

### Cannot sign in
- Check that popups are not blocked in your browser
- Ensure your organization's Azure AD admin has consented to the required permissions
- Try signing out and back in

### File won't save
- Check your internet connection for OneDrive saves
- For local files, ensure the browser still has permission to access the file
- Try "Save As" to save to a new location

### OneDrive files not loading
- Verify you're signed in
- Check that you have Files.ReadWrite permission
- Try searching for the file instead of browsing

### Comments not appearing
- Ensure the Comments sidebar is visible (click the chevron on the right edge)
- Check the "Show resolved" checkbox if you're looking for resolved comments
- Comments are only stored when the file is saved

### Mermaid diagram not rendering
- Check the diagram syntax for errors (error messages appear in preview mode)
- Ensure you're using a supported diagram type
- Try simplifying the diagram to identify syntax issues
