import React, { useState, useEffect } from 'react';
import { Puzzle, Trash2, Plus, AlertCircle } from 'lucide-react';
import './ExtensionsPage.css';

interface Extension {
    id: string;
    name: string;
    version: string;
    description?: string;
    enabled: boolean;
    path: string;
}

export const ExtensionsPage: React.FC = () => {
    const [extensions, setExtensions] = useState<Extension[]>([]);
    const [loading, setLoading] = useState(true);
    const [installPath, setInstallPath] = useState('');

    useEffect(() => {
        loadExtensions();
    }, []);

    const loadExtensions = async () => {
        try {
            const list = await window.electron.invoke('extensions:get');
            setExtensions(list);
        } catch (error) {
            console.error('Failed to load extensions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInstall = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!installPath) return;

        try {
            await window.electron.invoke('extensions:install', installPath);
            setInstallPath('');
            loadExtensions();
        } catch (error) {
            console.error('Failed to install extension:', error);
        }
    };

    const handleRemove = async (name: string) => {
        try {
            await window.electron.invoke('extensions:remove', name);
            loadExtensions();
        } catch (error) {
            console.error('Failed to remove extension:', error);
        }
    };

    return (
        <div className="extensions-page">
            <header className="extensions-header">
                <h1>Extensions</h1>
                <div className="search-container">
                    <Puzzle size={20} />
                    <input
                        type="text"
                        placeholder="Search extensions..."
                        className="search-input"
                    />
                </div>
            </header>

            <div className="extensions-content">
                <div className="install-section">
                    <h2>Install Extension (Developer Mode)</h2>
                    <form onSubmit={handleInstall} className="install-form">
                        <input
                            type="text"
                            value={installPath}
                            onChange={(e) => setInstallPath(e.target.value)}
                            placeholder="Path to unpacked extension folder..."
                            className="install-input"
                        />
                        <button type="submit" className="install-button">
                            <Plus size={16} />
                            Load Unpacked
                        </button>
                    </form>
                    <p className="hint">
                        <AlertCircle size={14} />
                        Enter the absolute path to a folder containing a manifest.json file.
                    </p>
                </div>

                <div className="extensions-list">
                    {loading ? (
                        <div className="loading">Loading extensions...</div>
                    ) : extensions.length === 0 ? (
                        <div className="empty-state">
                            <Puzzle size={48} />
                            <h2>No extensions installed</h2>
                            <p>Load an unpacked extension to get started.</p>
                        </div>
                    ) : (
                        extensions.map((ext) => (
                            <div key={ext.name} className="extension-card">
                                <div className="extension-icon">
                                    {ext.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="extension-info">
                                    <h3>{ext.name}</h3>
                                    <span className="version">v{ext.version}</span>
                                    <p className="path">{ext.path}</p>
                                </div>
                                <div className="extension-actions">
                                    <button
                                        className="remove-button"
                                        onClick={() => handleRemove(ext.name)}
                                        title="Remove extension"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
