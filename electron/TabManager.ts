import { BrowserWindow, BrowserView } from 'electron';
import { randomUUID } from 'crypto';

interface TabInfo {
    id: string;
    url: string;
    title: string;
    view: BrowserView;
}

export class TabManager {
    private tabs: Map<string, TabInfo> = new Map();
    private activeTabId: string | null = null;
    private readonly CHROME_HEIGHT = 100;
    private mainWindow: BrowserWindow | null = null;

    setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    createTab(mainWindow: BrowserWindow, url: string): string {
        const tabId = `tab-${randomUUID()}`;

        // Store tab info first
        const tabInfo: TabInfo = {
            id: tabId,
            url: url,
            title: url === 'neuralweb://home' ? 'Home' : url,
            view: null as any, // Will be set for non-home pages
        };

        // Handle special neuralweb://home protocol
        if (url === 'neuralweb://home') {
            this.tabs.set(tabId, tabInfo);
            this.switchTab(mainWindow, tabId);
            return tabId;
        }

        // Ensure URL has protocol for regular pages
        const urlString = url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`;

        // Create BrowserView for regular pages
        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false, // Match main window settings
            },
        });

        // Add to window
        mainWindow.addBrowserView(view);

        // Set bounds
        const bounds = mainWindow.getContentBounds();
        view.setBounds({
            x: 0,
            y: this.CHROME_HEIGHT,
            width: bounds.width,
            height: bounds.height - this.CHROME_HEIGHT,
        });

        // Load URL with error handling
        view.webContents.loadURL(urlString).catch((err) => {
            console.error(`Failed to load URL ${urlString}:`, err);
        });

        // Update tab info with view
        tabInfo.url = urlString;
        tabInfo.title = urlString;
        tabInfo.view = view;
        this.tabs.set(tabId, tabInfo);

        // Set as active and hide others
        this.switchTab(mainWindow, tabId);

        // Listen for title updates
        view.webContents.on('page-title-updated', (_event, title) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.title = title;
                // Notify renderer process
                if (this.mainWindow) {
                    this.mainWindow.webContents.send('tab-updated', tabId);
                }
            }
        });

        // Listen for URL changes (navigation)
        view.webContents.on('did-navigate', (_event, url) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.url = url;
                // Notify renderer process
                if (this.mainWindow) {
                    this.mainWindow.webContents.send('tab-updated', tabId);
                }
            }
        });

        // Also listen for in-page navigation
        view.webContents.on('did-navigate-in-page', (_event, url) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.url = url;
                // Notify renderer process
                if (this.mainWindow) {
                    this.mainWindow.webContents.send('tab-updated', tabId);
                }
            }
        });

        return tabId;
    }

    closeTab(mainWindow: BrowserWindow, tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Remove BrowserView only if it exists (not for home page)
        if (tab.view) {
            mainWindow.removeBrowserView(tab.view);
            (tab.view.webContents as any).destroy();
        }

        // Remove from tabs
        this.tabs.delete(tabId);

        // If this was the active tab, activate another one
        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(mainWindow, remainingTabs[0]);
            } else {
                this.activeTabId = null;
            }
        }
    }

    switchTab(mainWindow: BrowserWindow, tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Hide all views
        this.tabs.forEach((t) => {
            if (t.view) {
                mainWindow.removeBrowserView(t.view);
            }
        });

        // Show selected view only if it exists (not for home page)
        if (tab.view) {
            mainWindow.addBrowserView(tab.view);

            // Update bounds
            const bounds = mainWindow.getContentBounds();
            tab.view.setBounds({
                x: 0,
                y: this.CHROME_HEIGHT,
                width: bounds.width,
                height: bounds.height - this.CHROME_HEIGHT,
            });
        }

        this.activeTabId = tabId;
    }

    navigateTab(tabId: string, url: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Handle navigation to home page
        if (url === 'neuralweb://home') {
            // Remove existing view if present
            if (tab.view && this.mainWindow) {
                this.mainWindow.removeBrowserView(tab.view);
                (tab.view.webContents as any).destroy();
            }
            tab.view = null as any;
            tab.url = 'neuralweb://home';
            tab.title = 'Home';

            // Notify renderer
            if (this.mainWindow) {
                this.mainWindow.webContents.send('tab-updated', tabId);
            }
            return;
        }

        const urlString = url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`;

        // If navigating from home page, create a new BrowserView
        if (!tab.view && this.mainWindow) {
            const view = new BrowserView({
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true,
                    sandbox: false,
                },
            });

            this.mainWindow.addBrowserView(view);
            const bounds = this.mainWindow.getContentBounds();
            view.setBounds({
                x: 0,
                y: this.CHROME_HEIGHT,
                width: bounds.width,
                height: bounds.height - this.CHROME_HEIGHT,
            });

            tab.view = view;

            // Add event listeners for the new view
            view.webContents.on('page-title-updated', (_event, title) => {
                const t = this.tabs.get(tabId);
                if (t) {
                    t.title = title;
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('tab-updated', tabId);
                    }
                }
            });

            view.webContents.on('did-navigate', (_event, url) => {
                const t = this.tabs.get(tabId);
                if (t) {
                    t.url = url;
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('tab-updated', tabId);
                    }
                }
            });

            view.webContents.on('did-navigate-in-page', (_event, url) => {
                const t = this.tabs.get(tabId);
                if (t) {
                    t.url = url;
                    if (this.mainWindow) {
                        this.mainWindow.webContents.send('tab-updated', tabId);
                    }
                }
            });
        }

        if (tab.view) {
            tab.view.webContents.loadURL(urlString);
            tab.url = urlString;
        }
    }

    goBack(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (tab && tab.view.webContents.canGoBack()) {
            tab.view.webContents.goBack();
        }
    }

    goForward(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (tab && tab.view.webContents.canGoForward()) {
            tab.view.webContents.goForward();
        }
    }

    refreshTab(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (tab) {
            tab.view.webContents.reload();
        }
    }

    getTabs(): Array<{ id: string; url: string; title: string; history: string[]; history_index: number }> {
        return Array.from(this.tabs.values()).map((tab) => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            history: [tab.url], // Simplified for now
            history_index: 0,
        }));
    }

    getActiveTabId(): string | null {
        return this.activeTabId;
    }

    repositionViews(mainWindow: BrowserWindow): void {
        const bounds = mainWindow.getContentBounds();
        this.tabs.forEach((tab) => {
            if (tab.id === this.activeTabId) {
                tab.view.setBounds({
                    x: 0,
                    y: this.CHROME_HEIGHT,
                    width: bounds.width,
                    height: bounds.height - this.CHROME_HEIGHT,
                });
            }
        });
    }
}
