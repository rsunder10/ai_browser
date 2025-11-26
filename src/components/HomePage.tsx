import React, { useState } from 'react';
import './HomePage.css';

interface HomePageProps {
    onNavigate: (url: string) => void;
}

export default function HomePage({ onNavigate }: HomePageProps) {
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        // Check if it's a URL or search query
        const isUrl = searchQuery.includes('.') && !searchQuery.includes(' ');
        const url = isUrl
            ? (searchQuery.startsWith('http://') || searchQuery.startsWith('https://')
                ? searchQuery
                : `https://${searchQuery}`)
            : `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

        onNavigate(url);
        setSearchQuery('');
    };

    const [quickLinks, setQuickLinks] = useState([
        { name: 'YouTube', url: 'https://youtube.com', icon: '▶️', color: '#FF0000', favicon: 'https://www.google.com/s2/favicons?domain=https://youtube.com&sz=64' },
        { name: 'GitHub', url: 'https://github.com', icon: '🐙', color: '#181717', favicon: 'https://www.google.com/s2/favicons?domain=https://github.com&sz=64' },
        { name: 'Twitter', url: 'https://twitter.com', icon: '🐦', color: '#1DA1F2', favicon: 'https://www.google.com/s2/favicons?domain=https://twitter.com&sz=64' },
        { name: 'Reddit', url: 'https://reddit.com', icon: '🤖', color: '#FF4500', favicon: 'https://www.google.com/s2/favicons?domain=https://reddit.com&sz=64' },
        { name: 'LinkedIn', url: 'https://linkedin.com', icon: '💼', color: '#0A66C2', favicon: 'https://www.google.com/s2/favicons?domain=https://linkedin.com&sz=64' },
        { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚', color: '#F48024', favicon: 'https://www.google.com/s2/favicons?domain=https://stackoverflow.com&sz=64' },
        { name: 'Medium', url: 'https://medium.com', icon: '✍️', color: '#00AB6C', favicon: 'https://www.google.com/s2/favicons?domain=https://medium.com&sz=64' },
        { name: 'Dev.to', url: 'https://dev.to', icon: '👨‍💻', color: '#0A0A0A', favicon: 'https://www.google.com/s2/favicons?domain=https://dev.to&sz=64' },
    ]);

    React.useEffect(() => {
        const loadTopSites = async () => {
            if (window.electron) {
                try {
                    const sites = await window.electron.invoke('get-top-sites');
                    console.log('Fetched top sites:', sites);
                    if (sites && sites.length > 0) {
                        setQuickLinks(sites);
                    }
                } catch (error) {
                    console.error('Failed to load top sites:', error);
                }
            }
        };
        loadTopSites();
    }, []);

    return (
        <div className="home-page">
            <div className="home-background">
                <div className="gradient-orb orb-1"></div>
                <div className="gradient-orb orb-2"></div>
                <div className="gradient-orb orb-3"></div>
            </div>

            <div className="home-content">
                <div className="home-hero">
                    <div className="logo-container">
                        <div className="neural-logo">
                            <span className="logo-icon">🧠</span>
                            <h1 className="logo-text">NeuralWeb</h1>
                        </div>
                        <p className="tagline">AI-Powered Browsing Experience</p>
                    </div>

                    <form onSubmit={handleSearch} className="search-container">
                        <div className="search-box">
                            <span className="search-icon">🔍</span>
                            <input
                                type="text"
                                className="search-input"
                                placeholder="Search the web or enter a URL..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className="clear-btn"
                                    onClick={() => setSearchQuery('')}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <div className="quick-links-section">
                    <h2 className="section-title">Quick Access</h2>
                    <div className="quick-links-grid">
                        {quickLinks.map((link) => (
                            <button
                                key={link.url}
                                className="quick-link-card"
                                onClick={() => onNavigate(link.url)}
                                style={{ '--accent-color': link.color } as React.CSSProperties}
                            >
                                <span className="quick-link-icon">
                                    {(link as any).favicon ? (
                                        <img
                                            src={(link as any).favicon}
                                            alt=""
                                            className="quick-link-favicon"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                                (e.target as HTMLImageElement).nextElementSibling?.removeAttribute('style');
                                            }}
                                        />
                                    ) : null}
                                    <span style={{ display: (link as any).favicon ? 'none' : 'block' }}>
                                        {link.icon}
                                    </span>
                                </span>
                                <span className="quick-link-name">{link.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="footer-info">
                    <p>Press <kbd>Ctrl</kbd> + <kbd>T</kbd> for new tab • <kbd>Ctrl</kbd> + <kbd>L</kbd> to focus address bar</p>
                </div>
            </div>
        </div>
    );
}
