# MDEdit - User Guide

## Getting Started

MDEdit is a full-featured Markdown editor available as a Microsoft Teams personal tab, a VS Code extension, and a standalone website. It combines a visual rich-text editor with a raw Markdown code editor, so you can write and format documents whichever way you prefer.

---

## Installation

### Microsoft Teams

Download the app package: [mdedit-teams.zip](https://green-sky-0a669861e.1.azurestaticapps.net/mdedit-teams.zip)

**Prerequisites:**
- Microsoft Teams (desktop or web)
- Your organization must allow custom app sideloading (see [Admin Setup](#admin-setup) if it's not enabled)

#### Option 1: Teams Desktop or Web (Recommended)

1. Open **Microsoft Teams**
2. Click the **Apps** icon in the left sidebar (or bottom bar on mobile)
3. Click **Manage your apps** at the bottom of the Apps panel
4. Click **Upload an app**
5. Select **Upload a custom app**
6. Browse to and select the **mdedit-teams.zip** file
7. In the dialog that appears, review the app details and click **Add**
8. MDEdit will now appear in your left sidebar

#### Option 2: Direct Link in Teams

1. Open **Microsoft Teams**
2. Click the **...** (More added apps) button in the left sidebar
3. Click **More apps** at the bottom
4. Click **Upload an app** in the bottom-left corner
5. Select **Upload a custom app**
6. Choose the **mdedit-teams.zip** file and click **Add**

#### After Installation

- Click the **MDEdit** icon in the left sidebar to open the editor
- Right-click the icon and select **Pin** to keep it visible in your sidebar
- Sign in with your Microsoft account to enable OneDrive file access, @mentions, and task integration

#### Admin Setup

If your organization doesn't allow custom app sideloading, a Teams administrator needs to enable it:

1. Go to the **Teams admin center** (https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** > **Setup policies**
3. Select the **Global (Org-wide default)** policy (or create a new one)
4. Toggle **Upload custom apps** to **On**
5. Click **Save**

Changes may take a few hours to propagate. The admin can also assign the policy to specific users instead of enabling it org-wide.

#### Organization-Wide Deployment (Admin)

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** > **Manage apps**
3. Click **Upload new app**
4. Select `mdedit-teams.zip`
5. Configure policies to make it available to users:
   - Go to **Teams apps** > **Setup policies**
   - Add MDEdit to the installed apps list
   - Optionally pin it to the app bar

#### Uninstall

1. Right-click the **MDEdit** icon in the Teams sidebar
2. Select **Uninstall**
3. Confirm the uninstallation

### VS Code Extension

1. Get the `.vsix` file (either build it from source with `npm run package:vscode`, or download a release)
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type **"Extensions: Install from VSIX..."** and select it
5. Browse to the `mdedit-vscode-1.0.0.vsix` file and click **Install**
6. Reload VS Code when prompted

Once installed, you can:
- Press `Ctrl+Shift+P` → **"MDEdit: Open WYSIWYG Editor"** to open a new editor panel
- Right-click any `.md` file in the Explorer → **"Edit in WYSIWYG Editor"**
- Click the MDEdit button in the editor title bar when a `.md` file is open

#### Setting MDEdit as the Default Markdown Editor
1. Right-click any `.md` file in the Explorer
2. Select **"Open With..."**
3. Choose **"MDEdit WYSIWYG Editor"** from the list
4. Click **"Configure Default Editor for '*.md'..."** at the bottom of the picker
5. Select **"MDEdit WYSIWYG Editor"** again

Now all `.md` files will open in MDEdit by default. To switch back, repeat the steps and choose **"Text Editor"** instead.

### Standalone Website

Visit the hosted URL directly in any modern browser.

---

## Signing In

MDEdit supports two sign-in providers:

**Microsoft (recommended)** -- Click the **Sign In** button in the toolbar and choose **Microsoft**. This enables the full feature set:

- Saving and opening files from OneDrive
- @mentioning colleagues in comments with directory search
- Creating Microsoft To-Do tasks from comments
- Your profile photo appears in the toolbar

When running inside Teams, sign-in happens automatically using your Teams identity. In VS Code, sign-in uses your VS Code Microsoft account automatically.

**Google** -- Click the **Sign In** button and choose **Google**. Available in the standalone website, this provides:

- Comment authorship with your Google name and email
- Local file editing with your identity attached to comments

Google sign-in does not provide access to OneDrive or Microsoft To-Do.

You can use MDEdit without signing in for local file editing with anonymous comment functionality.

---

## Editor Modes

MDEdit offers three view modes, switchable via the view toggle in the toolbar. **Rich Text** is the default view.

| Mode | Description |
|------|-------------|
| **Rich Text** | Visual WYSIWYG editor (default) - what you see is what you get |
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
2. Right-click and choose **Add Comment** from the context menu, or use `Ctrl+Shift+M`
3. The selected text is highlighted in yellow
4. The comment appears in the right sidebar and is automatically focused for typing

If no text is selected, the word under your cursor is automatically selected.

### Working with Comments

In the **Comments** sidebar:

- **Click** a comment to scroll to its highlighted text in the editor
- **Click the comment text** to edit it
- **Reply** to start a threaded conversation
- **Reply & resolve** to add a final reply and resolve in one step
- **Resolve** (checkmark) to mark a comment as addressed
- **Delete** (trash icon) to remove a comment
- **Show resolved** checkbox to toggle visibility of resolved comments

### @Mentions

When editing a comment or reply, type `@` to mention a colleague:

1. Type `@` -- a dropdown appears showing:
   - **Recently mentioned people** (MRU -- most recently used)
   - **Document authors** (people who have commented on this file)
2. Continue typing to filter the list (e.g., `@joh` filters to names matching "joh")
3. Use **arrow keys** to navigate the dropdown
4. Press **Enter** to insert the selected mention
5. Select **"Search people..."** at the bottom of the list to search the full directory:
   - **In Teams**: Opens the Teams native people picker
   - **Outside Teams**: Opens a dialog where you can enter a name and email
6. Mentioned users appear highlighted in blue

Selected people are automatically added to the MRU list for faster future mentions.

### Task Assignment

You can assign comments as tasks to mentioned people:

- **Assign from mention**: After mentioning someone in a comment, click the assign button next to their name in the comment
- Tasks sync to **Microsoft To-Do** under the "MDEdit Comments" list (requires Microsoft sign-in)
- Set a due date for the task using the date picker
- Task completion status syncs between MDEdit and To-Do

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
| `Ctrl+Shift+M` | Add comment (with text selected) |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo |
| `Tab` (in code/mermaid) | Indent |
| `↑` / `↓` | Navigate @mention dropdown |
| `Enter` | Select @mention / confirm |
| `Escape` | Dismiss @mention dropdown |

---

## Tips and Tricks

1. **Quick file switching**: Use the recent files list in the file picker to quickly reopen previously edited files.

2. **Mermaid editing**: Write your diagram code first, then click **Preview** to see the result. Click **Edit** to go back and make changes.

3. **Split mode for learning**: Use split mode to see how Markdown syntax corresponds to the formatted output in real time.

4. **Drag and drop**: Drop a `.md` file directly onto the local file picker to open it instantly.

5. **Comments in collaboration**: Use comments and @mentions to discuss specific parts of a document with your team, then resolve them when addressed.

6. **Offline editing**: Local file editing works without an internet connection. OneDrive features require connectivity.

7. **Quick @mentions**: The MRU list remembers who you mention most, so frequently-mentioned colleagues appear at the top of the dropdown.

---

## Troubleshooting

### "Failed to initialize"
- Refresh the page (or close and reopen the VS Code panel)
- Ensure you're accessing MDEdit through Microsoft Teams, VS Code, or a supported browser

### Cannot sign in
- **Teams**: Check that popups are not blocked and your organization's Azure AD admin has consented to the required permissions
- **VS Code**: Ensure the Microsoft authentication extension is working -- try `Ctrl+Shift+P` → "Sign in to Microsoft" separately
- **Browser**: Check that popups are not blocked
- Try signing out and back in

### Google sign-in not showing
- Google sign-in is only available in the standalone website (not in Teams or VS Code)
- Verify the app is configured with a Google Client ID

### File won't save
- Check your internet connection for OneDrive saves
- For local files in the browser, ensure the browser still has permission to access the file
- In VS Code, ensure the file path is still valid and writable
- Try "Save As" to save to a new location

### VS Code extension not loading
- Ensure you installed the `.vsix` file and reloaded VS Code
- Check the VS Code Developer Tools console (`Help` → `Toggle Developer Tools`) for errors
- Try reinstalling the extension: uninstall first, then install the `.vsix` again

### App shows a blank screen (Teams)
1. Make sure you're connected to the internet
2. Try refreshing: right-click the MDEdit tab and select **Reload**
3. Clear Teams cache: close Teams, delete `%appdata%\Microsoft\Teams\Cache`, and reopen

### OneDrive files not loading
- Verify you're signed in with Microsoft
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
