# CLAUDE.md — AI Assistant Guide for NeuralWeb Browser

## Project Overview

NeuralWeb is a desktop web browser built with **Electron 28 + React 18 + TypeScript 5 + Vite 5**. It uses Electron's `BrowserView` API for true multi-tab browsing within a single window. The renderer (React) communicates with the main process (Electron/Node.js) exclusively through a secure IPC bridge.

## Repository Structure

```
ai_browser/
├── electron/                  # Main process (Node.js backend)
│   ├── main.ts               # App lifecycle, window management, IPC handlers
│   ├── TabManager.ts         # BrowserView tab creation, navigation, lifecycle
│   ├── preload.ts            # IPC security bridge (context isolation)
│   ├── tsconfig.json         # Backend TypeScript config (CommonJS output)
│   ├── managers/             # Feature-specific manager classes
│   │   ├── AIManager.ts      # AI query processing (mock responses)
│   │   ├── AdBlockerManager.ts
│   │   ├── BookmarksManager.ts
│   │   ├── DownloadManager.ts
│   │   ├── ExtensionsManager.ts
│   │   ├── HistoryManager.ts
│   │   ├── PasswordManager.ts
│   │   ├── PermissionsManager.ts
│   │   ├── ReaderManager.ts
│   │   ├── SessionManager.ts
│   │   └── SettingsManager.ts
│   ├── pages/
│   │   └── crash.html        # Crash recovery page
│   └── utils/
│       └── Store.ts          # Generic JSON file persistence
├── src/                      # Renderer process (React frontend)
│   ├── App.tsx               # Root component, tab state management
│   ├── App.css               # Global styles + Tailwind imports
│   ├── main.tsx              # React entry point
│   ├── electron.d.ts         # IPC type definitions
│   └── components/           # 25 React component files
│       ├── BrowserChrome.tsx  # Browser frame (tabs + address bar + controls)
│       ├── TabBar.tsx         # Tab strip rendering
│       ├── AddressBar.tsx     # URL input with suggestions
│       ├── NavigationControls.tsx
│       ├── AISidebar.tsx      # AI assistant panel
│       ├── FindInPage.tsx     # Ctrl+F search overlay
│       ├── HomePage.tsx       # neuralweb://home landing page
│       ├── HistoryPage.tsx    # neuralweb://history
│       ├── BookmarksPage.tsx  # neuralweb://bookmarks
│       ├── DownloadsPage.tsx  # neuralweb://downloads
│       ├── SettingsPage.tsx   # neuralweb://settings
│       ├── SiteSettingsPage.tsx
│       ├── ExtensionsPage.tsx
│       ├── BookmarksBar.tsx
│       ├── BrowserMenu.tsx    # Hamburger menu
│       ├── Omnibar.tsx
│       ├── TabContent.tsx
│       └── WebViewContainer.tsx
├── package.json              # Dependencies, scripts, electron-builder config
├── tsconfig.json             # Frontend TypeScript config (ESNext, strict)
├── vite.config.ts            # Vite config (React plugin, relative base)
├── tailwind.config.js        # Tailwind CSS (scans src/**/*.{js,ts,jsx,tsx})
├── postcss.config.cjs        # PostCSS (Tailwind + Autoprefixer)
├── index.html                # HTML entry point
├── test-logic.ts             # Manual mock-based tests
├── test-bookmarks.ts         # Bookmark test stubs
├── walkthrough.md            # Manual feature verification guide
└── suggested_features.md     # Feature roadmap
```

## Architecture

### Dual-Process Model

```
┌──────────────────────────────────┐
│         Main Process             │
│  (electron/main.ts)              │
│                                  │
│  ┌─────────────┐ ┌───────────┐  │
│  │ TabManager   │ │ Managers  │  │
│  │ (BrowserView)│ │ (11 total)│  │
│  └──────┬───────┘ └─────┬─────┘  │
│         │    IPC         │        │
├─────────┼────────────────┼────────┤
│         │  preload.ts    │        │
│  ┌──────┴────────────────┴─────┐  │
│  │     Renderer Process        │  │
│  │  (React via src/App.tsx)    │  │
│  │  window.electron.invoke()   │  │
│  └─────────────────────────────┘  │
└──────────────────────────────────┘
```

- **Main process** (`electron/`): Manages BrowserWindow, BrowserView tabs, IPC handlers, and all persistent state via manager classes.
- **Renderer process** (`src/`): React SPA handles the browser chrome UI (tab bar, address bar, settings pages). Communicates with the main process only through `window.electron.invoke()` and `window.electron.on()`.
- **Preload bridge** (`electron/preload.ts`): Whitelists ~66 IPC channels. Context isolation is enabled — the renderer has no direct access to Node.js APIs.

### Key Design Patterns

- **Manager pattern**: Each feature area (bookmarks, history, downloads, passwords, etc.) has a dedicated manager class in `electron/managers/`. Managers own their state and persistence.
- **Store utility** (`electron/utils/Store.ts`): Generic JSON-file persistence. Each manager uses a Store instance for reading/writing data to `app.getPath('userData')`.
- **Internal protocol**: `neuralweb://` URLs route to built-in React pages (home, settings, history, bookmarks, downloads). Routing is handled in `App.tsx`.
- **BrowserView per tab**: Each tab is a separate Chromium `BrowserView` instance attached to the main window, avoiding X-Frame-Options issues that webview tags encounter.

### Data Storage

All user data persists as JSON files in the platform's userData directory:
- `bookmarks.json` — Recursive tree structure
- `history.json` — Flat list, capped at 5000 entries
- `session.json` — Window/tab state for session restore
- `settings.json` — User preferences
- `downloads.json` — Download history
- `passwords.json` — Stored credentials (plaintext)
- `permissions.json` — Per-site permissions
- `extensions.json` — Extension metadata

## Development Workflow

### Commands

```bash
npm install             # Install dependencies
npm run dev             # Start Vite dev server + Electron concurrently
npm run dev:vite        # Start Vite dev server only (port 5173)
npm run dev:electron    # Compile backend TS + launch Electron
npm run build           # Compile backend TS + build Vite for production
npm run build:all       # Build + package with electron-builder
npm run preview         # Preview production Vite build
```

### Development Mode

1. `npm run dev` starts Vite (port 5173) and Electron concurrently.
2. Frontend changes hot-reload automatically via Vite HMR.
3. **Backend changes require restarting Electron** — kill the process and re-run `npm run dev`.
4. Electron loads the Vite dev server URL in development, the built `dist/` in production.

### Build & Distribution

1. `npm run build` compiles `electron/` to `dist/electron/` (CommonJS) and builds the React app to `dist/`.
2. `npm run build:all` additionally runs `electron-builder` to create platform installers in `release/`.
3. Supported targets: macOS (dmg), Windows (nsis), Linux (AppImage).

## TypeScript Configuration

- **Frontend** (`tsconfig.json`): `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, JSX via `react-jsx`.
- **Backend** (`electron/tsconfig.json`): `target: ES2020`, `module: commonjs`, `strict: true`, outputs to `dist/electron/`.
- Both configs have strict mode enabled.

## Styling

- **Tailwind CSS 3.3** for utility classes — configured in `tailwind.config.js`.
- **PostCSS** with Autoprefixer — configured in `postcss.config.cjs`.
- Global styles and Tailwind directives (`@tailwind base/components/utilities`) are in `src/App.css`.
- VS Code settings suppress `@tailwind` at-rule warnings (`.vscode/settings.json`).

## Testing

- **No formal test framework** is configured (no Jest, Vitest, or Playwright).
- `test-logic.ts` and `test-bookmarks.ts` contain manual verification scripts with mock dependencies.
- `walkthrough.md` documents manual feature verification steps.
- There is no CI/CD pipeline.

## IPC Channel Reference

All IPC communication goes through the preload bridge. The whitelist in `electron/preload.ts` defines valid channels:

**Invoke channels** (request/response via `window.electron.invoke`):
- Tab management: `create-tab`, `close-tab`, `switch-tab`, `navigate-tab`, `go-back`, `go-forward`, `refresh-tab`, `get-tabs`, `get-active-tab`
- Bookmarks: `bookmarks:get`, `bookmarks:add`, `bookmarks:remove`, `bookmarks:check`, `bookmarks:getByUrl`
- History: `history:get`, `history:clear`, `history:search`
- Downloads: `downloads:get-history`, `downloads:pause`, `downloads:resume`, `downloads:cancel`, `downloads:open-file`, `downloads:clear`
- Settings: `settings:get`, `settings:set`
- Passwords: `passwords:save`, `passwords:get`, `passwords:list`, `passwords:delete`
- Permissions: `permissions:get-all`, `permissions:set`, `permissions:clear`
- Find: `find:start`, `find:stop`, `find:next`, `find:prev`
- Zoom: `zoom:set`, `zoom:get`, `zoom:reset`
- AI: `ai_query`
- Reader/AdBlocker: `reader:toggle`, `reader:status`, `adblocker:toggle`, `adblocker:status`
- Tab groups: `tabs:create-group`, `tabs:add-to-group`, `tabs:remove-from-group`, `tabs:get-groups`, `tabs:delete-group`
- Other: `print:page`, `open-devtools`, `create-incognito-window`, `is-incognito`, `open-browser-menu`, `get-top-sites`, `extensions:get`, `extensions:install`, `extensions:remove`, `tabs:show-context-menu`, `tabs:set-visibility`

**Event channels** (push via `window.electron.on`):
- `tab-updated` — Tab properties changed (URL, title, loading state)
- `trigger-find` — Keyboard shortcut triggered find-in-page
- `show-create-group-dialog` — Show tab group creation UI

## Conventions for AI Assistants

### Code Style
- TypeScript strict mode in both processes. Do not use `any` without justification.
- React components use functional style with hooks (`useState`, `useEffect`).
- Tailwind utility classes for styling — avoid writing custom CSS unless necessary.
- Icons from `lucide-react` — do not add other icon libraries.

### Adding New Features
1. **Backend feature**: Create a new manager in `electron/managers/`, register IPC handlers in `electron/main.ts`, add channels to the whitelist in `electron/preload.ts`.
2. **Frontend feature**: Add components in `src/components/`, wire IPC calls through `window.electron.invoke()`.
3. **Internal page**: Add a `neuralweb://` route in `App.tsx` and a corresponding page component.
4. **New IPC channel**: Must be added to three places: the handler in `main.ts`, the channel whitelist in `preload.ts`, and the type definition in `src/electron.d.ts`.

### Important Constraints
- The renderer has no access to Node.js APIs — all system interactions must go through IPC.
- `BrowserView` is used for tabs, not `<webview>` tags. Tab management lives in `TabManager.ts`.
- Session state auto-saves on tab changes. Be careful modifying `SessionManager.ts` to avoid data loss.
- Passwords are stored in plaintext — do not expand password features without addressing encryption first.

### File Naming
- Manager classes: `PascalCaseManager.ts` in `electron/managers/`
- React components: `PascalCase.tsx` in `src/components/`
- Utility files: `PascalCase.ts` in `electron/utils/`

### What Not to Do
- Do not add Node.js `require()` or `import` of Node modules in `src/` files.
- Do not bypass the IPC channel whitelist in `preload.ts`.
- Do not introduce a new CSS framework or replace Tailwind.
- Do not add a state management library (Redux, Zustand) — the current hooks-based approach is intentional.
