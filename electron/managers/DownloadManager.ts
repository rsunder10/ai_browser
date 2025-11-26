import { BrowserWindow, DownloadItem, app, shell } from 'electron';
import { Store } from '../utils/Store';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface DownloadRecord {
    id: string;
    filename: string;
    path: string;
    url: string;
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
    startTime: number;
    endTime?: number;
    totalBytes: number;
    receivedBytes: number;
    mimeType: string;
    paused: boolean;
}

interface DownloadStore {
    history: DownloadRecord[];
}

export class DownloadManager {
    private store: Store<DownloadStore>;
    private activeDownloads: Map<string, DownloadItem> = new Map();
    private mainWindow: BrowserWindow | null = null;

    constructor() {
        this.store = new Store<DownloadStore>({
            configName: 'downloads',
            defaults: {
                history: []
            }
        });
    }

    setMainWindow(window: BrowserWindow) {
        this.mainWindow = window;
    }

    handleWillDownload(event: Electron.Event, item: DownloadItem, webContents: Electron.WebContents) {
        const id = uuidv4();
        this.activeDownloads.set(id, item);

        const record: DownloadRecord = {
            id,
            filename: item.getFilename(),
            path: item.getSavePath(), // Note: might be empty initially if user hasn't selected yet
            url: item.getURL(),
            state: 'progressing',
            startTime: Date.now(),
            totalBytes: item.getTotalBytes(),
            receivedBytes: item.getReceivedBytes(),
            mimeType: item.getMimeType(),
            paused: false
        };

        // If save path is not set, Electron might prompt or use default. 
        // We'll update it on 'done'.

        this.updateDownload(record);

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                record.state = 'interrupted';
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    record.paused = true;
                } else {
                    record.paused = false;
                }
            }

            record.receivedBytes = item.getReceivedBytes();
            record.totalBytes = item.getTotalBytes();
            record.filename = item.getFilename();
            record.path = item.getSavePath();

            this.updateDownload(record);
            this.notifyRenderer(record);
        });

        item.once('done', (event, state) => {
            record.endTime = Date.now();
            record.state = state;
            record.path = item.getSavePath(); // Final path

            this.activeDownloads.delete(id);
            this.updateDownload(record);
            this.notifyRenderer(record);
        });
    }

    private updateDownload(record: DownloadRecord) {
        const history = this.store.get('history');
        const index = history.findIndex(r => r.id === record.id);

        if (index !== -1) {
            history[index] = record;
        } else {
            history.unshift(record); // Add to top
        }

        // Limit history size? Maybe keep last 100
        if (history.length > 100) {
            history.length = 100;
        }

        this.store.set('history', history);
    }

    private notifyRenderer(record: DownloadRecord) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('download-updated', record);
        }
    }

    getHistory(): DownloadRecord[] {
        return this.store.get('history') || [];
    }

    pause(id: string) {
        const item = this.activeDownloads.get(id);
        if (item && !item.isPaused()) {
            item.pause();
        }
    }

    resume(id: string) {
        const item = this.activeDownloads.get(id);
        if (item && item.canResume()) {
            item.resume();
        }
    }

    cancel(id: string) {
        const item = this.activeDownloads.get(id);
        if (item) {
            item.cancel();
        } else {
            // If not active, maybe remove from history or mark as cancelled if it was stuck?
            // For now, just remove from history if user requests cancel on a completed/failed item?
            // Usually 'cancel' implies stopping an active download.
            // To remove from history, we'd use a separate 'remove' method.
        }
    }

    remove(id: string) {
        const history = this.store.get('history');
        const newHistory = history.filter(r => r.id !== id);
        this.store.set('history', newHistory);
        return newHistory;
    }

    openFile(id: string) {
        const history = this.store.get('history');
        const record = history.find(r => r.id === id);
        if (record && record.path) {
            shell.showItemInFolder(record.path);
        }
    }

    clearHistory() {
        this.store.set('history', []);
    }
}
