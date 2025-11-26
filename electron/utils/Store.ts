import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export class Store<T> {
    private path: string;
    private data: T;

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
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }

    getAll(): T {
        return this.data;
    }

    setAll(data: T): void {
        this.data = data;
        fs.writeFileSync(this.path, JSON.stringify(this.data));
    }

    private parseDataFile(filePath: string, defaults: T): T {
        try {
            return JSON.parse(fs.readFileSync(filePath).toString());
        } catch (error) {
            return defaults;
        }
    }
}
