# MDEdit - Deployment Guide

This guide covers setting up the development environment, configuring authentication providers, building, and deploying MDEdit.

## Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **Azure AD** app registration (instructions below)
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

The app will be available at `https://localhost:3002`.

## Azure AD App Registration

MDEdit uses Azure AD for authentication via OAuth 2.0 with PKCE (no client secrets needed).

### Step 1: Create the App Registration

1. Go to [Azure Portal](https://portal.azure.com) > **Microsoft Entra ID** > **App registrations**
2. Click **New registration**
3. Configure:
   - **Name**: `MDEdit Teams`
   - **Supported account types**: "Accounts in any organizational directory" (multi-tenant) or "Single tenant" for your org only
   - **Redirect URI**: Select **Single-page application (SPA)** and enter `https://localhost:3002`
4. Click **Register**
5. Copy the **Application (client) ID** -- you'll need this

### Step 2: Configure Authentication

1. Go to **Authentication** in your app registration
2. Under **Single-page application** redirect URIs, add:
   ```
   https://localhost:3002/auth-popup.html
   ```
3. Also add your production URL when deploying:
   ```
   https://your-app-name.azurestaticapps.net
   ```
4. Under **Implicit grant and hybrid flows**, ensure both checkboxes are **unchecked** (we use PKCE, not implicit flow)
5. Set **Supported account types** to match your needs

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

### Step 5: Configure for Teams NAA (Nested App Authentication)

To enable seamless SSO inside Teams, you need to expose an API on your app registration:

1. Go to **Expose an API** in your app registration
2. Set the **Application ID URI** to:
   ```
   api://localhost:3002/{your-client-id}
   ```
   Replace `{your-client-id}` with your Application (client) ID.
3. Click **Add a scope**:
   - **Scope name**: `access_as_user`
   - **Who can consent**: Admins and users
   - **Admin consent display name**: `Access MDEdit as the user`
   - **Admin consent description**: `Allow MDEdit to access Microsoft Graph APIs on behalf of the user`
   - **User consent display name**: `Access MDEdit`
   - **User consent description**: `Allow MDEdit to access your Microsoft data`
   - **State**: Enabled
4. Under **Authorized client applications**, add the Teams client IDs and select the `access_as_user` scope:
   - `1fec8e78-bce4-4aaf-ab1b-5451cc387264` (Teams desktop/mobile)
   - `5e3ce6c0-2b1f-4285-8d4b-75ee78787346` (Teams web)

## Google OAuth Setup

Google sign-in is optional and provides an alternative authentication method for the standalone website.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Select **External** user type and click **Create**
5. Fill in the required fields (App name, User support email, Developer contact)
6. No scopes are needed -- MDEdit only uses the ID token for identity
7. Add test users if in testing mode

### Step 2: Create OAuth 2.0 Client ID

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Select **Web application** as the application type
4. Set **Authorized JavaScript Origins**:
   - `https://localhost:3002` (for local development)
   - Your production URL (e.g., `https://mdedit-teams.azurestaticapps.net`)
5. Click **Create** and copy the **Client ID**

### Step 3: Configure Environment

Add the Google Client ID to your `.env` file:

```env
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

Google sign-in will automatically appear as an option when this environment variable is set.

## Local Development

### Basic Development

```bash
npm run dev          # Start dev server at https://localhost:3002
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
devtunnel host -p 3002

# Or using ngrok
ngrok http 3002
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
   | `VITE_GOOGLE_CLIENT_ID` | Your Google OAuth Client ID (optional) |

   > **Note**: Vite environment variables are embedded at build time, not read at runtime. These settings are used by the GitHub Actions build step. If you deploy manually, set them before running `npm run build`.

5. The GitHub Action workflow will be auto-created. Push to trigger a build.

### SPA Routing Configuration

Azure Static Web Apps needs a fallback route for client-side routing. Create a `staticwebapp.config.json` in the project root:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.ico", "/*.png", "/*.svg"]
  }
}
```

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
    VITE_AAD_TENANT_ID=common \
    VITE_GOOGLE_CLIENT_ID=your-google-client-id
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

### Post-Deployment: Update Auth Providers

After deploying, update redirect URIs for each auth provider:

1. **Azure AD**: Go to Azure Portal > your App Registration > **Authentication**
   - Under SPA redirect URIs, add: `https://mdedit-teams.azurestaticapps.net`
   - Update the Application ID URI under **Expose an API** to include your production domain:
     `api://mdedit-teams.azurestaticapps.net/{your-client-id}`
2. **Google OAuth** (if using): Go to Google Cloud Console > your OAuth Client
   - Add your production URL to **Authorized JavaScript Origins**

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

## Building the VS Code Extension

### Build from Source

```bash
# Build the SPA + copy to extension + build extension host
npm run build:vscode

# Package as .vsix
npm run package:vscode
```

The VSIX file will be at `vscode-extension/mdedit-vscode-1.0.0.vsix`.

### Build Steps (manual)

```bash
# 1. Build the SPA
npm run build

# 2. Copy dist/ into the extension's media/ folder
node scripts/copy-dist-to-vscode.mjs

# 3. Build the extension host
cd vscode-extension && npm install && npm run build

# 4. Package
npx @vscode/vsce package --allow-missing-repository
```

### Extension Architecture

The VS Code extension bundles the entire SPA inside the VSIX -- no server needed. Network calls go directly from the webview to Microsoft Graph.

```
vscode-extension/
  src/
    extension.ts            # Commands + custom editor registration
    webviewPanel.ts         # Standalone WebviewPanel creation
    customEditorProvider.ts # CustomTextEditorProvider for .md files
    messageHandler.ts       # Auth, file open/save message handling
    auth.ts                 # VS Code authentication API wrapper
  media/                    # Built SPA (copied from dist/)
  out/                      # Compiled extension host
```

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
4. Add environment variables: `VITE_AAD_CLIENT_ID=your-client-id` and optionally `VITE_GOOGLE_CLIENT_ID=your-google-client-id`

For any deployment, remember to:
- Add the deployment URL as an SPA redirect URI in Azure AD
- Add the deployment URL to Google OAuth Authorized JavaScript Origins (if using)
- Update `manifest.json` with the correct URLs
- Update `validDomains` in the manifest

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

### Build Issues

**TypeScript errors during build**
- Run `npm install` to ensure all dependencies are installed
- Check that `tsconfig.json` is not modified

**Vite build fails**
- Ensure Node.js 18+ is installed: `node --version`
- Delete `node_modules` and `package-lock.json`, then run `npm install`

**VS Code extension packaging fails (Node 18)**
- The `@vscode/vsce` tool pulls `undici` which needs Node 20+
- The `vscode-extension/package.json` includes an `overrides` workaround for Node 18
- If issues persist, use Node 20+ or run `rm -rf node_modules package-lock.json && npm install` in the vscode-extension directory

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
