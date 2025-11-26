# Suggested Features for NeuralWeb Browser

Based on a comprehensive review of the codebase, the following features are recommended to enhance the browser's functionality and user experience.

## Essential Features
These features are considered standard for any modern web browser and are currently missing or incomplete.

### 1. Global History
- **Current State**: The browser tracks navigation within a tab for Back/Forward functionality and keeps an in-memory count of top sites. There is no persistent global history.
- **Recommendation**: Implement a persistent history database (e.g., using SQLite or JSON file) and a `HistoryPage` UI to view, search, and clear browsing history.

### 2. Find in Page
- **Current State**: No functionality to search for text within a web page.
- **Recommendation**: Add `Cmd+F` (or `Ctrl+F`) support to open a search bar. Use Electron's `webContents.findInPage` API to highlight and navigate matches.

### 3. Zoom Controls
- **Current State**: No UI or keyboard shortcuts for zooming.
- **Recommendation**: Implement `Cmd/Ctrl +` and `Cmd/Ctrl -` shortcuts and a menu option to control page zoom levels using `webContents.setZoomLevel`.

### 4. Print Support
- **Current State**: No print functionality.
- **Recommendation**: Add `Cmd/Ctrl + P` support and a menu option to trigger printing using `webContents.print`.

## Advanced Features
These features would significantly improve the browser's capability and competitiveness.

### 5. Extensions Support
- **Current State**: No support for Chrome extensions.
- **Recommendation**: Implement support for loading Chrome extensions. This is a complex task involving Electron's `session.loadExtension` and handling extension APIs.

### 6. Password Manager
- **Current State**: No password saving or autofill.
- **Recommendation**: Implement a secure password manager to save and autofill credentials. This requires secure storage (e.g., system keychain) and IPC handlers for form detection.

### 7. Site Settings & Permissions
- **Current State**: No granular control over site permissions (camera, microphone, notifications, location).
- **Recommendation**: Add a UI to manage permissions per site. Listen to `session.setPermissionRequestHandler` to prompt users.

### 8. Custom Search Engines
- **Current State**: Search engine is likely hardcoded or defaults to Google.
- **Recommendation**: Allow users to configure their default search engine (Google, Bing, DuckDuckGo, etc.) in the Settings page.

### 9. Incognito Mode Improvements
- **Current State**: Basic backend support exists (`create-incognito-window`), but visual indicators might be subtle.
- **Recommendation**: Ensure a distinct visual theme (e.g., dark theme or specific icon) for Incognito windows to clearly differentiate them from normal windows.

## Technical Improvements
- **Session Restore**: Automatically restore tabs and windows after a crash or restart.
- **Crash Handling**: Better error pages for renderer crashes.
