
import { useState, useEffect } from 'react';
import TabBar from './TabBar';
import NavigationControls from './NavigationControls';
import AddressBar from './AddressBar';
import BookmarksBar from './BookmarksBar';
import BrowserMenu from './BrowserMenu';
import { Download, Book, EyeOff, Puzzle, Sparkles } from 'lucide-react';

interface Tab {
    id: string;
    url: string;
    title: string;
    history: string[];
    history_index: number;
    groupId?: string;
}

interface ExtensionAction {
    name: string;
    icon?: string;
    title?: string;
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
    onAIToggle?: () => void;
    aiSidebarOpen?: boolean;
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
    onHome,
    onAIToggle,
    aiSidebarOpen
}: BrowserChromeProps) {
    const activeTab = tabs.find(t => t.id === activeTabId);
    const canGoBack = activeTab ? activeTab.history_index > 0 : false;
    const canGoForward = activeTab ? activeTab.history_index < activeTab.history.length - 1 : false;
    const currentUrl = activeTab?.url || '';

    const [isIncognito, setIsIncognito] = useState(false);
    const [extensionActions, setExtensionActions] = useState<ExtensionAction[]>([]);

    useEffect(() => {
        if (window.electron) {
            window.electron.invoke('is-incognito').then(setIsIncognito);
            window.electron.invoke('extensions:get-actions').then(setExtensionActions).catch(() => {});
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
                    activeTabId={activeTabId}
                />
                {isIncognito && (
                    <div className="incognito-badge" title="Incognito Mode">
                        <EyeOff size={16} />
                        <span>Incognito</span>
                    </div>
                )}

                {extensionActions.map(ext => (
                    <button
                        key={ext.name}
                        className="settings-btn"
                        onClick={() => window.electron.invoke('extensions:action-click', ext.name)}
                        title={ext.title || ext.name}
                    >
                        <Puzzle size={16} />
                    </button>
                ))}

                {onAIToggle && (
                    <button
                        className={`settings-btn ${aiSidebarOpen ? 'active' : ''}`}
                        onClick={onAIToggle}
                        title="AI Assistant"
                    >
                        <Sparkles size={18} />
                    </button>
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
