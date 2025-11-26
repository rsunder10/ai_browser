import React, { useState } from 'react';

interface AddressBarProps {
    currentUrl: string;
    onNavigate: (url: string) => void;
}

export default function AddressBar({ currentUrl, onNavigate }: AddressBarProps) {
    // Display friendly text for home page
    const displayUrl = currentUrl === 'neuralweb://home' ? 'Home' : currentUrl;
    const [inputValue, setInputValue] = useState(displayUrl);
    const [isSecure, setIsSecure] = useState(currentUrl.startsWith('https://'));

    React.useEffect(() => {
        const display = currentUrl === 'neuralweb://home' ? 'Home' : currentUrl;
        setInputValue(display);
        setIsSecure(currentUrl.startsWith('https://'));
    }, [currentUrl]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onNavigate(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            onNavigate(inputValue);
        }
    };

    return (
        <div className="address-bar">
            {isSecure && <span className="ssl-indicator" title="Secure">🔒</span>}
            <input
                type="text"
                className="url-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or enter address"
            />
            <button className="bookmark-btn" title="Bookmark">
                ☆
            </button>
        </div>
    );
}
