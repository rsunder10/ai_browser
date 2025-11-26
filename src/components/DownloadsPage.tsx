import React, { useState, useEffect } from 'react';
import { Download, File, Pause, Play, X, FolderOpen, Trash2 } from 'lucide-react';

interface DownloadRecord {
    id: string;
    filename: string;
    path: string;
    url: string;
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted';
    startTime: number;
    endTime?: number;
    totalBytes: number;
    receivedBytes: number;
    mimeType: string;
    paused: boolean;
}

export default function DownloadsPage() {
    const [downloads, setDownloads] = useState<DownloadRecord[]>([]);

    useEffect(() => {
        loadDownloads();

        if (window.electron) {
            window.electron.on('download-updated', (record: DownloadRecord) => {
                setDownloads(prev => {
                    const index = prev.findIndex(r => r.id === record.id);
                    if (index !== -1) {
                        const newDownloads = [...prev];
                        newDownloads[index] = record;
                        return newDownloads;
                    } else {
                        return [record, ...prev];
                    }
                });
            });
        }

        return () => {
            if (window.electron) {
                window.electron.removeListener('download-updated', () => { });
            }
        };
    }, []);

    const loadDownloads = async () => {
        if (window.electron) {
            const history = await window.electron.invoke('downloads:get-history');
            setDownloads(history || []);
        }
    };

    const handlePause = async (id: string) => {
        await window.electron.invoke('downloads:pause', id);
    };

    const handleResume = async (id: string) => {
        await window.electron.invoke('downloads:resume', id);
    };

    const handleCancel = async (id: string) => {
        await window.electron.invoke('downloads:cancel', id);
    };

    const handleOpenFile = async (id: string) => {
        await window.electron.invoke('downloads:open-file', id);
    };

    const handleClear = async () => {
        await window.electron.invoke('downloads:clear');
        setDownloads([]);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
    };

    return (
        <div className="downloads-page">
            <div className="downloads-header">
                <h1>Downloads</h1>
                <div className="downloads-actions">
                    <button className="clear-btn" onClick={handleClear}>
                        <Trash2 size={16} /> Clear All
                    </button>
                </div>
            </div>

            <div className="downloads-list">
                {downloads.length === 0 ? (
                    <div className="empty-state">
                        <Download size={48} />
                        <p>No downloads yet</p>
                    </div>
                ) : (
                    downloads.map(item => (
                        <div key={item.id} className="download-item">
                            <div className="download-icon">
                                <File size={24} />
                            </div>
                            <div className="download-info">
                                <div className="download-filename" title={item.filename}>{item.filename}</div>
                                <div className="download-url" title={item.url}>{item.url}</div>
                                <div className="download-meta">
                                    {item.state === 'progressing' ? (
                                        <span>
                                            {formatBytes(item.receivedBytes)} of {formatBytes(item.totalBytes)}
                                            {item.paused && ' (Paused)'}
                                        </span>
                                    ) : (
                                        <span>
                                            {item.state === 'completed' ? formatBytes(item.totalBytes) : item.state} • {formatDate(item.startTime)}
                                        </span>
                                    )}
                                </div>
                                {item.state === 'progressing' && (
                                    <div className="progress-bar">
                                        <div
                                            className="progress-fill"
                                            style={{ width: `${(item.receivedBytes / item.totalBytes) * 100}%` }}
                                        ></div>
                                    </div>
                                )}
                            </div>
                            <div className="download-actions">
                                {item.state === 'progressing' && (
                                    <>
                                        {item.paused ? (
                                            <button onClick={() => handleResume(item.id)} title="Resume"><Play size={16} /></button>
                                        ) : (
                                            <button onClick={() => handlePause(item.id)} title="Pause"><Pause size={16} /></button>
                                        )}
                                        <button onClick={() => handleCancel(item.id)} title="Cancel"><X size={16} /></button>
                                    </>
                                )}
                                {item.state === 'completed' && (
                                    <button onClick={() => handleOpenFile(item.id)} title="Show in Folder"><FolderOpen size={16} /></button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
