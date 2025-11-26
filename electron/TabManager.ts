import { BrowserWindow, BrowserView, Menu, MenuItem, WebContents } from 'electron';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { SettingsManager } from './managers/SettingsManager';
import { HistoryManager } from './managers/HistoryManager';
import { PasswordManager } from './managers/PasswordManager';
import { SessionManager } from './managers/SessionManager';

interface Tab {
    id: string;
    view: BrowserView;
    title: string;
    url: string;
    favicon?: string;
    history: string[];
    historyIndex: number;
}

export class TabManager {
    private tabs: Map<string, Tab> = new Map();
    private activeTabId: string | null = null;
    private mainWindow: BrowserWindow | null = null;
    private settingsManager: SettingsManager;
    private historyManager: HistoryManager;
    private passwordManager: PasswordManager;
    private sessionManager: SessionManager;
    private visitCounts: Map<string, { count: number; favicon?: string; title?: string }> = new Map();
    private readonly CHROME_HEIGHT = 100;
    private readonly isDevelopment = process.env.NODE_ENV === 'development';
    private readonly isIncognito = false; // TODO: Implement incognito mode

    constructor(historyManager: HistoryManager, sessionManager: SessionManager) {
        this.settingsManager = new SettingsManager();
        this.historyManager = historyManager;
        this.passwordManager = new PasswordManager();
        this.sessionManager = sessionManager;
    }

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

    private saveSession() {
        if (!this.mainWindow || this.isIncognito) return;

        const tabsList = this.getTabs().map(t => ({
            url: t.url,
            title: t.title
        }));

        // Assuming tabOrder is managed elsewhere or we need to derive it
        // For now, let's just save the active tab ID and the list of tabs
        // A more robust solution would involve tracking the order of tabs in an array.
        // For simplicity, let's assume the order in getTabs() is sufficient for now.
        const activeIndex = tabsList.findIndex(t => {
            const activeTab = this.tabs.get(this.activeTabId || '');
            return activeTab && t.url === activeTab.url && t.title === activeTab.title;
        });

        this.sessionManager.updateWindow(this.mainWindow.id, tabsList, activeIndex);
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
                this.updatePageMetadata(tab.url, { title });
                this.log('Title updated:', title, 'for tab:', tabId);
            }
        });

        // Favicon updates
        view.webContents.on('page-favicon-updated', (_event, favicons) => {
            const tab = this.tabs.get(tabId);
            if (tab && favicons && favicons.length > 0) {
                // Prefer high-res icons if available, but for now just take the first one
                const favicon = favicons[0];
                this.updatePageMetadata(tab.url, { favicon });
                this.log('Favicon updated:', favicon, 'for tab:', tabId);
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
                this.recordNavigation(url);
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
                this.recordNavigation(url);
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
        const tabInfo: Tab = {
            id: tabId,
            url: url,
            title: url === 'neuralweb://home' ? 'Home' :
                (url === 'neuralweb://settings' ? 'Settings' :
                    (url === 'neuralweb://downloads' ? 'Downloads' :
                        (url === 'neuralweb://bookmarks' ? 'Bookmarks' : url))),
            view: null as any, // Will be set for non-home pages
            history: [],
            historyIndex: 0
        };

        // Handle special neuralweb:// protocol
        if (url.startsWith('neuralweb://')) {
            this.tabs.set(tabId, tabInfo);
            this.switchTab(mainWindow, tabId);
            this.saveSession();
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
        this.saveSession();

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
        this.saveSession();
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
        this.saveSession();
    }

    navigateTab(tabId: string, url: string) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // Handle navigation to internal pages
        if (url.startsWith('neuralweb://')) {
            // Remove existing view if present
            if (tab.view && this.mainWindow) {
                this.mainWindow.removeBrowserView(tab.view);
                (tab.view.webContents as any).destroy();
            }
            tab.view = null as any;
            tab.url = url;
            tab.title = url === 'neuralweb://home' ? 'Home' :
                (url === 'neuralweb://settings' ? 'Settings' :
                    (url === 'neuralweb://downloads' ? 'Downloads' :
                        (url === 'neuralweb://bookmarks' ? 'Bookmarks' : url)));

            // Notify renderer
            if (this.mainWindow) {
                this.mainWindow.webContents.send('tab-updated', this.activeTabId);
            }
            this.saveSession();
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
        this.saveSession();
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
        if (tab && tab.view) {
            tab.view.webContents.reload();
        }
    }

    getTabs(): Array<{ id: string; url: string; title: string; history: string[]; history_index: number }> {
        return Array.from(this.tabs.values()).map(tab => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            history: tab.history,
            history_index: tab.historyIndex
        }));
    }

    getActiveTabId(): string | null {
        return this.activeTabId;
    }

    private async loadVisitCounts() {
        // Load visit counts from disk if persistence is implemented
        // For now, it's in-memory
    }

    recordNavigation(url: string) {
        if (!url || url.startsWith('neuralweb://') || url === 'about:blank') return;

        try {
            const domain = new URL(url).hostname;
            const current = this.visitCounts.get(domain) || { count: 0 };

            this.visitCounts.set(domain, {
                ...current,
                count: current.count + 1
            });
            this.log('Recorded visit for:', domain, 'Count:', current.count + 1);

            // Add to global history
            this.historyManager.addEntry({
                url: url,
                title: url, // Initial title is URL
            });
            this.saveSession();
        } catch (e) {
            // Invalid URL, ignore
        }
    }

    updatePageMetadata(url: string, metadata: { title?: string, favicon?: string }) {
        if (!url || url.startsWith('neuralweb://') || url === 'about:blank') return;

        try {
            const domain = new URL(url).hostname;
            const current = this.visitCounts.get(domain);

            if (current) {
                this.visitCounts.set(domain, {
                    ...current,
                    title: metadata.title || current.title,
                    favicon: metadata.favicon || current.favicon
                });
            }

            // Update global history
            this.historyManager.updateLastEntry(url, metadata);
            this.saveSession();
        } catch (e) {
            // Invalid URL, ignore
        }
    }


    getTopSites(): Array<{ name: string; url: string; icon: string; color: string; favicon?: string }> {
        const sortedSites = Array.from(this.visitCounts.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 8)
            .map(([domain, data]) => {
                let name = domain.replace(/^https?:\/\/(www\.)?/, '');
                name = name.charAt(0).toUpperCase() + name.slice(1);

                // Use Google's favicon service as fallback if no local favicon
                const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

                return {
                    name: data.title || name,
                    url: domain,
                    icon: '🌐', // Fallback emoji
                    color: '#333333',
                    favicon: data.favicon || fallbackFavicon
                };
            });

        return sortedSites;
    }

    repositionViews(mainWindow: BrowserWindow): void {
        const bounds = mainWindow.getContentBounds();
        this.tabs.forEach((tab) => {
            if (tab.id === this.activeTabId && tab.view) {
                tab.view.setBounds({
                    x: 0,
                    y: this.CHROME_HEIGHT,
                    width: bounds.width,
                    height: bounds.height - this.CHROME_HEIGHT,
                });
            }
        });
    }

    // New Features

    findInPage(text: string, forward: boolean = true) {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            tab.view.webContents.findInPage(text, { forward, findNext: true });
        }
    }

    stopFindInPage(action: 'clearSelection' | 'keepSelection' | 'activateSelection') {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            tab.view.webContents.stopFindInPage(action);
        }
    }

    setZoomLevel(level: number) {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            tab.view.webContents.setZoomLevel(level);
        }
    }

    getZoomLevel(): number {
        if (!this.activeTabId) return 0;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            return tab.view.webContents.getZoomLevel();
        }
        return 0;
    }

    printPage() {
        if (!this.activeTabId) return;
        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            tab.view.webContents.print();
        }
    }
}
