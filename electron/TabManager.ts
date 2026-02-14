import { BrowserWindow, BrowserView, Menu, MenuItem, WebContents } from 'electron';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { SettingsManager } from './managers/SettingsManager';
import { HistoryManager } from './managers/HistoryManager';
import { PasswordManager } from './managers/PasswordManager';
import { SessionManager } from './managers/SessionManager';

interface TabGroup {
    id: string;
    name: string;
    color: string;
}

interface Tab {
    id: string;
    view: BrowserView;
    title: string;
    url: string;
    favicon?: string;
    history: string[];
    historyIndex: number;
    groupId?: string;
    scrollPosition?: { x: number; y: number };
    pinned: boolean;
    muted: boolean;
    suspended: boolean;
    lastActiveAt: number;
}

export class TabManager {
    private tabs: Map<string, Tab> = new Map();
    private groups: Map<string, TabGroup> = new Map();
    private activeTabId: string | null = null;
    private mainWindow: BrowserWindow | null = null;
    private settingsManager: SettingsManager;
    private historyManager: HistoryManager;
    private passwordManager: PasswordManager;
    private sessionManager: SessionManager;
    private visitCounts: Map<string, { count: number; favicon?: string; title?: string }> = new Map();
    private onExplainText?: (text: string) => void;
    private onTranslateRequest?: (tabId: string, targetLang: string) => void;
    private readonly CHROME_HEIGHT = 100;
    private readonly isDevelopment = process.env.NODE_ENV === 'development';
    private readonly isIncognito = false;
    private suspensionInterval: NodeJS.Timeout | null = null;
    private readonly SUSPEND_AFTER_MS = 10 * 60 * 1000; // 10 minutes
    private aiSidebarWidth: number = 0; // 0 when closed, sidebar width when open
    private overlayActive: boolean = false;

    constructor(historyManager: HistoryManager, sessionManager: SessionManager) {
        this.settingsManager = new SettingsManager();
        this.historyManager = historyManager;
        this.passwordManager = new PasswordManager();
        this.sessionManager = sessionManager;
        this.startSuspensionCheck();
    }

    private startSuspensionCheck() {
        this.suspensionInterval = setInterval(() => {
            this.checkForSuspension();
        }, 60_000);
    }

    private checkForSuspension() {
        const now = Date.now();
        this.tabs.forEach((tab, tabId) => {
            if (tabId === this.activeTabId) return;
            if (tab.suspended) return;
            if (!tab.view) return;
            // Don't suspend tabs playing audio
            if (tab.view.webContents && !tab.view.webContents.isDestroyed() && tab.view.webContents.isCurrentlyAudible()) return;
            if (now - tab.lastActiveAt > this.SUSPEND_AFTER_MS) {
                this.suspendTab(tabId);
            }
        });
    }

    private suspendTab(tabId: string) {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view || tab.suspended) return;

        this.log('Suspending tab:', tabId, tab.url);
        if (this.mainWindow) {
            this.mainWindow.removeBrowserView(tab.view);
        }
        if (!tab.view.webContents.isDestroyed()) {
            (tab.view.webContents as any).destroy();
        }
        tab.view = null as any;
        tab.suspended = true;
        this.sendTabUpdate(tabId);
    }

    private async unsuspendTab(tabId: string): Promise<void> {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.suspended || !this.mainWindow) return;

        this.log('Unsuspending tab:', tabId, tab.url);
        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
            },
        });

        tab.view = view;
        tab.suspended = false;
        tab.lastActiveAt = Date.now();

        this.setupBrowserView(view, tabId);

        if (tab.url && !tab.url.startsWith('neuralweb://')) {
            view.webContents.loadURL(tab.url).catch(err => {
                console.error(`[TabManager] Failed to reload suspended tab ${tab.url}:`, err);
            });
            if (tab.scrollPosition) {
                view.webContents.once('did-finish-load', () => {
                    if (tab.scrollPosition) {
                        view.webContents.executeJavaScript(`window.scrollTo(${tab.scrollPosition.x}, ${tab.scrollPosition.y})`);
                    }
                });
            }
        }
    }

    setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
        if (this.isDevelopment) {
            console.log('[TabManager] Main window set');
        }
    }

    setOnExplainText(handler: (text: string) => void) {
        this.onExplainText = handler;
    }

    setOnTranslateRequest(handler: (tabId: string, targetLang: string) => void) {
        this.onTranslateRequest = handler;
    }

    private log(...args: any[]) {
        if (this.isDevelopment) {
            console.log('[TabManager]', ...args);
        }
    }

    private sendTabUpdate(tabId: string) {
        if (!this.mainWindow) return;
        const tab = this.tabs.get(tabId);
        if (!tab) return;
        this.mainWindow.webContents.send('tab-updated', {
            id: tab.id,
            url: tab.url,
            title: tab.title,
            history: tab.history,
            historyIndex: tab.historyIndex,
            groupId: tab.groupId,
            scrollPosition: tab.scrollPosition,
            pinned: tab.pinned,
            muted: tab.muted,
            suspended: tab.suspended,
        });
    }

    private sendTabsListChanged() {
        if (!this.mainWindow) return;
        this.mainWindow.webContents.send('tabs:list-changed');
    }

    private async captureScrollPosition(tabId: string): Promise<{ x: number; y: number } | undefined> {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return undefined;

        try {
            const position = await tab.view.webContents.executeJavaScript(`
                ({ x: window.scrollX, y: window.scrollY })
            `);
            return position;
        } catch (e) {
            return undefined;
        }
    }

    private async saveSession() {
        if (!this.mainWindow || this.isIncognito) return;

        if (this.activeTabId) {
            const scroll = await this.captureScrollPosition(this.activeTabId);
            const activeTab = this.tabs.get(this.activeTabId);
            if (activeTab && scroll) {
                activeTab.scrollPosition = scroll;
            }
        }

        const tabsList = this.getTabs().map(t => ({
            url: t.url,
            title: t.title,
            groupId: t.groupId,
            scrollPosition: t.scrollPosition,
            history: t.history,
            historyIndex: t.historyIndex
        }));

        const groupsList = this.getGroups();

        const activeIndex = tabsList.findIndex(t => {
            const activeTab = this.tabs.get(this.activeTabId || '');
            return activeTab && t.url === activeTab.url && t.title === activeTab.title;
        });

        this.sessionManager.updateWindow(this.mainWindow.id, tabsList, groupsList, activeIndex);
    }

    private setupBrowserView(view: BrowserView, tabId: string): void {
        this.log('Setting up BrowserView for tab:', tabId);

        view.webContents.on('page-title-updated', (_event, title) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.title = title;
                this.sendTabUpdate(tabId);
                this.updatePageMetadata(tab.url, { title });
                this.log('Title updated:', title, 'for tab:', tabId);
            }
        });

        view.webContents.on('page-favicon-updated', (_event, favicons) => {
            const tab = this.tabs.get(tabId);
            if (tab && favicons && favicons.length > 0) {
                const favicon = favicons[0];
                this.updatePageMetadata(tab.url, { favicon });
                this.log('Favicon updated:', favicon, 'for tab:', tabId);
            }
        });

        view.webContents.on('did-navigate', (_event, url) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.url = url;
                this.sendTabUpdate(tabId);
                this.recordNavigation(url);
                this.log('Navigated to:', url);
            }
        });

        view.webContents.on('did-navigate-in-page', (_event, url) => {
            const tab = this.tabs.get(tabId);
            if (tab) {
                tab.url = url;
                this.sendTabUpdate(tabId);
                this.recordNavigation(url);
            }
        });

        view.webContents.on('context-menu', (_event, params) => {
            this.log('Context menu triggered at:', params.x, params.y);
            const menu = new Menu();

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

            if (params.isEditable) {
                menu.append(new MenuItem({ label: 'Cut', role: 'cut' }));
                menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
                menu.append(new MenuItem({ label: 'Paste', role: 'paste' }));
                menu.append(new MenuItem({ type: 'separator' }));
            } else if (params.selectionText) {
                menu.append(new MenuItem({ label: 'Copy', role: 'copy' }));
                const truncated = params.selectionText.length > 30
                    ? params.selectionText.substring(0, 30) + '...'
                    : params.selectionText;
                menu.append(new MenuItem({
                    label: `Explain "${truncated}"`,
                    click: () => {
                        if (this.onExplainText) {
                            this.onExplainText(params.selectionText);
                        }
                    }
                }));
                menu.append(new MenuItem({ type: 'separator' }));
            }

            // Translate Page submenu
            const languages = ['Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Korean', 'Portuguese', 'Russian'];
            menu.append(new MenuItem({
                label: 'Translate Page',
                type: 'submenu',
                submenu: Menu.buildFromTemplate(
                    languages.map(lang => ({
                        label: lang,
                        click: () => {
                            if (this.onTranslateRequest) {
                                this.onTranslateRequest(tabId, lang);
                            }
                        },
                    }))
                ),
            }));
            menu.append(new MenuItem({ type: 'separator' }));

            if (this.isDevelopment) {
                menu.append(new MenuItem({
                    label: 'Inspect Element',
                    click: () => {
                        this.log('Opening DevTools at:', params.x, params.y);

                        if (!view.webContents.isDevToolsOpened()) {
                            view.webContents.openDevTools({ mode: 'right', activate: true });
                        }

                        view.webContents.inspectElement(params.x, params.y);
                    }
                }));
            }

            if (params.mediaType === 'image') {
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(new MenuItem({
                    label: 'Save Image As...',
                    click: () => {
                        view.webContents.downloadURL(params.srcURL);
                    }
                }));
            }

            if (params.linkURL) {
                menu.append(new MenuItem({ type: 'separator' }));
                menu.append(new MenuItem({
                    label: 'Open Link in New Tab',
                    click: () => {
                        if (this.mainWindow) {
                            this.createTab(this.mainWindow, params.linkURL);
                        }
                    }
                }));
            }

            menu.popup();
        });

        view.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
            console.error('[TabManager] Failed to load:', errorDescription, 'Code:', errorCode);
        });

        view.webContents.on('did-finish-load', () => {
            this.log('Page loaded for tab:', tabId);
        });

        view.webContents.on('render-process-gone', (_event, details) => {
            console.error('[TabManager] Renderer process gone:', details.reason);
            const tab = this.tabs.get(tabId);
            if (tab) {
                const crashUrl = `file://${path.join(__dirname, 'pages/crash.html')}?url=${encodeURIComponent(tab.url)}&reason=${details.reason}`;
                view.webContents.loadURL(crashUrl).catch(err => console.error('Failed to load crash page:', err));
            }
        });

        // Intercept keyboard shortcuts from BrowserView and forward to renderer
        view.webContents.on('before-input-event', (event, input) => {
            if (!this.mainWindow || input.type !== 'keyDown') return;
            const meta = process.platform === 'darwin' ? input.meta : input.control;

            if (meta && !input.shift && !input.alt) {
                const key = input.key.toLowerCase();
                if (['k', 'f', 'l', 't', 'w', 'h', 'j', 'b', 'p', '=', '+', '-', '0'].includes(key)) {
                    event.preventDefault();
                    this.mainWindow.webContents.send('shortcut:from-browserview', { key, meta: true, shift: false, alt: false });
                }
            }

            // Cmd+Alt+I / Ctrl+Shift+I — DevTools
            if ((input.meta && input.alt && input.key.toLowerCase() === 'i') ||
                (input.control && input.shift && input.key.toLowerCase() === 'i')) {
                event.preventDefault();
                this.openDevToolsForActiveTab();
            }

            // Escape
            if (input.key === 'Escape') {
                this.mainWindow.webContents.send('shortcut:from-browserview', { key: 'escape', meta: false, shift: false, alt: false });
            }
        });
    }

    async createTab(mainWindow: BrowserWindow, url: string, initialState?: { history?: string[], historyIndex?: number, scrollPosition?: { x: number, y: number } }): Promise<string> {
        const tabId = `tab-${randomUUID()}`;

        const tabInfo: Tab = {
            id: tabId,
            url: url,
            title: url === 'neuralweb://home' ? 'Home' :
                (url === 'neuralweb://settings' ? 'Settings' :
                    (url === 'neuralweb://downloads' ? 'Downloads' :
                        (url === 'neuralweb://bookmarks' ? 'Bookmarks' : url))),
            view: null as any,
            history: initialState?.history || [],
            historyIndex: initialState?.historyIndex || 0,
            scrollPosition: initialState?.scrollPosition,
            pinned: false,
            muted: false,
            suspended: false,
            lastActiveAt: Date.now(),
        };

        if (url.startsWith('neuralweb://')) {
            if (url !== 'neuralweb://crash') {
                this.tabs.set(tabId, tabInfo);
                this.switchTab(mainWindow, tabId);
                this.sendTabsListChanged();
                this.saveSession();
                return tabId;
            }
        }

        const urlString = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('neuralweb://')
            ? url
            : `https://${url}`;

        const view = new BrowserView({
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: false,
            },
        });

        mainWindow.addBrowserView(view);

        const bounds = mainWindow.getContentBounds();
        view.setBounds({
            x: 0,
            y: this.CHROME_HEIGHT,
            width: bounds.width - this.aiSidebarWidth,
            height: bounds.height - this.CHROME_HEIGHT,
        });

        this.setupBrowserView(view, tabId);

        if (url === 'neuralweb://crash') {
            setTimeout(() => {
                view.webContents.forcefullyCrashRenderer();
            }, 1000);
        } else {
            this.log('Loading URL:', urlString);
            view.webContents.loadURL(urlString).catch((err) => {
                console.error(`[TabManager] Failed to load URL ${urlString}:`, err);
            });
        }

        if (initialState?.scrollPosition) {
            view.webContents.once('did-finish-load', () => {
                if (initialState.scrollPosition) {
                    view.webContents.executeJavaScript(`window.scrollTo(${initialState.scrollPosition.x}, ${initialState.scrollPosition.y})`);
                }
            });
        }

        tabInfo.url = urlString;
        tabInfo.title = urlString;
        tabInfo.view = view;
        this.tabs.set(tabId, tabInfo);

        this.switchTab(mainWindow, tabId);
        this.sendTabsListChanged();
        this.saveSession();

        return tabId;
    }

    closeTab(mainWindow: BrowserWindow, tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        if (tab.view) {
            mainWindow.removeBrowserView(tab.view);
            if (!tab.view.webContents.isDestroyed()) {
                (tab.view.webContents as any).destroy();
            }
        }

        this.tabs.delete(tabId);

        if (this.activeTabId === tabId) {
            const remainingTabs = Array.from(this.tabs.keys());
            if (remainingTabs.length > 0) {
                this.switchTab(mainWindow, remainingTabs[0]);
            } else {
                this.activeTabId = null;
            }
        }
        this.sendTabsListChanged();
        this.saveSession();
    }

    async switchTab(mainWindow: BrowserWindow, tabId: string): Promise<void> {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        // If tab is suspended, unsuspend it
        if (tab.suspended) {
            await this.unsuspendTab(tabId);
        }

        // Hide all views
        this.tabs.forEach((t) => {
            if (t.view) {
                mainWindow.removeBrowserView(t.view);
            }
        });

        // Show selected view
        if (tab.view) {
            mainWindow.addBrowserView(tab.view);

            const bounds = mainWindow.getContentBounds();
            tab.view.setBounds({
                x: 0,
                y: this.CHROME_HEIGHT,
                width: bounds.width - this.aiSidebarWidth,
                height: bounds.height - this.CHROME_HEIGHT,
            });
        }

        this.activeTabId = tabId;
        tab.lastActiveAt = Date.now();
        this.saveSession();
    }

    navigateTab(tabId: string, url: string) {
        const tab = this.tabs.get(tabId);
        if (!tab) return;

        if (url.startsWith('neuralweb://')) {
            if (tab.view && this.mainWindow) {
                this.mainWindow.removeBrowserView(tab.view);
                if (!tab.view.webContents.isDestroyed()) {
                    (tab.view.webContents as any).destroy();
                }
            }
            tab.view = null as any;
            tab.url = url;
            tab.title = url === 'neuralweb://home' ? 'Home' :
                (url === 'neuralweb://settings' ? 'Settings' :
                    (url === 'neuralweb://downloads' ? 'Downloads' :
                        (url === 'neuralweb://bookmarks' ? 'Bookmarks' : url)));
            tab.suspended = false;

            this.sendTabUpdate(tabId);
            this.saveSession();
            return;
        }

        const urlString = url.startsWith('http://') || url.startsWith('https://')
            ? url
            : `https://${url}`;

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
                width: bounds.width - this.aiSidebarWidth,
                height: bounds.height - this.CHROME_HEIGHT,
            });

            tab.view = view;
            tab.suspended = false;

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
            tab.view.webContents.devToolsWebContents?.focus();
        }
    }

    goBack(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (tab && tab.view && tab.view.webContents.canGoBack()) {
            tab.view.webContents.goBack();
        }
    }

    goForward(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (tab && tab.view && tab.view.webContents.canGoForward()) {
            tab.view.webContents.goForward();
        }
    }

    refreshTab(tabId: string): void {
        const tab = this.tabs.get(tabId);
        if (tab && tab.view) {
            tab.view.webContents.reload();
        }
    }

    getTabs(): Array<{ id: string; url: string; title: string; history: string[]; historyIndex: number; groupId?: string; scrollPosition?: { x: number; y: number }; pinned: boolean; muted: boolean; suspended: boolean }> {
        return Array.from(this.tabs.values()).map(tab => ({
            id: tab.id,
            url: tab.url,
            title: tab.title,
            history: tab.history,
            historyIndex: tab.historyIndex,
            groupId: tab.groupId,
            scrollPosition: tab.scrollPosition,
            pinned: tab.pinned,
            muted: tab.muted,
            suspended: tab.suspended,
        }));
    }

    getTab(tabId: string): BrowserView | null {
        const tab = this.tabs.get(tabId);
        return tab ? tab.view : null;
    }


    getActiveTabId(): string | null {
        return this.activeTabId;
    }

    async getActiveTabContent(): Promise<{ text: string; url: string; title: string } | null> {
        if (!this.activeTabId) return null;
        return this.getTabContent(this.activeTabId);
    }

    async getTabContent(tabId: string, maxChars: number = 15000): Promise<{ text: string; url: string; title: string } | null> {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return null;

        try {
            const text = await tab.view.webContents.executeJavaScript(
                `document.body.innerText.substring(0, ${maxChars})`
            );
            return {
                text: text || '',
                url: tab.url,
                title: tab.title,
            };
        } catch {
            return null;
        }
    }

    async getMultiTabContent(tabIds: string[]): Promise<Array<{ text: string; url: string; title: string }>> {
        const limited = tabIds.slice(0, 5);
        const results: Array<{ text: string; url: string; title: string }> = [];
        for (const id of limited) {
            const content = await this.getTabContent(id, 10000);
            if (content) results.push(content);
        }
        return results;
    }

    private async loadVisitCounts() {
        // Load visit counts from disk if persistence is implemented
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

            this.historyManager.addEntry({
                url: url,
                title: url,
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

                const fallbackFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;

                return {
                    name: data.title || name,
                    url: domain,
                    icon: '🌐',
                    color: '#333333',
                    favicon: data.favicon || fallbackFavicon
                };
            });

        return sortedSites;
    }

    setOverlayActive(active: boolean): void {
        this.overlayActive = active;
        this.setTabVisibility(!active);
    }

    setAiSidebarOpen(open: boolean): void {
        this.aiSidebarWidth = open ? 400 : 0;
        if (this.mainWindow) {
            this.repositionViews(this.mainWindow);
        }
    }

    repositionViews(mainWindow: BrowserWindow): void {
        const bounds = mainWindow.getContentBounds();
        this.tabs.forEach((tab) => {
            if (tab.id === this.activeTabId && tab.view) {
                tab.view.setBounds({
                    x: 0,
                    y: this.CHROME_HEIGHT,
                    width: bounds.width - this.aiSidebarWidth,
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

    // Tab Groups Management
    createGroup(name: string, color: string): TabGroup {
        const id = randomUUID();
        const group = { id, name, color };
        this.groups.set(id, group);
        this.saveSession();
        return group;
    }

    restoreGroup(group: TabGroup): void {
        this.groups.set(group.id, group);
    }

    addTabToGroup(tabId: string, groupId: string): boolean {
        const tab = this.tabs.get(tabId);
        const group = this.groups.get(groupId);

        if (!tab || !group) return false;

        tab.groupId = groupId;
        this.saveSession();
        this.sendTabUpdate(tabId);
        return true;
    }

    removeTabFromGroup(tabId: string): boolean {
        const tab = this.tabs.get(tabId);

        if (!tab) return false;

        tab.groupId = undefined;
        this.saveSession();
        this.sendTabUpdate(tabId);
        return true;
    }

    getGroups(): TabGroup[] {
        return Array.from(this.groups.values());
    }

    deleteGroup(groupId: string): boolean {
        this.tabs.forEach(tab => {
            if (tab.groupId === groupId) {
                tab.groupId = undefined;
            }
        });

        const result = this.groups.delete(groupId);
        if (result) {
            this.saveSession();
        }
        return result;
    }

    setTabVisibility(visible: boolean): void {
        if (!this.mainWindow || !this.activeTabId) return;

        const tab = this.tabs.get(this.activeTabId);
        if (tab && tab.view) {
            if (visible) {
                this.mainWindow.addBrowserView(tab.view);
                const bounds = this.mainWindow.getContentBounds();
                tab.view.setBounds({
                    x: 0,
                    y: this.CHROME_HEIGHT,
                    width: bounds.width - this.aiSidebarWidth,
                    height: bounds.height - this.CHROME_HEIGHT,
                });
            } else {
                this.mainWindow.removeBrowserView(tab.view);
            }
        }
    }

    async duplicateTab(tabId: string): Promise<string | null> {
        const tab = this.tabs.get(tabId);
        if (!tab || !this.mainWindow) return null;

        return this.createTab(this.mainWindow, tab.url);
    }

    togglePin(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab) return false;

        tab.pinned = !tab.pinned;
        this.saveSession();
        this.sendTabUpdate(tabId);
        return tab.pinned;
    }

    toggleMute(tabId: string): boolean {
        const tab = this.tabs.get(tabId);
        if (!tab || !tab.view) return false;

        tab.muted = !tab.muted;
        tab.view.webContents.setAudioMuted(tab.muted);

        this.saveSession();
        this.sendTabUpdate(tabId);
        return tab.muted;
    }

    closeOtherTabs(keepTabId: string): void {
        if (!this.mainWindow) return;

        const tabsToRemove = Array.from(this.tabs.keys()).filter(id => id !== keepTabId);

        tabsToRemove.forEach(id => {
            this.closeTab(this.mainWindow!, id);
        });
    }
}
