# MDEdit for Microsoft Teams - Installation Guide

## Download

Download the app package: [mdedit-teams.zip](https://green-sky-0a669861e.1.azurestaticapps.net/mdedit-teams.zip)

## Prerequisites

- Microsoft Teams (desktop or web)
- Your organization must allow custom app sideloading (see [Admin Setup](#admin-setup) if it's not enabled)

## Install the App

### Option 1: Teams Desktop or Web (Recommended)

1. Open **Microsoft Teams**
2. Click the **Apps** icon in the left sidebar (or bottom bar on mobile)
3. Click **Manage your apps** at the bottom of the Apps panel
4. Click **Upload an app**
5. Select **Upload a custom app**
6. Browse to and select the **mdedit-teams.zip** file
7. In the dialog that appears, review the app details and click **Add**
8. MDEdit will now appear in your left sidebar

### Option 2: Direct Link in Teams

1. Open **Microsoft Teams**
2. Click the **...** (More added apps) button in the left sidebar
3. Click **More apps** at the bottom
4. Click **Upload an app** in the bottom-left corner
5. Select **Upload a custom app**
6. Choose the **mdedit-teams.zip** file and click **Add**

## After Installation

- Click the **MDEdit** icon in the left sidebar to open the editor
- Right-click the icon and select **Pin** to keep it visible in your sidebar
- Sign in with your Microsoft account to enable OneDrive file access, @mentions, and task integration

## Features

- WYSIWYG markdown editing with live preview
- Raw markdown editing with syntax highlighting
- OneDrive file open/save
- Inline comments with @mentions
- Mermaid diagram rendering
- Code block syntax highlighting

## Troubleshooting

### "You don't have permission to upload custom apps"

Your Teams admin needs to enable custom app sideloading. See [Admin Setup](#admin-setup) below.

### App shows a blank screen

1. Make sure you're connected to the internet
2. Try refreshing: right-click the MDEdit tab and select **Reload**
3. Clear Teams cache: close Teams, delete `%appdata%\Microsoft\Teams\Cache`, and reopen

### Sign-in issues

- MDEdit uses your Teams identity automatically when running inside Teams
- If prompted, sign in with the same Microsoft account you use for Teams
- For Google sign-in (standalone browser only), ensure pop-ups are allowed

---

## Admin Setup

If your organization doesn't allow custom app sideloading, a Teams administrator needs to enable it:

1. Go to the **Teams admin center** (https://admin.teams.microsoft.com)
2. Navigate to **Teams apps** > **Setup policies**
3. Select the **Global (Org-wide default)** policy (or create a new one)
4. Toggle **Upload custom apps** to **On**
5. Click **Save**

Changes may take a few hours to propagate. The admin can also assign the policy to specific users instead of enabling it org-wide.

## Uninstall

1. Right-click the **MDEdit** icon in the Teams sidebar
2. Select **Uninstall**
3. Confirm the uninstallation
