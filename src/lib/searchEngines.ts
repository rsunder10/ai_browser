export interface SearchEngineDefinition {
    id: string;
    name: string;
    template: string;
    keyword: string;
    isBuiltIn?: boolean;
}

export interface SearchSettings {
    searchEngine: string;
    searchEngines: SearchEngineDefinition[];
}

const BUILT_IN_SEARCH_ENGINES: SearchEngineDefinition[] = [
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

function sanitizeKeyword(keyword: string | undefined): string {
    return (keyword || '').trim().toLowerCase();
}

function sanitizeEngine(engine: SearchEngineDefinition, fallback: SearchEngineDefinition): SearchEngineDefinition {
    return {
        id: (engine.id || fallback.id).trim(),
        name: (engine.name || fallback.name).trim(),
        template: (engine.template || fallback.template).trim(),
        keyword: sanitizeKeyword(engine.keyword || fallback.keyword),
        isBuiltIn: engine.isBuiltIn ?? fallback.isBuiltIn ?? false,
    };
}

export function normalizeSearchSettings(rawSettings: Partial<SearchSettings> | null | undefined): SearchSettings {
    const providedEngines = Array.isArray(rawSettings?.searchEngines) ? rawSettings.searchEngines : [];
    const mergedEngines = new Map<string, SearchEngineDefinition>();

    for (const builtIn of BUILT_IN_SEARCH_ENGINES) {
        mergedEngines.set(builtIn.id, builtIn);
    }

    for (const providedEngine of providedEngines) {
        if (!providedEngine || typeof providedEngine !== 'object') continue;

        const fallback = BUILT_IN_SEARCH_ENGINES.find((engine) => engine.id === providedEngine.id)
            || {
                id: providedEngine.id || `engine-${mergedEngines.size + 1}`,
                name: providedEngine.name || 'Custom Search',
                template: providedEngine.template || 'https://www.google.com/search?q=%s',
                keyword: providedEngine.keyword || '',
                isBuiltIn: false,
            };

        const sanitized = sanitizeEngine(providedEngine, fallback);
        if (!sanitized.id || !sanitized.template.includes('%s')) continue;
        mergedEngines.set(sanitized.id, sanitized);
    }

    const searchEngines = Array.from(mergedEngines.values());
    const selectedId = rawSettings?.searchEngine && mergedEngines.has(rawSettings.searchEngine)
        ? rawSettings.searchEngine
        : BUILT_IN_SEARCH_ENGINES[0].id;

    return {
        searchEngine: selectedId,
        searchEngines,
    };
}

export function getSearchEngineById(settings: SearchSettings, engineId: string): SearchEngineDefinition {
    return settings.searchEngines.find((engine) => engine.id === engineId)
        || settings.searchEngines[0]
        || BUILT_IN_SEARCH_ENGINES[0];
}

export function buildSearchUrl(engine: SearchEngineDefinition, query: string): string {
    return engine.template.replace('%s', encodeURIComponent(query));
}

export function resolveSearchUrl(query: string, settings: Partial<SearchSettings> | null | undefined): string {
    const normalized = normalizeSearchSettings(settings);
    const trimmedQuery = query.trim();
    const keywordMatch = trimmedQuery.match(/^(\S+)\s+(.+)$/);

    if (keywordMatch) {
        const keyword = sanitizeKeyword(keywordMatch[1]);
        const engine = normalized.searchEngines.find((entry) => sanitizeKeyword(entry.keyword) === keyword);
        if (engine) {
            return buildSearchUrl(engine, keywordMatch[2]);
        }
    }

    return buildSearchUrl(getSearchEngineById(normalized, normalized.searchEngine), trimmedQuery);
}

export function createCustomSearchEngineId(name: string): string {
    const normalizedName = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    return `custom-${normalizedName || 'engine'}-${Date.now()}`;
}
