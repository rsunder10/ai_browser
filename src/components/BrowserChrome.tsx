
import TabBar from './TabBar';
import NavigationControls from './NavigationControls';
import AddressBar from './AddressBar';
import BookmarksBar from './BookmarksBar';
import { Settings, Download, Book } from 'lucide-react';

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

    return (
        <div className="browser-chrome">
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
                <button
                    className="settings-btn"
                    onClick={() => onNavigate('neuralweb://settings')}
                    title="Settings"
                >
                    <Settings size={18} />
                </button>
            </div>
            <BookmarksBar onNavigate={onNavigate} />
        </div>
    );
}
