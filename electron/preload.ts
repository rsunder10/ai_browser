import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
    invoke: (channel: string, ...args: any[]) => {
        const validChannels = [
            'create-tab',
            'close-tab',
            'switch-tab',
            'navigate-tab',
            'go-back',
            'go-forward',
            'refresh-tab',
            'get-tabs',
            'get-active-tab',
            'open-devtools',
            'get-top-sites',
            'extensions:get',
            'extensions:install',
            'extensions:remove',
            'passwords:save',
            'passwords:get',
            'permissions:get-all',
            'permissions:set',
            'permissions:clear',
            'bookmarks:get',
            'bookmarks:add',
            'bookmarks:remove',
            'bookmarks:check',
            'bookmarks:getByUrl',
            'settings:get',
            'settings:set',
            'downloads:get-history',
            'downloads:pause',
            'downloads:resume',
            'downloads:cancel',
            'downloads:open-file',
            'downloads:clear',
            'create-incognito-window',
            'open-browser-menu',
            'is-incognito',
            'history:get',
            'history:clear',
            'history:search',
            'find:start',
            'find:stop',
            'find:next',
            'find:prev',
            'zoom:set',
            'zoom:get',
            'zoom:reset',
            'print:page',
            'ai_query',
            'passwords:list',
            'session:clear',
        ];

        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = ['tab-updated', 'trigger-find'];

        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_event, ...args) => callback(...args));
        }
    },
    removeListener: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = ['tab-updated', 'trigger-find'];

        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    },
});
