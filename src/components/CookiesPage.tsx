import { useState, useEffect } from 'react';
import { Cookie, Trash2, Search, Shield } from 'lucide-react';
import './CookiesPage.css';

interface CookieData {
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    expirationDate?: number;
}

interface DomainGroup {
    domain: string;
    cookies: CookieData[];
}

export default function CookiesPage() {
    const [cookies, setCookies] = useState<CookieData[]>([]);
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [filter, setFilter] = useState('');
    const [autoClearDomains, setAutoClearDomains] = useState<string[]>([]);

    useEffect(() => {
        loadCookies();
        loadSettings();
    }, []);

    const loadCookies = async () => {
        if (window.electron) {
            const data = await window.electron.invoke('cookies:get-all');
            setCookies(data || []);
        }
    };

    const loadSettings = async () => {
        if (window.electron) {
            const settings = await window.electron.invoke('settings:get');
            setAutoClearDomains(settings?.autoClearCookieDomains || []);
        }
    };

    const handleDeleteCookie = async (cookie: CookieData) => {
        if (!window.electron) return;
        const protocol = cookie.secure ? 'https' : 'http';
        const url = `${protocol}://${cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
        await window.electron.invoke('cookies:delete', url, cookie.name);
        loadCookies();
    };

    const handleClearDomain = async (domain: string) => {
        if (!window.electron) return;
        await window.electron.invoke('cookies:clear-domain', domain);
        loadCookies();
    };

    const handleClearAll = async () => {
        if (!window.electron) return;
        await window.electron.invoke('cookies:clear-all');
        setCookies([]);
        setSelectedDomain(null);
    };

    const toggleAutoClear = async (domain: string) => {
        if (!window.electron) return;
        const updated = autoClearDomains.includes(domain)
            ? autoClearDomains.filter(d => d !== domain)
            : [...autoClearDomains, domain];
        setAutoClearDomains(updated);
        await window.electron.invoke('settings:set', 'autoClearCookieDomains', updated);
    };

    // Group cookies by domain
    const domainGroups: DomainGroup[] = [];
    const domainMap = new Map<string, CookieData[]>();
    for (const cookie of cookies) {
        const domain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
        if (!domainMap.has(domain)) domainMap.set(domain, []);
        domainMap.get(domain)!.push(cookie);
    }
    for (const [domain, domainCookies] of domainMap) {
        domainGroups.push({ domain, cookies: domainCookies });
    }
    domainGroups.sort((a, b) => a.domain.localeCompare(b.domain));

    const filteredGroups = filter
        ? domainGroups.filter(g => g.domain.toLowerCase().includes(filter.toLowerCase()))
        : domainGroups;

    const selectedCookies = selectedDomain
        ? domainMap.get(selectedDomain) || []
        : [];

    const formatExpiry = (timestamp?: number) => {
        if (!timestamp) return 'Session';
        return new Date(timestamp * 1000).toLocaleDateString();
    };

    return (
        <div className="cookies-page">
            <div className="cookies-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={24} color="#1a73e8" />
                    <h1>Cookie Manager</h1>
                </div>
                <button className="clear-btn" onClick={handleClearAll}>
                    <Trash2 size={16} />
                    Clear All Cookies
                </button>
            </div>

            <div className="cookies-layout">
                <div className="cookies-sidebar">
                    <div className="cookies-search">
                        <Search size={14} />
                        <input
                            type="text"
                            placeholder="Filter domains..."
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />
                    </div>
                    <div className="domain-list">
                        {filteredGroups.map(group => (
                            <div
                                key={group.domain}
                                className={`domain-item ${selectedDomain === group.domain ? 'active' : ''}`}
                                onClick={() => setSelectedDomain(group.domain)}
                            >
                                <span className="domain-name">{group.domain}</span>
                                <span className="domain-count">{group.cookies.length}</span>
                            </div>
                        ))}
                        {filteredGroups.length === 0 && (
                            <div className="domain-empty">No cookies found</div>
                        )}
                    </div>
                </div>

                <div className="cookies-detail">
                    {selectedDomain ? (
                        <>
                            <div className="cookies-detail-header">
                                <h2>{selectedDomain}</h2>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <label className="auto-clear-toggle" title="Auto-clear cookies for this domain when tabs are closed">
                                        <input
                                            type="checkbox"
                                            checked={autoClearDomains.includes(selectedDomain)}
                                            onChange={() => toggleAutoClear(selectedDomain)}
                                        />
                                        Auto-clear on tab close
                                    </label>
                                    <button
                                        className="clear-domain-btn"
                                        onClick={() => handleClearDomain(selectedDomain)}
                                    >
                                        Clear Domain
                                    </button>
                                </div>
                            </div>
                            <div className="cookies-table">
                                <div className="cookies-table-header">
                                    <span className="cookie-col-name">Name</span>
                                    <span className="cookie-col-value">Value</span>
                                    <span className="cookie-col-path">Path</span>
                                    <span className="cookie-col-flags">Flags</span>
                                    <span className="cookie-col-expires">Expires</span>
                                    <span className="cookie-col-action"></span>
                                </div>
                                {selectedCookies.map((cookie, i) => (
                                    <div key={`${cookie.name}-${i}`} className="cookies-table-row">
                                        <span className="cookie-col-name" title={cookie.name}>{cookie.name}</span>
                                        <span className="cookie-col-value" title={cookie.value}>
                                            {cookie.value.length > 40 ? cookie.value.slice(0, 40) + '...' : cookie.value}
                                        </span>
                                        <span className="cookie-col-path">{cookie.path}</span>
                                        <span className="cookie-col-flags">
                                            {cookie.secure && <span className="cookie-flag">Secure</span>}
                                            {cookie.httpOnly && <span className="cookie-flag">HttpOnly</span>}
                                        </span>
                                        <span className="cookie-col-expires">{formatExpiry(cookie.expirationDate)}</span>
                                        <span className="cookie-col-action">
                                            <button
                                                className="cookie-delete-btn"
                                                onClick={() => handleDeleteCookie(cookie)}
                                                title="Delete cookie"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="cookies-detail-empty">
                            <Cookie size={48} color="#dadce0" />
                            <p>Select a domain to view its cookies</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
