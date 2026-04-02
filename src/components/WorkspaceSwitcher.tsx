import { useState, useEffect } from 'react';
import { Layers, Plus, Trash2, Save, FolderOpen, Edit3 } from 'lucide-react';

interface Workspace {
    id: string;
    name: string;
    icon: string;
    tabs: { url: string; title: string }[];
    groups: { id: string; name: string; color: string }[];
    createdAt: number;
    updatedAt: number;
}

interface WorkspaceSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
}

const WORKSPACE_ICONS = ['💼', '🏠', '📚', '🔬', '🎮', '🎵', '📰', '💻', '🛒', '✈️'];

export default function WorkspaceSwitcher({ isOpen, onClose }: WorkspaceSwitcherProps) {
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState('');
    const [newIcon, setNewIcon] = useState('💼');

    useEffect(() => {
        if (isOpen) loadWorkspaces();
    }, [isOpen]);

    const loadWorkspaces = async () => {
        if (!window.electron) return;
        const list = await window.electron.invoke('workspaces:get-all');
        setWorkspaces(list || []);
        const id = await window.electron.invoke('workspaces:get-active');
        setActiveId(id);
    };

    const handleSave = async () => {
        if (!window.electron || !newName.trim()) return;
        await window.electron.invoke('workspaces:save-current', newName.trim(), newIcon);
        setShowCreate(false);
        setNewName('');
        setNewIcon('💼');
        loadWorkspaces();
    };

    const handleLoad = async (id: string) => {
        if (!window.electron) return;
        await window.electron.invoke('workspaces:load', id);
        setActiveId(id);
        onClose();
    };

    const handleUpdate = async (id: string) => {
        if (!window.electron) return;
        await window.electron.invoke('workspaces:update-current', id);
        loadWorkspaces();
    };

    const handleDelete = async (id: string) => {
        if (!window.electron) return;
        await window.electron.invoke('workspaces:remove', id);
        loadWorkspaces();
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '70vh' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Layers size={18} />
                    Workspaces
                </h3>

                <div style={{ overflowY: 'auto', maxHeight: '50vh' }}>
                    {workspaces.length === 0 && !showCreate && (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#9aa0a6' }}>
                            <Layers size={32} style={{ opacity: 0.4, marginBottom: 8 }} />
                            <p style={{ fontSize: 14, marginBottom: 4 }}>No workspaces saved</p>
                            <p style={{ fontSize: 12 }}>Save your current tabs as a workspace to quickly switch between contexts</p>
                        </div>
                    )}

                    {workspaces.map(w => (
                        <div
                            key={w.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 12px',
                                borderRadius: 8,
                                marginBottom: 6,
                                background: w.id === activeId ? 'rgba(26, 115, 232, 0.15)' : 'rgba(255,255,255,0.04)',
                                border: w.id === activeId ? '1px solid rgba(26, 115, 232, 0.3)' : '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'all 0.15s',
                            }}
                            onClick={() => handleLoad(w.id)}
                        >
                            <span style={{ fontSize: 20 }}>{w.icon}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 500, fontSize: 14, color: '#e8eaed' }}>{w.name}</div>
                                <div style={{ fontSize: 11, color: '#9aa0a6' }}>
                                    {w.tabs.length} tab{w.tabs.length !== 1 ? 's' : ''}
                                    {w.groups.length > 0 && ` · ${w.groups.length} group${w.groups.length !== 1 ? 's' : ''}`}
                                    {' · '}Updated {new Date(w.updatedAt).toLocaleDateString()}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => handleUpdate(w.id)}
                                    title="Update with current tabs"
                                    style={{
                                        background: 'transparent', border: 'none', color: '#9aa0a6',
                                        cursor: 'pointer', padding: 4, borderRadius: 4,
                                    }}
                                >
                                    <Save size={14} />
                                </button>
                                <button
                                    onClick={() => handleDelete(w.id)}
                                    title="Delete workspace"
                                    style={{
                                        background: 'transparent', border: 'none', color: '#9aa0a6',
                                        cursor: 'pointer', padding: 4, borderRadius: 4,
                                    }}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {showCreate && (
                        <div style={{
                            padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)', marginTop: 8,
                        }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                    {WORKSPACE_ICONS.map(icon => (
                                        <div
                                            key={icon}
                                            onClick={() => setNewIcon(icon)}
                                            style={{
                                                width: 30, height: 30, display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', borderRadius: 6, cursor: 'pointer',
                                                background: newIcon === icon ? 'rgba(26,115,232,0.3)' : 'transparent',
                                                border: newIcon === icon ? '1px solid #1a73e8' : '1px solid transparent',
                                                fontSize: 16,
                                            }}
                                        >
                                            {icon}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Workspace name"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') setShowCreate(false);
                                }}
                                autoFocus
                                style={{
                                    width: '100%', padding: '8px 10px', borderRadius: 6,
                                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                                    color: '#e8eaed', fontSize: 13, marginBottom: 10, outline: 'none',
                                }}
                            />
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowCreate(false)}
                                    style={{
                                        padding: '6px 14px', borderRadius: 6, border: '1px solid #3c4043',
                                        background: 'transparent', color: '#9aa0a6', cursor: 'pointer', fontSize: 13,
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!newName.trim()}
                                    style={{
                                        padding: '6px 14px', borderRadius: 6, border: 'none',
                                        background: '#1a73e8', color: 'white', cursor: 'pointer', fontSize: 13,
                                        opacity: newName.trim() ? 1 : 0.5,
                                    }}
                                >
                                    Save Workspace
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-actions" style={{ marginTop: 16 }}>
                    <button onClick={onClose}>Close</button>
                    {!showCreate && (
                        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Plus size={14} />
                            Save Current Tabs
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
