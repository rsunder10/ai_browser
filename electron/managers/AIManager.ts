
import { net, WebContents } from 'electron';
import { OllamaManager } from './OllamaManager';
import { SettingsManager } from './SettingsManager';

const SYSTEM_PROMPT = `You are NeuralWeb AI Assistant, a helpful assistant built into the NeuralWeb web browser. You help users with browsing questions, page summaries, and general knowledge. Keep responses concise and helpful.`;

export class AIManager {
    private ollamaManager: OllamaManager;
    private settingsManager: SettingsManager;

    constructor(ollamaManager: OllamaManager, settingsManager: SettingsManager) {
        this.ollamaManager = ollamaManager;
        this.settingsManager = settingsManager;
    }

    private getModel(): string {
        return this.settingsManager.get('aiModel') || this.ollamaManager.getDefaultModel();
    }

    private trimMessages(messages: Array<{ role: string; content: string }>): Array<{ role: string; content: string }> {
        const MAX_CHARS = 8000;

        // Separate system context messages from user/assistant messages
        const systemMessages = messages.filter(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        let totalChars = 0;
        const trimmed: Array<{ role: string; content: string }> = [];

        // Keep chat messages from most recent, working backwards
        for (let i = chatMessages.length - 1; i >= 0; i--) {
            const msgChars = chatMessages[i].content.length;
            if (totalChars + msgChars > MAX_CHARS && trimmed.length > 0) break;
            totalChars += msgChars;
            trimmed.unshift(chatMessages[i]);
        }

        // Prepend system context messages (never trim these)
        return [...systemMessages, ...trimmed];
    }

    async processQuery(provider: string, prompt: string): Promise<string> {
        console.log(`[AIManager] Processing query: ${prompt.substring(0, 50)}...`);

        const { status } = this.ollamaManager.getStatus();
        if (status !== 'running') {
            return `AI is not ready yet (status: ${status}). Please wait for Ollama to finish starting up.`;
        }

        try {
            const baseUrl = this.ollamaManager.getBaseUrl();
            const model = this.getModel();

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

    async processQueryStream(
        webContents: WebContents,
        requestId: string,
        messages: Array<{ role: string; content: string }>,
    ): Promise<void> {
        const { status } = this.ollamaManager.getStatus();
        if (status !== 'running') {
            webContents.send('ai:stream-end', { requestId, error: `AI is not ready yet (status: ${status}).` });
            return;
        }

        try {
            const baseUrl = this.ollamaManager.getBaseUrl();
            const model = this.getModel();

            const trimmed = this.trimMessages(messages);

            // Merge any context system messages into the base system prompt
            const contextSystemMessages = trimmed.filter(m => m.role === 'system');
            const chatMessages = trimmed.filter(m => m.role !== 'system');
            const systemContent = contextSystemMessages.length > 0
                ? SYSTEM_PROMPT + '\n\n' + contextSystemMessages.map(m => m.content).join('\n\n')
                : SYSTEM_PROMPT;

            const fullMessages = [
                { role: 'system', content: systemContent },
                ...chatMessages,
            ];

            const response = await net.fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: fullMessages,
                    stream: true,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('[AIManager] Ollama stream error:', errorText);
                webContents.send('ai:stream-end', { requestId, error: 'AI model returned an error.' });
                return;
            }

            const reader = (response.body as ReadableStream<Uint8Array>).getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const chunk = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
                        const content = chunk.message?.content || '';
                        if (content) {
                            webContents.send('ai:stream-chunk', { requestId, content, done: !!chunk.done });
                        }
                        if (chunk.done) {
                            webContents.send('ai:stream-end', { requestId });
                            return;
                        }
                    } catch {
                        // Skip malformed JSON lines
                    }
                }
            }

            // Process any remaining buffer
            if (buffer.trim()) {
                try {
                    const chunk = JSON.parse(buffer) as { message?: { content?: string }; done?: boolean };
                    const content = chunk.message?.content || '';
                    if (content) {
                        webContents.send('ai:stream-chunk', { requestId, content, done: !!chunk.done });
                    }
                } catch {
                    // Skip
                }
            }

            webContents.send('ai:stream-end', { requestId });
        } catch (err: any) {
            console.error('[AIManager] Stream error:', err.message);
            webContents.send('ai:stream-end', { requestId, error: 'Failed to reach the AI model.' });
        }
    }

    async suggestTabGroups(tabs: Array<{ id: string; title: string; url: string }>): Promise<Array<{ name: string; color: string; tabIds: string[] }>> {
        const { status } = this.ollamaManager.getStatus();
        if (status !== 'running') return [];

        const tabList = tabs.map((t, i) => `${i + 1}. [${t.id}] "${t.title}" — ${t.url}`).join('\n');
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

        try {
            const baseUrl = this.ollamaManager.getBaseUrl();
            const model = this.getModel();

            const response = await net.fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: `You organize browser tabs into logical groups. Given a list of tabs, suggest groups based on topic/domain similarity. Return ONLY a JSON array with objects having: "name" (short group name), "color" (one of: ${colors.join(', ')}), "tabIds" (array of tab ID strings). Every tab should be in exactly one group. If tabs don't fit together, put them in a "Other" group. Return ONLY valid JSON, no other text.`,
                        },
                        { role: 'user', content: `Here are the tabs:\n${tabList}` },
                    ],
                    stream: false,
                }),
            });

            if (!response.ok) return [];

            const data = await response.json() as { message?: { content?: string } };
            const content = data.message?.content || '';

            const match = content.match(/\[[\s\S]*\]/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) {
                    return parsed.filter((g: any) =>
                        g.name && g.color && Array.isArray(g.tabIds) && g.tabIds.length > 0
                    );
                }
            }
            return [];
        } catch (err: any) {
            console.error('[AIManager] Tab grouping error:', err.message);
            return [];
        }
    }

    async translateText(text: string, targetLang: string): Promise<string> {
        const prompt = `Translate the following text to ${targetLang}. Return ONLY the translated text, nothing else.\n\n${text}`;
        return this.processQuery('ollama', prompt);
    }

    async getSuggestions(query: string): Promise<string[]> {
        const { status } = this.ollamaManager.getStatus();
        if (status !== 'running') return [];

        try {
            const baseUrl = this.ollamaManager.getBaseUrl();
            const model = this.getModel();

            const response = await net.fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: 'You are a search suggestion engine. Given a partial query, return exactly 3 search suggestions as a JSON array of strings. Return ONLY the JSON array, no other text.' },
                        { role: 'user', content: query },
                    ],
                    stream: false,
                }),
            });

            if (!response.ok) return [];

            const data = await response.json() as { message?: { content?: string } };
            const content = data.message?.content || '';

            // Try to parse JSON array from response
            const match = content.match(/\[[\s\S]*?\]/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                if (Array.isArray(parsed)) {
                    return parsed.filter((s: any) => typeof s === 'string').slice(0, 3);
                }
            }
            return [];
        } catch (err: any) {
            console.error('[AIManager] Suggestions error:', err.message);
            return [];
        }
    }
}
