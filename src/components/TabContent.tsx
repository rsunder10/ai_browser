import { useRef, useEffect } from 'react';

interface Tab {
    id: string;
    url: string;
    title: string;
}

interface TabContentProps {
    tabs: Tab[];
    activeTabId: string | null;
    onRefresh?: () => void;
}

export default function TabContent({ tabs, activeTabId, onRefresh }: TabContentProps) {
    const iframeRefs = useRef<{ [key: string]: HTMLIFrameElement | null }>({});

    const activeTab = tabs.find(t => t.id === activeTabId);

    useEffect(() => {
        // Refresh active iframe when onRefresh is called
        if (onRefresh && activeTabId && iframeRefs.current[activeTabId]) {
            const iframe = iframeRefs.current[activeTabId];
            if (iframe && iframe.src) {
                iframe.src = iframe.src; // Force reload
            }
        }
    }, [onRefresh, activeTabId]);

    if (!activeTab) {
        return (
            <div className="tab-content-empty">
                <div className="empty-state">
                    <h2>Welcome to NeuralWeb</h2>
                    <p>Create a new tab to start browsing</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content-container">
            {tabs.map((tab) => (
                <iframe
                    key={tab.id}
                    ref={(el) => { iframeRefs.current[tab.id] = el; }}
                    src={tab.url}
                    className={`tab-content-iframe ${tab.id === activeTabId ? 'active' : 'hidden'}`}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-downloads"
                    title={tab.title || 'Tab Content'}
                />
            ))}
        </div>
    );
}
