import { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';
import './PermissionPrompt.css';

interface PermissionRequest {
    requestId: string;
    origin: string;
    permission: string;
}

const PERMISSION_LABELS: Record<string, string> = {
    media: 'Camera and Microphone',
    geolocation: 'Location',
    notifications: 'Notifications',
    midi: 'MIDI Devices',
    pointerLock: 'Pointer Lock',
    fullscreen: 'Fullscreen',
    openExternal: 'Open External Links',
    clipboard: 'Clipboard',
    idle: 'Idle Detection',
    display: 'Screen Capture',
};

export default function PermissionPrompt() {
    const [queue, setQueue] = useState<PermissionRequest[]>([]);
    const [remember, setRemember] = useState(false);

    useEffect(() => {
        if (!window.electron) return;

        const handleRequest = (data: PermissionRequest) => {
            setQueue(prev => [...prev, data]);
        };

        window.electron.on('permission:request', handleRequest);
        return () => {
            window.electron.removeListener('permission:request', handleRequest);
        };
    }, []);

    const handleRespond = (allowed: boolean) => {
        const current = queue[0];
        if (!current) return;

        window.electron.invoke('permission:respond', {
            requestId: current.requestId,
            allowed,
            remember,
        });

        setQueue(prev => prev.slice(1));
        setRemember(false);
    };

    if (queue.length === 0) return null;

    const current = queue[0];
    const label = PERMISSION_LABELS[current.permission] || current.permission;

    return (
        <div className="permission-prompt">
            <div className="permission-prompt-icon">
                <Shield size={16} />
            </div>
            <div className="permission-prompt-content">
                <span className="permission-prompt-origin">{current.origin}</span>
                {' wants to use your '}
                <span className="permission-prompt-label">{label}</span>
            </div>
            <label className="permission-prompt-remember">
                <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                />
                Remember
            </label>
            <div className="permission-prompt-actions">
                <button
                    className="permission-btn permission-btn-block"
                    onClick={() => handleRespond(false)}
                >
                    Block
                </button>
                <button
                    className="permission-btn permission-btn-allow"
                    onClick={() => handleRespond(true)}
                >
                    Allow
                </button>
            </div>
        </div>
    );
}
