import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface HistoryEntry {
    id: string;
    url: string;
    title: string;
    timestamp: number;
    favicon?: string;
}

export class HistoryManager {
    private historyPath: string;
    private history: HistoryEntry[] = [];
    private readonly MAX_ENTRIES = 5000;
    private writeTimer: NodeJS.Timeout | null = null;
    private readonly DEBOUNCE_MS = 300;

    constructor() {
        this.historyPath = path.join(app.getPath('userData'), 'history.json');
        this.loadHistory();
    }

    private loadHistory() {
        try {
            if (fs.existsSync(this.historyPath)) {
                const data = fs.readFileSync(this.historyPath, 'utf-8');
                this.history = JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
            this.history = [];
        }
    }

    private queueSave() {
        if (this.writeTimer) clearTimeout(this.writeTimer);
        this.writeTimer = setTimeout(() => {
            this.writeTimer = null;
            this.writeAsync();
        }, this.DEBOUNCE_MS);
    }

    private async writeAsync(): Promise<void> {
        const tmpPath = this.historyPath + '.tmp';
        try {
            await fs.promises.writeFile(tmpPath, JSON.stringify(this.history, null, 2));
            await fs.promises.rename(tmpPath, this.historyPath);
        } catch (error) {
            console.error('Failed to save history:', error);
        }
    }

    flushSync(): void {
        if (this.writeTimer) {
            clearTimeout(this.writeTimer);
            this.writeTimer = null;
        }
        try {
            fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
        } catch (error) {
            console.error('Failed to flush history:', error);
        }
    }

    addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>) {
        // Don't add internal pages or blank pages
        if (entry.url.startsWith('neuralweb://') || entry.url === 'about:blank') {
            return;
        }

        const newEntry: HistoryEntry = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            ...entry
        };

        // Add to beginning
        this.history.unshift(newEntry);

        // Limit size
        if (this.history.length > this.MAX_ENTRIES) {
            this.history = this.history.slice(0, this.MAX_ENTRIES);
        }

        this.queueSave();
    }

    updateLastEntry(url: string, updates: Partial<Omit<HistoryEntry, 'id' | 'timestamp' | 'url'>>) {
        if (this.history.length === 0) return;

        const lastEntry = this.history[0];
        if (lastEntry.url === url) {
            Object.assign(lastEntry, updates);
            this.queueSave();
        }
    }

    getHistory(): HistoryEntry[] {
        return this.history;
    }

    clearHistory() {
        this.history = [];
        this.queueSave();
    }

    search(query: string): HistoryEntry[] {
        const lowerQuery = query.toLowerCase();
        return this.history.filter(entry =>
            entry.title.toLowerCase().includes(lowerQuery) ||
            entry.url.toLowerCase().includes(lowerQuery)
        );
    }

    mergeHistory(entries: HistoryEntry[]): number {
        const existing = new Set(this.history.map(e => `${e.url}|${e.timestamp}`));
        let added = 0;
        for (const entry of entries) {
            const key = `${entry.url}|${entry.timestamp}`;
            if (!existing.has(key)) {
                this.history.push(entry);
                existing.add(key);
                added++;
            }
        }
        // Sort by timestamp descending
        this.history.sort((a, b) => b.timestamp - a.timestamp);
        // Limit size
        if (this.history.length > this.MAX_ENTRIES) {
            this.history = this.history.slice(0, this.MAX_ENTRIES);
        }
        this.queueSave();
        return added;
    }

    setHistory(entries: HistoryEntry[]): void {
        this.history = entries.slice(0, this.MAX_ENTRIES);
        this.queueSave();
    }
}
