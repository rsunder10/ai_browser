import * as fs from 'fs';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Store } from '../../electron/utils/Store';
import { cleanupTempUserDataDir, createTempUserDataDir } from './helpers';

interface TestPrefs {
    theme: string;
    sidebarOpen: boolean;
}

describe('Store', () => {
    let userDataDir: string;

    beforeEach(() => {
        userDataDir = createTempUserDataDir();
    });

    afterEach(() => {
        cleanupTempUserDataDir(userDataDir);
    });

    it('returns defaults when no persisted file exists', () => {
        const store = new Store<TestPrefs>({
            configName: 'prefs',
            defaults: { theme: 'dark', sidebarOpen: false },
        });

        expect(store.getAll()).toEqual({ theme: 'dark', sidebarOpen: false });
    });

    it('loads existing data from disk', () => {
        const filePath = path.join(userDataDir, 'prefs.json');
        fs.writeFileSync(filePath, JSON.stringify({ theme: 'light', sidebarOpen: true }));

        const store = new Store<TestPrefs>({
            configName: 'prefs',
            defaults: { theme: 'dark', sidebarOpen: false },
        });

        expect(store.get('theme')).toBe('light');
        expect(store.get('sidebarOpen')).toBe(true);
    });

    it('persists updates after the debounce window', async () => {
        const store = new Store<TestPrefs>({
            configName: 'prefs',
            defaults: { theme: 'dark', sidebarOpen: false },
        });

        store.set('theme', 'sunset');
        await new Promise(resolve => setTimeout(resolve, 250));

        const filePath = path.join(userDataDir, 'prefs.json');
        const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TestPrefs;

        expect(saved).toEqual({ theme: 'sunset', sidebarOpen: false });
    });

    it('flushes synchronously when requested', () => {
        const store = new Store<TestPrefs>({
            configName: 'prefs',
            defaults: { theme: 'dark', sidebarOpen: false },
        });

        store.setAll({ theme: 'forest', sidebarOpen: true });
        store.flushSync();

        const filePath = path.join(userDataDir, 'prefs.json');
        const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as TestPrefs;

        expect(saved).toEqual({ theme: 'forest', sidebarOpen: true });
    });
});
