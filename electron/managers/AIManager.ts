
import { net } from 'electron';
import { OllamaManager } from './OllamaManager';

const SYSTEM_PROMPT = `You are NeuralWeb AI Assistant, a helpful assistant built into the NeuralWeb web browser. You help users with browsing questions, page summaries, and general knowledge. Keep responses concise and helpful.`;

export class AIManager {
    private ollamaManager: OllamaManager;

    constructor(ollamaManager: OllamaManager) {
        this.ollamaManager = ollamaManager;
    }

    async processQuery(provider: string, prompt: string): Promise<string> {
        console.log(`[AIManager] Processing query: ${prompt.substring(0, 50)}...`);

        const { status } = this.ollamaManager.getStatus();
        if (status !== 'running') {
            return `AI is not ready yet (status: ${status}). Please wait for Ollama to finish starting up.`;
        }

        try {
            const baseUrl = this.ollamaManager.getBaseUrl();
            const model = this.ollamaManager.getDefaultModel();

            const response = await net.fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: SYSTEM_PROMPT },
                        { role: 'user', content: prompt },
                    ],
                    stream: false,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AIManager] Ollama API error:', errorText);
                return `Sorry, the AI model returned an error. Please try again.`;
            }

            const data = await response.json() as { message?: { content?: string } };
            return data.message?.content || 'No response from model.';
        } catch (err: any) {
            console.error('[AIManager] Error calling Ollama:', err.message);
            return `Failed to reach the AI model. Please check that Ollama is running.`;
        }
    }
}
