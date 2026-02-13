import { useState, useEffect } from 'react';
import { Settings, Search, Monitor, Home, Shield, Puzzle, Lock, Bot, RefreshCw } from 'lucide-react';

interface SettingsData {
    searchEngine: 'google' | 'duckduckgo' | 'bing';
    theme: 'system' | 'light' | 'dark';
    homePage: string;
    aiModel: string;
    aiSuggestionsEnabled: boolean;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsData>({
        searchEngine: 'google',
        theme: 'system',
        homePage: 'neuralweb://home',
        aiModel: 'llama3.2:1b',
        aiSuggestionsEnabled: false
    });
    const [aiStatus, setAiStatus] = useState<{ status: string; error: string | null }>({ status: 'unknown', error: null });
    const [aiModels, setAiModels] = useState<Array<{ name: string; size: number }>>([]);

    // Sync state
    const [syncBookmarks, setSyncBookmarks] = useState(true);
    const [syncHistory, setSyncHistory] = useState(true);
    const [syncSettings, setSyncSettings] = useState(false);
    const [importStrategy, setImportStrategy] = useState<'merge' | 'replace'>('merge');
    const [syncMessage, setSyncMessage] = useState('');

    useEffect(() => {
        loadSettings();
        loadAiInfo();
    }, []);

    const loadSettings = async () => {
        if (window.electron) {
            const data = await window.electron.invoke('settings:get');
            if (data) setSettings(data);
        }
    };

    const loadAiInfo = async () => {
        if (!window.electron) return;
        try {
            const status = await window.electron.invoke('ai:status');
            setAiStatus(status);
            if (status.status === 'running') {
                const modelsData = await window.electron.invoke('ai:models');
                setAiModels(modelsData?.models || []);
            }
        } catch (e) {
            console.error('Failed to load AI info:', e);
        }
    };

    const updateSetting = async (key: keyof SettingsData, value: any) => {
        if (window.electron) {
            await window.electron.invoke('settings:set', key, value);
            setSettings(prev => ({ ...prev, [key]: value }));
        }
    };

    const handleExport = async () => {
        if (!window.electron) return;
        setSyncMessage('');
        try {
            const result = await window.electron.invoke('sync:export', {
                bookmarks: syncBookmarks,
                history: syncHistory,
                settings: syncSettings,
            });
            if (result.success) {
                setSyncMessage(`Exported to ${result.path}`);
            } else {
                setSyncMessage('Export cancelled');
            }
        } catch (e) {
            setSyncMessage('Export failed');
        }
    };

    const handleImport = async () => {
        if (!window.electron) return;
        setSyncMessage('');
        try {
            const result = await window.electron.invoke('sync:import', {
                strategy: importStrategy,
            });
            if (result.success) {
                setSyncMessage(result.summary || 'Import complete');
            } else {
                setSyncMessage('Import cancelled');
            }
        } catch (e) {
            setSyncMessage('Import failed');
        }
    };

    return (
        <div className="settings-page">
            <div className="settings-sidebar">
                <div className="settings-header">
                    <Settings size={24} />
                    <h1>Settings</h1>
                </div>
                <nav className="settings-nav">
                    <a href="#search" className="active">Search Engine</a>
                    <a href="#appearance">Appearance</a>
                    <a href="#startup">On Startup</a>
                    <a href="#ai">AI Assistant</a>
                    <a href="#privacy">Privacy & Security</a>
                    <a href="#passwords">Passwords</a>
                    <a href="#extensions">Extensions</a>
                    <a href="#sync">Sync</a>
                </nav>
            </div>

            <div className="settings-content">
                <section id="search" className="settings-section">
                    <h2><Search size={20} /> Search Engine</h2>
                    <div className="setting-item">
                        <label>Search engine used in the address bar</label>
                        <select
                            value={settings.searchEngine}
                            onChange={(e) => updateSetting('searchEngine', e.target.value)}
                        >
                            <option value="google">Google</option>
                            <option value="duckduckgo">DuckDuckGo</option>
                            <option value="bing">Bing</option>
                        </select>
                    </div>
                </section>

                <section id="appearance" className="settings-section">
                    <h2><Monitor size={20} /> Appearance</h2>
                    <div className="setting-item">
                        <label>Theme</label>
                        <select
                            value={settings.theme}
                            onChange={(e) => updateSetting('theme', e.target.value)}
                        >
                            <option value="system">System Default</option>
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </section>

                <section id="startup" className="settings-section">
                    <h2><Home size={20} /> On Startup</h2>
                    <div className="setting-item">
                        <label>Home Page</label>
                        <input
                            type="text"
                            value={settings.homePage}
                            onChange={(e) => updateSetting('homePage', e.target.value)}
                            placeholder="neuralweb://home"
                        />
                    </div>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Clear Session</label>
                            <p>Reset saved windows and tabs on next startup</p>
                        </div>
                        <button
                            className="action-btn"
                            onClick={async () => {
                                if (window.electron) {
                                    await window.electron.invoke('session:clear');
                                    alert('Session cleared. Changes will take effect on next restart.');
                                }
                            }}
                            style={{ marginTop: '8px', padding: '8px 16px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Clear Session
                        </button>
                    </div>
                </section>

                <section id="ai" className="settings-section">
                    <h2><Bot size={20} /> AI Assistant</h2>
                    <div className="setting-item">
                        <label>Ollama Status</label>
                        <span style={{
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '13px',
                            fontWeight: 500,
                            background: aiStatus.status === 'running' ? '#e6f4ea' : aiStatus.status === 'error' ? '#fce8e6' : '#fef7e0',
                            color: aiStatus.status === 'running' ? '#137333' : aiStatus.status === 'error' ? '#c5221f' : '#b05a00',
                            display: 'inline-block',
                            maxWidth: 'fit-content'
                        }}>
                            {aiStatus.status}{aiStatus.error ? `: ${aiStatus.error}` : ''}
                        </span>
                    </div>
                    <div className="setting-item">
                        <label>AI Model</label>
                        <select
                            value={settings.aiModel}
                            onChange={(e) => updateSetting('aiModel', e.target.value)}
                        >
                            {aiModels.length > 0 ? (
                                aiModels.map(m => (
                                    <option key={m.name} value={m.name}>{m.name}</option>
                                ))
                            ) : (
                                <option value={settings.aiModel}>{settings.aiModel}</option>
                            )}
                        </select>
                    </div>
                    <div className="setting-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                                type="checkbox"
                                id="aiSuggestions"
                                checked={settings.aiSuggestionsEnabled}
                                onChange={(e) => updateSetting('aiSuggestionsEnabled', e.target.checked)}
                                style={{ width: 'auto', maxWidth: 'none' }}
                            />
                            <label htmlFor="aiSuggestions" style={{ margin: 0 }}>Enable AI address bar suggestions</label>
                        </div>
                    </div>
                </section>

                <section id="privacy" className="settings-section">
                    <h2><Shield size={20} /> Privacy & Security</h2>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Site Settings</label>
                            <p>Manage permissions for sites you visit</p>
                        </div>
                        <button
                            className="action-btn"
                            onClick={() => window.location.href = 'neuralweb://settings/site'}
                        >
                            Manage Permissions
                        </button>
                    </div>
                </section>

                <section id="passwords" className="settings-section">
                    <h2><Lock size={20} /> Passwords</h2>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Saved Passwords</label>
                            <p>Manage your saved passwords</p>
                        </div>
                        <PasswordsList />
                    </div>
                </section>

                <section id="extensions" className="settings-section">
                    <h2><Puzzle size={20} /> Extensions</h2>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Manage Extensions</label>
                            <p>Add, remove, and configure browser extensions</p>
                        </div>
                        <button
                            className="action-btn"
                            onClick={() => window.location.href = 'neuralweb://extensions'}
                        >
                            Open Extensions
                        </button>
                    </div>
                </section>

                <section id="sync" className="settings-section">
                    <h2><RefreshCw size={20} /> Sync</h2>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Export Data</label>
                            <p>Save your browser data to a JSON file</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                                    <input type="checkbox" checked={syncBookmarks} onChange={e => setSyncBookmarks(e.target.checked)} style={{ width: 'auto' }} />
                                    Bookmarks
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                                    <input type="checkbox" checked={syncHistory} onChange={e => setSyncHistory(e.target.checked)} style={{ width: 'auto' }} />
                                    History
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                                    <input type="checkbox" checked={syncSettings} onChange={e => setSyncSettings(e.target.checked)} style={{ width: 'auto' }} />
                                    Settings
                                </label>
                            </div>
                            <button
                                onClick={handleExport}
                                style={{ padding: '8px 16px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-start' }}
                            >
                                Export
                            </button>
                        </div>
                    </div>
                    <div className="setting-item">
                        <div className="setting-info">
                            <label>Import Data</label>
                            <p>Load browser data from a JSON file</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '13px' }}>Strategy:</label>
                                <select
                                    value={importStrategy}
                                    onChange={e => setImportStrategy(e.target.value as 'merge' | 'replace')}
                                    style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                                >
                                    <option value="merge">Merge (add new items)</option>
                                    <option value="replace">Replace (overwrite)</option>
                                </select>
                            </div>
                            <button
                                onClick={handleImport}
                                style={{ padding: '8px 16px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-start' }}
                            >
                                Import
                            </button>
                        </div>
                    </div>
                    {syncMessage && (
                        <div className="setting-item">
                            <div style={{
                                padding: '8px 12px',
                                borderRadius: '6px',
                                background: '#e6f4ea',
                                color: '#137333',
                                fontSize: '13px',
                            }}>
                                {syncMessage}
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function PasswordsList() {
    const [passwords, setPasswords] = useState<any[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newPassword, setNewPassword] = useState({ url: '', username: '', password: '' });

    useEffect(() => {
        loadPasswords();
    }, []);

    const loadPasswords = async () => {
        if (window.electron) {
            const list = await window.electron.invoke('passwords:list');
            setPasswords(list || []);
        }
    };

    const handleSave = async () => {
        if (window.electron && newPassword.url && newPassword.username && newPassword.password) {
            await window.electron.invoke('passwords:save', newPassword.url, newPassword.username, newPassword.password);
            setNewPassword({ url: '', username: '', password: '' });
            setShowAdd(false);
            loadPasswords();
        }
    };

    const handleDelete = async (id: string) => {
        if (window.electron && confirm('Are you sure you want to delete this password?')) {
            await window.electron.invoke('passwords:delete', id);
            loadPasswords();
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Password copied to clipboard!');
    };

    return (
        <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                <button
                    className="action-btn"
                    onClick={() => setShowAdd(!showAdd)}
                    style={{ padding: '6px 12px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                >
                    {showAdd ? 'Cancel' : 'Add Password'}
                </button>
            </div>

            {showAdd && (
                <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #dfe1e5' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <input
                            placeholder="URL (e.g., google.com)"
                            value={newPassword.url}
                            onChange={e => setNewPassword({ ...newPassword, url: e.target.value })}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                        />
                        <input
                            placeholder="Username"
                            value={newPassword.username}
                            onChange={e => setNewPassword({ ...newPassword, username: e.target.value })}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                        />
                        <input
                            type="password"
                            placeholder="Password"
                            value={newPassword.password}
                            onChange={e => setNewPassword({ ...newPassword, password: e.target.value })}
                            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #dadce0' }}
                        />
                        <button
                            onClick={handleSave}
                            style={{ padding: '8px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', alignSelf: 'flex-start' }}
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {passwords.length === 0 ? (
                    <div style={{ color: '#5f6368', fontStyle: 'italic' }}>No saved passwords</div>
                ) : (
                    passwords.map(p => (
                        <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'white', border: '1px solid #dfe1e5', borderRadius: '6px' }}>
                            <div>
                                <div style={{ fontWeight: '500' }}>{new URL(p.url).hostname}</div>
                                <div style={{ fontSize: '12px', color: '#5f6368' }}>{p.username}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={async () => {}}
                                    style={{ padding: '4px 8px', background: 'none', border: '1px solid #dadce0', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                    title="Copy Password"
                                >
                                    Copy
                                </button>
                                <button
                                    onClick={() => handleDelete(p.id)}
                                    style={{ padding: '4px 8px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
