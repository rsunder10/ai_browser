import React, { useState, useEffect } from 'react';
import { Search, Clock, Trash2, X, Globe } from 'lucide-react';
import './HistoryPage.css';

interface HistoryEntry {
    id: string;
    url: string;
    title: string;
    timestamp: number;
    favicon?: string;
}

interface HistoryPageProps {
    onNavigate: (url: string) => void;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredHistory, setFilteredHistory] = useState<HistoryEntry[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredHistory(history);
        } else {
            const lowerQuery = searchQuery.toLowerCase();
            const filtered = history.filter(
                (entry) =>
                    entry.title.toLowerCase().includes(lowerQuery) ||
                    entry.url.toLowerCase().includes(lowerQuery)
            );
            setFilteredHistory(filtered);
        }
    }, [searchQuery, history]);

    const loadHistory = async () => {
        if (window.electron) {
            const entries = await window.electron.invoke('history:get');
            setHistory(entries);
            setFilteredHistory(entries);
        }
    };

    const handleClearHistory = async () => {
        if (window.electron) {
            if (confirm('Are you sure you want to clear your entire browsing history?')) {
                await window.electron.invoke('history:clear');
                setHistory([]);
                setFilteredHistory([]);
            }
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // Group history by date
    const groupedHistory = filteredHistory.reduce((groups, entry) => {
        const date = formatDate(entry.timestamp);
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(entry);
        return groups;
    }, {} as Record<string, HistoryEntry[]>);

    return (
        <div className="history-page">
            <div className="history-header">
                <div className="history-title">
                    <Clock className="w-6 h-6 mr-2" />
                    <h1>History</h1>
                </div>
                <div className="history-controls">
                    <div className="search-bar">
                        <Search className="w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search history"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')}>
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <button className="clear-history-btn" onClick={handleClearHistory}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Clear browsing data
                    </button>
                </div>
            </div>

            <div className="history-content">
                {Object.keys(groupedHistory).length === 0 ? (
                    <div className="empty-state">
                        <Clock className="w-12 h-12 text-gray-300 mb-4" />
                        <p>No history entries found</p>
                    </div>
                ) : (
                    Object.entries(groupedHistory).map(([date, entries]) => (
                        <div key={date} className="history-group">
                            <h2 className="history-date">{date}</h2>
                            <div className="history-list">
                                {entries.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="history-item"
                                        onClick={() => onNavigate(entry.url)}
                                    >
                                        <div className="history-time">{formatTime(entry.timestamp)}</div>
                                        <div className="history-icon">
                                            {entry.favicon ? (
                                                <img src={entry.favicon} alt="" onError={(e) => (e.currentTarget.src = '')} />
                                            ) : (
                                                <Globe className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        <div className="history-details">
                                            <div className="history-entry-title">{entry.title}</div>
                                            <div className="history-entry-url">{entry.url}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistoryPage;
