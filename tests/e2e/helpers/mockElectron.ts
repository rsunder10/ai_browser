export function installMockElectron() {
    const listeners = new Map();
    const internalTitles = {
        'neuralweb://home': 'Home',
        'neuralweb://settings': 'Settings',
        'neuralweb://downloads': 'Downloads',
        'neuralweb://bookmarks': 'Bookmarks',
        'neuralweb://history': 'History',
        'neuralweb://privacy': 'Tracker Dashboard',
        'neuralweb://cookies': 'Cookie Manager',
        'neuralweb://reading-list': 'Reading List',
    };

    const state = {
        activeTabId: 'tab-1',
        tabs: [
            {
                id: 'tab-1',
                url: 'neuralweb://home',
                title: 'Home',
                history: ['neuralweb://home'],
                history_index: 0,
                pinned: false,
                muted: false,
                suspended: false,
            },
        ],
        groups: [],
        settings: {
            searchEngine: 'google',
            searchEngines: [
                {
                    id: 'google',
                    name: 'Google',
                    template: 'https://www.google.com/search?q=%s',
                    keyword: 'g',
                    isBuiltIn: true,
                },
                {
                    id: 'duckduckgo',
                    name: 'DuckDuckGo',
                    template: 'https://duckduckgo.com/?q=%s',
                    keyword: 'd',
                    isBuiltIn: true,
                },
                {
                    id: 'bing',
                    name: 'Bing',
                    template: 'https://www.bing.com/search?q=%s',
                    keyword: 'b',
                    isBuiltIn: true,
                },
            ],
            theme: 'system',
            accentColor: '#1a73e8',
            themePreset: 'default',
            homePage: 'neuralweb://home',
            aiModel: 'llama3.2:1b',
            aiSuggestionsEnabled: false,
            httpsOnlyMode: false,
            autoClearCookieDomains: [],
        },
    };

    const getTitleForUrl = (url) => internalTitles[url] || url;
    const cloneTabs = () => state.tabs.map(tab => ({ ...tab }));
    const emit = (channel, payload) => {
        const callbacks = listeners.get(channel) || [];
        callbacks.forEach((callback) => callback(payload));
    };

    Object.defineProperty(window, 'electron', {
        configurable: true,
        value: {
            invoke: async (channel, ...args) => {
                switch (channel) {
                    case 'is-incognito':
                        return false;
                    case 'get-tabs':
                        return cloneTabs();
                    case 'get-active-tab':
                        return state.activeTabId;
                    case 'create-tab': {
                        const url = args[0] || 'neuralweb://home';
                        const nextIndex = state.tabs.length + 1;
                        const tab = {
                            id: `tab-${nextIndex}`,
                            url,
                            title: getTitleForUrl(url),
                            history: [url],
                            history_index: 0,
                            pinned: false,
                            muted: false,
                            suspended: false,
                        };
                        state.tabs.push(tab);
                        state.activeTabId = tab.id;
                        emit('tabs:list-changed');
                        return tab.id;
                    }
                    case 'switch-tab':
                        state.activeTabId = args[0];
                        emit('tabs:list-changed');
                        return true;
                    case 'close-tab':
                        state.tabs = state.tabs.filter(tab => tab.id !== args[0]);
                        state.activeTabId = state.tabs[0]?.id || null;
                        emit('tabs:list-changed');
                        return true;
                    case 'navigate-tab': {
                        const [tabId, url] = args;
                        const tab = state.tabs.find(item => item.id === tabId);
                        if (tab) {
                            tab.url = url;
                            tab.title = getTitleForUrl(url);
                            tab.history = [...tab.history.slice(0, tab.history_index + 1), url];
                            tab.history_index = tab.history.length - 1;
                            emit('tab-updated', {
                                id: tab.id,
                                url: tab.url,
                                title: tab.title,
                                history: [...tab.history],
                                historyIndex: tab.history_index,
                                groupId: tab.groupId,
                                pinned: tab.pinned,
                                muted: tab.muted,
                                suspended: tab.suspended,
                            });
                        }
                        return true;
                    }
                    case 'go-back':
                    case 'go-forward':
                    case 'refresh-tab':
                    case 'overlay:set-active':
                    case 'ai:sidebar-toggle':
                        return true;
                    case 'tabs:get-groups':
                        return state.groups;
                    case 'extensions:get-actions':
                        return [];
                    case 'bookmarks:get':
                        return [];
                    case 'bookmarks:getByUrl':
                        return null;
                    case 'adblocker:status':
                        return false;
                    case 'adblocker:get-tab-stats':
                        return { total: 0 };
                    case 'reading-list:check':
                        return false;
                    case 'get-top-sites':
                        return [];
                    case 'settings:get':
                        return { ...state.settings };
                    case 'settings:set': {
                        const [key, value] = args;
                        state.settings[key] = value;
                        return true;
                    }
                    case 'ai:status':
                        return { status: 'stopped', error: null };
                    case 'ai:models':
                        return { models: [] };
                    case 'passwords:list':
                        return [];
                    case 'passwords:copy':
                        return true;
                    default:
                        return null;
                }
            },
            on: (channel, callback) => {
                const existing = listeners.get(channel) || [];
                listeners.set(channel, [...existing, callback]);
            },
            removeListener: (channel, callback) => {
                const existing = listeners.get(channel) || [];
                listeners.set(channel, existing.filter((entry) => entry !== callback));
            },
        },
    });
}
