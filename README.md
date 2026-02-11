# NeuralWeb

An AI-powered desktop web browser built with Electron, React, and TypeScript. Each tab runs as a separate BrowserView with a local Ollama-backed AI assistant.

## Quick Start

```bash
npm install
make dev
```

## Architecture

**Two-process model:**

- **Main process** (`electron/`) — Node.js. Manages windows, BrowserViews, IPC, data persistence, and the Ollama sidecar.
- **Renderer process** (`src/`) — React. Renders browser chrome only. Web content lives in BrowserViews, not React.
- **IPC bridge** (`electron/preload.ts`) — Context-isolated bridge via `window.electron.invoke()` / `window.electron.on()`.

### Project Structure

```
neural-web/
├── electron/                # Main process
│   ├── main.ts              # Window management, IPC handlers, app lifecycle
│   ├── TabManager.ts        # BrowserView tab lifecycle & navigation
│   ├── preload.ts           # Secure IPC bridge
│   ├── managers/
│   │   ├── OllamaManager.ts # Ollama sidecar lifecycle
│   │   ├── AIManager.ts     # LLM query routing via Ollama
│   │   ├── BookmarksManager.ts
│   │   ├── HistoryManager.ts
│   │   ├── DownloadManager.ts
│   │   ├── SessionManager.ts
│   │   ├── SettingsManager.ts
│   │   ├── PasswordManager.ts
│   │   ├── PermissionsManager.ts
│   │   ├── ExtensionsManager.ts
│   │   ├── ReaderManager.ts
│   │   └── AdBlockerManager.ts
│   └── utils/
│       └── Store.ts         # JSON file persistence
├── src/                     # Renderer process
│   ├── App.tsx              # Root component, tab state
│   ├── components/
│   │   ├── BrowserChrome.tsx # Chrome container
│   │   ├── TabBar.tsx
│   │   ├── AddressBar.tsx
│   │   ├── NavigationControls.tsx
│   │   ├── BookmarksBar.tsx
│   │   ├── BrowserMenu.tsx
│   │   ├── AISidebar.tsx
│   │   ├── Omnibar.tsx
│   │   ├── FindInPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── BookmarksPage.tsx
│   │   ├── HistoryPage.tsx
│   │   ├── DownloadsPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── SiteSettingsPage.tsx
│   │   └── ExtensionsPage.tsx
│   └── electron.d.ts       # IPC channel type definitions
└── package.json
```

## Features

### Browser
- Multi-tab support via BrowserView (no iframe/X-Frame-Options issues)
- Full navigation (back, forward, refresh, home)
- Address bar with SSL indicators
- Tab groups with color coding
- Tab pinning and muting
- Bookmarks and bookmarks bar
- Browsing history with search
- Download manager
- Session save/restore
- Find in page
- Zoom controls and print
- Reader mode
- Ad blocker
- Incognito mode (separate session partition)
- Multiple windows
- Extension loading

### AI
- Local AI assistant via Ollama sidecar (`llama3.2:1b`)
- Ollama binary auto-downloaded on first launch
- AI sidebar with chat interface
- IPC channels for status, model listing, and model pulling

### Internal Pages
Built-in pages via `neuralweb://` scheme: home, bookmarks, history, downloads, settings, site settings, extensions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 28 |
| UI | React 18, TypeScript, Tailwind CSS |
| Bundler | Vite 5 |
| AI | Ollama (via electron-ollama) |
| Icons | lucide-react |
| Persistence | JSON files in `app.getPath('userData')` |

## Development

```bash
make dev          # Start dev environment (Vite HMR + Electron)
make build        # Compile TypeScript + Vite build
make package      # Build + package with electron-builder
make clean        # Remove dist/ and release/ directories
```

Hot reload is enabled for renderer changes. Restart Electron for main process changes.

## License

MIT
