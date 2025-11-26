# Phase 1 Verification Walkthrough

This walkthrough guides you through verifying the newly implemented features: Global History, Find in Page, Zoom, and Print.

## 1. Global History

### Verification Steps
1.  **Navigation**: Open the browser and navigate to a few different websites (e.g., google.com, example.com).
2.  **Access History**:
    -   Click the **Menu** button (three dots) -> **History**.
    -   OR use the shortcut `Cmd+H` (Mac) / `Ctrl+H` (Windows).
    -   OR type `neuralweb://history` in the address bar.
3.  **Verify Entries**: Check that your recent visits are listed, grouped by date.
4.  **Search**: Type a query in the search bar (e.g., "google") and verify the list filters correctly.
5.  **Clear History**: Click "Clear browsing data", confirm the dialog, and verify the list is empty.

## 2. Find in Page

### Verification Steps
1.  **Open Page**: Go to a text-heavy page (e.g., a Wikipedia article).
2.  **Trigger Find**:
    -   Press `Cmd+F` (Mac) / `Ctrl+F` (Windows).
    -   OR click **Menu** -> **Find in Page**.
3.  **Search**: Type a common word (e.g., "the").
4.  **Navigation**:
    -   Press `Enter` or click the Down arrow to go to the next match.
    -   Press `Shift+Enter` or click the Up arrow to go to the previous match.
5.  **Close**: Press `Esc` or click the X button to close the find bar.

## 3. Zoom Controls

### Verification Steps
1.  **Zoom In**:
    -   Press `Cmd +` (Mac) / `Ctrl +` (Windows).
    -   OR click **Menu** -> **Zoom In**.
    -   Verify the page content gets larger.
2.  **Zoom Out**:
    -   Press `Cmd -` (Mac) / `Ctrl -` (Windows).
    -   OR click **Menu** -> **Zoom Out**.
    -   Verify the page content gets smaller.
3.  **Reset Zoom**:
    -   Press `Cmd 0` (Mac) / `Ctrl 0` (Windows).
    -   OR click **Menu** -> **Reset Zoom**.
    -   Verify the page returns to 100% scale.

## 4. Print Support

### Verification Steps
1.  **Trigger Print**:
    -   Press `Cmd+P` (Mac) / `Ctrl+P` (Windows).
    -   OR click **Menu** -> **Print**.
2.  **Verify**: Ensure the system print dialog appears.
