import React, { useState, useEffect } from 'react';
import { Folder, Trash2, ExternalLink, Search } from 'lucide-react';
import './BookmarksPage.css';

interface BookmarkNode {
    id: string;
    title: string;
    url?: string;
    children?: BookmarkNode[];
    dateAdded: number;
}

interface BookmarksPageProps {
    onNavigate: (url: string) => void;
}

export default function BookmarksPage({ onNavigate }: BookmarksPageProps) {
    const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadBookmarks();
        // Poll for changes
        const interval = setInterval(loadBookmarks, 2000);
        return () => clearInterval(interval);
    }, []);

    const loadBookmarks = async () => {
        if (window.electron) {
            try {
                const tree = await window.electron.invoke('bookmarks:get');
                setBookmarks(Array.isArray(tree) ? tree : []);
            } catch (error) {
                console.error('Failed to load bookmarks:', error);
            }
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.electron) {
            try {
                await window.electron.invoke('bookmarks:remove', id);
                loadBookmarks();
            } catch (error) {
                console.error('Failed to delete bookmark:', error);
            }
        }
    };

    const renderNode = (node: BookmarkNode) => {
        if (searchTerm && !node.title.toLowerCase().includes(searchTerm.toLowerCase()) && !node.url?.toLowerCase().includes(searchTerm.toLowerCase())) {
            // If searching, only show matches. If folder, check children.
            if (node.children) {
                const hasMatch = node.children.some(child =>
                    child.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    child.url?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                if (!hasMatch) return null;
            } else {
                return null;
            }
        }

        return (
            <div key={node.id} className="bookmark-item-row">
                <div
                    className="bookmark-info"
                    onClick={() => node.url && onNavigate(node.url)}
                    style={{ cursor: node.url ? 'pointer' : 'default' }}
                >
                    {node.url ? <ExternalLink size={16} className="icon" /> : <Folder size={16} className="icon" />}
                    <span className="title">{node.title}</span>
                    {node.url && <span className="url">{node.url}</span>}
                </div>
                <button
                    className="delete-btn"
                    onClick={(e) => handleDelete(node.id, e)}
                    title="Delete"
                >
                    <Trash2 size={14} />
                </button>
                {node.children && (
                    <div className="bookmark-children">
                        {node.children.map(renderNode)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bookmarks-page">
            <div className="header">
                <h1>Bookmarks</h1>
                <div className="search-bar">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="Search bookmarks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <div className="bookmarks-list">
                {Array.isArray(bookmarks) && bookmarks.map(renderNode)}
            </div>
        </div>
    );
}
