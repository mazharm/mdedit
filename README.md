# MDEdit Teams Add-in

A Microsoft Teams Personal Tab add-in that brings MDEdit's markdown editing capabilities into Teams. Uses **Nested App Authentication (NAA)** for a fully client-side deployment with no backend server required.

## Features

- **Full WYSIWYG + Markdown split editor** - Same rich editing experience as MDEdit desktop
- **Comments with @mentions** - Collaborate with teammates using Microsoft 365 authentication
- **Task assignment** - Create tasks in Microsoft To-Do from comments
- **OneDrive file access** - Open and save markdown files from OneDrive
- **Local file support** - Also supports local files via File System Access API
- **mdedit compatible** - Comment format fully compatible with MDEdit desktop app
- **No backend required** - Fully client-side using Nested App Authentication (NAA)

## Prerequisites

- Node.js 18+
- Azure AD app registration (SPA)
- Microsoft Teams (desktop or web)

## Setup

### 1. Azure AD App Registration (SPA - No Backend)

1. Go to [Azure Portal](https://portal.azure.com) > Azure Active Directory > App registrations
2. Click "New registration"
3. Enter:
   - Name: `MDEdit Teams`
   - Supported account types: "Accounts in any organizational directory" (multi-tenant)
   - Redirect URI: Select "Single-page application (SPA)" and enter:
     - `https://localhost:3000` (for development)
4. After creation, note the **Application (client) ID**
5. Go to "Authentication":
   - Add additional SPA redirect URIs for your deployed domain:
     - `https://your-deployed-domain.com`
   - Under "Implicit grant and hybrid flows", ensure both options are **unchecked** (we use PKCE)
6. Go to "API permissions" and add Microsoft Graph **Delegated** permissions:
   - `User.Read` - Sign in and read user profile
   - `User.ReadBasic.All` - Read basic profiles of all users
   - `People.Read` - Read users' relevant people lists
   - `Files.ReadWrite` - Read and write user files
   - `Tasks.ReadWrite` - Read and write user tasks
7. Click "Grant admin consent" if you have admin rights, or users will consent individually

**Note:** No "Expose an API" configuration is needed for NAA - it's purely client-side!

### 2. Local Development Setup

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your Azure AD client ID
# VITE_AAD_CLIENT_ID=your-client-id-here
# VITE_AAD_TENANT_ID=common

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

For testing in Teams, you'll need HTTPS. You can use:
- `npm run dev:https` (requires SSL certificates in `certs/` folder)
- Or use a tunneling service like ngrok

### 3. Teams App Setup

1. Generate a unique GUID for your app ID (e.g., using `uuidgen` or an online generator)

2. Update `manifest/manifest.json`:
   - Replace `{{APP_ID}}` with your generated GUID
   - Replace `{{HOSTNAME}}` with your deployment domain (or use ngrok URL for dev)

3. Create app icons:
   - `manifest/color.png` - 192x192 color icon
   - `manifest/outline.png` - 32x32 outline icon (white on transparent)

4. Create Teams app package:
   ```bash
   cd manifest
   zip -r ../mdedit-teams.zip manifest.json color.png outline.png
   ```

5. Upload to Teams:
   - Go to Teams > Apps > Manage your apps
   - Click "Upload an app" > "Upload a custom app"
   - Select `mdedit-teams.zip`

## Development

```bash
# Start dev server
npm run dev

# Start dev server with HTTPS (for Teams testing)
npm run dev:https

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Deployment (Static Hosting)

Since this is a client-only app, you can deploy to any static hosting service:

### GitHub Pages

1. Build: `npm run build`
2. Deploy `dist/` folder to GitHub Pages
3. Update manifest with your GitHub Pages URL

### Azure Static Web Apps

1. Create a Static Web App in Azure Portal
2. Connect to your GitHub repository
3. Configure build:
   - App location: `/`
   - Output location: `dist`
4. Update manifest with your Static Web App URL

### Netlify / Vercel / Cloudflare Pages

1. Connect your repository
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variable: `VITE_AAD_CLIENT_ID`
5. Update manifest with your deployment URL

## Authentication Flow (NAA)

Nested App Authentication allows Teams tabs to authenticate without a backend:

1. App initializes MSAL with `createNestablePublicClientApplication()`
2. Teams acts as a broker, providing seamless SSO
3. Tokens are acquired directly in the browser
4. All Graph API calls are made client-side using `fetch()`

This means:
- No backend server needed
- No token exchange endpoints
- Simpler deployment (static hosting)
- Full offline capability for local files

## Comment Format

Comments are stored in mdedit-compatible format:

**Inline markers:**
```markdown
<!--MDEDIT_COMMENT_START:uuid-->highlighted text<!--MDEDIT_COMMENT_END:uuid-->
```

**Data block (end of file):**
```html
<!--MDEDIT_COMMENTS_DATA
[{
  "id": "uuid",
  "text": "Comment text",
  "author": {"id": "...", "name": "...", "email": "..."},
  "mentions": [{"id": "...", "name": "...", "email": "..."}],
  "assignedTo": {"id": "...", "name": "...", "email": "..."},
  "resolved": false,
  "replies": []
}]
MDEDIT_COMMENTS_DATA-->
```

## Troubleshooting

### "AADSTS65001: The user or administrator has not consented"
- Ensure all required permissions are added in Azure AD
- Have an admin grant consent, or users will see a consent prompt on first use

### "Unable to acquire token silently"
- This is expected on first use - the app will prompt for interactive login
- After initial consent, subsequent sessions should be silent

### App not loading in Teams
- Ensure your manifest `validDomains` includes all required domains
- Check browser console for CORS or CSP errors
- Verify the `contentUrl` in manifest matches your deployment URL

## License

MIT
