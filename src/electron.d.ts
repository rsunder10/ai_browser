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
            invoke(channel: 'downloads:get-history'): Promise<any[]>;
            invoke(channel: 'downloads:pause', id: string): Promise<void>;
            invoke(channel: 'downloads:resume', id: string): Promise<void>;
            invoke(channel: 'downloads:cancel', id: string): Promise<void>;
            invoke(channel: 'downloads:open-file', id: string): Promise<void>;
            invoke(channel: 'downloads:clear'): Promise<void>;
            invoke(channel: 'ai_query', data: { provider: string; prompt: string }): Promise<string>;
            // invoke: (channel: string, ...args: any[]) => Promise<any>;
            on: (channel: string, callback: (...args: any[]) => void) => void;
            removeListener: (channel: string, callback: (...args: any[]) => void) => void;
        };
    }
}

export { };
