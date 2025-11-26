import React, { useState, useEffect } from 'react';
import { Lock, Star, BookOpen, Shield } from 'lucide-react';

interface AddressBarProps {
    currentUrl: string;
    pageTitle: string;
    onNavigate: (url: string) => void;
}

export default function AddressBar({ currentUrl, pageTitle, onNavigate }: AddressBarProps) {
    // Display friendly text for home page
    const displayUrl = currentUrl === 'neuralweb://home' ? 'Home' : currentUrl;
    const [inputValue, setInputValue] = useState(displayUrl);
    const [isSecure, setIsSecure] = useState(currentUrl.startsWith('https://'));
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkId, setBookmarkId] = useState<string | null>(null);
    const [isAdBlockerEnabled, setIsAdBlockerEnabled] = useState(false);

    useEffect(() => {
        const display = currentUrl === 'neuralweb://home' ? 'Home' : currentUrl;
        setInputValue(display);
        setIsSecure(currentUrl.startsWith('https://'));
        checkBookmarkStatus();
        checkAdBlockerStatus();
    }, [currentUrl]);

    const checkBookmarkStatus = async () => {
        if (window.electron && currentUrl && currentUrl !== 'neuralweb://home') {
            try {
                const bookmark = await window.electron.invoke('bookmarks:getByUrl', currentUrl);
                setIsBookmarked(!!bookmark);
                setBookmarkId(bookmark ? bookmark.id : null);
            } catch (e) {
                console.error('Failed to check bookmark status:', e);
                setIsBookmarked(false);
                setBookmarkId(null);
            }
        } else {
            setIsBookmarked(false);
            setBookmarkId(null);
        }
    };

    const checkAdBlockerStatus = async () => {
        if (window.electron) {
            try {
                const status = await window.electron.invoke('adblocker:status');
                setIsAdBlockerEnabled(status);
            } catch (e) {
                console.error('Failed to check ad blocker status:', e);
            }
        }
    };

    const handleBookmarkClick = async () => {
        if (!window.electron || !currentUrl || currentUrl === 'neuralweb://home') return;

        try {
            if (isBookmarked && bookmarkId) {
                await window.electron.invoke('bookmarks:remove', bookmarkId);
                setIsBookmarked(false);
                setBookmarkId(null);
            } else {
                const newBookmark = await window.electron.invoke('bookmarks:add', {
                    title: pageTitle || inputValue,
                    url: currentUrl
                });
                if (newBookmark) {
                    setIsBookmarked(true);
                    setBookmarkId(newBookmark.id);
                } else {
                    console.error('Failed to add bookmark: Backend returned null/undefined');
                }
            }
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        }
    };

    const toggleAdBlocker = async () => {
        if (window.electron) {
            try {
                const status = await window.electron.invoke('adblocker:toggle');
                setIsAdBlockerEnabled(status);
            } catch (e) {
                console.error('Failed to toggle ad blocker:', e);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onNavigate(inputValue);
        }
    };

    return (
        <div className="address-bar">
            {isSecure && <Lock size={14} className="ssl-indicator" />}
            <input
                type="text"
                className="url-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or enter address"
            />
            <button
                className="bookmark-btn"
                title={isAdBlockerEnabled ? "Disable Ad Blocker" : "Enable Ad Blocker"}
                onClick={toggleAdBlocker}
            >
                <Shield
                    size={16}
                    fill={isAdBlockerEnabled ? "currentColor" : "none"}
                />
            </button>
            <button
                className="bookmark-btn"
                title="Toggle Reader Mode"
                onClick={async () => {
                    if (window.electron) {
                        await window.electron.invoke('reader:toggle');
                    }
                }}
            >
                <BookOpen size={16} />
            </button>
            <button
                className="bookmark-btn"
                title={isBookmarked ? "Remove bookmark" : "Bookmark this tab"}
                onClick={handleBookmarkClick}
            >
                <Star
                    size={16}
                    fill={isBookmarked ? "#ffd700" : "none"}
                    color={isBookmarked ? "#ffd700" : "currentColor"}
                />
            </button>
        </div>
    );
}
