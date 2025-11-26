import React, { useState, useEffect } from 'react';
import { Shield, Trash2, Globe } from 'lucide-react';
import './SiteSettingsPage.css';

interface SitePermission {
    origin: string;
    permission: string;
    status: 'allow' | 'deny' | 'prompt';
}

export const SiteSettingsPage: React.FC = () => {
    const [permissions, setPermissions] = useState<SitePermission[]>([]);

    useEffect(() => {
        loadPermissions();
    }, []);

    const loadPermissions = async () => {
        try {
            const perms = await window.electron.invoke('permissions:get-all');
            setPermissions(perms);
        } catch (error) {
            console.error('Failed to load permissions:', error);
        }
    };

    const handleStatusChange = async (origin: string, permission: string, status: 'allow' | 'deny' | 'prompt') => {
        try {
            await window.electron.invoke('permissions:set', { origin, permission, status });
            loadPermissions();
        } catch (error) {
            console.error('Failed to update permission:', error);
        }
    };

    const handleClear = async (origin: string) => {
        try {
            await window.electron.invoke('permissions:clear', origin);
            loadPermissions();
        } catch (error) {
            console.error('Failed to clear permissions:', error);
        }
    };

    return (
        <div className="settings-page">
            <header className="settings-header">
                <h1>Site Settings</h1>
            </header>

            <div className="settings-content">
                <div className="permissions-list">
                    {permissions.length === 0 ? (
                        <div className="empty-state">
                            <Shield size={48} />
                            <h2>No permissions saved</h2>
                            <p>Sites you visit will appear here when they request permissions.</p>
                        </div>
                    ) : (
                        permissions.map((perm, index) => (
                            <div key={index} className="permission-item">
                                <div className="site-info">
                                    <Globe size={20} />
                                    <div>
                                        <h3>{perm.origin}</h3>
                                        <span className="permission-badge">{perm.permission}</span>
                                    </div>
                                </div>
                                <div className="permission-status">
                                    <select
                                        value={perm.status}
                                        onChange={(e) => handleStatusChange(perm.origin, perm.permission, e.target.value as any)}
                                        className={`status-select ${perm.status}`}
                                    >
                                        <option value="allow">Allow</option>
                                        <option value="deny">Block</option>
                                        <option value="prompt">Ask</option>
                                    </select>
                                    <button
                                        className="delete-btn"
                                        onClick={() => handleClear(perm.origin)}
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
