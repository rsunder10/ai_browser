import { describe, expect, it } from 'vitest';
import {
    normalizeSearchSettings,
    resolveSearchUrl,
} from '../../src/lib/searchEngines';

describe('search engine helpers', () => {
    it('merges built-in engines with custom engines', () => {
        const settings = normalizeSearchSettings({
            searchEngine: 'custom-wikipedia',
            searchEngines: [
                {
                    id: 'custom-wikipedia',
                    name: 'Wikipedia',
                    template: 'https://en.wikipedia.org/w/index.php?search=%s',
                    keyword: 'w',
                },
            ],
        });

        expect(settings.searchEngine).toBe('custom-wikipedia');
        expect(settings.searchEngines.some((engine) => engine.id === 'google')).toBe(true);
        expect(settings.searchEngines.some((engine) => engine.id === 'custom-wikipedia')).toBe(true);
    });

    it('uses keyword shortcuts when present', () => {
        const url = resolveSearchUrl('w neural browser', {
            searchEngine: 'google',
            searchEngines: [
                {
                    id: 'custom-wikipedia',
                    name: 'Wikipedia',
                    template: 'https://en.wikipedia.org/w/index.php?search=%s',
                    keyword: 'w',
                },
            ],
        });

        expect(url).toBe('https://en.wikipedia.org/w/index.php?search=neural%20browser');
    });

    it('falls back to the selected default search engine', () => {
        const url = resolveSearchUrl('privacy browser', {
            searchEngine: 'duckduckgo',
            searchEngines: [
                {
                    id: 'duckduckgo',
                    name: 'DuckDuckGo',
                    template: 'https://duckduckgo.com/?q=%s',
                    keyword: 'd',
                    isBuiltIn: true,
                },
            ],
        });

        expect(url).toBe('https://duckduckgo.com/?q=privacy%20browser');
    });
});
