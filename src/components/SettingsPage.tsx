import { useState, useEffect } from 'react';
import { Settings, Search, Monitor, Home } from 'lucide-react';

interface SettingsData {
    searchEngine: 'google' | 'duckduckgo' | 'bing';
    theme: 'system' | 'light' | 'dark';
    homePage: string;
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsData>({
        searchEngine: 'google',
        theme: 'system',
        homePage: 'neuralweb://home'
    });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        if (window.electron) {
            const data = await window.electron.invoke('settings:get');
            if (data) setSettings(data);
        }
    };

    const updateSetting = async (key: keyof SettingsData, value: any) => {
        if (window.electron) {
            await window.electron.invoke('settings:set', key, value);
            setSettings(prev => ({ ...prev, [key]: value }));
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
                </section>
            </div>
        </div>
    );
}
