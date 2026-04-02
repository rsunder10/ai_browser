import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { HistoryManager, type HistoryEntry } from '../../electron/managers/HistoryManager';
import { cleanupTempUserDataDir, createTempUserDataDir } from './helpers';

describe('HistoryManager', () => {
    let userDataDir: string;

    beforeEach(() => {
        userDataDir = createTempUserDataDir();
    });

    afterEach(() => {
        cleanupTempUserDataDir(userDataDir);
    });

    it('skips internal and blank pages', () => {
        const manager = new HistoryManager();

        manager.addEntry({ url: 'neuralweb://home', title: 'Home' });
        manager.addEntry({ url: 'about:blank', title: 'Blank' });
        manager.addEntry({ url: 'https://example.com', title: 'Example' });

        expect(manager.getHistory()).toHaveLength(1);
        expect(manager.getHistory()[0]).toMatchObject({
            url: 'https://example.com',
            title: 'Example',
        });
    });

    it('updates the most recent matching entry and supports searching', () => {
        const manager = new HistoryManager();

        manager.addEntry({ url: 'https://docs.example.com', title: 'Docs Home' });
        manager.updateLastEntry('https://docs.example.com', {
            title: 'Documentation',
            favicon: 'docs.ico',
        });

        expect(manager.getHistory()[0]).toMatchObject({
            title: 'Documentation',
            favicon: 'docs.ico',
        });
        expect(manager.search('doc')).toHaveLength(1);
        expect(manager.search('missing')).toHaveLength(0);
    });

    it('merges only unique entries and keeps newest items first', () => {
        const manager = new HistoryManager();
        const existing: HistoryEntry = {
            id: 'existing',
            url: 'https://example.com',
            title: 'Example',
            timestamp: 1_700_000_000_000,
        };
        const newer: HistoryEntry = {
            id: 'newer',
            url: 'https://openai.com',
            title: 'OpenAI',
            timestamp: 1_700_000_100_000,
        };

        manager.setHistory([existing]);
        const added = manager.mergeHistory([existing, newer]);

        expect(added).toBe(1);
        expect(manager.getHistory().map(entry => entry.id)).toEqual(['newer', 'existing']);
    });
});
