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

## In Progress / Partial
- [ ] **Extensions Support**:
    - **Current State**: Developer mode (loading unpacked extensions) is implemented.
    - **Next Steps**: Support for CRX files or Chrome Web Store integration (complex).

## New Suggestions (Next Steps)

### 1. Tab Groups
- **Current State**: Basic tabs only.
- **Recommendation**: Allow users to group tabs by context (e.g., "Work", "Research").

### 2. Session Restore Polish
- **Current State**: Basic restore exists.
- **Recommendation**: Ensure scroll position and history state are preserved per tab.

## Technical Improvements
- **Crash Handling**: Better error pages for renderer crashes.
- **Performance**: Optimize BrowserView resizing and switching.
