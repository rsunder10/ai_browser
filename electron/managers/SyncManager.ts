import * as fs from 'fs';
import { BookmarksManager } from './BookmarksManager';
import { HistoryManager, HistoryEntry } from './HistoryManager';
import { SettingsManager } from './SettingsManager';

interface SyncData {
    version: 1;
    exportedAt: string;
    bookmarks?: any;
    history?: HistoryEntry[];
    settings?: any;
}

export class SyncManager {
    private bookmarksManager: BookmarksManager;
    private historyManager: HistoryManager;
    private settingsManager: SettingsManager;

    constructor(bookmarksManager: BookmarksManager, historyManager: HistoryManager, settingsManager: SettingsManager) {
        this.bookmarksManager = bookmarksManager;
        this.historyManager = historyManager;
        this.settingsManager = settingsManager;
    }

    async exportToFile(filePath: string, options: { bookmarks: boolean; history: boolean; settings: boolean }): Promise<void> {
        const data: SyncData = {
            version: 1,
            exportedAt: new Date().toISOString(),
        };

        if (options.bookmarks) {
            data.bookmarks = this.bookmarksManager.getTree();
        }
        if (options.history) {
            data.history = this.historyManager.getHistory();
        }
        if (options.settings) {
            data.settings = this.settingsManager.getSettings();
        }

        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    }

    async importFromFile(filePath: string, strategy: 'merge' | 'replace'): Promise<string> {
        const raw = await fs.promises.readFile(filePath, 'utf-8');
        const data: SyncData = JSON.parse(raw);

        if (!data.version || data.version !== 1) {
            throw new Error('Unsupported sync file version');
        }

        const results: string[] = [];

        if (data.bookmarks) {
            if (strategy === 'replace') {
                this.bookmarksManager.setTree(data.bookmarks);
                results.push('Bookmarks replaced');
            } else {
                const added = this.bookmarksManager.mergeBookmarks(data.bookmarks);
                results.push(`${added} bookmarks merged`);
            }
        }

        if (data.history) {
            if (strategy === 'replace') {
                this.historyManager.setHistory(data.history);
                results.push(`${data.history.length} history entries replaced`);
            } else {
                const added = this.historyManager.mergeHistory(data.history);
                results.push(`${added} history entries merged`);
            }
        }

        if (data.settings) {
            // Settings are always replaced (merging settings doesn't make sense)
            const settings = this.settingsManager.getSettings();
            for (const [key, value] of Object.entries(data.settings)) {
                this.settingsManager.set(key as any, value);
            }
            results.push('Settings imported');
        }

        return results.join('. ');
    }
}
