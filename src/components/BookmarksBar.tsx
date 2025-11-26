import React, { useState, useEffect } from 'react';
import { Folder } from 'lucide-react';

interface BookmarkNode {
    id: string;
    title: string;
    url?: string;
    children?: BookmarkNode[];
}

interface BookmarksBarProps {
    onNavigate: (url: string) => void;
}

export default function BookmarksBar({ onNavigate }: BookmarksBarProps) {
    const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);

    useEffect(() => {
        loadBookmarks();

        // Poll for changes (temporary solution until we implement events)
        const interval = setInterval(loadBookmarks, 2000);
        return () => clearInterval(interval);
    }, []);

    const loadBookmarks = async () => {
        if (window.electron) {
            try {
                const tree = await window.electron.invoke('bookmarks:get');
                // The tree returns [bookmark_bar, other]. We want the children of bookmark_bar.
                if (tree && tree.length > 0 && tree[0].children) {
                    setBookmarks(tree[0].children);
                }
            } catch (error) {
                console.error('Failed to load bookmarks:', error);
            }
        }
    };

    if (bookmarks.length === 0) return null;

    return (
        <div className="bookmarks-bar">
            {bookmarks.map((node) => (
                <button
                    key={node.id}
                    className="bookmark-item"
                    onClick={() => node.url && onNavigate(node.url)}
                    title={node.title}
                >
                    {!node.url && <Folder size={14} className="bookmark-folder-icon" />}
                    <span className="bookmark-title">{node.title}</span>
                </button>
            ))}
        </div>
    );
}
