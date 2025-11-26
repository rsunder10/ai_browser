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

    private saveHistory() {
        try {
            fs.writeFileSync(this.historyPath, JSON.stringify(this.history, null, 2));
        } catch (error) {
            console.error('Failed to save history:', error);
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

        this.saveHistory();
    }

    updateLastEntry(url: string, updates: Partial<Omit<HistoryEntry, 'id' | 'timestamp' | 'url'>>) {
        if (this.history.length === 0) return;

        const lastEntry = this.history[0];
        if (lastEntry.url === url) {
            Object.assign(lastEntry, updates);
            this.saveHistory();
        }
    }

    getHistory(): HistoryEntry[] {
        return this.history;
    }

    clearHistory() {
        this.history = [];
        this.saveHistory();
    }

    search(query: string): HistoryEntry[] {
        const lowerQuery = query.toLowerCase();
        return this.history.filter(entry =>
            entry.title.toLowerCase().includes(lowerQuery) ||
            entry.url.toLowerCase().includes(lowerQuery)
        );
    }
}
