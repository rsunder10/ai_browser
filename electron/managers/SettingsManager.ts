import { Store } from '../utils/Store';

export interface Settings {
    searchEngine: 'google' | 'duckduckgo' | 'bing';
    theme: 'system' | 'light' | 'dark';
    homePage: string;
    aiModel: string;
    aiSuggestionsEnabled: boolean;
    httpsOnlyMode: boolean;
    autoClearCookieDomains: string[];
}

export class SettingsManager {
    private store: Store<Settings>;

    constructor() {
        this.store = new Store<Settings>({
            configName: 'settings',
            defaults: {
                searchEngine: 'google',
                theme: 'system',
                homePage: 'neuralweb://home',
                aiModel: 'llama3.2:1b',
                aiSuggestionsEnabled: false,
                httpsOnlyMode: false,
                autoClearCookieDomains: []
            }
        });
    }

    getSettings(): Settings {
        return this.store.getAll();
    }

    get<K extends keyof Settings>(key: K): Settings[K] {
        return this.store.get(key) as Settings[K];
    }

    set<K extends keyof Settings>(key: K, value: Settings[K]): void {
        this.store.set(key, value);
    }

    setAll(settings: Settings): void {
        this.store.setAll(settings);
    }
}
