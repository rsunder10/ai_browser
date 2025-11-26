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

    const quickLinks = [
        { name: 'YouTube', url: 'https://youtube.com', icon: '▶️', color: '#FF0000' },
        { name: 'GitHub', url: 'https://github.com', icon: '🐙', color: '#181717' },
        { name: 'Twitter', url: 'https://twitter.com', icon: '🐦', color: '#1DA1F2' },
        { name: 'Reddit', url: 'https://reddit.com', icon: '🤖', color: '#FF4500' },
        { name: 'LinkedIn', url: 'https://linkedin.com', icon: '💼', color: '#0A66C2' },
        { name: 'Stack Overflow', url: 'https://stackoverflow.com', icon: '📚', color: '#F48024' },
        { name: 'Medium', url: 'https://medium.com', icon: '✍️', color: '#00AB6C' },
        { name: 'Dev.to', url: 'https://dev.to', icon: '👨‍💻', color: '#0A0A0A' },
    ];

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
                                key={link.name}
                                className="quick-link-card"
                                onClick={() => onNavigate(link.url)}
                                style={{ '--accent-color': link.color } as React.CSSProperties}
                            >
                                <span className="quick-link-icon">{link.icon}</span>
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
