import React from 'react';

interface NavigationControlsProps {
    canGoBack: boolean;
    canGoForward: boolean;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
    onHome: () => void;
}

export default function NavigationControls({
    canGoBack,
    canGoForward,
    onBack,
    onForward,
    onRefresh,
    onHome
}: NavigationControlsProps) {
    return (
        <div className="nav-controls">
            <button
                className="nav-btn"
                onClick={onBack}
                disabled={!canGoBack}
                title="Back"
            >
                ←
            </button>
            <button
                className="nav-btn"
                onClick={onForward}
                disabled={!canGoForward}
                title="Forward"
            >
                →
            </button>
            <button
                className="nav-btn"
                onClick={onRefresh}
                title="Refresh"
            >
                ⟳
            </button>
            <button
                className="nav-btn"
                onClick={onHome}
                title="Home"
            >
                ⌂
            </button>
        </div>
    );
}
