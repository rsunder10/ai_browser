
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
            // If Ollama is already running (e.g. standalone install or leftover process), use it
            if (await this.isServerReachable()) {
                console.log('[OllamaManager] Ollama already running');
                this.status = 'running';
                this.error = null;
                this.autoPullDefaultModel();
                return;
            }

            this.status = 'downloading';
            console.log('[OllamaManager] Downloading/starting Ollama...');

            const metadata = await this.ollama.getMetadata('latest');

            // Fire off serve() without awaiting — its built-in health check is unreliable.
            // We poll the server ourselves below.
            this.status = 'starting';
            this.ollama.serve(metadata.version, {
                serverLog: (message) => console.log('[Ollama]', message),
                downloadLog: (percent, message) => {
                    this.status = 'downloading';
                    console.log(`[Ollama Download] ${percent}% - ${message}`);
                },
                timeoutSec: 300,
            }).catch(() => {
                // Ignore — we handle status via our own polling
            });

            // Poll until the server responds or we give up after 120s
            const started = await this.waitForServer(120);
            if (started) {
                this.status = 'running';
                this.error = null;
                console.log('[OllamaManager] Ollama server is ready');
                this.autoPullDefaultModel();
            } else {
                this.status = 'error';
                this.error = 'Ollama server did not become reachable within 120s';
                console.error('[OllamaManager]', this.error);
            }
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

    private async isServerReachable(): Promise<boolean> {
        try {
            const response = await net.fetch(BASE_URL);
            return response.ok;
        } catch {
            return false;
        }
    }

    private async waitForServer(timeoutSec: number): Promise<boolean> {
        const deadline = Date.now() + timeoutSec * 1000;
        while (Date.now() < deadline) {
            if (await this.isServerReachable()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        return false;
    }

    private async autoPullDefaultModel(): Promise<void> {
        try {
            const data = await this.listModels();
            const models: any[] = data.models || [];
            const hasDefault = models.some((m: any) => m.name === DEFAULT_MODEL);
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
