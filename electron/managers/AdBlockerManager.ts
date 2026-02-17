import { session, BrowserWindow } from 'electron';
import { SettingsManager } from './SettingsManager';

type TrackerCategory = 'ads' | 'analytics' | 'fingerprinting' | 'social';

interface TabTrackerStats {
    total: number;
    byCategory: Record<TrackerCategory, number>;
    blockedDomains: string[];
}

interface SiteTrackerRecord {
    domain: string;
    total: number;
    byCategory: Record<TrackerCategory, number>;
    lastBlocked: number;
}

const CATEGORIZED_PATTERNS: { pattern: string; category: TrackerCategory; domain: string }[] = [
    // Ads
    { pattern: '*://*.doubleclick.net/*', category: 'ads', domain: 'doubleclick.net' },
    { pattern: '*://*.googleadservices.com/*', category: 'ads', domain: 'googleadservices.com' },
    { pattern: '*://*.googlesyndication.com/*', category: 'ads', domain: 'googlesyndication.com' },
    { pattern: '*://*.moatads.com/*', category: 'ads', domain: 'moatads.com' },
    { pattern: '*://*.taboola.com/*', category: 'ads', domain: 'taboola.com' },
    { pattern: '*://*.outbrain.com/*', category: 'ads', domain: 'outbrain.com' },
    { pattern: '*://*.adroll.com/*', category: 'ads', domain: 'adroll.com' },
    { pattern: '*://*.pubmatic.com/*', category: 'ads', domain: 'pubmatic.com' },
    { pattern: '*://*.rubiconproject.com/*', category: 'ads', domain: 'rubiconproject.com' },
    { pattern: '*://*.openx.net/*', category: 'ads', domain: 'openx.net' },
    { pattern: '*://*.adnxs.com/*', category: 'ads', domain: 'adnxs.com' },
    { pattern: '*://*.criteo.com/*', category: 'ads', domain: 'criteo.com' },
    { pattern: '*://*.advertising.com/*', category: 'ads', domain: 'advertising.com' },
    { pattern: '*://*.amazon-adsystem.com/*', category: 'ads', domain: 'amazon-adsystem.com' },
    { pattern: '*://*.adsrvr.org/*', category: 'ads', domain: 'adsrvr.org' },
    { pattern: '*://*.ad-delivery.net/*', category: 'ads', domain: 'ad-delivery.net' },
    { pattern: '*://*.mediavine.com/*', category: 'ads', domain: 'mediavine.com' },
    // Analytics
    { pattern: '*://*.google-analytics.com/*', category: 'analytics', domain: 'google-analytics.com' },
    { pattern: '*://*.hotjar.com/*', category: 'analytics', domain: 'hotjar.com' },
    { pattern: '*://*.mixpanel.com/*', category: 'analytics', domain: 'mixpanel.com' },
    { pattern: '*://*.segment.com/*', category: 'analytics', domain: 'segment.com' },
    { pattern: '*://*.amplitude.com/*', category: 'analytics', domain: 'amplitude.com' },
    { pattern: '*://*.fullstory.com/*', category: 'analytics', domain: 'fullstory.com' },
    { pattern: '*://*.newrelic.com/*', category: 'analytics', domain: 'newrelic.com' },
    { pattern: '*://*.googletagmanager.com/*', category: 'analytics', domain: 'googletagmanager.com' },
    // Fingerprinting
    { pattern: '*://*.fingerprintjs.com/*', category: 'fingerprinting', domain: 'fingerprintjs.com' },
    { pattern: '*://*.iovation.com/*', category: 'fingerprinting', domain: 'iovation.com' },
    { pattern: '*://*.threatmetrix.com/*', category: 'fingerprinting', domain: 'threatmetrix.com' },
    // Social
    { pattern: '*://*.facebook.com/tr/*', category: 'social', domain: 'facebook.com' },
    { pattern: '*://*.facebook.net/signals/*', category: 'social', domain: 'facebook.net' },
    { pattern: '*://*.connect.facebook.net/*', category: 'social', domain: 'facebook.net' },
    { pattern: '*://*.platform.twitter.com/widgets*', category: 'social', domain: 'twitter.com' },
    { pattern: '*://*.linkedin.com/px/*', category: 'social', domain: 'linkedin.com' },
];

function emptyStats(): TabTrackerStats {
    return { total: 0, byCategory: { ads: 0, analytics: 0, fingerprinting: 0, social: 0 }, blockedDomains: [] };
}

export class AdBlockerManager {
    private isEnabled: boolean = false;
    private tabStats: Map<string, TabTrackerStats> = new Map();
    private siteStats: Map<string, SiteTrackerRecord> = new Map();
    private tabIdResolver?: (webContentsId: number) => string | null;
    private mainWindow: BrowserWindow | null = null;
    private settingsManager?: SettingsManager;

    // Build a lookup from domain fragment to category
    private domainCategoryMap: Map<string, TrackerCategory>;

    constructor() {
        this.domainCategoryMap = new Map();
        for (const entry of CATEGORIZED_PATTERNS) {
            this.domainCategoryMap.set(entry.domain, entry.category);
        }
    }

    setSettingsManager(sm: SettingsManager) {
        this.settingsManager = sm;
    }

    setTabIdResolver(resolver: (webContentsId: number) => string | null) {
        this.tabIdResolver = resolver;
    }

    setMainWindow(win: BrowserWindow) {
        this.mainWindow = win;
    }

    enable() {
        this.isEnabled = true;
        this.applyFilter();
    }

    disable() {
        this.isEnabled = false;
        if (session.defaultSession) {
            session.defaultSession.webRequest.onBeforeRequest(null);
        }
    }

    toggle(): boolean {
        if (this.isEnabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.isEnabled;
    }

    getStatus(): boolean {
        return this.isEnabled;
    }

    getTabStats(tabId: string): TabTrackerStats {
        return this.tabStats.get(tabId) || emptyStats();
    }

    getAllSiteStats(): SiteTrackerRecord[] {
        return Array.from(this.siteStats.values()).sort((a, b) => b.total - a.total);
    }

    clearTabStats(tabId: string) {
        this.tabStats.delete(tabId);
    }

    clearAllStats() {
        this.siteStats.clear();
        this.tabStats.clear();
    }

    private categorizeUrl(url: string): TrackerCategory | null {
        try {
            const hostname = new URL(url).hostname;
            for (const [domain, category] of this.domainCategoryMap) {
                if (hostname.endsWith(domain)) {
                    return category;
                }
            }
        } catch {}
        return null;
    }

    private recordBlock(tabId: string | null, blockedUrl: string, category: TrackerCategory) {
        let blockedDomain: string;
        try {
            blockedDomain = new URL(blockedUrl).hostname;
        } catch {
            blockedDomain = 'unknown';
        }

        // Update tab stats
        if (tabId) {
            let stats = this.tabStats.get(tabId);
            if (!stats) {
                stats = emptyStats();
                this.tabStats.set(tabId, stats);
            }
            stats.total++;
            stats.byCategory[category]++;
            if (!stats.blockedDomains.includes(blockedDomain)) {
                stats.blockedDomains.push(blockedDomain);
            }
        }

        // Update site stats
        let siteRecord = this.siteStats.get(blockedDomain);
        if (!siteRecord) {
            siteRecord = {
                domain: blockedDomain,
                total: 0,
                byCategory: { ads: 0, analytics: 0, fingerprinting: 0, social: 0 },
                lastBlocked: Date.now(),
            };
            this.siteStats.set(blockedDomain, siteRecord);
        }
        siteRecord.total++;
        siteRecord.byCategory[category]++;
        siteRecord.lastBlocked = Date.now();

        // Push event to renderer
        if (tabId && this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('privacy:tab-stats-updated', {
                tabId,
                stats: this.tabStats.get(tabId),
            });
        }
    }

    private applyFilter() {
        if (!this.isEnabled) return;

        const urls = CATEGORIZED_PATTERNS.map(p => p.pattern);

        session.defaultSession.webRequest.onBeforeRequest({ urls }, (details, callback) => {
            const category = this.categorizeUrl(details.url);
            if (category) {
                const wcId = (details as any).webContentsId as number | undefined;
                const tabId = this.tabIdResolver && wcId != null ? this.tabIdResolver(wcId) : null;
                this.recordBlock(tabId, details.url, category);
            }
            callback({ cancel: true });
        });
    }
}
