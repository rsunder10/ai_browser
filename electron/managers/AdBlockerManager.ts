import { session, WebContents } from 'electron';

export class AdBlockerManager {
    private isEnabled: boolean = false;
    private blockedDomains: string[] = [
        '*://*.doubleclick.net/*',
        '*://*.googleadservices.com/*',
        '*://*.googlesyndication.com/*',
        '*://*.moatads.com/*',
        '*://*.taboola.com/*',
        '*://*.outbrain.com/*',
        '*://*.adroll.com/*',
        '*://*.pubmatic.com/*',
        '*://*.rubiconproject.com/*',
        '*://*.openx.net/*',
        '*://*.adnxs.com/*',
        '*://*.criteo.com/*',
        '*://*.advertising.com/*',
        '*://*.amazon-adsystem.com/*',
        '*://*.facebook.com/tr/*',
        '*://*.google-analytics.com/*',
        '*://*.hotjar.com/*',
    ];

    constructor() {
        this.isEnabled = false;
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

    private applyFilter() {
        if (!this.isEnabled) return;

        const filter = {
            urls: this.blockedDomains
        };

        session.defaultSession.webRequest.onBeforeRequest(filter, (details, callback) => {
            // console.log('Blocked:', details.url);
            callback({ cancel: true });
        });
    }
}
