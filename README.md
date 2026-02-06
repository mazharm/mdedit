# MDEdit Teams

A full-featured WYSIWYG Markdown editor that runs as a Microsoft Teams personal tab. Combines rich text editing, raw Markdown, OneDrive integration, collaborative commenting with @mentions, and Mermaid diagram support -- all with zero backend infrastructure.

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
- **OneDrive file management** -- Browse, open, save, and search Markdown files in OneDrive
- **Local file support** -- Open and save local files via File System Access API with drag-and-drop
- **Teams-native UI** -- Built with Fluent UI v9 for seamless Teams look-and-feel
- **No backend required** -- 100% client-side using Nested App Authentication (NAA)
- **Offline capable** -- Local file editing works without internet

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Azure AD App Registration](#azure-ad-app-registration)
- [Local Development](#local-development)
- [Deploying to Azure Static Web Apps](#deploying-to-azure-static-web-apps)
- [Creating the Teams App Package](#creating-the-teams-app-package)
- [Installing in Microsoft Teams](#installing-in-microsoft-teams)
- [Alternative Deployment Options](#alternative-deployment-options)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **Azure AD** app registration (instructions below)
- **Microsoft Teams** desktop or web client
- **Azure subscription** (for Azure Static Web Apps deployment)

## Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd mdedit

# Install dependencies
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your Azure AD Client ID (see Azure AD section below)

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

## Azure AD App Registration

MDEdit uses Azure AD for authentication via OAuth 2.0 with PKCE (no client secrets needed).

### Step 1: Create the App Registration

1. Go to [Azure Portal](https://portal.azure.com) > **Microsoft Entra ID** > **App registrations**
2. Click **New registration**
3. Configure:
   - **Name**: `MDEdit Teams`
   - **Supported account types**: "Accounts in any organizational directory" (multi-tenant) or "Single tenant" for your org only
   - **Redirect URI**: Select **Single-page application (SPA)** and enter `https://localhost:3000`
4. Click **Register**
5. Copy the **Application (client) ID** -- you'll need this

### Step 2: Configure Authentication

1. Go to **Authentication** in your app registration
2. Under **Single-page application** redirect URIs, add your production URL:
   ```
   https://your-app-name.azurestaticapps.net
   ```
3. Under **Implicit grant and hybrid flows**, ensure both checkboxes are **unchecked** (we use PKCE, not implicit flow)
4. Set **Supported account types** to match your needs

### Step 3: Add API Permissions

Go to **API permissions** > **Add a permission** > **Microsoft Graph** > **Delegated permissions** and add:

| Permission | Purpose |
|-----------|---------|
| `User.Read` | Sign in and read user profile |
| `User.ReadBasic.All` | Search and display colleague profiles |
| `People.Read` | @mention autocomplete from relevant contacts |
| `Files.ReadWrite` | Open and save files in OneDrive |
| `Tasks.ReadWrite` | Create tasks in Microsoft To-Do |

Then click **Grant admin consent for [your org]** if you have admin rights. Otherwise, users will be prompted to consent individually on first use.

### Step 4: Configure Environment

Create a `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_AAD_CLIENT_ID=your-application-client-id-here
VITE_AAD_TENANT_ID=common
```

Set `VITE_AAD_TENANT_ID` to your tenant ID for single-tenant apps, or leave as `common` for multi-tenant.

## Local Development

### Basic Development

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (output: dist/)
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
```

### HTTPS for Teams Testing

Teams requires HTTPS. To test locally inside Teams:

**Option A: Self-signed certificates**

```bash
# Create certs directory
mkdir certs

# Generate self-signed certificate (using mkcert)
mkcert -install
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost

# Start dev server (auto-detects certs)
npm run dev
```

The dev server automatically enables HTTPS when it finds `certs/localhost-key.pem` and `certs/localhost.pem`.

**Option B: Tunneling with dev tunnels or ngrok**

```bash
# Using VS Code dev tunnels
devtunnel host -p 3000

# Or using ngrok
ngrok http 3000
```

Add the tunnel URL as an additional SPA redirect URI in your Azure AD app registration.

## Deploying to Azure Static Web Apps

### Option A: Via Azure Portal (GUI)

1. Go to [Azure Portal](https://portal.azure.com) > **Create a resource** > **Static Web App**

2. Configure:
   - **Subscription**: Select your Azure subscription
   - **Resource Group**: Create new or select existing
   - **Name**: `mdedit-teams` (this determines your URL: `mdedit-teams.azurestaticapps.net`)
   - **Plan type**: Free
   - **Region**: Select closest to your users
   - **Source**: GitHub (connect your repository)

3. Build configuration:
   - **App location**: `/`
   - **Output location**: `dist`
   - **Build preset**: Custom

4. After creation, go to your Static Web App > **Configuration** > **Application settings** and add:

   | Name | Value |
   |------|-------|
   | `VITE_AAD_CLIENT_ID` | Your Azure AD Application Client ID |
   | `VITE_AAD_TENANT_ID` | `common` (or your specific tenant ID) |

5. The GitHub Action workflow will be auto-created. Push to trigger a build.

### Option B: Via Azure CLI

```bash
# Login to Azure
az login

# Create resource group (if needed)
az group create --name mdedit-rg --location eastus2

# Build the app
npm run build

# Create the Static Web App
az staticwebapp create \
  --name mdedit-teams \
  --resource-group mdedit-rg \
  --source https://github.com/YOUR_USER/mdedit \
  --location eastus2 \
  --branch master \
  --app-location "/" \
  --output-location "dist" \
  --login-with-github

# Set environment variables
az staticwebapp appsettings set \
  --name mdedit-teams \
  --resource-group mdedit-rg \
  --setting-names \
    VITE_AAD_CLIENT_ID=your-client-id \
    VITE_AAD_TENANT_ID=common
```

### Option C: Manual Deploy (no GitHub integration)

```bash
# Build
npm run build

# Install SWA CLI
npm install -g @azure/static-web-apps-cli

# Deploy directly
swa deploy ./dist \
  --deployment-token YOUR_DEPLOYMENT_TOKEN \
  --env production
```

Get the deployment token from Azure Portal > your Static Web App > **Manage deployment token**.

### Post-Deployment: Update Azure AD

After deploying, add your production URL as a redirect URI:

1. Go to Azure Portal > your App Registration > **Authentication**
2. Under SPA redirect URIs, add: `https://mdedit-teams.azurestaticapps.net`
3. Save

## Creating the Teams App Package

### Step 1: Update the Manifest

Edit `manifest/manifest.json` with your production values:

```json
{
  "id": "YOUR-UNIQUE-GUID",
  "developer": {
    "name": "Your Organization",
    "websiteUrl": "https://mdedit-teams.azurestaticapps.net",
    "privacyUrl": "https://mdedit-teams.azurestaticapps.net/privacy",
    "termsOfUseUrl": "https://mdedit-teams.azurestaticapps.net/terms"
  },
  "staticTabs": [
    {
      "entityId": "mdedit",
      "name": "Editor",
      "contentUrl": "https://mdedit-teams.azurestaticapps.net",
      "websiteUrl": "https://mdedit-teams.azurestaticapps.net",
      "scopes": ["personal"]
    }
  ],
  "validDomains": [
    "mdedit-teams.azurestaticapps.net"
  ]
}
```

Replace:
- `YOUR-UNIQUE-GUID` with a new GUID (generate at https://www.uuidgenerator.net/ or with `uuidgen`)
- All URLs with your actual deployment URL
- `validDomains` with your deployment domain (without `https://`)

### Step 2: Prepare Icons

Ensure these files exist in the `manifest/` directory:
- `color.png` -- 192x192 pixels, full color app icon
- `outline.png` -- 32x32 pixels, white icon on transparent background

### Step 3: Create the Package

```bash
# On macOS/Linux
cd manifest
zip -r ../mdedit-teams.zip manifest.json color.png outline.png

# On Windows (PowerShell)
cd manifest
Compress-Archive -Path manifest.json, color.png, outline.png -DestinationPath ..\mdedit-teams.zip
```

## Installing in Microsoft Teams

### For Individual Use (Sideloading)

1. Open **Microsoft Teams**
2. Click **Apps** in the left sidebar
3. Click **Manage your apps** at the bottom
4. Click **Upload an app** > **Upload a custom app**
5. Select `mdedit-teams.zip`
6. Click **Add** to install as a personal app

### For Organization-Wide Deployment (Admin)

1. Go to [Teams Admin Center](https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** > **Manage apps**
3. Click **Upload new app**
4. Select `mdedit-teams.zip`
5. Configure policies to make it available to users:
   - Go to **Teams apps** > **Setup policies**
   - Add MDEdit to the installed apps list
   - Optionally pin it to the app bar

### For Teams App Store (Public)

For publishing to the Microsoft Teams App Store:
1. Ensure your manifest complies with [Teams Store validation policies](https://learn.microsoft.com/en-us/microsoftteams/platform/concepts/deploy-and-publish/appsource/prepare/teams-store-validation-guidelines)
2. Submit via [Partner Center](https://partner.microsoft.com/en-us/dashboard/marketplace-offers/overview)

## Alternative Deployment Options

The `dist/` folder contains only static files, so you can deploy to any static hosting service:

### GitHub Pages

```bash
npm run build
# Deploy dist/ to gh-pages branch or use GitHub Actions
```

### Netlify / Vercel / Cloudflare Pages

1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variable: `VITE_AAD_CLIENT_ID=your-client-id`

For any deployment, remember to:
- Add the deployment URL as an SPA redirect URI in Azure AD
- Update `manifest.json` with the correct URLs
- Update `validDomains` in the manifest

## Project Structure

```
mdedit/
├── manifest/                   # Teams app manifest & icons
│   ├── manifest.json
│   ├── color.png
│   └── outline.png
├── public/                     # Static assets
│   └── auth-end.html
├── src/
│   ├── App.tsx                 # Root component & orchestration
│   ├── index.tsx               # React entry point
│   ├── index.css               # Global styles
│   ├── ErrorBoundary.tsx       # Error boundary
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── Toolbar.tsx     # Main toolbar with all controls
│   │   │   ├── WysiwygEditor.tsx  # TipTap rich text editor
│   │   │   ├── MarkdownEditor.tsx # CodeMirror markdown editor
│   │   │   └── SplitPane.tsx   # Resizable split layout
│   │   ├── Comments/
│   │   │   ├── CommentSidebar.tsx # Comment list & management
│   │   │   └── MentionPicker.tsx  # @mention autocomplete
│   │   └── FileManager/
│   │       ├── FilePicker.tsx  # File open/save dialog
│   │       ├── OneDrivePicker.tsx # OneDrive file browser
│   │       └── LocalFilePicker.tsx # Local file system access
│   ├── hooks/
│   │   ├── useTeamsContext.ts  # Teams SDK initialization
│   │   └── useTeamsSSO.ts     # Azure AD authentication
│   ├── services/
│   │   ├── graphService.ts    # Microsoft Graph HTTP client
│   │   ├── oneDriveService.ts # OneDrive file operations
│   │   ├── peopleService.ts   # User search & profiles
│   │   └── todoService.ts     # Microsoft To-Do integration
│   ├── stores/
│   │   ├── commentStore.ts    # Comment state (Zustand)
│   │   ├── editorStore.ts     # Editor ref type definitions
│   │   └── fileStore.ts       # File state & recent files
│   ├── extensions/
│   │   ├── CommentMark.ts     # TipTap comment highlight mark
│   │   └── MermaidBlock.tsx   # TipTap mermaid diagram node
│   └── utils/
│       ├── markdown.ts        # Markdown/HTML conversion & comment parsing
│       └── fileHandleStore.ts # IndexedDB persistence for file handles
├── docs/
│   ├── DESIGN.md              # Architecture & design document
│   └── HELP.md                # User guide
├── .env.example               # Environment variable template
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies & scripts
```

## Architecture

MDEdit is a client-side SPA with no backend server:

- **UI**: React 18 + Fluent UI v9
- **Rich text editing**: TipTap (ProseMirror) with custom extensions
- **Code editing**: CodeMirror 6 with Markdown language support
- **State management**: Zustand (lightweight stores)
- **Authentication**: MSAL.js with Nested App Authentication (NAA)
- **API integration**: Microsoft Graph for OneDrive, People, and To-Do
- **Build**: Vite for fast development and optimized production builds

See [docs/DESIGN.md](docs/DESIGN.md) for detailed architecture diagrams and data flow documentation.

## Documentation

| Document | Description |
|----------|-------------|
| [docs/DESIGN.md](docs/DESIGN.md) | Detailed design document with architecture diagrams |
| [docs/HELP.md](docs/HELP.md) | User guide with feature documentation |

## Troubleshooting

### Authentication Issues

**"AADSTS65001: The user or administrator has not consented"**
- Ensure all required Graph permissions are added in Azure AD
- Have an admin grant consent, or users will see a consent prompt on first use

**"Unable to acquire token silently"**
- Expected on first use -- the app will prompt for interactive login
- After initial consent, subsequent sessions should be silent
- If persistent, clear browser cache and try again

**Sign-in popup blocked**
- Ensure popups are allowed for your deployment domain
- In Teams desktop, popups should work automatically

### Teams Issues

**App not loading in Teams**
- Verify `validDomains` in manifest includes your deployment domain
- Check browser console (F12) for CORS or CSP errors
- Ensure `contentUrl` matches your actual deployment URL

**Blank screen after loading**
- Check that `VITE_AAD_CLIENT_ID` is set correctly
- Verify the app builds without errors: `npm run build`

### File Issues

**OneDrive files not loading**
- Verify you're signed in (avatar visible in toolbar)
- Check that `Files.ReadWrite` permission is consented
- Try searching for the file instead of browsing

**Local file "Permission denied"**
- The File System Access API requires user permission for each session
- Click "Allow" when the browser prompts for file access
- Not available inside Teams iframes -- use OneDrive instead

### Build Issues

**TypeScript errors during build**
- Run `npm install` to ensure all dependencies are installed
- Check that `tsconfig.json` is not modified

**Vite build fails**
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and `package-lock.json`, then run `npm install`

## License

MIT
