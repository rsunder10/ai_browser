
import { X, Plus, Folder, Pin, VolumeX, Sparkles, Container } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Tab {
    id: string;
    url: string;
    title: string;
    groupId?: string;
    pinned?: boolean;
    muted?: boolean;
}

interface TabGroup {
    id: string;
    name: string;
    color: string;
    isContainer?: boolean;
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
    const [newGroupIsContainer, setNewGroupIsContainer] = useState(false);
    const [showOrganizeDialog, setShowOrganizeDialog] = useState(false);
    const [organizeLoading, setOrganizeLoading] = useState(false);
    const [organizeSuggestions, setOrganizeSuggestions] = useState<Array<{ name: string; color: string; tabIds: string[] }>>([]);

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

        const newGroup = await window.electron.invoke('tabs:create-group', newGroupName, newGroupColor, newGroupIsContainer);
        if (newGroup) {
            await window.electron.invoke('tabs:add-to-group', targetTabId, newGroup.id);
            setShowNewGroupDialog(false);
            setNewGroupIsContainer(false);
            window.electron.invoke('tabs:set-visibility', true);
        }
    };

    const closeDialog = () => {
        setShowNewGroupDialog(false);
        if (window.electron) {
            window.electron.invoke('tabs:set-visibility', true);
        }
    };

    const handleOrganize = async () => {
        if (!window.electron || organizeLoading) return;
        setOrganizeLoading(true);
        setShowOrganizeDialog(true);
        window.electron.invoke('tabs:set-visibility', false);
        try {
            const suggestions = await window.electron.invoke('ai:organize-tabs');
            setOrganizeSuggestions(suggestions || []);
        } catch (err) {
            console.error('Organize failed:', err);
            setOrganizeSuggestions([]);
        }
        setOrganizeLoading(false);
    };

    const applyOrganization = async () => {
        if (!window.electron) return;
        for (const group of organizeSuggestions) {
            const newGroup = await window.electron.invoke('tabs:create-group', group.name, group.color);
            if (newGroup) {
                for (const tabId of group.tabIds) {
                    await window.electron.invoke('tabs:add-to-group', tabId, newGroup.id);
                }
            }
        }
        setShowOrganizeDialog(false);
        setOrganizeSuggestions([]);
        window.electron.invoke('tabs:set-visibility', true);
        loadGroups();
    };

    const closeOrganizeDialog = () => {
        setShowOrganizeDialog(false);
        setOrganizeSuggestions([]);
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
                        <span className="tab-title">
                            {tab.pinned && <Pin size={12} style={{ marginRight: 6, transform: 'rotate(45deg)' }} />}
                            {tab.title || 'New Tab'}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {tab.muted && <VolumeX size={12} style={{ color: '#9aa0a6' }} />}
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
                    </div>
                ))}

                {/* Grouped tabs */}
                {groupedTabs.map(({ group, tabs: groupTabs }) => (
                    <div key={group.id} className="tab-group">
                        <div className="group-header" style={{ borderLeftColor: group.color }}>
                            {group.isContainer ? (
                                <Container size={14} style={{ color: group.color }} />
                            ) : (
                                <Folder size={14} style={{ color: group.color }} />
                            )}
                            <span>{group.name}</span>
                        </div>
                        {groupTabs.map(tab => (
                            <div
                                key={tab.id}
                                className={`tab grouped ${tab.id === activeTabId ? 'active' : ''}`}
                                style={{
                                    borderLeft: `3px solid ${group.color}`,
                                    ...(group.isContainer ? { borderTop: `2px solid ${group.color}` } : {})
                                }}
                                onClick={() => onTabClick(tab.id)}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    showTabContextMenu(tab.id, true);
                                }}
                            >
                                <span className="tab-title">
                                    {tab.pinned && <Pin size={12} style={{ marginRight: 6, transform: 'rotate(45deg)' }} />}
                                    {tab.title || 'New Tab'}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    {tab.muted && <VolumeX size={12} style={{ color: '#9aa0a6' }} />}
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
                            </div>
                        ))}
                    </div>
                ))}

                <button
                    className="organize-btn"
                    onClick={handleOrganize}
                    title="Organize tabs with AI"
                    disabled={organizeLoading || tabs.filter(t => !t.url?.startsWith('neuralweb://')).length < 2}
                >
                    <Sparkles size={16} />
                </button>
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
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 13, color: '#5f6368', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={newGroupIsContainer}
                                onChange={e => setNewGroupIsContainer(e.target.checked)}
                                style={{ width: 'auto' }}
                            />
                            <Container size={14} />
                            Container (isolated session)
                        </label>
                        <div className="modal-actions">
                            <button onClick={closeDialog}>Cancel</button>
                            <button onClick={createGroup} disabled={!newGroupName.trim()}>Create</button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Organize Dialog */}
            {showOrganizeDialog && (
                <div className="modal-overlay" onClick={closeOrganizeDialog}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Sparkles size={18} style={{ color: '#8b5cf6' }} />
                            Organize Tabs
                        </h3>
                        {organizeLoading ? (
                            <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>
                                Analyzing tabs...
                            </div>
                        ) : organizeSuggestions.length === 0 ? (
                            <div style={{ padding: '20px 0', textAlign: 'center', color: '#9ca3af' }}>
                                Could not generate suggestions. Try again.
                            </div>
                        ) : (
                            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                                {organizeSuggestions.map((group, i) => (
                                    <div key={i} style={{ marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <div style={{
                                                width: 12, height: 12, borderRadius: '50%',
                                                background: group.color, flexShrink: 0
                                            }} />
                                            <input
                                                type="text"
                                                value={group.name}
                                                onChange={(e) => {
                                                    setOrganizeSuggestions(prev => prev.map((g, j) =>
                                                        j === i ? { ...g, name: e.target.value } : g
                                                    ));
                                                }}
                                                style={{
                                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: 4, padding: '2px 6px', color: '#e5e7eb', fontSize: 13, flex: 1
                                                }}
                                            />
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                {['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                                                    <div
                                                        key={color}
                                                        onClick={() => {
                                                            setOrganizeSuggestions(prev => prev.map((g, j) =>
                                                                j === i ? { ...g, color } : g
                                                            ));
                                                        }}
                                                        style={{
                                                            width: 16, height: 16, borderRadius: '50%', background: color,
                                                            cursor: 'pointer',
                                                            border: group.color === color ? '2px solid white' : '2px solid transparent',
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <div style={{ paddingLeft: 20, fontSize: 11, color: '#6b7280' }}>
                                            {group.tabIds.length} tab{group.tabIds.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button onClick={closeOrganizeDialog}>Cancel</button>
                            <button onClick={applyOrganization} disabled={organizeLoading || organizeSuggestions.length === 0}>
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
