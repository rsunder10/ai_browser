# Suggested Features for NeuralWeb Browser

Based on a comprehensive review of the codebase, the following features are recommended to enhance the browser's functionality and user experience.

## Completed / Implemented Features
- [x] **Global History**: `HistoryPage` and backend logic implemented.
- [x] **Find in Page**: UI and IPC handlers implemented.
- [x] **Zoom Controls**: Menu and shortcuts implemented.
- [x] **Print Support**: Basic print functionality implemented.
- [x] **Site Settings**: Permissions management implemented.
- [x] **Custom Search Engines**: Configurable in Settings.
- [x] **Incognito Mode**: implemented.
- [x] **AI Assistant Backend**: Implemented with mock handlers.
- [x] **Reader Mode**: Implemented with toggle button.
- [x] **Ad Blocker**: Implemented with `AdBlockerManager` and UI toggle.
- [x] **Session Restore Polish**: Scroll position and history state preserved.
- [x] **Crash Handling**: "Aw, Snap!" page implemented.

## In Progress / Partial
- [ ] **Extensions Support**:
    - **Current State**: Developer mode (loading unpacked extensions) is implemented.
    - **Next Steps**: Support for CRX files or Chrome Web Store integration (complex).

## New Suggestions (Next Steps)

### 1. Tab Groups
- **Current State**: Basic tabs only.
- **Recommendation**: Allow users to group tabs by context (e.g., "Work", "Research").

### 2. Chrome Consistency Features
- **Enhanced Context Menus**:
    - Right-click on tabs: Duplicate, Pin, Mute, Close Others, Add to Group.
    - Right-click on content: Save Image, Open Link in New Tab/Window, Inspect.
- **Downloads Bubble**: Modern popup UI for downloads (instead of just a page).
- **Bookmarks Bar**: Toggleable bar below the address bar for quick access.
- **Keyboard Shortcuts**: Audit and implement standard shortcuts (Ctrl+Shift+T, Ctrl+J, etc.).

### 3. Advanced Features
- **Omnibox Improvements**: Autocomplete, search suggestions, and rich entity display.
- **Picture-in-Picture**: Support for popping out videos.
- **PDF Viewer**: Integrated PDF viewing capability.

## Technical Improvements
- **Performance**: Optimize BrowserView resizing and switching.
