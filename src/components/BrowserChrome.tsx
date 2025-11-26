import React from 'react';
import TabBar from './TabBar';
import NavigationControls from './NavigationControls';
import AddressBar from './AddressBar';

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
                    onNavigate={onNavigate}
                />
            </div>
        </div>
    );
}
