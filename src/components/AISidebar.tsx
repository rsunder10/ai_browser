import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

interface AISidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    currentUrl: string;
    pendingExplainText?: string | null;
    onExplainConsumed?: () => void;
}

interface Message {
    role: string;
    content: string;
}

export default function AISidebar({ isOpen, onToggle, currentUrl, pendingExplainText, onExplainConsumed }: AISidebarProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modelName, setModelName] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Fetch model name on mount
    useEffect(() => {
        if (!window.electron) return;
        window.electron.invoke('settings:get').then((settings: any) => {
            if (settings?.aiModel) setModelName(settings.aiModel);
        });
    }, []);

    const setupStreamListeners = useCallback((requestId: string) => {
        const handleChunk = (data: { requestId: string; content: string; done: boolean }) => {
            if (data.requestId !== requestId) return;
            setMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant') {
                    updated[updated.length - 1] = { ...last, content: last.content + data.content };
                }
                return updated;
            });
        };

        const handleEnd = (data: { requestId: string; error?: string }) => {
            if (data.requestId !== requestId) return;
            if (data.error) {
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && last.role === 'assistant' && !last.content) {
                        updated[updated.length - 1] = { ...last, content: data.error || 'An error occurred.' };
                    }
                    return updated;
                });
            }
            setIsLoading(false);
            window.electron.removeListener('ai:stream-chunk', handleChunk);
            window.electron.removeListener('ai:stream-end', handleEnd);
        };

        window.electron.on('ai:stream-chunk', handleChunk);
        window.electron.on('ai:stream-end', handleEnd);
    }, []);

    const sendMessage = useCallback((text: string) => {
        if (!text.trim() || isLoading) return;

        const requestId = crypto.randomUUID();
        const userMessage: Message = { role: 'user', content: text };
        const assistantPlaceholder: Message = { role: 'assistant', content: '' };

        setMessages(prev => {
            const newMessages = [...prev, userMessage, assistantPlaceholder];

            // Send full conversation (excluding empty assistant placeholder) to backend
            const toSend = newMessages.filter(m => m.content.length > 0 || m.role !== 'assistant');
            const chatMessages = toSend.filter(m => m.content.length > 0);

            setupStreamListeners(requestId);
            window.electron.invoke('ai:chat-stream', { messages: chatMessages, requestId });

            return newMessages;
        });

        setIsLoading(true);
    }, [isLoading, setupStreamListeners]);

    const handleSend = () => {
        if (!input.trim()) return;
        const text = input;
        setInput('');
        sendMessage(text);
    };

    const handleSummarize = () => {
        if (isLoading) return;

        const requestId = 'summarize-' + crypto.randomUUID();
        const userMessage: Message = { role: 'user', content: 'Summarize this page' };
        const assistantPlaceholder: Message = { role: 'assistant', content: '' };

        setMessages(prev => [...prev, userMessage, assistantPlaceholder]);
        setIsLoading(true);

        setupStreamListeners(requestId);
        window.electron.invoke('ai:summarize', { requestId });
    };

    const handleClear = () => {
        setMessages([]);
    };

    // Handle pending explain text from context menu
    useEffect(() => {
        if (pendingExplainText && isOpen && !isLoading) {
            sendMessage(`Explain the following text:\n\n"${pendingExplainText}"`);
            onExplainConsumed?.();
        }
    }, [pendingExplainText, isOpen, isLoading, sendMessage, onExplainConsumed]);

    if (!isOpen) {
        return (
            <button className="ai-toggle-btn" onClick={onToggle} title="Open AI Assistant">
                AI
            </button>
        );
    }

    return (
        <div className="ai-sidebar">
            <div className="ai-header">
                <div>
                    <h3>AI Assistant</h3>
                    {modelName && <span className="ai-model-name">{modelName}</span>}
                </div>
                <div className="ai-header-actions">
                    {messages.length > 0 && (
                        <button className="ai-clear-btn" onClick={handleClear} title="Clear conversation">
                            Clear
                        </button>
                    )}
                    <button className="ai-close-btn" onClick={onToggle}>x</button>
                </div>
            </div>

            <div className="ai-quick-actions">
                <button onClick={handleSummarize} disabled={isLoading}>
                    Summarize Page
                </button>
            </div>

            <div className="ai-messages">
                {messages.length === 0 && (
                    <div className="ai-welcome">
                        <p>Hi! I can help you with:</p>
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
                        <div className="message-content">
                            {msg.role === 'assistant' ? (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            ) : (
                                msg.content
                            )}
                        </div>
                    </div>
                ))}
                {isLoading && messages[messages.length - 1]?.content === '' && (
                    <div className="ai-loading">Thinking...</div>
                )}
                <div ref={messagesEndRef} />
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
                    &gt;
                </button>
            </div>
        </div>
    );
}
