
import { app, BrowserWindow, BrowserView, ipcMain, Menu, MenuItem, dialog } from 'electron';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { TabManager } from './TabManager';

import { BookmarksManager } from './managers/BookmarksManager';
import { SettingsManager } from './managers/SettingsManager';
import { DownloadManager } from './managers/DownloadManager';
import { HistoryManager } from './managers/HistoryManager';
import { ExtensionsManager } from './managers/ExtensionsManager';
import { PasswordManager } from './managers/PasswordManager';
import { PermissionsManager } from './managers/PermissionsManager';
import { SessionManager } from './managers/SessionManager';
import { AIManager } from './managers/AIManager';
import { ReaderManager } from './managers/ReaderManager';
import { AdBlockerManager } from './managers/AdBlockerManager';
import { OllamaManager } from './managers/OllamaManager';
import { SyncManager } from './managers/SyncManager';

// ... existing imports

const adBlockerManager = new AdBlockerManager();

// ... existing code

ipcMain.handle('adblocker:toggle', () => {
    return adBlockerManager.toggle();
});

ipcMain.handle('adblocker:status', () => {
    return adBlockerManager.getStatus();
});

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
const ollamaManager = new OllamaManager();
const aiManager = new AIManager(ollamaManager, settingsManager);
const readerManager = new ReaderManager();
const syncManager = new SyncManager(bookmarksManager, historyManager, settingsManager);

// Permission request handling
interface PendingPermission {
    callback: (granted: boolean) => void;
    origin: string;
    permission: string;
    timeout: NodeJS.Timeout;
}
const pendingPermissionRequests = new Map<string, PendingPermission>();

function getTabManager(event: Electron.IpcMainInvokeEvent): TabManager | null {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return null;
    return tabManagers.get(window.id) || null;
}

function createWindow(options: { incognito?: boolean, initialTabs?: { url: string, title: string, groupId?: string, scrollPosition?: { x: number, y: number }, history?: string[], historyIndex?: number }[], initialGroups?: { id: string, name: string, color: string }[] } = {}) {
    const { incognito = false, initialTabs = [], initialGroups = [] } = options;

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
    tabManager.setOnExplainText((text) => {
        window.webContents.send('ai:open-sidebar', { text, action: 'explain' });
    });
    tabManagers.set(windowId, tabManager);

    // Update download manager to track this window (simplified for now, might need better multi-window handling)
    downloadManager.setMainWindow(window);

    // Handle permissions with prompt UI
    window.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        const url = webContents.getURL();
        let origin: string;
        try {
            origin = new URL(url).origin;
        } catch {
            callback(false);
            return;
        }
        const storedPermission = permissionsManager.getPermission(origin, permission);

        if (storedPermission === 'allow') {
            callback(true);
        } else if (storedPermission === 'deny') {
            callback(false);
        } else {
            // Show permission prompt in renderer
            const requestId = randomUUID();

            // Auto-deny after 60 seconds
            const timeout = setTimeout(() => {
                const pending = pendingPermissionRequests.get(requestId);
                if (pending) {
                    pending.callback(false);
                    pendingPermissionRequests.delete(requestId);
                }
            }, 60_000);

            pendingPermissionRequests.set(requestId, { callback, origin, permission, timeout });
            window.webContents.send('permission:request', { requestId, origin, permission });
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
        // Restore groups first
        if (initialGroups.length > 0) {
            for (const group of initialGroups) {
                tabManager.restoreGroup(group);
            }
        }

        if (initialTabs.length > 0) {
            for (const tab of initialTabs) {
                const tabId = await tabManager.createTab(window, tab.url, {
                    history: tab.history,
                    historyIndex: tab.historyIndex,
                    scrollPosition: tab.scrollPosition
                });
                if (tab.groupId) {
                    tabManager.addTabToGroup(tabId, tab.groupId);
                }
            }
        } else {
            // Default tab
            // Only create if no tabs exist (to avoid duplicates if something else created one)
            if (tabManager.getTabs().length === 0) {
                await tabManager.createTab(window, 'neuralweb://home');
            }
        }
    });

    // Disable default context menu on main window to allow React components to handle it
    window.webContents.on('context-menu', (event) => {
        event.preventDefault();
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
app.whenReady().then(async () => {
    // Start Ollama sidecar in background (does not block window creation)
    ollamaManager.start().catch(err => console.error('[Main] Ollama start failed:', err));

    // Load extensions from saved paths
    await extensionsManager.loadExtensions();

    const lastSession = sessionManager.getLastSession();
    const windowIds = Object.keys(lastSession.windows).map(Number);

    if (windowIds.length > 0) {
        // Restore windows
        for (const winId of windowIds) {
            const winState = lastSession.windows[winId];
            createWindow({ initialTabs: winState.tabs, initialGroups: winState.groups });
        }
    } else {
        createWindow();
    }
});

ipcMain.handle('session:clear', async () => {
    sessionManager.clearSession();
    return true;
});

app.on('before-quit', () => {
    // Flush all pending writes synchronously
    historyManager.flushSync();
    sessionManager.flushSync();
    permissionsManager.flushSync();
    bookmarksManager.flushSync();

    ollamaManager.stop().catch(err => console.error('[Main] Ollama stop failed:', err));
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

// Password Manager IPC
ipcMain.handle('passwords:save', async (event, url, username, password) => {
    return passwordManager.savePassword(url, username, password);
});

ipcMain.handle('passwords:get', async (event, url) => {
    return passwordManager.getCredentials(url);
});

ipcMain.handle('passwords:list', async () => {
    return passwordManager.getAllPasswords();
});

ipcMain.handle('passwords:delete', async (event, id) => {
    return passwordManager.deletePassword(id);
});

// Permissions IPC
ipcMain.handle('permissions:get-all', async () => {
    return permissionsManager.getAllPermissions();
});

ipcMain.handle('permissions:set', async (event, { origin, permission, status }) => {
    permissionsManager.setPermission(origin, permission, status);
    return true;
});

ipcMain.handle('permissions:clear', async (event, origin) => {
    permissionsManager.clearPermissionsForOrigin(origin);
    return true;
});

// Permission prompt response handler
ipcMain.handle('permission:respond', async (event, { requestId, allowed, remember }) => {
    const pending = pendingPermissionRequests.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    pending.callback(allowed);
    pendingPermissionRequests.delete(requestId);

    if (remember) {
        permissionsManager.setPermission(pending.origin, pending.permission, allowed ? 'allow' : 'deny');
    }
});

// Extensions IPC
ipcMain.handle('extensions:get', async () => {
    return extensionsManager.getExtensions();
});

ipcMain.handle('extensions:install', async (event, extensionPath: string) => {
    return extensionsManager.installExtension(extensionPath);
});

ipcMain.handle('extensions:remove', async (event, name: string) => {
    return extensionsManager.removeExtension(name);
});

ipcMain.handle('extensions:get-actions', async () => {
    return extensionsManager.getExtensionActions();
});

ipcMain.handle('extensions:action-click', async (event, name: string) => {
    // For now, just log - real implementation would open extension popup
    console.log('[Extensions] Action clicked:', name);
});

// AI IPC
ipcMain.handle('ai_query', async (event, { provider, prompt }) => {
    return aiManager.processQuery(provider, prompt);
});

ipcMain.handle('ai:chat-stream', async (event, { messages, requestId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return;
    await aiManager.processQueryStream(win.webContents, requestId, messages);
});

ipcMain.handle('ai:summarize', async (event, { requestId }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    const tm = getTabManager(event);
    if (!win || !tm) return;

    const content = await tm.getActiveTabContent();
    if (!content) {
        win.webContents.send('ai:stream-end', { requestId, error: 'Could not extract page content.' });
        return;
    }

    const messages = [
        { role: 'user', content: `Please summarize the following web page.\n\nTitle: ${content.title}\nURL: ${content.url}\n\nContent:\n${content.text}` },
    ];
    await aiManager.processQueryStream(win.webContents, requestId, messages);
});

ipcMain.handle('ai:suggest', async (event, query: string) => {
    if (!settingsManager.get('aiSuggestionsEnabled')) return [];
    return aiManager.getSuggestions(query);
});

ipcMain.handle('ai:status', async () => {
    return ollamaManager.getStatus();
});

ipcMain.handle('ai:models', async () => {
    return ollamaManager.listModels();
});

ipcMain.handle('ai:pull-model', async (event, name: string) => {
    return ollamaManager.pullModel(name);
});

// Reader Mode IPC
ipcMain.handle('reader:toggle', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return false;

    const activeTabId = tm.getActiveTabId();
    if (!activeTabId) return false;

    const view = tm.getTab(activeTabId);
    if (!view) return false;

    return readerManager.toggleReaderMode(view.webContents);
});

ipcMain.handle('reader:status', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return false;

    const activeTabId = tm.getActiveTabId();
    if (!activeTabId) return false;

    const view = tm.getTab(activeTabId);
    if (!view) return false;

    return readerManager.isReaderActive(view.webContents.id);
});

// Tab Groups IPC
ipcMain.handle('tabs:create-group', async (event, name: string, color: string) => {
    const tm = getTabManager(event);
    if (!tm) return null;
    return tm.createGroup(name, color);
});

ipcMain.handle('tabs:add-to-group', async (event, tabId: string, groupId: string) => {
    const tm = getTabManager(event);
    if (!tm) return false;
    return tm.addTabToGroup(tabId, groupId);
});

ipcMain.handle('tabs:remove-from-group', async (event, tabId: string) => {
    const tm = getTabManager(event);
    if (!tm) return false;
    return tm.removeTabFromGroup(tabId);
});

ipcMain.handle('tabs:get-groups', async (event) => {
    const tm = getTabManager(event);
    if (!tm) return [];
    return tm.getGroups();
});

ipcMain.handle('tabs:delete-group', async (event, groupId: string) => {
    const tm = getTabManager(event);
    if (!tm) return false;
    return tm.deleteGroup(groupId);
});

// Tab Context Menu
ipcMain.handle('tabs:show-context-menu', async (event, tabId: string, hasGroup: boolean) => {
    const tm = getTabManager(event);
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!tm || !win) return;

    const groups = tm.getGroups();
    const menu = new Menu();
    const tab = (await tm.getTabs()).find(t => t.id === tabId);
    const isPinned = tab?.pinned || false;
    const isMuted = tab?.muted || false;

    // Standard Tab Actions
    menu.append(new MenuItem({
        label: 'New Tab',
        click: () => {
            tm.createTab(win, 'neuralweb://home');
        }
    }));

    menu.append(new MenuItem({ type: 'separator' }));

    menu.append(new MenuItem({
        label: 'Duplicate',
        click: () => {
            tm.duplicateTab(tabId);
        }
    }));

    menu.append(new MenuItem({
        label: isPinned ? 'Unpin Tab' : 'Pin Tab',
        click: () => {
            tm.togglePin(tabId);
        }
    }));

    menu.append(new MenuItem({
        label: isMuted ? 'Unmute Site' : 'Mute Site',
        click: () => {
            tm.toggleMute(tabId);
        }
    }));

    menu.append(new MenuItem({ type: 'separator' }));

    if (hasGroup) {
        // Tab is in a group - show option to remove from group
        menu.append(new MenuItem({
            label: 'Remove from Group',
            click: () => {
                tm.removeTabFromGroup(tabId);
            }
        }));
    } else {
        // Tab is not in a group - show group assignment options
        menu.append(new MenuItem({
            label: 'Add to Group',
            type: 'submenu',
            submenu: Menu.buildFromTemplate([
                ...groups.map(group => ({
                    label: group.name,
                    click: () => {
                        tm.addTabToGroup(tabId, group.id);
                    }
                })),
                { type: 'separator' as const },
                {
                    label: 'New Group...',
                    click: () => {
                        // Trigger frontend dialog to ask for group name
                        console.log('Main: Sending show-create-group-dialog to renderer');
                        win.webContents.send('show-create-group-dialog', tabId);
                    }
                }
            ])
        }));
    }

    menu.append(new MenuItem({ type: 'separator' }));

    menu.append(new MenuItem({
        label: 'Close Tab',
        click: () => {
            tm.closeTab(win, tabId);
        }
    }));

    menu.append(new MenuItem({
        label: 'Close Other Tabs',
        click: () => {
            tm.closeOtherTabs(tabId);
        }
    }));

    menu.popup({ window: win });
});

ipcMain.handle('tabs:set-visibility', async (event, visible: boolean) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.setTabVisibility(visible);
});

ipcMain.handle('ai:sidebar-toggle', async (event, open: boolean) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.setAiSidebarOpen(open);
});

ipcMain.handle('overlay:set-active', async (event, active: boolean) => {
    const tm = getTabManager(event);
    if (!tm) return;
    tm.setOverlayActive(active);
});

// Sync IPC
ipcMain.handle('sync:export', async (event, options: { bookmarks: boolean; history: boolean; settings: boolean }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false };

    const result = await dialog.showSaveDialog(win, {
        title: 'Export Browser Data',
        defaultPath: `neuralweb-export-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (result.canceled || !result.filePath) return { success: false };

    try {
        await syncManager.exportToFile(result.filePath, options);
        return { success: true, path: result.filePath };
    } catch (error) {
        console.error('[Sync] Export failed:', error);
        return { success: false };
    }
});

ipcMain.handle('sync:import', async (event, { strategy }: { strategy: 'merge' | 'replace' }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return { success: false };

    const result = await dialog.showOpenDialog(win, {
        title: 'Import Browser Data',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) return { success: false };

    try {
        const summary = await syncManager.importFromFile(result.filePaths[0], strategy);
        return { success: true, summary };
    } catch (error) {
        console.error('[Sync] Import failed:', error);
        return { success: false };
    }
});
