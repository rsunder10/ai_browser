import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class Store<T> {
    private path: string;
    private data: T;
    private writeTimer: NodeJS.Timeout | null = null;
    private readonly DEBOUNCE_MS = 150;

    constructor(opts: { configName: string; defaults: T }) {
        const userDataPath = app.getPath('userData');
        this.path = path.join(userDataPath, opts.configName + '.json');
        this.data = this.parseDataFile(this.path, opts.defaults);
    }

    get(key: keyof T): T[keyof T] {
        return this.data[key];
    }

    set(key: keyof T, val: T[keyof T]): void {
        this.data[key] = val;
        this.queueWrite();
    }

    getAll(): T {
        return this.data;
    }

    setAll(data: T): void {
        this.data = data;
        this.queueWrite();
    }

    /** Immediately flush pending writes (sync). Call from before-quit. */
    flushSync(): void {
        if (this.writeTimer) {
            clearTimeout(this.writeTimer);
            this.writeTimer = null;
        }
        try {
            fs.writeFileSync(this.path, JSON.stringify(this.data));
        } catch (error) {
            console.error(`[Store] flushSync failed for ${this.path}:`, error);
        }
    }

    private queueWrite(): void {
        if (this.writeTimer) clearTimeout(this.writeTimer);
        this.writeTimer = setTimeout(() => {
            this.writeTimer = null;
            this.writeAsync();
        }, this.DEBOUNCE_MS);
    }

    private async writeAsync(): Promise<void> {
        const tmpPath = this.path + '.tmp';
        try {
            await fs.promises.writeFile(tmpPath, JSON.stringify(this.data));
            await fs.promises.rename(tmpPath, this.path);
        } catch (error) {
            console.error(`[Store] Async write failed for ${this.path}:`, error);
        }
    }

    private parseDataFile(filePath: string, defaults: T): T {
        try {
            return JSON.parse(fs.readFileSync(filePath).toString());
        } catch (error) {
            return defaults;
        }
    }
}
