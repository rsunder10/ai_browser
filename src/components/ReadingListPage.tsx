import { useState, useEffect } from 'react';
import { BookOpen, Check, Trash2, ExternalLink, Clock } from 'lucide-react';
import './ReadingListPage.css';

interface ReadingListItem {
    id: string;
    url: string;
    title: string;
    excerpt?: string;
    dateAdded: number;
    isRead: boolean;
}

interface ReadingListPageProps {
    onNavigate: (url: string) => void;
}

export default function ReadingListPage({ onNavigate }: ReadingListPageProps) {
    const [items, setItems] = useState<ReadingListItem[]>([]);
    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        if (window.electron) {
            const list = await window.electron.invoke('reading-list:get');
            setItems(list || []);
        }
    };

    const handleToggleRead = async (id: string) => {
        if (window.electron) {
            await window.electron.invoke('reading-list:toggle-read', id);
            loadItems();
        }
    };

    const handleRemove = async (id: string) => {
        if (window.electron) {
            await window.electron.invoke('reading-list:remove', id);
            loadItems();
        }
    };

    const filteredItems = items.filter(item => {
        if (filter === 'unread') return !item.isRead;
        if (filter === 'read') return item.isRead;
        return true;
    });

    const unreadCount = items.filter(i => !i.isRead).length;

    return (
        <div className="reading-list-page">
            <div className="reading-list-header">
                <div className="reading-list-title">
                    <BookOpen size={24} />
                    <h1>Reading List</h1>
                    {unreadCount > 0 && (
                        <span className="unread-badge">{unreadCount} unread</span>
                    )}
                </div>
                <div className="reading-list-filters">
                    <button
                        className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        All ({items.length})
                    </button>
                    <button
                        className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
                        onClick={() => setFilter('unread')}
                    >
                        Unread ({unreadCount})
                    </button>
                    <button
                        className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
                        onClick={() => setFilter('read')}
                    >
                        Read ({items.length - unreadCount})
                    </button>
                </div>
            </div>

            <div className="reading-list-items">
                {filteredItems.length === 0 ? (
                    <div className="reading-list-empty">
                        <BookOpen size={48} />
                        <p>{filter === 'all' ? 'Your reading list is empty' : `No ${filter} articles`}</p>
                        <span>Save articles from any page using the bookmark menu or address bar</span>
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className={`reading-list-card ${item.isRead ? 'read' : ''}`}>
                            <div className="card-content" onClick={() => onNavigate(item.url)}>
                                <h3 className="card-title">{item.title}</h3>
                                {item.excerpt && <p className="card-excerpt">{item.excerpt}</p>}
                                <div className="card-meta">
                                    <span className="card-url">{new URL(item.url).hostname}</span>
                                    <span className="card-date">
                                        <Clock size={12} />
                                        {new Date(item.dateAdded).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <div className="card-actions">
                                <button
                                    className={`card-action-btn ${item.isRead ? 'read' : ''}`}
                                    onClick={() => handleToggleRead(item.id)}
                                    title={item.isRead ? 'Mark as unread' : 'Mark as read'}
                                >
                                    <Check size={16} />
                                </button>
                                <button
                                    className="card-action-btn"
                                    onClick={() => onNavigate(item.url)}
                                    title="Open"
                                >
                                    <ExternalLink size={16} />
                                </button>
                                <button
                                    className="card-action-btn danger"
                                    onClick={() => handleRemove(item.id)}
                                    title="Remove"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
