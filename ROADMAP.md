# NeuralWeb Roadmap

## Phase 1 — AI Deep Integration (The Differentiator) ✅ COMPLETE

These features leverage the existing Ollama integration and make AI the core identity of the browser.

### ✅ 1.1 Page-Aware AI Chat
- Injects current page content as context into every AI sidebar conversation
- `getActiveTabContent()` extracts page text, wired as a system message
- Users can ask "What's the return policy?" while reading any page
- **Files:** `electron/managers/AIManager.ts`, `src/components/AISidebar.tsx`

### ✅ 1.2 Smart Tab Grouping
- "Organize Tabs" button sends all open tab titles/URLs to the LLM
- LLM returns suggested groups with names and colors
- User confirms or adjusts, then tabs are auto-grouped
- **Files:** `electron/TabManager.ts`, `electron/managers/AIManager.ts`, `src/components/TabBar.tsx`

### ✅ 1.3 Multi-Tab Synthesis
- Select multiple tabs and ask "Compare these", "Summarize my research"
- Extract content from 2-5 tabs, concatenate, and send to LLM
- Results displayed in AI sidebar with source attribution
- **Files:** `electron/TabManager.ts`, `electron/managers/AIManager.ts`, `src/components/AISidebar.tsx`

### ✅ 1.4 Inline Page Translation
- Right-click context menu → "Translate this page" (8 languages)
- Extract page text, batch translate via LLM, inject translated HTML back
- Fully local and private — no cloud API needed
- **Files:** `electron/TabManager.ts`, `electron/managers/AIManager.ts`

### ✅ 1.5 AI-Powered Omnibar Answers
- When the user types a question in the Omnibar, shows a quick AI answer inline
- Distinguishes questions from navigation using keyword detection
- Streams a short answer directly in the Omnibar dropdown
- **Files:** `src/components/Omnibar.tsx`, `electron/managers/AIManager.ts`

---

## Phase 2 — Privacy & Security Suite ✅ COMPLETE

NeuralWeb as the privacy-first AI browser. Local AI is the foundation — extended to all data handling.

### ✅ 2.1 Tracker Dashboard
- AdBlockerManager categorizes blocked requests: ads, analytics, fingerprinting, social trackers
- Shield icon in the address bar showing blocked count per page
- `neuralweb://privacy` page with per-site breakdown and totals
- **Files:** `electron/managers/AdBlockerManager.ts`, `src/components/AddressBar.tsx`, `src/components/PrivacyPage.tsx`

### ✅ 2.2 Container Tabs (Site Isolation)
- Tab groups can use isolated Electron sessions (separate cookies, storage, login state)
- Visual indicator (colored bar) on container tabs
- **Files:** `electron/TabManager.ts`, `src/components/TabBar.tsx`

### ✅ 2.3 Cookie Manager
- `neuralweb://cookies` page listing all cookies by domain
- View, search, and delete individual cookies
- Auto-clear cookies on tab close (per-site setting)
- **Files:** `electron/main.ts`, `src/components/CookiesPage.tsx`

### ✅ 2.4 HTTPS-Only Mode
- Setting to auto-upgrade all HTTP requests to HTTPS
- Warning interstitial when HTTPS fails with "Proceed Anyway"
- **Files:** `electron/managers/SettingsManager.ts`, `electron/TabManager.ts`

### ✅ 2.5 Certificate Viewer
- Click the lock icon in the address bar to view TLS certificate details
- Shows issuer, expiration, subject, fingerprint
- Warns on self-signed or expiring certificates
- **Files:** `src/components/AddressBar.tsx`, `electron/main.ts`

---

## Phase 3 — Productivity & Workspaces ✅ COMPLETE

Turn the browser into a workspace tool, not just a page viewer.

### ✅ 3.1 Workspaces
- Named workspace configurations that save and restore a set of tabs and groups
- Save current tabs as a workspace, load any workspace to switch contexts
- Workspace switcher accessible from the toolbar (Layers icon)
- **Files:** `electron/managers/WorkspaceManager.ts`, `src/components/WorkspaceSwitcher.tsx`, `src/components/BrowserChrome.tsx`

### ✅ 3.2 Reading List
- Separate from bookmarks — a "Read Later" queue with unread/read state
- Add via address bar button (ListPlus icon) or browser menu
- `neuralweb://reading-list` page with card-style layout and filters
- **Files:** `electron/managers/ReadingListManager.ts`, `src/components/ReadingListPage.tsx`, `src/components/AddressBar.tsx`

### 3.3 Split View
- Side-by-side tabs in a single window using two BrowserViews
- Drag a tab to the right edge to activate split mode
- Adjustable divider between panes
- **Files:** `electron/TabManager.ts`, `src/App.tsx`, `src/App.css`

### 3.4 Web Clipper & Annotations
- Highlight text on any page, add notes, save clips to a local collection
- Clips stored with source URL, timestamp, and user notes
- `neuralweb://clips` page to browse and search all saved clips
- AI can summarize your collected highlights
- **Files:** new `electron/managers/ClipsManager.ts`, `electron/TabManager.ts`, new `src/components/ClipsPage.tsx`

### ✅ 3.5 Extended Omnibar Commands
- 19 action commands in the Omnibar beyond navigation:
  - New Tab, Settings, History, Bookmarks, Downloads, Extensions
  - Clear History, Zoom In/Out/Reset, Print, DevTools, AI Assistant
  - New Incognito Window, Toggle Ad Blocker, Reading List, Privacy Dashboard, Manage Cookies
- Each command is a registered action with a label, icon, and handler
- **Files:** `src/components/Omnibar.tsx`

---

## Phase 4 — UX Polish & Visual Features

These are the details that make users *feel* the browser is high quality.

### ✅ 4.1 Tab Drag & Drop Reordering
- Drag tabs to reorder in the tab bar
- Visual drop indicator during drag
- Persisted via `tabs:reorder` IPC handler
- **Files:** `src/components/TabBar.tsx`, `electron/TabManager.ts`

### 4.2 Tab Hover Previews
- Capture tab thumbnail via `BrowserView.webContents.capturePage()`
- Show preview tooltip on tab hover with a 200ms delay
- Cache thumbnails and refresh on navigation
- **Files:** `electron/TabManager.ts`, `src/components/TabBar.tsx`

### 4.3 Vertical Tabs Mode
- Optional sidebar tab list (like Arc/Edge) on the left side
- Collapsible with tab titles, favicons, and group headers
- Toggle between horizontal and vertical via settings
- AI sidebar stays on the right
- **Files:** new `src/components/VerticalTabBar.tsx`, `src/App.tsx`, `electron/TabManager.ts`

### 4.4 Picture-in-Picture
- Detect `<video>` elements on a page
- Show a PiP button overlay on video hover
- Floating video window persists across tab switches
- Uses Electron's `BrowserWindow` for the floating player
- **Files:** `electron/TabManager.ts`, `electron/main.ts`

### 4.5 Built-in Screenshots
- Cmd+Shift+S to capture visible area or full page
- Annotation overlay: draw, highlight, add text, crop
- Save to disk or copy to clipboard
- **Files:** `electron/TabManager.ts`, new `src/components/ScreenshotEditor.tsx`

### ✅ 4.6 Theme Customization
- 3 base themes: system/light/dark
- 8 accent colors: Blue, Purple, Pink, Red, Orange, Green, Teal, Cyan
- 5 preset themes: Default, Ocean, Forest, Sunset, Midnight
- CSS custom properties driven by settings
- **Files:** `electron/managers/SettingsManager.ts`, `src/components/SettingsPage.tsx`, `src/App.css`, `src/App.tsx`

---

## Phase 5 — Power User & Advanced Features

Features for users who live in their browser.

### 5.1 Profiles
- Separate browsing profiles (Work, Personal, Kids) with independent data stores
- Each profile has its own bookmarks, history, passwords, extensions, and AI chat history
- Profile switcher in the title bar
- Uses separate Electron sessions and Store directories per profile
- **Files:** new `electron/managers/ProfileManager.ts`, `electron/main.ts`, `electron/utils/Store.ts`

### 5.2 Custom Search Engines
- Add any search engine with a `%s` URL pattern
- Assign keyword shortcuts (e.g., `g query` for Google, `w query` for Wikipedia)
- Manage from settings page
- **Files:** `electron/managers/SettingsManager.ts`, `src/components/SettingsPage.tsx`, `src/App.tsx`

### 5.3 Performance Monitor
- Per-tab memory usage, CPU usage, and network request count
- Accessible from tab context menu or `neuralweb://performance`
- Identify and highlight resource-heavy tabs
- Uses `process.getProcessMemoryInfo()` and webContents metrics
- **Files:** new `src/components/PerformancePage.tsx`, `electron/TabManager.ts`

### 5.4 Userscript Support
- Load and manage custom JavaScript that runs on matching URLs
- Compatible with Greasemonkey/Tampermonkey script format
- Script manager page at `neuralweb://scripts`
- Inject via `webContents.executeJavaScript()` on page load
- **Files:** new `electron/managers/UserscriptManager.ts`, `electron/TabManager.ts`, new `src/components/ScriptsPage.tsx`

### 5.5 Keyboard Shortcut Customization
- Let users rebind all keyboard shortcuts
- Settings page with shortcut editor (press keys to record)
- Stored in settings, loaded at startup
- **Files:** `electron/managers/SettingsManager.ts`, `src/components/SettingsPage.tsx`, `src/App.tsx`, `electron/TabManager.ts`

### 5.6 Sync via File / Cloud
- Extend SyncManager to support automatic sync via a shared folder (Dropbox, iCloud Drive, etc.)
- Set a sync directory in settings; browser reads/writes sync files automatically
- Conflict resolution with timestamps
- **Files:** `electron/managers/SyncManager.ts`, `src/components/SettingsPage.tsx`

---

## Phase 6 — Production Readiness

Ship-quality infrastructure.

### 6.1 Auto-Update
- Integrate `electron-updater` for seamless background updates
- Update notification in the toolbar with "Restart to update" prompt
- **Files:** `electron/main.ts`, new update logic

### 6.2 Code Signing
- macOS notarization and Windows Authenticode signing
- CI/CD pipeline for signed builds on every release
- **Files:** `electron-builder` config, CI workflow files

### 6.3 Crash Reporting
- Capture and report renderer/main process crashes
- Local crash log viewer at `neuralweb://crashes`
- Optional opt-in remote reporting
- **Files:** `electron/main.ts`, new `src/components/CrashesPage.tsx`

### 6.4 Onboarding Flow
- First-run wizard: set default search engine, import bookmarks from Chrome/Firefox, pick theme
- Tutorial tooltips highlighting key features (AI sidebar, Omnibar, workspaces)
- **Files:** new `src/components/OnboardingWizard.tsx`

---

## Phase Summary

| Phase | Theme | Done | Total | Status |
|-------|-------|------|-------|--------|
| **1** | AI Deep Integration | 5 | 5 | ✅ Complete |
| **2** | Privacy & Security | 5 | 5 | ✅ Complete |
| **3** | Productivity | 3 | 5 | 🟡 In Progress |
| **4** | UX Polish | 2 | 6 | 🟡 In Progress |
| **5** | Power User | 0 | 6 | ⬜ Not Started |
| **6** | Production | 0 | 4 | ⬜ Not Started |
| | **Total** | **15** | **31** | **48%** |

### Next Priorities
1. **Split View** (3.3) — High impact for productivity users
2. **Tab Hover Previews** (4.2) — Quick win for polish
3. **Picture-in-Picture** (4.4) — Expected modern browser feature
4. **Custom Search Engines** (5.2) — Power user table stakes
5. **Onboarding Flow** (6.4) — Critical for new user retention
