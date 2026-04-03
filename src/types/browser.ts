export interface BrowserTab {
    id: string;
    url: string;
    title: string;
    history: string[];
    history_index: number;
    groupId?: string;
    pinned?: boolean;
    muted?: boolean;
    suspended?: boolean;
}

export interface BrowserTabSummary {
    id: string;
    url: string;
    title: string;
}

export type BrowserPaneId = 'primary';

export interface BrowserPaneState {
    id: BrowserPaneId;
    tabId: string | null;
}

export interface BrowserLayoutState {
    mode: 'single';
    focusedPaneId: BrowserPaneId;
    panes: Record<BrowserPaneId, BrowserPaneState>;
}

export interface BrowserRuntimeState {
    tabsById: Record<string, BrowserTab>;
    tabOrder: string[];
    layout: BrowserLayoutState;
}

export function createSinglePaneLayout(tabId: string | null = null): BrowserLayoutState {
    return {
        mode: 'single',
        focusedPaneId: 'primary',
        panes: {
            primary: {
                id: 'primary',
                tabId,
            },
        },
    };
}

export function getFocusedTabId(layout: BrowserLayoutState): string | null {
    return layout.panes[layout.focusedPaneId]?.tabId ?? null;
}

export function setFocusedPaneTab(layout: BrowserLayoutState, tabId: string | null): BrowserLayoutState {
    return {
        ...layout,
        panes: {
            ...layout.panes,
            [layout.focusedPaneId]: {
                ...layout.panes[layout.focusedPaneId],
                tabId,
            },
        },
    };
}

export function getOrderedTabs(state: BrowserRuntimeState): BrowserTab[] {
    return state.tabOrder
        .map((tabId) => state.tabsById[tabId])
        .filter((tab): tab is BrowserTab => Boolean(tab));
}

