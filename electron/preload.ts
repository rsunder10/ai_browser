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
