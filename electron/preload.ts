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
        ];

        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = ['tab-updated'];

        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (_event, ...args) => callback(...args));
        }
    },
    removeListener: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = ['tab-updated'];

        if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, callback);
        }
    },
});
