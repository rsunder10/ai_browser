import { session, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface Extension {
    id: string;
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    path: string;
}

export class ExtensionsManager {
    private extensions: Map<string, Extension> = new Map();
    private extensionsPath: string;

    constructor() {
        this.extensionsPath = path.join(app.getPath('userData'), 'extensions');
        if (!fs.existsSync(this.extensionsPath)) {
            fs.mkdirSync(this.extensionsPath, { recursive: true });
        }
        this.loadExtensions();
    }

    private async loadExtensions() {
        // In a real implementation, we would scan the extensions directory
        // and load manifests. For now, we'll just keep track of loaded extensions.
        // Electron loads extensions from disk, so we need to point it to directories.

        // Example: Load React DevTools if available (for development)
        if (process.env.NODE_ENV === 'development') {
            // This is just a placeholder. Real extension loading requires
            // unzipping crx files or pointing to unpacked directories.
        }
    }

    async installExtension(extensionPath: string): Promise<Extension | null> {
        try {
            const name = await session.defaultSession.loadExtension(extensionPath);
            // We would need to parse the manifest to get details
            // For now, we'll return a basic object
            const extension: Extension = {
                id: 'unknown', // Electron doesn't easily give ID back on loadExtension
                name: name.name,
                version: '1.0',
                enabled: true,
                path: extensionPath
            };
            this.extensions.set(extension.name, extension);
            return extension;
        } catch (err) {
            console.error('Failed to install extension:', err);
            return null;
        }
    }

    getExtensions(): Extension[] {
        return Array.from(this.extensions.values());
    }

    async removeExtension(name: string) {
        try {
            session.defaultSession.removeExtension(name);
            this.extensions.delete(name);
        } catch (err) {
            console.error('Failed to remove extension:', err);
        }
    }
}
