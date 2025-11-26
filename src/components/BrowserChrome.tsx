
import { useState, useEffect } from 'react';
import TabBar from './TabBar';
import NavigationControls from './NavigationControls';
import AddressBar from './AddressBar';
import BookmarksBar from './BookmarksBar';
import BrowserMenu from './BrowserMenu';
import { Download, Book, EyeOff } from 'lucide-react';

interface Tab {
    id: string;
    url: string;
    title: string;
    history: string[];
    history_index: number;
}

interface BrowserChromeProps {
    tabs: Tab[];
    activeTabId: string | null;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
    onNavigate: (url: string) => void;
    onBack: () => void;
    onForward: () => void;
    onRefresh: () => void;
    onHome: () => void;
}

export default function BrowserChrome({
    tabs,
    activeTabId,
    onTabClick,
    onTabClose,
    onNewTab,
    onNavigate,
    onBack,
    onForward,
    onRefresh,
    onHome
}: BrowserChromeProps) {
    const activeTab = tabs.find(t => t.id === activeTabId);
    const canGoBack = activeTab ? activeTab.history_index > 0 : false;
    const canGoForward = activeTab ? activeTab.history_index < activeTab.history.length - 1 : false;
    const currentUrl = activeTab?.url || '';

    const [isIncognito, setIsIncognito] = useState(false);

    useEffect(() => {
        if (window.electron) {
            window.electron.invoke('is-incognito').then(setIsIncognito);
        }
    }, []);

    return (
        <div className={`browser-chrome ${isIncognito ? 'incognito' : ''}`}>
            <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onTabClick={onTabClick}
                onTabClose={onTabClose}
                onNewTab={onNewTab}
            />

            <div className="toolbar">
                <NavigationControls
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    onBack={onBack}
                    onForward={onForward}
                    onRefresh={onRefresh}
                    onHome={onHome}
                />
                <AddressBar
                    currentUrl={currentUrl}
                    pageTitle={activeTab?.title || ''}
                    onNavigate={onNavigate}
                />
                {isIncognito && (
                    <div className="incognito-badge" title="Incognito Mode">
                        <EyeOff size={16} />
                        <span>Incognito</span>
                    </div>
                )}
                <button
                    className="settings-btn"
                    onClick={() => onNavigate('neuralweb://downloads')}
                    title="Downloads"
                >
                    <Download size={18} />
                </button>
                <button
                    className="settings-btn"
                    onClick={() => onNavigate('neuralweb://bookmarks')}
                    title="Bookmarks"
                >
                    <Book size={18} />
                </button>
                <BrowserMenu onNavigate={onNavigate} />
            </div>
            <BookmarksBar onNavigate={onNavigate} />
        </div>
    );
}
