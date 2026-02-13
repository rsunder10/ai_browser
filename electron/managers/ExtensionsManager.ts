import { session, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface ExtensionManifest {
    name: string;
    version: string;
    description?: string;
    manifest_version: number;
    permissions?: string[];
    action?: { default_icon?: string | Record<string, string>; default_title?: string; default_popup?: string };
    browser_action?: { default_icon?: string | Record<string, string>; default_title?: string; default_popup?: string };
    content_scripts?: Array<{ matches: string[]; js?: string[]; css?: string[] }>;
    icons?: Record<string, string>;
}

export interface Extension {
    id: string;
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    path: string;
    manifest?: ExtensionManifest;
    hasAction: boolean;
    actionIcon?: string;
    actionTitle?: string;
}

export class ExtensionsManager {
    private extensions: Map<string, Extension> = new Map();
    private extensionsPath: string;
    private installedPath: string;

    constructor() {
        this.extensionsPath = path.join(app.getPath('userData'), 'extensions');
        this.installedPath = path.join(app.getPath('userData'), 'extensions-installed.json');
        if (!fs.existsSync(this.extensionsPath)) {
            fs.mkdirSync(this.extensionsPath, { recursive: true });
        }
    }

    async loadExtensions() {
        // Load previously installed extensions
        try {
            if (fs.existsSync(this.installedPath)) {
                const data = JSON.parse(fs.readFileSync(this.installedPath, 'utf-8'));
                if (Array.isArray(data)) {
                    for (const extPath of data) {
                        if (fs.existsSync(extPath)) {
                            await this.loadExtension(extPath);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[ExtensionsManager] Failed to load extensions:', error);
        }
    }

    private parseManifest(extensionPath: string): ExtensionManifest | null {
        try {
            const manifestPath = path.join(extensionPath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) return null;
            const data = fs.readFileSync(manifestPath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            console.error('[ExtensionsManager] Failed to parse manifest:', error);
            return null;
        }
    }

    private async loadExtension(extensionPath: string): Promise<Extension | null> {
        try {
            const manifest = this.parseManifest(extensionPath);
            const loaded = await session.defaultSession.loadExtension(extensionPath);

            const action = manifest?.action || manifest?.browser_action;
            let actionIcon: string | undefined;
            if (action?.default_icon) {
                if (typeof action.default_icon === 'string') {
                    actionIcon = path.join(extensionPath, action.default_icon);
                } else {
                    // Pick largest icon
                    const sizes = Object.keys(action.default_icon).map(Number).sort((a, b) => b - a);
                    if (sizes.length > 0) {
                        actionIcon = path.join(extensionPath, action.default_icon[String(sizes[0])]);
                    }
                }
            }

            const extension: Extension = {
                id: loaded.id || loaded.name,
                name: manifest?.name || loaded.name,
                version: manifest?.version || '1.0',
                description: manifest?.description,
                enabled: true,
                path: extensionPath,
                manifest: manifest || undefined,
                hasAction: !!action,
                actionIcon,
                actionTitle: action?.default_title,
            };

            this.extensions.set(extension.name, extension);
            return extension;
        } catch (err) {
            console.error('[ExtensionsManager] Failed to load extension:', err);
            return null;
        }
    }

    private saveInstalledPaths() {
        const paths = Array.from(this.extensions.values()).map(e => e.path);
        try {
            fs.writeFileSync(this.installedPath, JSON.stringify(paths, null, 2));
        } catch (error) {
            console.error('[ExtensionsManager] Failed to save installed paths:', error);
        }
    }

    async installExtension(extensionPath: string): Promise<Extension | null> {
        const ext = await this.loadExtension(extensionPath);
        if (ext) {
            this.saveInstalledPaths();
        }
        return ext;
    }

    getExtensions(): Extension[] {
        return Array.from(this.extensions.values());
    }

    getExtensionActions(): Array<{ name: string; icon?: string; title?: string }> {
        return Array.from(this.extensions.values())
            .filter(e => e.enabled && e.hasAction)
            .map(e => ({
                name: e.name,
                icon: e.actionIcon,
                title: e.actionTitle || e.name,
            }));
    }

    async removeExtension(name: string) {
        try {
            session.defaultSession.removeExtension(name);
            this.extensions.delete(name);
            this.saveInstalledPaths();
        } catch (err) {
            console.error('Failed to remove extension:', err);
        }
    }

    toggleExtension(name: string): boolean {
        const ext = this.extensions.get(name);
        if (!ext) return false;
        ext.enabled = !ext.enabled;
        return ext.enabled;
    }
}
