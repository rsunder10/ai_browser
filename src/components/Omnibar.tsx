import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileText, Globe, Bookmark, Command, Plus, Settings, Clock, Download, Puzzle, Trash2, ZoomIn, ZoomOut, RotateCcw, Printer, Terminal, Bot, EyeOff } from 'lucide-react';
import './Omnibar.css';

interface Tab {
    id: string;
    url: string;
    title: string;
}

interface OmnibarProps {
    tabs: Tab[];
    onTabClick: (tabId: string) => void;
    onNavigate: (url: string) => void;
    onNewTab: () => void;
    onToggleAI: () => void;
    onClose: () => void;
}

interface ResultItem {
    id: string;
    category: 'tab' | 'bookmark' | 'history' | 'command';
    title: string;
    subtitle?: string;
    icon: React.ReactNode;
    action: () => void;
}

function fuzzyScore(query: string, text: string): number {
    const lowerQuery = query.toLowerCase();
    const lowerText = text.toLowerCase();

    // Exact substring match scores highest
    if (lowerText.includes(lowerQuery)) {
        // Bonus for matching at the start
        if (lowerText.startsWith(lowerQuery)) return 100;
        return 80;
    }

    // Character-by-character fuzzy match
    let qi = 0;
    let score = 0;
    let consecutiveBonus = 0;
    for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
        if (lowerText[ti] === lowerQuery[qi]) {
            score += 10 + consecutiveBonus;
            consecutiveBonus += 5;
            qi++;
        } else {
            consecutiveBonus = 0;
        }
    }

    return qi === lowerQuery.length ? score : 0;
}

function isQuestion(query: string): boolean {
    const q = query.trim().toLowerCase();
    if (q.endsWith('?')) return true;
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which', 'is', 'are', 'can', 'does', 'do', 'will', 'should', 'could', 'would', 'explain', 'describe', 'tell me'];
    return questionWords.some(w => q.startsWith(w + ' '));
}

export default function Omnibar({ tabs, onTabClick, onNavigate, onNewTab, onToggleAI, onClose }: OmnibarProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [bookmarks, setBookmarks] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [aiAnswer, setAiAnswer] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const aiRequestIdRef = useRef<string | null>(null);
    const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
        if (window.electron) {
            window.electron.invoke('bookmarks:get').then((tree: any[]) => {
                const flat: any[] = [];
                const flatten = (nodes: any[]) => {
                    for (const node of nodes) {
                        if (node.url) flat.push(node);
                        if (node.children) flatten(node.children);
                    }
                };
                flatten(tree);
                setBookmarks(flat);
            });
            window.electron.invoke('history:get').then((entries: any[]) => {
                setHistory(entries.slice(0, 200));
            });
        }

        // Cleanup AI listeners on unmount
        return () => {
            aiRequestIdRef.current = null;
            if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
        };
    }, []);

    // AI answer streaming for questions
    useEffect(() => {
        if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);

        const q = query.trim();
        if (!q || q.length < 5 || !isQuestion(q) || q.startsWith('>') || q.startsWith('@') || q.startsWith('#')) {
            setAiAnswer('');
            setAiLoading(false);
            aiRequestIdRef.current = null;
            return;
        }

        aiDebounceRef.current = setTimeout(() => {
            if (!window.electron) return;

            // Cancel previous request by nulling the ref
            aiRequestIdRef.current = null;
            setAiAnswer('');
            setAiLoading(true);

            const requestId = 'omnibar-' + crypto.randomUUID();
            aiRequestIdRef.current = requestId;

            const handleChunk = (data: { requestId: string; content: string; done: boolean }) => {
                if (data.requestId !== requestId || aiRequestIdRef.current !== requestId) return;
                setAiAnswer(prev => prev + data.content);
            };

            const handleEnd = (data: { requestId: string; error?: string }) => {
                if (data.requestId !== requestId) return;
                if (data.error && aiRequestIdRef.current === requestId) {
                    setAiAnswer(data.error);
                }
                setAiLoading(false);
                window.electron.removeListener('ai:stream-chunk', handleChunk);
                window.electron.removeListener('ai:stream-end', handleEnd);
            };

            window.electron.on('ai:stream-chunk', handleChunk);
            window.electron.on('ai:stream-end', handleEnd);

            window.electron.invoke('ai:chat-stream', {
                messages: [{ role: 'user', content: q }],
                requestId,
                skipPageContext: true,
            });
        }, 600);

        return () => {
            if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
        };
    }, [query]);

    const commands: ResultItem[] = [
        { id: 'cmd-new-tab', category: 'command', title: 'New Tab', icon: <Plus size={14} />, action: () => { onNewTab(); onClose(); } },
        { id: 'cmd-settings', category: 'command', title: 'Settings', icon: <Settings size={14} />, action: () => { onNavigate('neuralweb://settings'); onClose(); } },
        { id: 'cmd-history', category: 'command', title: 'History', icon: <Clock size={14} />, action: () => { onNavigate('neuralweb://history'); onClose(); } },
        { id: 'cmd-bookmarks', category: 'command', title: 'Bookmarks', icon: <Bookmark size={14} />, action: () => { onNavigate('neuralweb://bookmarks'); onClose(); } },
        { id: 'cmd-downloads', category: 'command', title: 'Downloads', icon: <Download size={14} />, action: () => { onNavigate('neuralweb://downloads'); onClose(); } },
        { id: 'cmd-extensions', category: 'command', title: 'Extensions', icon: <Puzzle size={14} />, action: () => { onNavigate('neuralweb://extensions'); onClose(); } },
        { id: 'cmd-clear-history', category: 'command', title: 'Clear History', icon: <Trash2 size={14} />, action: () => { window.electron.invoke('history:clear'); onClose(); } },
        { id: 'cmd-zoom-in', category: 'command', title: 'Zoom In', icon: <ZoomIn size={14} />, action: () => { window.electron.invoke('zoom:get').then((l: number) => window.electron.invoke('zoom:set', l + 0.5)); onClose(); } },
        { id: 'cmd-zoom-out', category: 'command', title: 'Zoom Out', icon: <ZoomOut size={14} />, action: () => { window.electron.invoke('zoom:get').then((l: number) => window.electron.invoke('zoom:set', l - 0.5)); onClose(); } },
        { id: 'cmd-zoom-reset', category: 'command', title: 'Reset Zoom', icon: <RotateCcw size={14} />, action: () => { window.electron.invoke('zoom:reset'); onClose(); } },
        { id: 'cmd-print', category: 'command', title: 'Print', icon: <Printer size={14} />, action: () => { window.electron.invoke('print:page'); onClose(); } },
        { id: 'cmd-devtools', category: 'command', title: 'DevTools', icon: <Terminal size={14} />, action: () => { window.electron.invoke('open-devtools'); onClose(); } },
        { id: 'cmd-ai', category: 'command', title: 'AI Assistant', icon: <Bot size={14} />, action: () => { onToggleAI(); onClose(); } },
        { id: 'cmd-incognito', category: 'command', title: 'New Incognito Window', icon: <EyeOff size={14} />, action: () => { window.electron.invoke('create-incognito-window'); onClose(); } },
    ];

    const getResults = useCallback((): ResultItem[] => {
        const q = query.trim();

        // Prefix filters
        if (q.startsWith('>')) {
            const cmdQuery = q.slice(1).trim();
            if (!cmdQuery) return commands;
            return commands.filter(c => fuzzyScore(cmdQuery, c.title) > 0)
                .sort((a, b) => fuzzyScore(q.slice(1).trim(), b.title) - fuzzyScore(q.slice(1).trim(), a.title));
        }

        if (q.startsWith('@')) {
            const tabQuery = q.slice(1).trim();
            return tabs
                .filter(t => !tabQuery || fuzzyScore(tabQuery, t.title) > 0 || fuzzyScore(tabQuery, t.url) > 0)
                .map(t => ({
                    id: `tab-${t.id}`,
                    category: 'tab' as const,
                    title: t.title,
                    subtitle: t.url,
                    icon: <Globe size={14} />,
                    action: () => { onTabClick(t.id); onClose(); },
                }));
        }

        if (q.startsWith('#')) {
            const bmQuery = q.slice(1).trim();
            return bookmarks
                .filter(b => !bmQuery || fuzzyScore(bmQuery, b.title) > 0 || fuzzyScore(bmQuery, b.url || '') > 0)
                .slice(0, 20)
                .map(b => ({
                    id: `bm-${b.id}`,
                    category: 'bookmark' as const,
                    title: b.title,
                    subtitle: b.url,
                    icon: <Bookmark size={14} />,
                    action: () => { onNavigate(b.url); onClose(); },
                }));
        }

        // Empty query: show tabs + frequent commands
        if (!q) {
            const tabResults: ResultItem[] = tabs.slice(0, 5).map(t => ({
                id: `tab-${t.id}`,
                category: 'tab' as const,
                title: t.title,
                subtitle: t.url,
                icon: <Globe size={14} />,
                action: () => { onTabClick(t.id); onClose(); },
            }));
            const cmdResults = commands.slice(0, 5);
            return [...tabResults, ...cmdResults];
        }

        // Search all categories
        const results: ResultItem[] = [];

        // Tabs
        const tabResults = tabs
            .map(t => ({ tab: t, score: Math.max(fuzzyScore(q, t.title), fuzzyScore(q, t.url)) }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(r => ({
                id: `tab-${r.tab.id}`,
                category: 'tab' as const,
                title: r.tab.title,
                subtitle: r.tab.url,
                icon: <Globe size={14} />,
                action: () => { onTabClick(r.tab.id); onClose(); },
            }));
        results.push(...tabResults);

        // Bookmarks
        const bmResults = bookmarks
            .map(b => ({ bm: b, score: Math.max(fuzzyScore(q, b.title), fuzzyScore(q, b.url || '')) }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(r => ({
                id: `bm-${r.bm.id}`,
                category: 'bookmark' as const,
                title: r.bm.title,
                subtitle: r.bm.url,
                icon: <Bookmark size={14} />,
                action: () => { onNavigate(r.bm.url); onClose(); },
            }));
        results.push(...bmResults);

        // History
        const histResults = history
            .map(h => ({ entry: h, score: Math.max(fuzzyScore(q, h.title), fuzzyScore(q, h.url)) }))
            .filter(r => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(r => ({
                id: `hist-${r.entry.id}`,
                category: 'history' as const,
                title: r.entry.title,
                subtitle: r.entry.url,
                icon: <Clock size={14} />,
                action: () => { onNavigate(r.entry.url); onClose(); },
            }));
        results.push(...histResults);

        // Commands
        const cmdResults = commands
            .filter(c => fuzzyScore(q, c.title) > 0)
            .sort((a, b) => fuzzyScore(q, b.title) - fuzzyScore(q, a.title))
            .slice(0, 5);
        results.push(...cmdResults);

        return results;
    }, [query, tabs, bookmarks, history, commands, onTabClick, onNavigate, onNewTab, onToggleAI, onClose]);

    const results = getResults();

    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current) {
            const selected = resultsRef.current.querySelector('.omnibar-item.selected');
            if (selected) {
                selected.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [selectedIndex]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (results[selectedIndex]) {
                results[selectedIndex].action();
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const categoryLabel = (cat: string) => {
        switch (cat) {
            case 'tab': return 'Open Tabs';
            case 'bookmark': return 'Bookmarks';
            case 'history': return 'History';
            case 'command': return 'Commands';
            default: return cat;
        }
    };

    // Group results by category for display
    let lastCategory = '';
    let globalIndex = 0;

    return (
        <div className="omnibar-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="omnibar-panel">
                <div className="omnibar-input-container">
                    <Search size={18} />
                    <input
                        ref={inputRef}
                        className="omnibar-input"
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search tabs, bookmarks, history, or type > for commands..."
                    />
                </div>
                <div className="omnibar-results" ref={resultsRef}>
                    {(aiAnswer || aiLoading) && (
                        <div className="omnibar-ai-answer">
                            <div className="omnibar-ai-header">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                </svg>
                                AI Answer
                            </div>
                            <div className="omnibar-ai-content">
                                {aiAnswer || (aiLoading && <span className="omnibar-ai-loading">Thinking...</span>)}
                            </div>
                        </div>
                    )}
                    {results.length === 0 && !aiAnswer && !aiLoading ? (
                        <div className="omnibar-empty">No results found</div>
                    ) : (
                        results.map((item, idx) => {
                            const showCategory = item.category !== lastCategory;
                            lastCategory = item.category;
                            return (
                                <div key={item.id}>
                                    {showCategory && (
                                        <div className="omnibar-category">{categoryLabel(item.category)}</div>
                                    )}
                                    <div
                                        className={`omnibar-item ${idx === selectedIndex ? 'selected' : ''}`}
                                        onClick={() => item.action()}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                    >
                                        <div className="omnibar-item-icon">{item.icon}</div>
                                        <div className="omnibar-item-content">
                                            <div className="omnibar-item-title">{item.title}</div>
                                            {item.subtitle && (
                                                <div className="omnibar-item-subtitle">{item.subtitle}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
                <div className="omnibar-hint">
                    <span><kbd>↑↓</kbd> Navigate</span>
                    <span><kbd>↵</kbd> Select</span>
                    <span><kbd>Esc</kbd> Close</span>
                    <span><kbd>&gt;</kbd> Commands</span>
                    <span><kbd>@</kbd> Tabs</span>
                    <span><kbd>#</kbd> Bookmarks</span>
                </div>
            </div>
        </div>
    );
}
