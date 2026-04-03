import { Store } from '../utils/Store';

export interface SearchEngineSetting {
    id: string;
    name: string;
    template: string;
    keyword: string;
    isBuiltIn?: boolean;
}

export interface Settings {
    searchEngine: string;
    searchEngines: SearchEngineSetting[];
    theme: 'system' | 'light' | 'dark';
    accentColor: string;
    themePreset: 'default' | 'ocean' | 'forest' | 'sunset' | 'midnight';
    homePage: string;
    aiModel: string;
    aiSuggestionsEnabled: boolean;
    httpsOnlyMode: boolean;
    autoClearCookieDomains: string[];
}

const DEFAULT_SEARCH_ENGINES: SearchEngineSetting[] = [
    {
        id: 'google',
        name: 'Google',
        template: 'https://www.google.com/search?q=%s',
        keyword: 'g',
        isBuiltIn: true,
    },
    {
        id: 'duckduckgo',
        name: 'DuckDuckGo',
        template: 'https://duckduckgo.com/?q=%s',
        keyword: 'd',
        isBuiltIn: true,
    },
    {
        id: 'bing',
        name: 'Bing',
        template: 'https://www.bing.com/search?q=%s',
        keyword: 'b',
        isBuiltIn: true,
    },
];

export class SettingsManager {
    private store: Store<Settings>;
    private defaults: Settings;

    constructor() {
        this.defaults = {
            searchEngine: 'google',
            searchEngines: DEFAULT_SEARCH_ENGINES,
            theme: 'system',
            accentColor: '#1a73e8',
            themePreset: 'default',
            homePage: 'neuralweb://home',
            aiModel: 'llama3.2:1b',
            aiSuggestionsEnabled: false,
            httpsOnlyMode: false,
            autoClearCookieDomains: [],
        };

        this.store = new Store<Settings>({
            configName: 'settings',
            defaults: this.defaults,
        });

        const normalized = this.normalizeSettings(this.store.getAll());
        this.store.setAll(normalized);
    }

    private normalizeSettings(rawSettings: Partial<Settings> | null | undefined): Settings {
        const providedEngines = Array.isArray(rawSettings?.searchEngines) ? rawSettings.searchEngines : [];
        const mergedSearchEngines = new Map<string, SearchEngineSetting>();

        for (const builtInEngine of DEFAULT_SEARCH_ENGINES) {
            mergedSearchEngines.set(builtInEngine.id, { ...builtInEngine });
        }

        for (const searchEngine of providedEngines) {
            if (!searchEngine || typeof searchEngine !== 'object') continue;

            const fallback = DEFAULT_SEARCH_ENGINES.find((engine) => engine.id === searchEngine.id) || {
                id: searchEngine.id || `engine-${mergedSearchEngines.size + 1}`,
                name: searchEngine.name || 'Custom Search',
                template: searchEngine.template || 'https://www.google.com/search?q=%s',
                keyword: searchEngine.keyword || '',
                isBuiltIn: false,
            };

            const normalizedEngine: SearchEngineSetting = {
                id: (searchEngine.id || fallback.id).trim(),
                name: (searchEngine.name || fallback.name).trim(),
                template: (searchEngine.template || fallback.template).trim(),
                keyword: (searchEngine.keyword || fallback.keyword || '').trim().toLowerCase(),
                isBuiltIn: searchEngine.isBuiltIn ?? fallback.isBuiltIn ?? false,
            };

            if (!normalizedEngine.id || !normalizedEngine.template.includes('%s')) continue;
            mergedSearchEngines.set(normalizedEngine.id, normalizedEngine);
        }

        const normalizedSearchEngines = Array.from(mergedSearchEngines.values());
        const selectedEngine = rawSettings?.searchEngine && mergedSearchEngines.has(rawSettings.searchEngine)
            ? rawSettings.searchEngine
            : this.defaults.searchEngine;

        return {
            ...this.defaults,
            ...rawSettings,
            searchEngine: selectedEngine,
            searchEngines: normalizedSearchEngines,
            autoClearCookieDomains: Array.isArray(rawSettings?.autoClearCookieDomains)
                ? rawSettings.autoClearCookieDomains
                : this.defaults.autoClearCookieDomains,
        };
    }

    getSettings(): Settings {
        return this.normalizeSettings(this.store.getAll());
    }

    get<K extends keyof Settings>(key: K): Settings[K] {
        return this.getSettings()[key];
    }

    set<K extends keyof Settings>(key: K, value: Settings[K]): void {
        const nextSettings = this.normalizeSettings({
            ...this.store.getAll(),
            [key]: value,
        });
        this.store.setAll(nextSettings);
    }

    setAll(settings: Settings): void {
        this.store.setAll(this.normalizeSettings(settings));
    }
}
