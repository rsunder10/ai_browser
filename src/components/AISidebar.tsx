import { useState } from 'react';

interface AISidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    currentUrl: string;
}

export default function AISidebar({ isOpen, onToggle, currentUrl }: AISidebarProps) {
    const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = input;
        setInput('');
        setMessages([...messages, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // Call AI query command
            const response = await window.electron.invoke('ai_query', {
                provider: 'local',
                prompt: `Context: User is viewing ${currentUrl}\n\nQuestion: ${userMessage}`
            });

            setMessages(prev => [...prev, { role: 'assistant', content: response as string }]);
        } catch (error) {
            console.error('AI query failed:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSummarize = async () => {
        setIsLoading(true);
        try {
            // Placeholder - AI summarize would go here
            const response = `Summary of ${currentUrl}`;
            setMessages(prev => [...prev,
            { role: 'user', content: 'Summarize this page' },
            { role: 'assistant', content: response }
            ]);
        } catch (error) {
            console.error('Summarize failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button className="ai-toggle-btn" onClick={onToggle} title="Open AI Assistant">
                🤖
            </button>
        );
    }

    return (
        <div className="ai-sidebar">
            <div className="ai-header">
                <h3>AI Assistant</h3>
                <button className="ai-close-btn" onClick={onToggle}>×</button>
            </div>

            <div className="ai-quick-actions">
                <button onClick={handleSummarize} disabled={isLoading}>
                    📝 Summarize Page
                </button>
            </div>

            <div className="ai-messages">
                {messages.length === 0 && (
                    <div className="ai-welcome">
                        <p>👋 Hi! I can help you with:</p>
                        <ul>
                            <li>Summarizing this page</li>
                            <li>Answering questions about the content</li>
                            <li>Explaining concepts</li>
                            <li>Extracting information</li>
                        </ul>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`ai-message ${msg.role}`}>
                        <div className="message-content">{msg.content}</div>
                    </div>
                ))}
                {isLoading && <div className="ai-loading">Thinking...</div>}
            </div>

            <div className="ai-input-container">
                <input
                    type="text"
                    className="ai-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask me anything about this page..."
                    disabled={isLoading}
                />
                <button
                    className="ai-send-btn"
                    onClick={handleSend}
                    disabled={isLoading || !input.trim()}
                >
                    ➤
                </button>
            </div>
        </div>
    );
}
