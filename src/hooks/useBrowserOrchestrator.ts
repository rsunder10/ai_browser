import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
    BrowserRuntimeState,
    BrowserTab,
    createSinglePaneLayout,
    getFocusedTabId,
    getOrderedTabs,
    setFocusedPaneTab,
} from '../types/browser';
import { resolveSearchUrl } from '../lib/searchEngines';

type RawBrowserTab = Partial<BrowserTab> & {
    id: string;
    url: string;
    title: string;
    history?: string[];
    historyIndex?: number;
};

type BrowserAction =
    | { type: 'replace-tabs'; tabs: BrowserTab[]; activeTabId: string | null }
    | { type: 'upsert-tab'; tab: BrowserTab }
    | { type: 'set-active-tab'; tabId: string | null };

const initialState: BrowserRuntimeState = {
    tabsById: {},
    tabOrder: [],
    layout: createSinglePaneLayout(),
};

function normalizeBrowserTab(tab: RawBrowserTab): BrowserTab {
    return {
        id: tab.id,
        url: tab.url,
        title: tab.title,
        history: Array.isArray(tab.history) ? tab.history : [],
        history_index: tab.history_index ?? tab.historyIndex ?? 0,
        groupId: tab.groupId,
        pinned: tab.pinned,
        muted: tab.muted,
        suspended: tab.suspended,
    };
}

function browserReducer(state: BrowserRuntimeState, action: BrowserAction): BrowserRuntimeState {
    switch (action.type) {
        case 'replace-tabs': {
            const tabsById = Object.fromEntries(action.tabs.map((tab) => [tab.id, tab]));
            const tabOrder = action.tabs.map((tab) => tab.id);
            const nextActiveTabId = action.activeTabId && tabsById[action.activeTabId]
                ? action.activeTabId
                : tabOrder[0] || null;

            return {
                tabsById,
                tabOrder,
                layout: createSinglePaneLayout(nextActiveTabId),
            };
        }
        case 'upsert-tab': {
            return {
                ...state,
                tabsById: {
                    ...state.tabsById,
                    [action.tab.id]: action.tab,
                },
                tabOrder: state.tabOrder.includes(action.tab.id)
                    ? state.tabOrder
                    : [...state.tabOrder, action.tab.id],
            };
        }
        case 'set-active-tab':
            return {
                ...state,
                layout: setFocusedPaneTab(state.layout, action.tabId),
            };
        default:
            return state;
    }
}

function isValidUrl(value: string): boolean {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

export function useBrowserOrchestrator() {
    const [state, dispatch] = useReducer(browserReducer, initialState);
    const [isIncognito, setIsIncognito] = useState(false);
    const initialized = useRef(false);

    const loadTabs = useCallback(async () => {
        if (!window.electron) return;

        try {
            const [rawTabs, activeTabId] = await Promise.all([
                window.electron.invoke('get-tabs') as Promise<RawBrowserTab[]>,
                window.electron.invoke('get-active-tab') as Promise<string | null>,
            ]);

            dispatch({
                type: 'replace-tabs',
                tabs: (rawTabs || []).map(normalizeBrowserTab),
                activeTabId,
            });
        } catch (error) {
            console.error('Failed to load tabs:', error);
        }
    }, []);

    useEffect(() => {
        if (!window.electron || initialized.current) return;

        initialized.current = true;

        const initializeTabs = async () => {
            const incognito = await window.electron.invoke('is-incognito');
            setIsIncognito(incognito);

            await loadTabs();
            const result = await window.electron.invoke('get-tabs');
            if (Array.isArray(result) && result.length === 0) {
                await window.electron.invoke('create-tab', 'neuralweb://home');
                await loadTabs();
            }
        };

        initializeTabs().catch((error) => {
            console.error('Failed to initialize tabs:', error);
        });
    }, [loadTabs]);

    useEffect(() => {
        if (!window.electron) return;

        const handleTabUpdate = (data: RawBrowserTab | null) => {
            if (data?.id) {
                dispatch({
                    type: 'upsert-tab',
                    tab: normalizeBrowserTab(data),
                });
                return;
            }

            loadTabs();
        };

        const handleTabsListChanged = () => {
            loadTabs();
        };

        window.electron.on('tab-updated', handleTabUpdate);
        window.electron.on('tabs:list-changed', handleTabsListChanged);

        return () => {
            window.electron?.removeListener('tab-updated', handleTabUpdate);
            window.electron?.removeListener('tabs:list-changed', handleTabsListChanged);
        };
    }, [loadTabs]);

    const tabs = getOrderedTabs(state);
    const activeTabId = getFocusedTabId(state.layout);
    const activeTab = activeTabId ? state.tabsById[activeTabId] || null : null;

    const handleNewTab = useCallback(async () => {
        try {
            await window.electron.invoke('create-tab', 'neuralweb://home');
            await loadTabs();
        } catch (error) {
            console.error('Failed to create tab:', error);
        }
    }, [loadTabs]);

    const handleTabClick = useCallback(async (tabId: string) => {
        try {
            await window.electron.invoke('switch-tab', tabId);
            dispatch({ type: 'set-active-tab', tabId });
        } catch (error) {
            console.error('Failed to switch tab:', error);
        }
    }, []);

    const handleTabClose = useCallback(async (tabId: string) => {
        try {
            await window.electron.invoke('close-tab', tabId);
            await loadTabs();
        } catch (error) {
            console.error('Failed to close tab:', error);
        }
    }, [loadTabs]);

    const resolveNavigationTarget = useCallback(async (input: string) => {
        const trimmedInput = input.trim();
        if (!trimmedInput) return null;

        if (trimmedInput.startsWith('neuralweb://')) {
            return trimmedInput;
        }

        if (isValidUrl(trimmedInput)) {
            return trimmedInput;
        }

        if (trimmedInput.includes('.') && !trimmedInput.includes(' ')) {
            return `https://${trimmedInput}`;
        }

        try {
            const settings = await window.electron.invoke('settings:get');
            return resolveSearchUrl(trimmedInput, settings);
        } catch (error) {
            console.error('Failed to resolve search URL:', error);
            return resolveSearchUrl(trimmedInput, null);
        }
    }, []);

    const handleNavigate = useCallback(async (input: string) => {
        if (!activeTabId) {
            console.error('No active tab ID!');
            return;
        }

        const url = await resolveNavigationTarget(input);
        if (!url) return;

        try {
            await window.electron.invoke('navigate-tab', activeTabId, url);
            await loadTabs();
        } catch (error) {
            console.error('Failed to navigate:', error);
        }
    }, [activeTabId, loadTabs, resolveNavigationTarget]);

    const handleBack = useCallback(async () => {
        if (!activeTabId) return;

        try {
            await window.electron.invoke('go-back', activeTabId);
            await loadTabs();
        } catch (error) {
            console.error('Failed to go back:', error);
        }
    }, [activeTabId, loadTabs]);

    const handleForward = useCallback(async () => {
        if (!activeTabId) return;

        try {
            await window.electron.invoke('go-forward', activeTabId);
            await loadTabs();
        } catch (error) {
            console.error('Failed to go forward:', error);
        }
    }, [activeTabId, loadTabs]);

    const handleRefresh = useCallback(async () => {
        if (!activeTabId) return;

        try {
            await window.electron.invoke('refresh-tab', activeTabId);
        } catch (error) {
            console.error('Failed to refresh:', error);
        }
    }, [activeTabId]);

    return {
        tabs,
        layout: state.layout,
        activeTabId,
        activeTab,
        isIncognito,
        loadTabs,
        handleNewTab,
        handleTabClick,
        handleTabClose,
        handleNavigate,
        handleBack,
        handleForward,
        handleRefresh,
    };
}
