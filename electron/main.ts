
import { app, BrowserWindow, BrowserView, ipcMain, Menu, dialog } from 'electron';
import * as path from 'path';
import { TabManager } from './TabManager';

import { BookmarksManager } from './managers/BookmarksManager';
import { SettingsManager } from './managers/SettingsManager';
import { DownloadManager } from './managers/DownloadManager';
import { HistoryManager } from './managers/HistoryManager';
import { ExtensionsManager } from './managers/ExtensionsManager';
import { PasswordManager } from './managers/PasswordManager';
import { PermissionsManager } from './managers/PermissionsManager';
import { SessionManager } from './managers/SessionManager';

// Manage multiple windows and their respective TabManagers
const windows = new Map<number, BrowserWindow>();
const tabManagers = new Map<number, TabManager>();

const bookmarksManager = new BookmarksManager();
const settingsManager = new SettingsManager();
const downloadManager = new DownloadManager();
const historyManager = new HistoryManager();
const extensionsManager = new ExtensionsManager();
const passwordManager = new PasswordManager();
const permissionsManager = new PermissionsManager();
const sessionManager = new SessionManager();

function getTabManager(event: Electron.IpcMainInvokeEvent): TabManager | null {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    return tabManagers.get(window.id) || null;
}

function createWindow(options: { incognito?: boolean, initialTabs?: { url: string, title: string }[] } = {}) {
    const { incognito = false, initialTabs = [] } = options;

    const window = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false, // Disable sandbox to prevent V8 crashes on macOS
            webSecurity: true,
            partition: incognito ? 'incognito' : 'persist:main',
        },
    });

    const windowId = window.id;
    windows.set(windowId, window);

    // Create a new TabManager for this window
    const tabManager = new TabManager(historyManager, sessionManager);
    tabManager.setMainWindow(window);
    tabManagers.set(windowId, tabManager);

    // Update download manager to track this window (simplified for now, might need better multi-window handling)
    downloadManager.setMainWindow(window);

    // Handle permissions
    window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const url = webContents.getURL();
        const origin = new URL(url).origin;
        const storedPermission = permissionsManager.getPermission(origin, permission);

        if (storedPermission === 'allow') {
            callback(true);
        } else if (storedPermission === 'deny') {
            callback(false);
        } else {
            // For now, auto-approve to avoid blocking, but in real app we'd show a prompt
            // TODO: Implement permission prompt UI
            if (permission !== 'openExternal') {
                console.log(`Permission requested: ${permission} for ${origin}`);
            }
            callback(true);
        }
    });

    // Handle downloads for this window's session
    window.webContents.session.on('will-download', (event, item, webContents) => {
        downloadManager.handleWillDownload(event, item, webContents);
    });

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
        const loadURLWithRetry = (url: string, retries = 5) => {
            window.loadURL(url).catch((err) => {
                if (retries > 0) {
                    console.log(`Failed to load URL, retrying... (${retries} attempts left)`);
                    setTimeout(() => loadURLWithRetry(url, retries - 1), 1000);
                } else {
                    console.error('Failed to load URL:', err);
                }
            });
        };
        loadURLWithRetry('http://localhost:5173');
    } else {
        window.loadFile(path.join(__dirname, '../index.html'));
    }

    // Restore tabs or create default
    window.webContents.once('did-finish-load', async () => {
        if (initialTabs.length > 0) {
            for (const tab of initialTabs) {
                await tabManager.createTab(window, tab.url);
            }
        } else {
            // Default tab
            // Only create if no tabs exist (to avoid duplicates if something else created one)
            if (tabManager.getTabs().length === 0) {
                await tabManager.createTab(window, 'neuralweb://home');
            }
        }
    });

    window.on('close', (e) => {
        const choice = dialog.showMessageBoxSync(window, {
            type: 'question',
            buttons: ['Yes', 'No', 'Cancel'],
            title: 'Save Session?',
            message: 'Do you want to save your session?',
            detail: 'If you select "No", your tabs will be cleared.',
            defaultId: 0,
            cancelId: 2
        });

        if (choice === 2) {
            // Cancel
            e.preventDefault();
        } else if (choice === 1) {
            // No - Clear session
            sessionManager.removeWindow(windowId);
            // Allow close to proceed
        } else {
            // Yes - Session is already saved by SessionManager updates
            // Allow close to proceed
        }
    });

    window.on('closed', () => {
        windows.delete(windowId);
        tabManagers.delete(windowId);
    });

    // Add keyboard shortcut to open DevTools in detached mode
    window.webContents.on('before-input-event', (event, input) => {
        // Cmd+Option+I on Mac, Ctrl+Shift+I on Windows/Linux
        if ((input.meta && input.alt && input.key.toLowerCase() === 'i') ||
            (input.control && input.shift && input.key.toLowerCase() === 'i')) {
            event.preventDefault();

            // Try to open DevTools for active tab's BrowserView first
            const activeTabId = tabManager.getActiveTabId();
            if (activeTabId) {
                tabManager.openDevToolsForActiveTab();
            } else {
                // Fallback to main window DevTools (for React UI)
                window.webContents.openDevTools({ mode: 'detach' });
            }
        }
    });

    // Handle window resize to reposition BrowserViews
    window.on('resize', () => {
        tabManager.repositionViews(window);
    });

    // Handle window move to reposition BrowserViews
    window.on('move', () => {
        tabManager.repositionViews(window);
    });
}

// IPC Handlers
ipcMain.handle('create-tab', async (event, url: string) => {
    const tm = getTabManager(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!tm || !win) return null;
    return tm.createTab(win, url);
});

ipcMain.handle('close-tab', async (event, tabId: string) => {
    const tm = getTabManager(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!tm || !win) return;
    tm.closeTab(win, tabId);
});

ipcMain.handle('switch-tab', async (event, tabId: string) => {
    const tm = getTabManager(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!tm || !win) return;
    tm.switchTab(win, tabId);
});

ipcMain.handle('navigate-tab', async (event, tabId: string, url: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.navigateTab(tabId, url);
});

ipcMain.handle('go-back', async (event, tabId: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.goBack(tabId);
});

ipcMain.handle('go-forward', async (event, tabId: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.goForward(tabId);
});

ipcMain.handle('refresh-tab', async (event, tabId: string) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.refreshTab(tabId);
});

ipcMain.handle('get-tabs', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return [];
    return tm.getTabs();
});

ipcMain.handle('get-active-tab', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return null;
    return tm.getActiveTabId();
});

ipcMain.handle('open-devtools', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.openDevToolsForActiveTab();
});

ipcMain.handle('get-top-sites', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return [];
    return tm.getTopSites();
});

ipcMain.handle('create-incognito-window', async () => {
    createWindow({ incognito: true });
});

ipcMain.handle('open-browser-menu', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;

    const menu = Menu.buildFromTemplate([
        {
            label: 'New Incognito Window',
            click: () => {
                createWindow({ incognito: true });
            }
        },
        {
            label: 'History',
            accelerator: 'CmdOrCtrl+H',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const activeTabId = tm.getActiveTabId();
                    if (activeTabId) {
                        tm.navigateTab(activeTabId, 'neuralweb://history');
                    }
                }
            }
        },
        {
            label: 'Downloads',
            accelerator: 'CmdOrCtrl+J',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const activeTabId = tm.getActiveTabId();
                    if (activeTabId) {
                        tm.navigateTab(activeTabId, 'neuralweb://downloads');
                    }
                }
            }
        },
        {
            label: 'Bookmarks',
            accelerator: 'CmdOrCtrl+B',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const activeTabId = tm.getActiveTabId();
                    if (activeTabId) {
                        tm.navigateTab(activeTabId, 'neuralweb://bookmarks');
                    }
                }
            }
        },
        {
            label: 'Extensions',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const activeTabId = tm.getActiveTabId();
                    if (activeTabId) {
                        tm.navigateTab(activeTabId, 'neuralweb://extensions');
                    }
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Settings',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const activeTabId = tm.getActiveTabId();
                    if (activeTabId) {
                        tm.navigateTab(activeTabId, 'neuralweb://settings');
                    }
                }
            }
        },
        {
            label: 'Site Settings',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const activeTabId = tm.getActiveTabId();
                    if (activeTabId) {
                        tm.navigateTab(activeTabId, 'neuralweb://settings/site');
                    }
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Find in Page',
            accelerator: 'CmdOrCtrl+F',
            click: () => {
                win.webContents.send('trigger-find');
            }
        },
        {
            label: 'Print',
            accelerator: 'CmdOrCtrl+P',
            click: () => {
                const tm = getTabManager(event);
                if (tm) tm.printPage();
            }
        },
        { type: 'separator' },
        {
            label: 'Zoom In',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const level = tm.getZoomLevel();
                    tm.setZoomLevel(level + 0.5);
                }
            }
        },
        {
            label: 'Zoom Out',
            accelerator: 'CmdOrCtrl+-',
            click: () => {
                const tm = getTabManager(event);
                if (tm) {
                    const level = tm.getZoomLevel();
                    tm.setZoomLevel(level - 0.5);
                }
            }
        },
        {
            label: 'Reset Zoom',
            accelerator: 'CmdOrCtrl+0',
            click: () => {
                const tm = getTabManager(event);
                if (tm) tm.setZoomLevel(0);
            }
        }
    ]);

    menu.popup({ window: win });
});

ipcMain.handle('is-incognito', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return false;
    // Incognito sessions are not persistent
    return !win.webContents.session.isPersistent();
});

// Bookmarks IPC
ipcMain.handle('bookmarks:get', async () => {
    return bookmarksManager.getTree();
});

ipcMain.handle('bookmarks:add', async (event, bookmark) => {
    return bookmarksManager.addBookmark(bookmark);
});

ipcMain.handle('bookmarks:remove', async (event, id) => {
    return bookmarksManager.removeBookmark(id);
});

ipcMain.handle('bookmarks:check', async (event, url) => {
    return bookmarksManager.isBookmarked(url);
});

ipcMain.handle('bookmarks:getByUrl', async (event, url) => {
    return bookmarksManager.getBookmarkByUrl(url);
});

// Downloads IPC
ipcMain.handle('downloads:get-history', async () => {
    return downloadManager.getHistory();
});

ipcMain.handle('downloads:pause', async (event, id) => {
    downloadManager.pause(id);
});

ipcMain.handle('downloads:resume', async (event, id) => {
    downloadManager.resume(id);
});

ipcMain.handle('downloads:cancel', async (event, id) => {
    downloadManager.cancel(id);
});

ipcMain.handle('downloads:open-file', async (event, id) => {
    downloadManager.openFile(id);
});

ipcMain.handle('downloads:clear', async () => {
    downloadManager.clearHistory();
});

// Settings IPC
ipcMain.handle('settings:get', async () => {
    return settingsManager.getSettings();
});

ipcMain.handle('settings:set', async (event, key, value) => {
    settingsManager.set(key, value);
    // Notify renderer of update if needed, or just let it pull
    return true;
});

// History IPC
ipcMain.handle('history:get', async () => {
    return historyManager.getHistory();
});

ipcMain.handle('history:clear', async () => {
    historyManager.clearHistory();
});

ipcMain.handle('history:search', async (event, query) => {
    return historyManager.search(query);
});

// Find in Page IPC
ipcMain.handle('find:start', async (event, text) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.findInPage(text);
});

ipcMain.handle('find:stop', async (event, action) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.stopFindInPage(action);
});

ipcMain.handle('find:next', async (event, text) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.findInPage(text, true);
});

ipcMain.handle('find:prev', async (event, text) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.findInPage(text, false);
});

// Zoom IPC
ipcMain.handle('zoom:set', async (event, level) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.setZoomLevel(level);
});

ipcMain.handle('zoom:get', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return 0;
    return tm.getZoomLevel();
});

ipcMain.handle('zoom:reset', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.setZoomLevel(0);
});

// Print IPC
ipcMain.handle('print:page', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.printPage();
});

// App lifecycle
app.whenReady().then(() => {
    const lastSession = sessionManager.getLastSession();
    const windowIds = Object.keys(lastSession.windows).map(Number);

    if (windowIds.length > 0) {
        // Restore windows
        for (const winId of windowIds) {
            const winState = lastSession.windows[winId];
            createWindow({ initialTabs: winState.tabs });
        }
    } else {
        createWindow();
    }
});

ipcMain.handle('session:clear', async () => {
    sessionManager.clearSession();
    return true;
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (windows.size === 0) {
        createWindow();
    }
});
