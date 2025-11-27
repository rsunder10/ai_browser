import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface TabState {
    url: string;
    title: string;
    groupId?: string;
    scrollPosition?: { x: number; y: number };
    history?: string[];
    historyIndex?: number;
}

export interface TabGroupState {
    id: string;
    name: string;
    color: string;
}

export interface SessionState {
    windows: {
        [windowId: number]: {
            tabs: TabState[];
            groups: TabGroupState[];
            activeTabId: string | null;
            activeTabIndex: number;
        }
    }
}

export class SessionManager {
    private sessionPath: string;
    private state: SessionState = { windows: {} };
    private saveTimeout: NodeJS.Timeout | null = null;

    constructor() {
        this.sessionPath = path.join(app.getPath('userData'), 'session.json');
        this.loadSession();
    }

    private loadSession() {
        try {
            if (fs.existsSync(this.sessionPath)) {
                const data = fs.readFileSync(this.sessionPath, 'utf-8');
                this.state = JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load session:', error);
            this.state = { windows: {} };
        }
    }

    private saveSession() {
        try {
            fs.writeFileSync(this.sessionPath, JSON.stringify(this.state, null, 2));
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }

    // Debounced save
    private queueSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            this.saveSession();
        }, 1000);
    }

    updateWindow(windowId: number, tabs: TabState[], groups: TabGroupState[], activeTabIndex: number) {
        this.state.windows[windowId] = {
            tabs,
            groups,
            activeTabId: null,
            activeTabIndex
        };
        this.queueSave();
    }

    removeWindow(windowId: number) {
        delete this.state.windows[windowId];
        this.queueSave();
    }

    getLastSession(): SessionState {
        return this.state;
    }

    clearSession() {
        this.state = { windows: {} };
        this.saveSession();
    }
}
