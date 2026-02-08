# MDEdit

A full-featured WYSIWYG Markdown editor that runs as a Microsoft Teams personal tab, a VS Code extension, or a standalone website. Combines rich text editing, raw Markdown, OneDrive integration, collaborative commenting with @mentions, and Mermaid diagram support -- all with zero backend infrastructure.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Microsoft%20Teams-6264A7)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![React](https://img.shields.io/badge/React-18.2-61DAFB)

## Features

- **Dual-mode editor** -- WYSIWYG rich text, raw Markdown, or side-by-side split view with live sync
- **Rich formatting** -- Bold, italic, underline, strikethrough, headings, lists, task lists, tables, code blocks with syntax highlighting
- **Mermaid diagrams** -- Flowcharts, sequence diagrams, class diagrams, state diagrams, ER diagrams, Gantt charts, pie charts, mindmaps, and more
- **Collaborative comments** -- Select text, add comments, @mention colleagues, threaded replies, resolve/reopen workflow
- **Task integration** -- Assign comments as tasks, synced to Microsoft To-Do
- **Multi-provider sign-in** -- Microsoft (Azure AD) and Google OAuth
- **OneDrive file management** -- Browse, open, save, and search Markdown files
- **Local file support** -- Open and save via File System Access API with drag-and-drop
- **VS Code extension** -- Use as a standalone panel or default editor for `.md` files
- **Teams-native UI** -- Built with Fluent UI v9
- **No backend required** -- 100% client-side SPA
- **Offline capable** -- Local file editing works without internet

## Quick Start

```bash
npm install
cp .env.example .env    # Add your Azure AD Client ID
npm run dev             # https://localhost:3002
```

## Project Structure

```
mdedit/
├── src/                        # React SPA source
│   ├── App.tsx                 # Root component & orchestration
│   ├── components/             # UI components (Editor, Comments, FileManager, Auth)
│   ├── hooks/                  # Auth hooks (Teams SSO, Google, VS Code)
│   ├── services/               # Graph API clients (OneDrive, People, To-Do)
│   ├── stores/                 # Zustand state stores
│   ├── extensions/             # TipTap extensions (CommentMark, MermaidBlock)
│   └── utils/                  # Markdown conversion, VS Code bridge
├── vscode-extension/           # VS Code extension wrapper
│   └── src/                    # Extension host (auth, file I/O, custom editor)
├── manifest/                   # Teams app manifest & icons
├── docs/                       # Documentation
│   ├── HELP.md                 # User guide & installation
│   ├── DESIGN.md               # Architecture & design diagrams
│   └── deploy.md               # Deployment & configuration guide
├── scripts/                    # Build scripts
├── .env.example                # Environment variable template
├── staticwebapp.config.json    # Azure SWA routing config
└── vite.config.ts              # Vite configuration
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/HELP.md](docs/HELP.md) | User guide, installation for Teams & VS Code |
| [docs/deploy.md](docs/deploy.md) | Azure AD setup, deployment, building the extension |
| [docs/DESIGN.md](docs/DESIGN.md) | Architecture diagrams and design decisions |

## License

MIT
