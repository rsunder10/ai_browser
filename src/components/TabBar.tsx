import React from 'react';

interface Tab {
    id: string;
    url: string;
    title: string;
}

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string | null;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
}

export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }: TabBarProps) {
    return (
        <div className="tab-bar">
            <div className="tabs-container">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                        onClick={() => onTabClick(tab.id)}
                    >
                        <span className="tab-title">{tab.title || 'New Tab'}</span>
                        <button
                            className="tab-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                            }}
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button className="new-tab-btn" onClick={onNewTab} title="New Tab">
                    +
                </button>
            </div>
        </div>
    );
}
