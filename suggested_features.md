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

## In Progress / Partial
- [ ] **Extensions Support**:
    - **Current State**: Developer mode (loading unpacked extensions) is implemented.
    - **Next Steps**: Support for CRX files or Chrome Web Store integration (complex).
- [ ] **Password Manager**:
    - **Current State**: Backend logic exists. Basic UI in Settings.
    - **Next Steps**: Improve UI, add auto-fill integration, secure storage integration.

## New Suggestions (Next Steps)

### 1. AI Assistant Backend (Critical Fix)
- **Current State**: `AISidebar` UI exists but the `ai_query` IPC handler is missing in `main.ts`.
- **Recommendation**: Implement a local AI handler (mock or simple heuristic) to make the sidebar functional.

### 2. Reader Mode
- **Current State**: Not implemented.
- **Recommendation**: Add a "Reader View" that strips clutter (ads, navigation) and presents clean text. This fits the "Neural/AI" theme.

### 3. Tab Groups
- **Current State**: Basic tabs only.
- **Recommendation**: Allow users to group tabs by context (e.g., "Work", "Research").

### 4. Ad Blocker
- **Current State**: No blocking.
- **Recommendation**: Implement basic request filtering using Electron's `webRequest` API.

### 5. Session Restore Polish
- **Current State**: Basic restore exists.
- **Recommendation**: Ensure scroll position and history state are preserved per tab.

## Technical Improvements
- **Crash Handling**: Better error pages for renderer crashes.
- **Performance**: Optimize BrowserView resizing and switching.
