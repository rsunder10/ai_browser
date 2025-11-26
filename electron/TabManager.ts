import { BrowserWindow, BrowserView, Menu, MenuItem } from 'electron';
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
    private readonly isDevelopment = process.env.NODE_ENV === 'development';

    setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
        if (this.isDevelopment) {
            console.log('[TabManager] Main window set');
        }
    }

    private log(...args: any[]) {
        if (this.isDevelopment) {
            console.log('[TabManager]', ...args);
        }
    }

    private setupBrowserView(view: BrowserView, tabId: string): void {
        this.log('Setting up BrowserView for tab:', tabId);

        // Title updates
        view.webContents.on('page-title-updated', (_event, title) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.title = title;
                if (this.mainWindow) {
                    this.mainWindow.webContents.send('tab-updated', tabId);
                }
                this.log('Title updated:', title, 'for tab:', tabId);
            }
        });

        // URL navigation
        view.webContents.on('did-navigate', (_event, url) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.url = url;
                if (this.mainWindow) {
                    this.mainWindow.webContents.send('tab-updated', tabId);
                }
                this.log('Navigated to:', url);
            }
        });

        // In-page navigation
        view.webContents.on('did-navigate-in-page', (_event, url) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.url = url;
                if (this.mainWindow) {
                    this.mainWindow.webContents.send('tab-updated', tabId);
                }
            }
        });

        // Add context menu support
        view.webContents.on('context-menu', (_event, params) => {
            this.log('Context menu triggered at:', params.x, params.y);
            const menu = new Menu();

            // Navigation options
            menu.append(new MenuItem({
                label: 'Back',
                enabled: view.webContents.canGoBack(),
                click: () => view.webContents.goBack()
            }));

            menu.append(new MenuItem({
                label: 'Forward',
                enabled: view.webContents.canGoForward(),
                click: () => view.webContents.goForward()
            }));

            menu.append(new MenuItem({
                label: 'Reload',
                click: () => view.webContents.reload()
            }));

            menu.append(new MenuItem({ type: 'separator' }));

            // Text editing options
            if (params.isEditable) {
                menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
                menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
                menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
                menu.append(new MenuItem({ type: 'separator' }));
            } else if (params.selectionText) {
                menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
                menu.append(new MenuItem({ type: 'separator' }));
            }

            // Inspect Element (always in development)
            if (this.isDevelopment) {
                menu.append(new MenuItem({
                    label: 'Inspect Element',
                    click: () => {
                        this.log('Opening DevTools at:', params.x, params.y);

                        // Open docked to right for standard Chrome feel
                        if (!view.webContents.isDevToolsOpened()) {
                            view.webContents.openDevTools({ mode: 'right', activate: true });
                        }

                        // Inspect the specific element
                        view.webContents.inspectElement(params.x, params.y);
                    }
                }));
            }

            menu.popup();
        });

        // Error handling
        view.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
            console.error('[TabManager] Failed to load:', errorDescription, 'Code:', errorCode);
        });

        // Log when page finishes loading
        view.webContents.on('did-finish-load', () => {
            this.log('Page loaded for tab:', tabId);
        });
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

        // Add
        mainWindow.addBrowserView(view);

        // Position the view
        const bounds = mainWindow.getContentBounds();
        view.setBounds({
            x: 0,
            y: this.CHROME_HEIGHT,
            width: bounds.width,
            height: bounds.height - this.CHROME_HEIGHT,
        });

        // Setup all event listeners
        this.setupBrowserView(view, tabId);

        // Load URL with error handling
        this.log('Loading URL:', urlString);
        view.webContents.loadURL(urlString).catch((err) => {
            console.error(`[TabManager] Failed to load URL ${urlString}:`, err);
        });

        // Update tab info with view
        tabInfo.url = urlString;
        tabInfo.title = urlString;
        tabInfo.view = view;
        this.tabs.set(tabId, tabInfo);

        // Set as active and hide others
        this.switchTab(mainWindow, tabId);

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

            // Setup all event listeners using centralized method
            this.setupBrowserView(view, tabId);
        }

        if (tab.view) {
            tab.view.webContents.loadURL(urlString);
            tab.url = urlString;
        }
    }

    openDevToolsForActiveTab(): void {
        if (!this.activeTabId) {
            this.log('No active tab to open DevTools for');
            return;
        }

        const tab = this.tabs.get(this.activeTabId);
        if (!tab || !tab.view) {
            this.log('Active tab has no BrowserView');
            return;
        }

        this.log('Opening DevTools for active tab:', this.activeTabId);
        if (!tab.view.webContents.isDevToolsOpened()) {
            tab.view.webContents.openDevTools({ mode: 'right', activate: true });
        } else {
            this.log('DevTools already open for this tab');
            // Focus the DevTools window if already open
            tab.view.webContents.devToolsWebContents?.focus();
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
