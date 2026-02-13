import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import './AISidebar.css';

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

export default function AISidebar({ isOpen, onToggle, currentUrl: _currentUrl, pendingExplainText, onExplainConsumed }: AISidebarProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [modelName, setModelName] = useState('');
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when messages change — use scrollTop to avoid stealing focus
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages]);

    // Focus input when sidebar opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

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
        // Re-focus after sending
        setTimeout(() => inputRef.current?.focus(), 0);
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
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    // Handle pending explain text from context menu
    useEffect(() => {
        if (pendingExplainText && isOpen && !isLoading) {
            sendMessage(`Explain the following text:\n\n"${pendingExplainText}"`);
            onExplainConsumed?.();
        }
    }, [pendingExplainText, isOpen, isLoading, sendMessage, onExplainConsumed]);

    // Handle textarea auto-resize
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInput(e.target.value);
        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
        // Stop propagation so App.tsx shortcuts don't fire while typing
        e.stopPropagation();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="ai-sidebar">
            <div className="ai-header">
                <div className="ai-header-title">
                    <div className="ai-header-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                    </div>
                    <div>
                        <h3>NeuralWeb AI</h3>
                        {modelName && <span className="ai-model-badge">{modelName}</span>}
                    </div>
                </div>
                <div className="ai-header-actions">
                    {messages.length > 0 && (
                        <button className="ai-header-btn" onClick={handleClear} title="Clear conversation">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                        </button>
                    )}
                    <button className="ai-header-btn" onClick={onToggle} title="Close">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18" /><path d="M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="ai-actions-bar">
                <button className="ai-action-chip" onClick={handleSummarize} disabled={isLoading}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                    Summarize Page
                </button>
            </div>

            <div className="ai-messages" ref={messagesContainerRef}>
                {messages.length === 0 && (
                    <div className="ai-welcome">
                        <div className="ai-welcome-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                            </svg>
                        </div>
                        <h4>How can I help?</h4>
                        <p>I can summarize pages, answer questions about content, explain concepts, and more.</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`ai-msg ${msg.role}`}>
                        <div className="ai-msg-avatar">
                            {msg.role === 'assistant' ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                </svg>
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            )}
                        </div>
                        <div className="ai-msg-body">
                            <span className="ai-msg-role">{msg.role === 'assistant' ? 'NeuralWeb AI' : 'You'}</span>
                            <div className="ai-msg-content">
                                {msg.role === 'assistant' ? (
                                    msg.content ? (
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    ) : (
                                        isLoading && (
                                            <div className="ai-typing">
                                                <span></span><span></span><span></span>
                                            </div>
                                        )
                                    )
                                ) : (
                                    msg.content
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                <div style={{ height: 1 }} />
            </div>

            <div className="ai-input-area">
                <div className="ai-input-box">
                    <textarea
                        ref={inputRef}
                        className="ai-input"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        disabled={isLoading}
                        rows={1}
                    />
                    <button
                        className="ai-send-btn"
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        title="Send message"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="22" y1="2" x2="11" y2="13" />
                            <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                    </button>
                </div>
                <span className="ai-input-hint">Enter to send, Shift+Enter for new line</span>
            </div>
        </div>
    );
}
