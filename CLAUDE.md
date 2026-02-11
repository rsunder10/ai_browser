# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeuralWeb is an AI-powered desktop web browser built with Electron 28, React 18, TypeScript, and Tailwind CSS. Each browser tab runs as a separate Electron BrowserView (not WebView), while the browser chrome (tabs, address bar, menus) is a React app in the renderer process.

## Commands

```bash
npm run dev          # Start dev environment (Vite HMR + Electron concurrently)
npm run dev:vite     # Vite dev server only (port 5173)
npm run dev:electron # Compile and launch Electron only
npm run build        # Compile TypeScript + Vite build to dist/
npm run build:all    # Build + package with electron-builder
```

No test runner or linter is configured.

## Architecture

### Two-Process Model

**Main process** (`electron/`): Node.js — manages windows, BrowserViews, IPC handlers, and all data persistence. Entry point is `electron/main.ts`.

**Renderer process** (`src/`): React — renders browser UI only. Entry point is `src/main.tsx` → `src/App.tsx`. Real web content is displayed in BrowserViews managed by the main process, not rendered by React.

**IPC bridge** (`electron/preload.ts`): Context-isolated bridge exposing `window.electron.invoke()` and `window.electron.on()`. All allowed IPC channels are typed in `src/electron.d.ts`.

### Main Process — Manager Pattern

`electron/main.ts` instantiates feature managers and wires them to IPC handlers:

- **TabManager** (`electron/TabManager.ts`) — Core class managing BrowserView lifecycle, tab switching, navigation, tab groups, pinning, muting. One instance per window.
- **Feature managers** (`electron/managers/`) — BookmarksManager, HistoryManager, SettingsManager, DownloadManager, SessionManager, PasswordManager, PermissionsManager, AIManager, ExtensionsManager, ReaderManager, AdBlockerManager. Each encapsulates its own logic and persistence.
- **Store** (`electron/utils/Store.ts`) — JSON file-based persistence to `app.getPath('userData')`.

Multiple windows are supported: `windows` and `tabManagers` Maps keyed by window ID.

### Renderer — Component Structure

`src/App.tsx` holds top-level state (tabs, active tab, incognito mode) and renders:
- `BrowserChrome` — container for TabBar, AddressBar, NavigationControls, BookmarksBar, BrowserMenu
- Built-in pages routed by `neuralweb://` URLs: HomePage, BookmarksPage, HistoryPage, DownloadsPage, SettingsPage, SiteSettingsPage, ExtensionsPage
- AISidebar, FindInPage, Omnibar as overlay components

### Internal URLs

The browser uses `neuralweb://` scheme for built-in pages (home, bookmarks, history, downloads, settings, extensions). These are rendered as React components in the renderer, not loaded as real URLs.

### Key Conventions

- IPC channel naming: feature-scoped with colons (e.g., `bookmarks:get`, `history:clear`, `find:start`)
- Tab groups: color-coded, stored by group ID on each tab
- Session restore: SessionManager saves/restores open tabs, groups, scroll positions, and per-tab navigation history
- Styling: Tailwind CSS utility classes; component-specific CSS files where needed
- Icons: lucide-react library
