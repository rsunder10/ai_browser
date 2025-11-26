
import { ArrowLeft, ArrowRight, RotateCw, Home } from 'lucide-react';

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
                <ArrowLeft size={18} />
            </button>
            <button
                className="nav-btn"
                onClick={onForward}
                disabled={!canGoForward}
                title="Forward"
            >
                <ArrowRight size={18} />
            </button>
            <button
                className="nav-btn"
                onClick={onRefresh}
                title="Refresh"
            >
                <RotateCw size={16} />
            </button>
            <button
                className="nav-btn"
                onClick={onHome}
                title="Home"
            >
                <Home size={16} />
            </button>
        </div>
    );
}
