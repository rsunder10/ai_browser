import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function createTempUserDataDir(prefix = 'neuralweb-unit-'): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
    process.env.NEURALWEB_TEST_USER_DATA_DIR = dir;
    return dir;
}

export function cleanupTempUserDataDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true });
    delete process.env.NEURALWEB_TEST_USER_DATA_DIR;
}
