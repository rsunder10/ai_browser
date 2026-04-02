import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BookmarksManager, type BookmarkNode } from '../../electron/managers/BookmarksManager';
import { cleanupTempUserDataDir, createTempUserDataDir } from './helpers';

describe('BookmarksManager', () => {
    let userDataDir: string;

    beforeEach(() => {
        userDataDir = createTempUserDataDir();
    });

    afterEach(() => {
        cleanupTempUserDataDir(userDataDir);
    });

    it('adds and removes bookmarks from the default bar', () => {
        const manager = new BookmarksManager();

        const bookmark = manager.addBookmark({
            title: 'Example',
            url: 'https://example.com',
        });

        expect(manager.isBookmarked('https://example.com')).toBe(true);
        expect(manager.getBookmarkByUrl('https://example.com')?.id).toBe(bookmark.id);

        expect(manager.removeBookmark(bookmark.id)).toBe(true);
        expect(manager.getBookmarkByUrl('https://example.com')).toBeNull();
    });

    it('throws when adding to an unknown folder', () => {
        const manager = new BookmarksManager();

        expect(() => manager.addBookmark({
            title: 'Broken',
            url: 'https://broken.example',
        }, 'missing-folder')).toThrow('Parent folder with id missing-folder not found');
    });

    it('merges new URLs while preserving existing ones', () => {
        const manager = new BookmarksManager();
        manager.addBookmark({
            title: 'Existing',
            url: 'https://example.com',
        });

        const importedTree: BookmarkNode[] = [
            {
                id: 'bookmark_bar',
                title: 'Bookmarks Bar',
                dateAdded: Date.now(),
                children: [
                    {
                        id: 'duplicate',
                        title: 'Existing Again',
                        url: 'https://example.com',
                        dateAdded: Date.now(),
                    },
                    {
                        id: 'fresh',
                        title: 'Fresh',
                        url: 'https://openai.com',
                        dateAdded: Date.now(),
                    },
                ],
            },
            {
                id: 'other',
                title: 'Other Bookmarks',
                dateAdded: Date.now(),
                children: [],
            },
        ];

        const added = manager.mergeBookmarks(importedTree);

        expect(added).toBe(1);
        expect(manager.isBookmarked('https://example.com')).toBe(true);
        expect(manager.isBookmarked('https://openai.com')).toBe(true);
    });
});
