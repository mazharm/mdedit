# MDEdit Teams - Detailed Design Document

## 1\. System Overview

MDEdit Teams is a Microsoft Teams personal tab application that provides a full-featured WYSIWYG markdown editor with commenting, OneDrive integration, and Mermaid diagram support. It is a 100% client-side Single Page Application (SPA) with no backend server, using Nested App Authentication (NAA) to access Microsoft Graph APIs.

### Key Design Decisions

<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Decision</p></th><th colspan="1" rowspan="1"><p>Choice</p></th><th colspan="1" rowspan="1"><p>Rationale</p></th></tr><tr><td colspan="1" rowspan="1"><p>Architecture</p></td><td colspan="1" rowspan="1"><p>Client-side SPA</p></td><td colspan="1" rowspan="1"><p>No server infrastructure needed; deploys as static files</p></td></tr><tr><td colspan="1" rowspan="1"><p>Auth</p></td><td colspan="1" rowspan="1"><p>Nested App Authentication (NAA)</p></td><td colspan="1" rowspan="1"><p>Seamless SSO inside Teams; no token exchange endpoint</p></td></tr><tr><td colspan="1" rowspan="1"><p>Rich Text</p></td><td colspan="1" rowspan="1"><p>TipTap (ProseMirror)</p></td><td colspan="1" rowspan="1"><p>Extensible, schema-based editor with React integration</p></td></tr><tr><td colspan="1" rowspan="1"><p>Raw Markdown</p></td><td colspan="1" rowspan="1"><p>CodeMirror 6</p></td><td colspan="1" rowspan="1"><p>Best-in-class code editor with language support</p></td></tr><tr><td colspan="1" rowspan="1"><p>State</p></td><td colspan="1" rowspan="1"><p>Zustand</p></td><td colspan="1" rowspan="1"><p>Lightweight, minimal boilerplate vs Redux</p></td></tr><tr><td colspan="1" rowspan="1"><p>UI Framework</p></td><td colspan="1" rowspan="1"><p>Fluent UI v9</p></td><td colspan="1" rowspan="1"><p>Native Teams look-and-feel</p></td></tr><tr><td colspan="1" rowspan="1"><p>Build</p></td><td colspan="1" rowspan="1"><p>Vite</p></td><td colspan="1" rowspan="1"><p>Fast HMR, optimized builds, ESM-native</p></td></tr><tr><td colspan="1" rowspan="1"><p>Comment Storage</p></td><td colspan="1" rowspan="1"><p>Embedded in Markdown</p></td><td colspan="1" rowspan="1"><p>Portable; no external database required</p></td></tr></tbody></table>

---

## 2\. High-Level Architecture

```mermaid
graph TB
    subgraph "Microsoft Teams Client"
        subgraph "MDEdit SPA (React + TypeScript)"
            UI["UI Layer<br/>Toolbar / Editors / Sidebar"]
            STATE["State Layer<br/>Zustand Stores"]
            SVC["Service Layer<br/>Graph API Clients"]
            AUTH["Auth Layer<br/>MSAL + Teams SSO"]
        end
    end

    UI --> STATE
    UI --> SVC
    SVC --> AUTH
    AUTH --> AAD["Azure AD<br/>OAuth 2.0 + PKCE"]
    SVC --> GRAPH["Microsoft Graph API"]
    GRAPH --> OD["OneDrive<br/>Files.ReadWrite"]
    GRAPH --> PPL["People API<br/>People.Read"]
    GRAPH --> TODO["To-Do API<br/>Tasks.ReadWrite"]
    GRAPH --> USR["User API<br/>User.Read"]

    style UI fill:#e3f2fd
    style STATE fill:#fff3e0
    style SVC fill:#e8f5e9
    style AUTH fill:#fce4ec
```

---

## 3\. Component Architecture

```mermaid
graph TD
    App["App<br/>(FluentProvider + Theme)"]
    AppContent["AppContent<br/>(Main Orchestrator)"]
    TB["Toolbar<br/>(File ops, Formatting, View mode, User)"]
    SP["SplitPane<br/>(Resizable layout)"]
    WE["WysiwygEditor<br/>(TipTap + Extensions)"]
    ME["MarkdownEditor<br/>(CodeMirror 6)"]
    CS["CommentSidebar<br/>(Comment list + replies)"]
    FP["FilePicker<br/>(Dialog wrapper)"]
    ODP["OneDrivePicker<br/>(Folder browser)"]
    LFP["LocalFilePicker<br/>(FSA + drag-drop)"]
    MP["MentionPicker<br/>(@mention autocomplete)"]
    CM["CommentMark<br/>(TipTap Mark extension)"]
    MB["MermaidBlock<br/>(TipTap Node extension)"]

    App --> AppContent
    AppContent --> TB
    AppContent --> SP
    AppContent --> CS
    AppContent --> FP
    SP --> WE
    SP --> ME
    WE --> CM
    WE --> MB
    CS --> MP
    FP --> ODP
    FP --> LFP

    style App fill:#e8eaf6
    style AppContent fill:#e8eaf6
    style TB fill:#e3f2fd
    style SP fill:#e3f2fd
    style WE fill:#c8e6c9
    style ME fill:#c8e6c9
    style CS fill:#fff9c4
    style FP fill:#ffccbc
    style CM fill:#d1c4e9
    style MB fill:#d1c4e9
```

---

## 4\. State Management

```mermaid
graph LR
    subgraph "Zustand Stores"
        CS["commentStore<br/>comments: Record&lt;id, Comment&gt;<br/>currentUser: Author<br/>showResolved: boolean"]
        FS["fileStore<br/>currentFile: FileInfo<br/>recentFiles: RecentFile[]<br/>isDirty: boolean"]
    end

    subgraph "React State (App.tsx)"
        VM["viewMode: ViewMode"]
        MD["markdown: string"]
        SC["showComments: boolean"]
        FPM["filePickerMode: Mode"]
        LFH["localFileHandle: FSAFileHandle"]
    end

    subgraph "Editor Refs (imperative)"
        WR["wysiwygRef<br/>.setMarkdown() .getMarkdown()<br/>.addComment() .scrollToComment()<br/>.executeCommand()"]
        MR["markdownRef<br/>.setContent() .getContent()<br/>.focus()"]
    end

    subgraph "Persistence"
        LS["localStorage<br/>Recent files list"]
        IDB["IndexedDB<br/>File handles"]
        MSAL["MSAL Cache<br/>Auth tokens"]
    end

    CS --> LS
    FS --> LS
    LFH --> IDB
    WR --> VM
    MR --> VM

    style CS fill:#fff3e0
    style FS fill:#fff3e0
```

---

## 5\. Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as MDEdit App
    participant SDK as Teams SDK
    participant MSAL as MSAL.js
    participant AAD as Azure AD
    participant Graph as Graph API

    Note over App: App Initialization
    App->>SDK: app.initialize()
    SDK-->>App: Context (host, theme)
    App->>App: checkIfInTeams()

    alt Running in Teams
        App->>MSAL: createNestablePublicClientApplication()
        Note over MSAL: Teams acts as auth broker (NAA)
    else Standalone Browser
        App->>MSAL: new PublicClientApplication()
        MSAL->>MSAL: initialize()
    end

    App->>MSAL: handleRedirectPromise()
    App->>MSAL: getAllAccounts()

    alt Has cached account
        App->>MSAL: acquireTokenSilent()
        MSAL-->>App: Access Token
        App->>Graph: GET /me (with Bearer token)
        Graph-->>App: User Profile
        App->>Graph: GET /me/photo/$value
        Graph-->>App: User Avatar
    else No cached account
        U->>App: Click "Sign In"
        App->>MSAL: loginPopup(scopes)
        MSAL->>AAD: OAuth 2.0 + PKCE
        AAD-->>U: Consent prompt
        U-->>AAD: Approve
        AAD-->>MSAL: Auth code + tokens
        MSAL-->>App: Access Token + Account
        App->>Graph: GET /me
        Graph-->>App: User Profile
    end

    Note over App: Subsequent API Calls
    App->>MSAL: acquireTokenSilent()
    Note over MSAL: Returns cached token<br/>or silently refreshes
    MSAL-->>App: Access Token
    App->>Graph: API call with Bearer token
```

---

## 6\. Editor Synchronization

```mermaid
sequenceDiagram
    participant U as User
    participant WE as WYSIWYG Editor
    participant AppState as App State
    participant ME as Markdown Editor

    Note over WE,ME: Split View - Bidirectional Sync

    rect rgb(232, 245, 233)
        Note over U,ME: User types in WYSIWYG
        U->>WE: Type/format text
        WE->>WE: TipTap onUpdate()
        WE->>WE: htmlToMarkdown(html)
        WE->>AppState: handleWysiwygChange(markdown)
        Note over AppState: isUpdatingRef = true
        AppState->>AppState: setMarkdown(md)
        AppState->>ME: markdownRef.setContent(md)
        Note over AppState: isUpdatingRef = false
    end

    rect rgb(227, 242, 253)
        Note over U,ME: User types in Markdown
        U->>ME: Type raw markdown
        ME->>ME: CodeMirror onUpdate
        ME->>AppState: handleMarkdownChange(markdown)
        Note over AppState: isUpdatingRef = true
        AppState->>AppState: setMarkdown(md)
        AppState->>WE: wysiwygRef.setMarkdown(md)
        WE->>WE: markdownToHtml(md)
        WE->>WE: editor.setContent(html)
        Note over AppState: isUpdatingRef = false
    end

    Note over AppState: isUpdatingRef prevents<br/>infinite sync loops
```

---

## 7\. Comment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> SelectText: User selects text
    SelectText --> Created: Add Comment<br/>(context menu / toolbar)

    state Created {
        [*] --> EmptyComment: commentStore.create()
        EmptyComment --> WithText: User types comment text
        WithText --> WithMention: @mention added
        WithText --> WithTask: Assign task
        WithMention --> WithTask: Assign task
    }

    Created --> InEditor: CommentMark applied<br/>to selection range

    state InEditor {
        [*] --> Highlighted: Yellow highlight
        Highlighted --> Active: User clicks highlight
        Active --> Highlighted: 2s timeout
    }

    Created --> HasReplies: Other users reply
    HasReplies --> Resolved: Mark as resolved
    Resolved --> Reopened: Unresolve
    Reopened --> Resolved: Resolve again
    Created --> Resolved: Mark as resolved

    Resolved --> Deleted: Delete comment
    Created --> Deleted: Delete comment
    HasReplies --> Deleted: Delete comment

    Deleted --> [*]: CommentMark removed<br/>from editor

    state Saved {
        [*] --> Embedded: embedCommentsInMarkdown()
        Embedded --> InFile: Comment markers +<br/>JSON data block
    }

    Created --> Saved: File Save
    Resolved --> Saved: File Save
```

---

## 8\. File Operations Flow

```mermaid
flowchart TD
    subgraph "Open File"
        OD_OPEN["OneDrive: Browse & Select"]
        LOCAL_OPEN["Local: FSA Picker / Drag-Drop"]
        FALLBACK_OPEN["Fallback: &lt;input type=file&gt;"]

        OD_OPEN -->|getFileContent| CONTENT["Raw Markdown Content"]
        LOCAL_OPEN -->|"file.text()"| CONTENT
        FALLBACK_OPEN -->|FileReader| CONTENT

        CONTENT --> EXTRACT["extractCommentsFromMarkdown()"]
        EXTRACT --> CLEAN_MD["Clean Markdown<br/>(without comment data block)"]
        EXTRACT --> COMMENTS["Comment[] array"]

        CLEAN_MD --> SET_WE["wysiwygRef.setMarkdown()"]
        CLEAN_MD --> SET_ME["markdownRef.setContent()"]
        COMMENTS --> LOAD_CS["commentStore.loadComments()"]

        SET_WE --> READY["Editor Ready"]
        SET_ME --> READY
        LOAD_CS --> READY
    end

    subgraph "Save File"
        SAVE_TRIGGER["Ctrl+S / Save Button"]
        SAVE_TRIGGER --> GET_CONTENT["getContentForSave()"]
        GET_CONTENT --> GET_MD["Get current markdown"]
        GET_CONTENT --> GET_COMMENTS["Get all comments"]
        GET_MD --> EMBED["embedCommentsInMarkdown()"]
        GET_COMMENTS --> EMBED
        EMBED --> FINAL["Final content with<br/>embedded comments"]

        FINAL --> OD_SAVE{"Source?"}
        OD_SAVE -->|OneDrive| GRAPH_PUT["graphPut(/content)"]
        OD_SAVE -->|Local| FSA_WRITE["fileHandle.createWritable()"]
        OD_SAVE -->|New file| SAVE_AS["Open Save As dialog"]
    end

    style CONTENT fill:#e8f5e9
    style FINAL fill:#e8f5e9
```

---

## 9\. Comment Storage Format

Comments are stored directly within the markdown file using two mechanisms:

### Inline Markers (within content)

```
Some text <!--MDEDIT_COMMENT_START:uuid-1-->highlighted text<!--MDEDIT_COMMENT_END:uuid-1--> more text.
```

### Data Block (appended to end of file)

```
<!--MDEDIT_COMMENTS_DATA
[
  {
    "id": "uuid-1",
    "text": "This needs revision",
    "author": { "id": "user-id", "name": "John", "email": "john@example.com" },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "resolved": false,
    "replies": [],
    "quotedText": "highlighted text",
    "mentions": [],
    "assignedTo": null,
    "taskDueDate": null,
    "taskCompleted": false
  }
]
MDEDIT_COMMENTS_DATA-->
```

```mermaid
graph LR
    subgraph "Markdown File"
        CONTENT["Document Content<br/>(with inline comment markers)"]
        SEPARATOR["<br/><br/>"]
        DATA["Comment Data Block<br/>(JSON in HTML comment)"]
    end

    CONTENT --> SEPARATOR --> DATA

    subgraph "On Load"
        PARSE["extractCommentsFromMarkdown()"]
        PARSE --> MD_OUT["Clean Markdown"]
        PARSE --> CM_OUT["Comment[] array"]
    end

    subgraph "On Save"
        EMBED["embedCommentsInMarkdown()"]
        MD_IN["Current Markdown"] --> EMBED
        CM_IN["Current Comments"] --> EMBED
        EMBED --> FILE["Combined File"]
    end
```

---

## 10\. Microsoft Graph API Integration

```mermaid
graph TD
    subgraph "Service Layer"
        GS["graphService.ts<br/>(Generic HTTP client)"]
        ODS["oneDriveService.ts<br/>(File operations)"]
        PS["peopleService.ts<br/>(User search)"]
        TS["todoService.ts<br/>(Task management)"]
    end

    subgraph "Graph API Endpoints"
        FILES["/me/drive/...<br/>List, Read, Write, Search"]
        PEOPLE["/me/people<br/>/users<br/>Search users"]
        TODOS["/me/todo/lists<br/>/me/todo/lists/{id}/tasks<br/>Create & manage tasks"]
        ME["/me<br/>/me/photo/$value<br/>User profile"]
    end

    subgraph "Permissions (Delegated)"
        P1["Files.ReadWrite"]
        P2["People.Read"]
        P3["Tasks.ReadWrite"]
        P4["User.Read"]
        P5["User.ReadBasic.All"]
    end

    ODS --> GS
    PS --> GS
    TS --> GS

    ODS --> FILES
    PS --> PEOPLE
    TS --> TODOS
    GS --> ME

    FILES -.-> P1
    PEOPLE -.-> P2
    TODOS -.-> P3
    ME -.-> P4
    PEOPLE -.-> P5

    style GS fill:#e8f5e9
    style ODS fill:#e3f2fd
    style PS fill:#fff3e0
    style TS fill:#fce4ec
```

---

## 11\. TipTap Extension Architecture

```mermaid
classDiagram
    class StarterKit {
        +Bold
        +Italic
        +Strike
        +Code
        +Heading
        +BulletList
        +OrderedList
        +Blockquote
        +HorizontalRule
        +History
    }

    class CommentMark {
        +name: "commentMark"
        +attrs: commentId, resolved
        +setComment(id)
        +unsetComment()
        +resolveComment(id)
        +unresolveComment(id)
        +removeCommentMark(id)
    }

    class MermaidBlock {
        +name: "mermaidBlock"
        +attrs: code
        +insertMermaid(code)
        +MermaidComponent (NodeView)
        +sanitizeSvg()
    }

    class AdditionalExtensions {
        +Underline
        +Link
        +Image
        +Table + TableRow + TableCell + TableHeader
        +TaskList + TaskItem
        +CodeBlockLowlight
        +Placeholder
    }

    StarterKit <|-- CommentMark : extends editor
    StarterKit <|-- MermaidBlock : extends editor
    StarterKit <|-- AdditionalExtensions : extends editor
```

---

## 12\. Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        DEV["Developer Machine"]
        DEV --> VITE["Vite Dev Server<br/>localhost:3000<br/>HTTPS with self-signed cert"]
    end

    subgraph "Build & Deploy"
        BUILD["npm run build<br/>tsc && vite build"]
        BUILD --> DIST["dist/ folder<br/>(static HTML/JS/CSS)"]
        DIST --> AZURE["Azure Static Web Apps"]
        DIST --> ALT["Alternative:<br/>GitHub Pages / Netlify / AWS S3"]
    end

    subgraph "Azure AD"
        AAD_REG["App Registration<br/>- Client ID<br/>- Redirect URI<br/>- API Permissions"]
    end

    subgraph "Teams App Package"
        MANIFEST["manifest.json<br/>- App ID<br/>- Content URL<br/>- Valid domains"]
        ICONS["color.png + outline.png"]
        MANIFEST --> ZIP["app-package.zip"]
        ICONS --> ZIP
        ZIP --> ADMIN["Teams Admin Center<br/>or Sideload"]
    end

    AZURE --> AAD_REG
    AZURE --> MANIFEST

    subgraph "Runtime"
        TEAMS["Microsoft Teams"]
        TEAMS -->|iframe| AZURE
        AZURE -->|NAA| AAD_REG
        AAD_REG -->|tokens| GRAPH["Microsoft Graph"]
    end

    style AZURE fill:#e3f2fd
    style AAD_REG fill:#fce4ec
    style TEAMS fill:#e8eaf6
```

---

## 13\. Security Model

```mermaid
graph TD
    subgraph "Authentication & Authorization"
        OAUTH["OAuth 2.0 + PKCE<br/>(No client secrets)"]
        NAA["Nested App Auth<br/>(Teams as broker)"]
        SCOPES["Delegated Scopes<br/>(User-consented only)"]
    end

    subgraph "Content Security"
        CSP["CSP Headers<br/>frame-ancestors whitelist"]
        SVG_SAN["SVG Sanitization<br/>(Mermaid output)"]
        LINK_REL["Link Security<br/>rel=noopener noreferrer"]
        MERMAID_STRICT["Mermaid securityLevel: strict"]
    end

    subgraph "Data Security"
        TOKEN_CACHE["Token Cache<br/>localStorage + memory"]
        HANDLE_PERM["File Handle Permissions<br/>OS-level access control"]
        LOCAL_ONLY["Client-side only<br/>No data sent to backend"]
    end

    subgraph "Input Validation"
        COMMENT_ESC["Comment ID escaping"]
        ODATA_ESC["OData query escaping"]
        URL_ENC["URL parameter encoding"]
    end

    style OAUTH fill:#c8e6c9
    style SVG_SAN fill:#c8e6c9
    style LOCAL_ONLY fill:#c8e6c9
```

---

## 14\. Module Dependency Graph

```mermaid
graph TD
    INDEX["index.tsx"] --> APP["App.tsx"]
    INDEX --> EB["ErrorBoundary.tsx"]

    APP --> TC["useTeamsContext"]
    APP --> TS["useTeamsSSO"]
    APP --> TB["Toolbar"]
    APP --> SP["SplitPane"]
    APP --> WE["WysiwygEditor"]
    APP --> ME["MarkdownEditor"]
    APP --> CSB["CommentSidebar"]
    APP --> FP["FilePicker"]
    APP --> CS["commentStore"]
    APP --> FS["fileStore"]
    APP --> MU["markdown utils"]
    APP --> ODS["oneDriveService"]

    WE --> CM_EXT["CommentMark"]
    WE --> MM_EXT["MermaidBlock"]
    WE --> MU

    CSB --> CS
    CSB --> MP["MentionPicker"]
    CSB --> TODO["todoService"]
    CSB --> PS["peopleService"]

    FP --> ODP["OneDrivePicker"]
    FP --> LFP["LocalFilePicker"]

    ODP --> ODS
    ODP --> FS
    LFP --> FS
    LFP --> FHS["fileHandleStore"]

    ODS --> GS["graphService"]
    PS --> GS
    TODO --> GS

    TS --> GS

    style APP fill:#e8eaf6
    style GS fill:#e8f5e9
    style CS fill:#fff3e0
    style FS fill:#fff3e0
```

---

## 15\. Technology Stack Summary

<table style="min-width: 75px;"><colgroup><col style="min-width: 25px;"><col style="min-width: 25px;"><col style="min-width: 25px;"></colgroup><tbody><tr><th colspan="1" rowspan="1"><p>Layer</p></th><th colspan="1" rowspan="1"><p>Technology</p></th><th colspan="1" rowspan="1"><p>Version</p></th></tr><tr><td colspan="1" rowspan="1"><p>UI Framework</p></td><td colspan="1" rowspan="1"><p>React</p></td><td colspan="1" rowspan="1"><p>18.2</p></td></tr><tr><td colspan="1" rowspan="1"><p>Type System</p></td><td colspan="1" rowspan="1"><p>TypeScript</p></td><td colspan="1" rowspan="1"><p>5.4</p></td></tr><tr><td colspan="1" rowspan="1"><p>Design System</p></td><td colspan="1" rowspan="1"><p>Fluent UI v9</p></td><td colspan="1" rowspan="1"><p>9.46</p></td></tr><tr><td colspan="1" rowspan="1"><p>WYSIWYG Editor</p></td><td colspan="1" rowspan="1"><p>TipTap</p></td><td colspan="1" rowspan="1"><p>2.2</p></td></tr><tr><td colspan="1" rowspan="1"><p>Code Editor</p></td><td colspan="1" rowspan="1"><p>CodeMirror</p></td><td colspan="1" rowspan="1"><p>6.0</p></td></tr><tr><td colspan="1" rowspan="1"><p>Markdown Parser</p></td><td colspan="1" rowspan="1"><p>Mar<span data-comment-id="4add2172-ae0b-405d-b796-7855bde2586d" class="comment-highlight">ke</span>d</p></td><td colspan="1" rowspan="1"><p>12.0</p></td></tr><tr><td colspan="1" rowspan="1"><p>HTML-to-Markdown</p></td><td colspan="1" rowspan="1"><p>Turndown + GFM</p></td><td colspan="1" rowspan="1"><p>7.1</p></td></tr><tr><td colspan="1" rowspan="1"><p>Diagrams</p></td><td colspan="1" rowspan="1"><p>Mermaid</p></td><td colspan="1" rowspan="1"><p>11.12</p></td></tr><tr><td colspan="1" rowspan="1"><p>State Management</p></td><td colspan="1" rowspan="1"><p>Zustand</p></td><td colspan="1" rowspan="1"><p>4.5</p></td></tr><tr><td colspan="1" rowspan="1"><p>Authentication</p></td><td colspan="1" rowspan="1"><p>MSAL Browser</p></td><td colspan="1" rowspan="1"><p>5.1</p></td></tr><tr><td colspan="1" rowspan="1"><p>Teams SDK</p></td><td colspan="1" rowspan="1"><p>@microsoft/teams-js</p></td><td colspan="1" rowspan="1"><p>2.19</p></td></tr><tr><td colspan="1" rowspan="1"><p>Build Tool</p></td><td colspan="1" rowspan="1"><p>Vite</p></td><td colspan="1" rowspan="1"><p>5.1</p></td></tr><tr><td colspan="1" rowspan="1"><p>Linting</p></td><td colspan="1" rowspan="1"><p>ESLint</p></td><td colspan="1" rowspan="1"><p>9.0</p></td></tr></tbody></table>

<!--MDEDIT_COMMENTS_DATA
[
  {
    "id": "uuid-1",
    "text": "This needs revision",
    "author": {
      "id": "user-id",
      "name": "John",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z",
    "resolved": false,
    "replies": [],
    "quotedText": "highlighted text",
    "mentions": [],
    "assignedTo": null,
    "taskDueDate": null,
    "taskCompleted": false,
    "resolvedAt": null
  },
  {
    "id": "4add2172-ae0b-405d-b796-7855bde2586d",
    "text": "testing 12345",
    "author": {
      "id": "anonymous",
      "name": "Anonymous",
      "email": ""
    },
    "createdAt": "2026-02-06T18:29:52.286Z",
    "updatedAt": "2026-02-06T18:30:01.782Z",
    "resolved": false,
    "resolvedBy": null,
    "resolvedAt": null,
    "replies": [],
    "assignedTo": null,
    "taskDueDate": null,
    "taskCompleted": false,
    "mentions": [],
    "quotedText": "ke"
  }
]
MDEDIT_COMMENTS_DATA-->