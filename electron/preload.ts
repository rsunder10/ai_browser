import { contextBridge, ipcRenderer } from 'electron';

// Map to track wrapped callbacks so removeListener can find the correct function
const listenerMap = new Map<Function, Function>();

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
            'extensions:get-actions',
            'extensions:action-click',
            'passwords:save',
            'passwords:get',
            'permissions:get-all',
            'permissions:set',
            'permissions:clear',
            'permission:respond',
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
            'ai:chat-stream',
            'ai:summarize',
            'ai:suggest',
            'ai:status',
            'ai:models',
            'ai:pull-model',
            'passwords:list',
            'reader:toggle',
            'reader:status',
            'passwords:delete',
            'adblocker:toggle',
            'adblocker:status',
            'adblocker:get-tab-stats',
            'adblocker:get-all-stats',
            'adblocker:clear-stats',
            'security:get-certificate',
            'cookies:get-all',
            'cookies:get-for-domain',
            'cookies:delete',
            'cookies:clear-domain',
            'cookies:clear-all',
            'tabs:set-group-container',
            'tabs:create-group',
            'tabs:add-to-group',
            'tabs:remove-from-group',
            'tabs:get-groups',
            'tabs:delete-group',
            'tabs:show-context-menu',
            'tabs:set-visibility',
            'session:clear',
            'ai:sidebar-toggle',
            'overlay:set-active',
            'sync:export',
            'sync:import',
            'ai:organize-tabs',
            'ai:multi-tab-stream',
            'ai:translate-page',
        ];

        if (validChannels.includes(channel)) {
            return ipcRenderer.invoke(channel, ...args);
        }
    },
    on: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = [
            'tab-updated',
            'tabs:list-changed',
            'trigger-find',
            'show-create-group-dialog',
            'ai:stream-chunk',
            'ai:stream-end',
            'ai:open-sidebar',
            'permission:request',
            'shortcut:from-browserview',
            'ai:translation-complete',
            'ai:translation-error',
            'privacy:tab-stats-updated',
        ];

        if (validChannels.includes(channel)) {
            const wrapped = (_event: any, ...args: any[]) => callback(...args);
            listenerMap.set(callback, wrapped);
            ipcRenderer.on(channel, wrapped);
        }
    },
    removeListener: (channel: string, callback: (...args: any[]) => void) => {
        const validChannels = [
            'tab-updated',
            'tabs:list-changed',
            'trigger-find',
            'show-create-group-dialog',
            'ai:stream-chunk',
            'ai:stream-end',
            'ai:open-sidebar',
            'permission:request',
            'shortcut:from-browserview',
            'ai:translation-complete',
            'ai:translation-error',
            'privacy:tab-stats-updated',
        ];

        if (validChannels.includes(channel)) {
            const wrapped = listenerMap.get(callback);
            if (wrapped) {
                ipcRenderer.removeListener(channel, wrapped as any);
                listenerMap.delete(callback);
            }
        }
    },
});

// Auto-fill logic
window.addEventListener('DOMContentLoaded', async () => {
    const url = window.location.href;
    if (url.startsWith('neuralweb://')) return;

    try {
        const credentials = await ipcRenderer.invoke('passwords:get', url);
        if (credentials && credentials.length > 0) {
            try { // New try block for DOM manipulation
                const { username, password } = credentials[0];

                // Find password field
                const passwordInput = document.querySelector('input[type="password"]') as any;
                if (passwordInput) {
                    passwordInput.value = password;

                    // Find preceding text/email input for username
                    const form = passwordInput.form;
                    if (form) {
                        const inputs = Array.from(form.querySelectorAll('input'));
                        const passIndex = inputs.indexOf(passwordInput);
                        if (passIndex > 0) {
                            const prevInput = inputs[passIndex - 1] as any;
                            if (prevInput.type === 'text' || prevInput.type === 'email') {
                                prevInput.value = username;
                            }
                        }
                    }
                }
            } catch (domError) {
                // Ignore DOM manipulation errors
            }
        }
    } catch (e) {
        // Ignore errors
    }
});
