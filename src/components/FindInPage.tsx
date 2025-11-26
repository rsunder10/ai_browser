import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import './FindInPage.css';

interface FindInPageProps {
    onClose: () => void;
}

const FindInPage: React.FC<FindInPageProps> = ({ onClose }) => {
    const [query, setQuery] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (query) {
            window.electron.invoke('find:start', query);
        } else {
            window.electron.invoke('find:stop', 'clearSelection');
        }
    }, [query]);

    const handleNext = () => {
        window.electron.invoke('find:next', query);
    };

    const handlePrev = () => {
        window.electron.invoke('find:prev', query);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                handlePrev();
            } else {
                handleNext();
            }
        } else if (e.key === 'Escape') {
            handleClose();
        }
    };

    const handleClose = () => {
        window.electron.invoke('find:stop', 'clearSelection');
        onClose();
    };

    return (
        <div className="find-in-page">
            <input
                ref={inputRef}
                type="text"
                placeholder="Find in page"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
            />
            <div className="find-divider" />
            <button onClick={handlePrev} title="Previous match (Shift+Enter)">
                <ChevronUp className="w-4 h-4" />
            </button>
            <button onClick={handleNext} title="Next match (Enter)">
                <ChevronDown className="w-4 h-4" />
            </button>
            <button onClick={handleClose} title="Close (Esc)">
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default FindInPage;
