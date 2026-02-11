
import { app, net } from 'electron';
import { ElectronOllama } from 'electron-ollama';

export type OllamaStatus = 'not_installed' | 'downloading' | 'starting' | 'running' | 'stopped' | 'error';

const DEFAULT_MODEL = 'llama3.2:1b';
const BASE_URL = 'http://127.0.0.1:11434';

export class OllamaManager {
    private ollama: ElectronOllama;
    private status: OllamaStatus = 'not_installed';
    private error: string | null = null;

    constructor() {
        this.ollama = new ElectronOllama({
            basePath: app.getPath('userData'),
        });
    }

    async start(): Promise<void> {
        try {
            // If Ollama is already running (e.g. standalone install), just use it
            if (await this.ollama.isRunning()) {
                console.log('[OllamaManager] Ollama already running');
                this.status = 'running';
                this.error = null;
                this.autoPullDefaultModel();
                return;
            }

            this.status = 'downloading';
            console.log('[OllamaManager] Downloading/starting Ollama...');

            const metadata = await this.ollama.getMetadata('latest');
            await this.ollama.serve(metadata.version, {
                serverLog: (message) => console.log('[Ollama]', message),
                downloadLog: (percent, message) => {
                    console.log(`[Ollama Download] ${percent}% - ${message}`);
                },
                timeoutSec: 30,
            });

            this.status = 'running';
            this.error = null;
            console.log('[OllamaManager] Ollama server started');

            this.autoPullDefaultModel();
        } catch (err: any) {
            this.status = 'error';
            this.error = err.message || String(err);
            console.error('[OllamaManager] Failed to start Ollama:', this.error);
        }
    }

    async stop(): Promise<void> {
        try {
            await this.ollama.getServer()?.stop();
            this.status = 'stopped';
            console.log('[OllamaManager] Ollama server stopped');
        } catch (err: any) {
            console.error('[OllamaManager] Error stopping Ollama:', err.message);
        }
    }

    getStatus(): { status: OllamaStatus; error: string | null } {
        return { status: this.status, error: this.error };
    }

    getBaseUrl(): string {
        return BASE_URL;
    }

    getDefaultModel(): string {
        return DEFAULT_MODEL;
    }

    async listModels(): Promise<any> {
        const response = await net.fetch(`${BASE_URL}/api/tags`);
        if (!response.ok) {
            throw new Error(`Failed to list models: ${response.statusText}`);
        }
        return response.json();
    }

    async pullModel(name: string): Promise<{ status: string }> {
        const response = await net.fetch(`${BASE_URL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, stream: false }),
        });
        if (!response.ok) {
            throw new Error(`Failed to pull model: ${response.statusText}`);
        }
        return response.json() as Promise<{ status: string }>;
    }

    private async autoPullDefaultModel(): Promise<void> {
        try {
            const data = await this.listModels();
            const models: any[] = data.models || [];
            const hasDefault = models.some((m: any) => m.name === DEFAULT_MODEL || m.name.startsWith(DEFAULT_MODEL.split(':')[0]));
            if (!hasDefault) {
                console.log(`[OllamaManager] Pulling default model ${DEFAULT_MODEL}...`);
                await this.pullModel(DEFAULT_MODEL);
                console.log(`[OllamaManager] Default model ${DEFAULT_MODEL} pulled`);
            } else {
                console.log(`[OllamaManager] Default model already available`);
            }
        } catch (err: any) {
            console.error('[OllamaManager] Failed to auto-pull default model:', err.message);
        }
    }
}
