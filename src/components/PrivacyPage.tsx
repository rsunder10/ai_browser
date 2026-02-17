import { useState, useEffect } from 'react';
import { Shield, Trash2, Search } from 'lucide-react';
import './PrivacyPage.css';

interface SiteRecord {
    domain: string;
    total: number;
    byCategory: { ads: number; analytics: number; fingerprinting: number; social: number };
    lastBlocked: number;
}

const CATEGORY_COLORS: Record<string, string> = {
    ads: '#e74c3c',
    analytics: '#3498db',
    fingerprinting: '#9b59b6',
    social: '#e67e22',
};

const CATEGORY_LABELS: Record<string, string> = {
    ads: 'Ads',
    analytics: 'Analytics',
    fingerprinting: 'Fingerprinting',
    social: 'Social',
};

export default function PrivacyPage() {
    const [stats, setStats] = useState<SiteRecord[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        if (window.electron) {
            const data = await window.electron.invoke('adblocker:get-all-stats');
            setStats(data || []);
        }
    };

    const handleClearAll = async () => {
        if (window.electron) {
            await window.electron.invoke('adblocker:clear-stats');
            setStats([]);
        }
    };

    const filtered = filter
        ? stats.filter(s => s.domain.toLowerCase().includes(filter.toLowerCase()))
        : stats;

    const totalBlocked = stats.reduce((sum, s) => sum + s.total, 0);
    const totalByCategory = stats.reduce(
        (acc, s) => {
            acc.ads += s.byCategory.ads;
            acc.analytics += s.byCategory.analytics;
            acc.fingerprinting += s.byCategory.fingerprinting;
            acc.social += s.byCategory.social;
            return acc;
        },
        { ads: 0, analytics: 0, fingerprinting: 0, social: 0 }
    );

    return (
        <div className="privacy-page">
            <div className="privacy-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Shield size={24} color="#1a73e8" />
                    <h1>Tracker Dashboard</h1>
                </div>
                <button className="clear-btn" onClick={handleClearAll}>
                    <Trash2 size={16} />
                    Clear All
                </button>
            </div>

            <div className="privacy-summary">
                <div className="summary-card">
                    <div className="summary-number">{totalBlocked}</div>
                    <div className="summary-label">Total Blocked</div>
                </div>
                {(Object.keys(CATEGORY_LABELS) as string[]).map(cat => (
                    <div className="summary-card" key={cat}>
                        <div className="summary-number" style={{ color: CATEGORY_COLORS[cat] }}>
                            {totalByCategory[cat as keyof typeof totalByCategory]}
                        </div>
                        <div className="summary-label">{CATEGORY_LABELS[cat]}</div>
                    </div>
                ))}
            </div>

            <div className="privacy-search">
                <Search size={16} />
                <input
                    type="text"
                    placeholder="Filter by domain..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
            </div>

            {filtered.length === 0 ? (
                <div className="privacy-empty">
                    <Shield size={48} color="#dadce0" />
                    <p>No trackers blocked yet. Enable the ad blocker and browse some sites.</p>
                </div>
            ) : (
                <div className="privacy-table">
                    <div className="privacy-table-header">
                        <span className="col-domain">Domain</span>
                        <span className="col-total">Total</span>
                        <span className="col-breakdown">Breakdown</span>
                    </div>
                    {filtered.map(record => {
                        const maxCat = Math.max(record.byCategory.ads, record.byCategory.analytics, record.byCategory.fingerprinting, record.byCategory.social, 1);
                        return (
                            <div key={record.domain} className="privacy-table-row">
                                <span className="col-domain">{record.domain}</span>
                                <span className="col-total">{record.total}</span>
                                <div className="col-breakdown">
                                    <div className="category-bars">
                                        {(Object.keys(CATEGORY_LABELS) as string[]).map(cat => {
                                            const value = record.byCategory[cat as keyof typeof record.byCategory];
                                            if (value === 0) return null;
                                            return (
                                                <div key={cat} className="cat-bar-wrapper" title={`${CATEGORY_LABELS[cat]}: ${value}`}>
                                                    <div
                                                        className="cat-bar"
                                                        style={{
                                                            width: `${(value / maxCat) * 100}%`,
                                                            background: CATEGORY_COLORS[cat],
                                                        }}
                                                    />
                                                    <span className="cat-bar-label">{value}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
