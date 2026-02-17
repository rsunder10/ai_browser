import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, Star, BookOpen, Shield, X } from 'lucide-react';

interface AddressBarProps {
    currentUrl: string;
    pageTitle: string;
    onNavigate: (url: string) => void;
    activeTabId?: string | null;
}

export default function AddressBar({ currentUrl, pageTitle, onNavigate, activeTabId }: AddressBarProps) {
    // Display friendly text for home page
    const displayUrl = currentUrl === 'neuralweb://home' ? 'Home' : currentUrl;
    const [inputValue, setInputValue] = useState(displayUrl);
    const [isSecure, setIsSecure] = useState(currentUrl.startsWith('https://'));
    const [isBookmarked, setIsBookmarked] = useState(false);
    const [bookmarkId, setBookmarkId] = useState<string | null>(null);
    const [isAdBlockerEnabled, setIsAdBlockerEnabled] = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [blockedCount, setBlockedCount] = useState(0);
    const [showCertModal, setShowCertModal] = useState(false);
    const [certInfo, setCertInfo] = useState<any>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const display = currentUrl === 'neuralweb://home' ? 'Home' : currentUrl;
        setInputValue(display);
        setIsSecure(currentUrl.startsWith('https://'));
        setShowSuggestions(false);
        setSuggestions([]);
        setShowCertModal(false);
        setCertInfo(null);
        checkBookmarkStatus();
        checkAdBlockerStatus();
        fetchBlockedCount();
    }, [currentUrl]);

    // Listen for tracker stats push events
    useEffect(() => {
        if (!window.electron || !activeTabId) return;
        const handler = (data: any) => {
            if (data.tabId === activeTabId && data.stats) {
                setBlockedCount(data.stats.total || 0);
            }
        };
        window.electron.on('privacy:tab-stats-updated', handler);
        return () => {
            window.electron?.removeListener('privacy:tab-stats-updated', handler);
        };
    }, [activeTabId]);

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

    const fetchBlockedCount = async () => {
        if (window.electron && activeTabId) {
            try {
                const stats = await window.electron.invoke('adblocker:get-tab-stats', activeTabId);
                setBlockedCount(stats?.total || 0);
            } catch {
                setBlockedCount(0);
            }
        } else {
            setBlockedCount(0);
        }
    };

    const handleLockClick = async () => {
        if (!window.electron || !activeTabId || !isSecure) return;
        try {
            const cert = await window.electron.invoke('security:get-certificate', activeTabId);
            if (cert) {
                setCertInfo(cert);
                setShowCertModal(true);
            }
        } catch (e) {
            console.error('Failed to get certificate:', e);
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

    const fetchSuggestions = useCallback(async (query: string) => {
        if (!window.electron || query.length < 3) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }

        try {
            const results = await window.electron.invoke('ai:suggest', query);
            if (results && results.length > 0) {
                setSuggestions(results);
                setShowSuggestions(true);
            } else {
                setSuggestions([]);
                setShowSuggestions(false);
            }
        } catch {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // Debounce AI suggestions
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(value);
        }, 500);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setShowSuggestions(false);
            setSuggestions([]);
            onNavigate(inputValue);
        }
        if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInputValue(suggestion);
        setShowSuggestions(false);
        setSuggestions([]);
        onNavigate(suggestion);
    };

    const handleFocus = () => {
        setIsFocused(true);
        if (suggestions.length > 0) setShowSuggestions(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
        // Delay hiding to allow click on suggestion
        setTimeout(() => setShowSuggestions(false), 200);
    };

    return (
        <div className="address-bar" style={{ position: 'relative' }}>
            {isSecure ? (
                <button
                    className="bookmark-btn"
                    onClick={handleLockClick}
                    title="View certificate"
                    style={{ padding: 2, color: certInfo?.isExpired ? '#e74c3c' : certInfo?.isSelfSigned || certInfo?.isExpiringSoon ? '#f59e0b' : '#5f6368' }}
                >
                    <Lock size={14} />
                </button>
            ) : currentUrl.startsWith('http://') ? (
                <span style={{ color: '#e74c3c', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>Not secure</span>
            ) : null}
            <input
                type="text"
                className="url-input"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder="Search or enter address"
            />
            {showSuggestions && isFocused && suggestions.length > 0 && (
                <div className="ai-suggestions-dropdown">
                    {suggestions.map((suggestion, idx) => (
                        <div
                            key={idx}
                            className="ai-suggestion-item"
                            onMouseDown={() => handleSuggestionClick(suggestion)}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
            <button
                className="bookmark-btn"
                title={isAdBlockerEnabled ? "Disable Ad Blocker" : "Enable Ad Blocker"}
                onClick={toggleAdBlocker}
                style={{ position: 'relative' }}
            >
                <Shield
                    size={16}
                    fill={isAdBlockerEnabled ? "currentColor" : "none"}
                />
                {isAdBlockerEnabled && blockedCount > 0 && (
                    <span style={{
                        position: 'absolute', top: -4, right: -4,
                        background: '#e74c3c', color: 'white', fontSize: 9, fontWeight: 700,
                        borderRadius: 6, padding: '1px 4px', lineHeight: '12px', minWidth: 14, textAlign: 'center'
                    }}>
                        {blockedCount > 99 ? '99+' : blockedCount}
                    </span>
                )}
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

            {showCertModal && certInfo && (
                <div className="cert-modal-overlay" onClick={() => setShowCertModal(false)}>
                    <div className="cert-modal" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: 16, color: '#202124' }}>Certificate Information</h3>
                            <button onClick={() => setShowCertModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5f6368' }}>
                                <X size={18} />
                            </button>
                        </div>
                        {certInfo.isExpired && (
                            <div className="cert-warning" style={{ background: '#fce8e6', color: '#c5221f' }}>
                                This certificate has expired
                            </div>
                        )}
                        {certInfo.isSelfSigned && (
                            <div className="cert-warning" style={{ background: '#fef7e0', color: '#b05a00' }}>
                                This certificate is self-signed
                            </div>
                        )}
                        {certInfo.isExpiringSoon && !certInfo.isExpired && (
                            <div className="cert-warning" style={{ background: '#fef7e0', color: '#b05a00' }}>
                                This certificate expires soon
                            </div>
                        )}
                        <div className="cert-row"><strong>Subject:</strong> {certInfo.subject}</div>
                        <div className="cert-row"><strong>Issuer:</strong> {certInfo.issuer}</div>
                        <div className="cert-row"><strong>Valid From:</strong> {certInfo.validFrom}</div>
                        <div className="cert-row"><strong>Valid To:</strong> {certInfo.validTo}</div>
                        <div className="cert-row"><strong>Fingerprint:</strong> <span style={{ fontFamily: 'monospace', fontSize: 11, wordBreak: 'break-all' }}>{certInfo.fingerprint}</span></div>
                        {certInfo.serialNumber && <div className="cert-row"><strong>Serial:</strong> <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{certInfo.serialNumber}</span></div>}
                    </div>
                </div>
            )}
        </div>
    );
}
