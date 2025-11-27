
import { X, Plus, Folder } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Tab {
    id: string;
    url: string;
    title: string;
    groupId?: string;
}

interface TabGroup {
    id: string;
    name: string;
    color: string;
}

interface TabBarProps {
    tabs: Tab[];
    activeTabId: string | null;
    onTabClick: (tabId: string) => void;
    onTabClose: (tabId: string) => void;
    onNewTab: () => void;
}

export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }: TabBarProps) {
    const [groups, setGroups] = useState<TabGroup[]>([]);
    const [showNewGroupDialog, setShowNewGroupDialog] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
    const [targetTabId, setTargetTabId] = useState<string | null>(null);

    useEffect(() => {
        loadGroups();

        // Listen for updates from main process
        if (window.electron) {
            const handleUpdate = () => {
                loadGroups();
            };

            const handleShowDialog = (tabId: string) => {
                console.log('TabBar: Received show-create-group-dialog for tab:', tabId);
                setTargetTabId(tabId);
                setNewGroupName('');
                setNewGroupColor('#3B82F6');
                setShowNewGroupDialog(true);
                window.electron.invoke('tabs:set-visibility', false);
            };

            window.electron.on('tab-updated', handleUpdate);
            window.electron.on('show-create-group-dialog', handleShowDialog);

            return () => {
                window.electron.removeListener('tab-updated', handleUpdate);
                window.electron.removeListener('show-create-group-dialog', handleShowDialog);
            };
        }
    }, []);

    const loadGroups = async () => {
        if (window.electron) {
            const groups = await window.electron.invoke('tabs:get-groups');
            setGroups(groups || []);
        }
    };

    const createGroup = async () => {
        if (!newGroupName.trim() || !window.electron || !targetTabId) return;

        const newGroup = await window.electron.invoke('tabs:create-group', newGroupName, newGroupColor);
        if (newGroup) {
            await window.electron.invoke('tabs:add-to-group', targetTabId, newGroup.id);
            // State update will happen via tab-updated event
            setShowNewGroupDialog(false);
            window.electron.invoke('tabs:set-visibility', true);
        }
    };

    const closeDialog = () => {
        setShowNewGroupDialog(false);
        if (window.electron) {
            window.electron.invoke('tabs:set-visibility', true);
        }
    };

    const showTabContextMenu = async (tabId: string, hasGroup: boolean) => {
        if (window.electron) {
            await window.electron.invoke('tabs:show-context-menu', tabId, hasGroup);
        }
    };

    // Group tabs by groupId
    const groupIds = new Set(groups.map(g => g.id));
    const ungroupedTabs = tabs.filter(tab => !tab.groupId || !groupIds.has(tab.groupId));
    const groupedTabs = groups.map(group => ({
        group,
        tabs: tabs.filter(tab => tab.groupId === group.id)
    })).filter(g => g.tabs.length > 0);



    return (
        <div className="tab-bar">
            <div className="tabs-container">
                {/* Ungrouped tabs */}
                {ungroupedTabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
                        onClick={() => onTabClick(tab.id)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            showTabContextMenu(tab.id, false);
                        }}
                    >
                        <span className="tab-title">{tab.title || 'New Tab'}</span>
                        <button
                            className="tab-close"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.id);
                            }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}

                {/* Grouped tabs */}
                {groupedTabs.map(({ group, tabs: groupTabs }) => (
                    <div key={group.id} className="tab-group">
                        <div className="group-header" style={{ borderLeftColor: group.color }}>
                            <Folder size={14} style={{ color: group.color }} />
                            <span>{group.name}</span>
                        </div>
                        {groupTabs.map(tab => (
                            <div
                                key={tab.id}
                                className={`tab grouped ${tab.id === activeTabId ? 'active' : ''}`}
                                style={{ borderLeft: `3px solid ${group.color}` }}
                                onClick={() => onTabClick(tab.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    showTabContextMenu(tab.id, true);
                                }}
                            >
                                <span className="tab-title">{tab.title || 'New Tab'}</span>
                                <button
                                    className="tab-close"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTabClose(tab.id);
                                    }}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>
                ))}

                <button className="new-tab-btn" onClick={onNewTab} title="New Tab">
                    <Plus size={18} />
                </button>
            </div>

            {/* New Group Dialog */}
            {showNewGroupDialog && (
                <div className="modal-overlay" onClick={closeDialog}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Create New Group</h3>
                        <input
                            type="text"
                            placeholder="Group name"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') createGroup();
                                if (e.key === 'Escape') closeDialog();
                            }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                                <div
                                    key={color}
                                    onClick={() => setNewGroupColor(color)}
                                    style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        background: color,
                                        cursor: 'pointer',
                                        border: newGroupColor === color ? '2px solid #202124' : '2px solid transparent',
                                        boxShadow: newGroupColor === color ? '0 0 0 2px #1a73e8' : 'none'
                                    }}
                                />
                            ))}
                        </div>
                        <div className="modal-actions">
                            <button onClick={closeDialog}>Cancel</button>
                            <button onClick={createGroup} disabled={!newGroupName.trim()}>Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
