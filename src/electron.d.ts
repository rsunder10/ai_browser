// Electron API type definitions
declare global {
    interface Window {
        electron: {
            invoke(channel: 'create-tab', url: string): Promise<string>;
            invoke(channel: 'close-tab', tabId: string): Promise<void>;
            invoke(channel: 'switch-tab', tabId: string): Promise<void>;
            invoke(channel: 'navigate-tab', tabId: string, url: string): Promise<void>;
            invoke(channel: 'go-back', tabId: string): Promise<void>;
            invoke(channel: 'go-forward', tabId: string): Promise<void>;
            invoke(channel: 'refresh-tab', tabId: string): Promise<void>;
            invoke(channel: 'get-tabs'): Promise<any[]>;
            invoke(channel: 'get-active-tab'): Promise<string | null>;
            invoke(channel: 'open-devtools'): Promise<void>;
            invoke(channel: 'get-top-sites'): Promise<any[]>;
            invoke(channel: 'bookmarks:get'): Promise<any[]>;
            invoke(channel: 'bookmarks:add', bookmark: any): Promise<any>;
            invoke(channel: 'bookmarks:remove', id: string): Promise<boolean>;
            invoke(channel: 'bookmarks:check', url: string): Promise<boolean>;
            invoke(channel: 'bookmarks:getByUrl', url: string): Promise<any | null>;
            invoke(channel: 'settings:get'): Promise<any>;
            invoke(channel: 'settings:set', key: string, value: any): Promise<boolean>;
            invoke(channel: 'create-incognito-window'): Promise<void>;
            invoke(channel: 'open-browser-menu'): Promise<void>;
            invoke(channel: 'is-incognito'): Promise<boolean>;
            invoke(channel: 'downloads:get-history'): Promise<any[]>;
            invoke(channel: 'extensions:get'): Promise<any[]>;
            invoke(channel: 'extensions:install', path: string): Promise<any>;
            invoke(channel: 'extensions:remove', name: string): Promise<void>;
            invoke(channel: 'extensions:get-actions'): Promise<Array<{ name: string; icon?: string; title?: string }>>;
            invoke(channel: 'extensions:action-click', name: string): Promise<void>;

            // Passwords
            invoke(channel: 'passwords:save', data: { url: string; username: string; password: string }): Promise<boolean>;
            invoke(channel: 'passwords:get', url: string): Promise<Array<{ username: string; password: string }>>;
            invoke(channel: 'passwords:list'): Promise<any[]>;
            invoke(channel: 'passwords:delete', id: string): Promise<void>;

            // Permissions
            invoke(channel: 'permissions:get-all'): Promise<Array<{ origin: string; permission: string; status: 'allow' | 'deny' | 'prompt' }>>;
            invoke(channel: 'permissions:set', data: { origin: string; permission: string; status: 'allow' | 'deny' | 'prompt' }): Promise<void>;
            invoke(channel: 'permissions:clear', origin: string): Promise<void>;
            invoke(channel: 'permission:respond', data: { requestId: string; allowed: boolean; remember: boolean }): Promise<void>;

            invoke(channel: 'downloads:pause', id: string): Promise<void>;
            invoke(channel: 'downloads:resume', id: string): Promise<void>;
            invoke(channel: 'downloads:cancel', id: string): Promise<void>;
            invoke(channel: 'downloads:open-file', id: string): Promise<void>;
            invoke(channel: 'downloads:clear'): Promise<void>;

            // History
            invoke(channel: 'history:get'): Promise<any[]>;
            invoke(channel: 'history:clear'): Promise<void>;
            invoke(channel: 'history:search', query: string): Promise<any[]>;

            // Find in Page
            invoke(channel: 'find:start', text: string): Promise<void>;
            invoke(channel: 'find:stop', action: 'clearSelection' | 'keepSelection' | 'activateSelection'): Promise<void>;
            invoke(channel: 'find:next', text: string): Promise<void>;
            invoke(channel: 'find:prev', text: string): Promise<void>;

            // Zoom
            invoke(channel: 'zoom:set', level: number): Promise<void>;
            invoke(channel: 'zoom:get'): Promise<number>;
            invoke(channel: 'zoom:reset'): Promise<void>;

            // Print
            invoke(channel: 'print:page'): Promise<void>;

            invoke(channel: 'ai_query', data: { provider: string; prompt: string }): Promise<string>;
            invoke(channel: 'ai:chat-stream', data: { messages: Array<{ role: string; content: string }>; requestId: string; skipPageContext?: boolean }): Promise<void>;
            invoke(channel: 'ai:summarize', data: { requestId: string }): Promise<void>;
            invoke(channel: 'ai:suggest', query: string): Promise<string[]>;
            invoke(channel: 'ai:status'): Promise<{ status: string; error: string | null }>;
            invoke(channel: 'ai:models'): Promise<{ models: Array<{ name: string; size: number; digest: string }> }>;
            invoke(channel: 'ai:pull-model', name: string): Promise<{ status: string }>;
            invoke(channel: 'ai:multi-tab-stream', data: { tabIds: string[]; prompt: string; requestId: string }): Promise<void>;
            invoke(channel: 'ai:organize-tabs'): Promise<Array<{ name: string; color: string; tabIds: string[] }>>;
            invoke(channel: 'ai:translate-page', targetLang: string): Promise<void>;
            invoke(channel: 'ai:sidebar-toggle', open: boolean): Promise<void>;
            invoke(channel: 'overlay:set-active', active: boolean): Promise<void>;

            // Sync
            invoke(channel: 'sync:export', options: { bookmarks: boolean; history: boolean; settings: boolean }): Promise<{ success: boolean; path?: string }>;
            invoke(channel: 'sync:import', options: { strategy: 'merge' | 'replace' }): Promise<{ success: boolean; summary?: string }>;

            // Session
            invoke(channel: 'session:clear'): Promise<boolean>;

            // Tracker Dashboard
            invoke(channel: 'adblocker:get-tab-stats', tabId: string): Promise<{ total: number; byCategory: { ads: number; analytics: number; fingerprinting: number; social: number }; blockedDomains: string[] }>;
            invoke(channel: 'adblocker:get-all-stats'): Promise<Array<{ domain: string; total: number; byCategory: { ads: number; analytics: number; fingerprinting: number; social: number }; lastBlocked: number }>>;
            invoke(channel: 'adblocker:clear-stats'): Promise<boolean>;

            // Certificate Viewer
            invoke(channel: 'security:get-certificate', tabId: string): Promise<{ subject: string; issuer: string; validFrom: string; validTo: string; fingerprint: string; serialNumber: string; isSelfSigned: boolean; isExpired: boolean; isExpiringSoon: boolean } | null>;

            // Cookie Manager
            invoke(channel: 'cookies:get-all'): Promise<any[]>;
            invoke(channel: 'cookies:get-for-domain', domain: string): Promise<any[]>;
            invoke(channel: 'cookies:delete', url: string, name: string): Promise<boolean>;
            invoke(channel: 'cookies:clear-domain', domain: string): Promise<boolean>;
            invoke(channel: 'cookies:clear-all'): Promise<boolean>;

            // Container Tabs
            invoke(channel: 'tabs:set-group-container', groupId: string, enable: boolean, name?: string): Promise<boolean>;

            invoke(channel: string, ...args: any[]): Promise<any>;

            on(channel: 'tab-updated', func: (data: { id: string; url: string; title: string; history: string[]; historyIndex: number; groupId?: string; pinned?: boolean; muted?: boolean; suspended?: boolean }) => void): void;
            on(channel: 'tabs:list-changed', func: () => void): void;
            on(channel: 'ai:stream-chunk', func: (data: { requestId: string; content: string; done: boolean }) => void): void;
            on(channel: 'ai:stream-end', func: (data: { requestId: string; error?: string }) => void): void;
            on(channel: 'ai:open-sidebar', func: (data: { text: string; action: string }) => void): void;
            on(channel: 'permission:request', func: (data: { requestId: string; origin: string; permission: string }) => void): void;
            on(channel: 'shortcut:from-browserview', func: (data: { key: string; meta: boolean; shift: boolean; alt: boolean }) => void): void;
            on(channel: 'ai:translation-complete', func: (data: { lang: string }) => void): void;
            on(channel: 'ai:translation-error', func: (data: { error: string }) => void): void;
            on(channel: 'privacy:tab-stats-updated', func: (data: { tabId: string; stats: { total: number; byCategory: { ads: number; analytics: number; fingerprinting: number; social: number } } }) => void): void;
            on(channel: string, func: (...args: any[]) => void): void;
            removeListener(channel: string, func: (...args: any[]) => void): void;
        };
    }
}

export { };
