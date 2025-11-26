import { MoreVertical } from 'lucide-react';

interface BrowserMenuProps {
    onNavigate: (url: string) => void;
}

export default function BrowserMenu({ }: BrowserMenuProps) {
    const handleMenuClick = async () => {
        if (window.electron) {
            await window.electron.invoke('open-browser-menu');
        }
    };

    return (
        <div className="browser-menu-container">
            <button
                className="settings-btn"
                onClick={handleMenuClick}
                title="Menu"
            >
                <MoreVertical size={18} />
            </button>
        </div>
    );
}
