# Suggested Features for NeuralWeb Browser

Based on a comprehensive review of the codebase, the following features are recommended to enhance the browser's functionality and user experience.

## Completed / Implemented Features
- [x] **Global History**: `HistoryPage` and backend logic implemented.
- [x] **Find in Page**: UI and IPC handlers implemented.
- [x] **Zoom Controls**: Menu and shortcuts implemented.
- [x] **Print Support**: Basic print functionality implemented.
- [x] **Site Settings**: Permissions management implemented.
- [x] **Custom Search Engines**: Configurable in Settings (Google, DuckDuckGo, Bing).
- [x] **Incognito Mode**: Implemented.
- [x] **AI Assistant Backend**: Full Ollama integration with streaming.
- [x] **Reader Mode**: Implemented with toggle button.
- [x] **Ad Blocker**: Implemented with `AdBlockerManager` and UI toggle.
- [x] **Session Restore Polish**: Scroll position and history state preserved.
- [x] **Crash Handling**: "Aw, Snap!" page implemented.
- [x] **Page-Aware AI Chat**: Injects page content into AI conversations.
- [x] **Smart Tab Grouping**: AI-powered tab organization.
- [x] **Multi-Tab Synthesis**: Compare/summarize content across tabs.
- [x] **Inline Page Translation**: Local LLM-powered translation (8 languages).
- [x] **AI Omnibar Answers**: Inline AI answers for questions.
- [x] **Tracker Dashboard**: Categorized blocked request stats at `neuralweb://privacy`.
- [x] **Container Tabs**: Isolated sessions per tab group.
- [x] **Cookie Manager**: Full CRUD at `neuralweb://cookies`.
- [x] **HTTPS-Only Mode**: Auto-upgrade with interstitial warning.
- [x] **Certificate Viewer**: Lock icon shows TLS certificate details.
- [x] **Workspaces**: Named tab/group configurations, save and restore.
- [x] **Reading List**: Read-later queue with unread/read state at `neuralweb://reading-list`.
- [x] **Extended Omnibar Commands**: 19 commands including ad blocker toggle, privacy dashboard.
- [x] **Tab Drag & Drop**: Reorder tabs by dragging.
- [x] **Theme Customization**: 8 accent colors + 5 theme presets (Ocean, Forest, Sunset, Midnight).
- [x] **Data Sync**: Export/import via JSON files.

## In Progress / Partial
- [ ] **Extensions Support**:
    - **Current State**: Developer mode (loading unpacked extensions) is implemented.
    - **Next Steps**: Support for CRX files or Chrome Web Store integration (complex).

## Next Suggestions

### High Priority
- **Split View**: Side-by-side tabs using two BrowserViews.
- **Tab Hover Previews**: Thumbnail preview on tab hover via `capturePage()`.
- **Picture-in-Picture**: Floating video player that persists across tabs.
- **Custom Search Engines**: User-defined engines with `%s` patterns and keyword shortcuts.
- **Onboarding Flow**: First-run wizard for setup and feature tour.

### Medium Priority
- **Web Clipper & Annotations**: Highlight text, save clips with notes.
- **Vertical Tabs Mode**: Sidebar tab list like Arc/Edge.
- **Profiles**: Independent browsing profiles with separate data stores.
- **Performance Monitor**: Per-tab resource usage at `neuralweb://performance`.
- **Built-in Screenshots**: Capture and annotate with Cmd+Shift+S.

### Lower Priority
- **Userscript Support**: Greasemonkey/Tampermonkey compatible scripts.
- **Keyboard Shortcut Customization**: Rebindable shortcuts via settings.
- **Auto-Update**: `electron-updater` integration.
- **Code Signing**: macOS notarization and Windows Authenticode.
- **Crash Reporting**: Local crash log viewer.
- **Cloud Sync**: Automatic sync via Dropbox/iCloud Drive folder.

## Technical Improvements
- **Performance**: Optimize BrowserView resizing and switching.
- **PDF Viewer**: Integrated PDF viewing capability.
