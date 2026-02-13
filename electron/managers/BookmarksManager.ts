import { Store } from '../utils/Store';
import { v4 as uuidv4 } from 'uuid';

export interface BookmarkNode {
    id: string;
    parentId?: string;
    title: string;
    url?: string; // If missing, it's a folder
    children?: BookmarkNode[];
    dateAdded: number;
    favicon?: string;
}

interface BookmarksData {
    roots: {
        bookmark_bar: BookmarkNode;
        other: BookmarkNode;
    };
}

export class BookmarksManager {
    private store: Store<BookmarksData>;

    constructor() {
        this.store = new Store<BookmarksData>({
            configName: 'bookmarks',
            defaults: {
                roots: {
                    bookmark_bar: {
                        id: 'bookmark_bar',
                        title: 'Bookmarks Bar',
                        children: [],
                        dateAdded: Date.now()
                    },
                    other: {
                        id: 'other',
                        title: 'Other Bookmarks',
                        children: [],
                        dateAdded: Date.now()
                    }
                }
            }
        });
    }

    getTree(): BookmarkNode[] {
        const data = this.store.getAll();
        return [data.roots.bookmark_bar, data.roots.other];
    }

    addBookmark(bookmark: Omit<BookmarkNode, 'id' | 'dateAdded' | 'children'>, parentId: string = 'bookmark_bar'): BookmarkNode {
        console.log('[BookmarksManager] Adding bookmark:', bookmark);
        const data = this.store.getAll();
        const newBookmark: BookmarkNode = {
            ...bookmark,
            id: uuidv4(),
            dateAdded: Date.now(),
            children: bookmark.url ? undefined : []
        };

        const added = this.addToNode(data.roots.bookmark_bar, parentId, newBookmark) ||
            this.addToNode(data.roots.other, parentId, newBookmark);

        if (added) {
            this.store.setAll(data);
            console.log('[BookmarksManager] Bookmark added:', newBookmark);
            return newBookmark;
        }

        console.error(`[BookmarksManager] Parent folder with id ${parentId} not found`);
        throw new Error(`Parent folder with id ${parentId} not found`);
    }

    removeBookmark(id: string): boolean {
        const data = this.store.getAll();
        const removed = this.removeFromNode(data.roots.bookmark_bar, id) ||
            this.removeFromNode(data.roots.other, id);

        if (removed) {
            this.store.setAll(data);
            return true;
        }
        return false;
    }

    isBookmarked(url: string): boolean {
        return !!this.getBookmarkByUrl(url);
    }

    getBookmarkByUrl(url: string): BookmarkNode | null {
        const data = this.store.getAll();
        return this.findBookmarkByUrl(data.roots.bookmark_bar, url) ||
            this.findBookmarkByUrl(data.roots.other, url);
    }

    private addToNode(node: BookmarkNode, parentId: string, newBookmark: BookmarkNode): boolean {
        if (node.id === parentId) {
            if (!node.children) node.children = [];
            node.children.push(newBookmark);
            return true;
        }

        if (node.children) {
            for (const child of node.children) {
                if (this.addToNode(child, parentId, newBookmark)) {
                    return true;
                }
            }
        }
        return false;
    }

    private removeFromNode(node: BookmarkNode, id: string): boolean {
        if (!node.children) return false;

        const index = node.children.findIndex(child => child.id === id);
        if (index !== -1) {
            node.children.splice(index, 1);
            return true;
        }

        for (const child of node.children) {
            if (this.removeFromNode(child, id)) {
                return true;
            }
        }
        return false;
    }

    private findBookmarkByUrl(node: BookmarkNode, url: string): BookmarkNode | null {
        if (node.url === url) return node;

        if (node.children) {
            for (const child of node.children) {
                const found = this.findBookmarkByUrl(child, url);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    private collectUrls(node: BookmarkNode): Set<string> {
        const urls = new Set<string>();
        if (node.url) urls.add(node.url);
        if (node.children) {
            for (const child of node.children) {
                for (const url of this.collectUrls(child)) {
                    urls.add(url);
                }
            }
        }
        return urls;
    }

    mergeBookmarks(importedTree: BookmarkNode[]): number {
        const data = this.store.getAll();
        const existingUrls = new Set<string>();
        for (const url of this.collectUrls(data.roots.bookmark_bar)) existingUrls.add(url);
        for (const url of this.collectUrls(data.roots.other)) existingUrls.add(url);

        let added = 0;
        const addNewBookmarks = (sourceNode: BookmarkNode, targetNode: BookmarkNode) => {
            if (!sourceNode.children) return;
            if (!targetNode.children) targetNode.children = [];
            for (const child of sourceNode.children) {
                if (child.url) {
                    if (!existingUrls.has(child.url)) {
                        targetNode.children.push({ ...child, id: uuidv4() });
                        existingUrls.add(child.url);
                        added++;
                    }
                } else if (child.children) {
                    // It's a folder - find or create matching folder
                    let targetFolder = targetNode.children.find(c => !c.url && c.title === child.title);
                    if (!targetFolder) {
                        targetFolder = { ...child, id: uuidv4(), children: [] };
                        targetNode.children.push(targetFolder);
                    }
                    addNewBookmarks(child, targetFolder);
                }
            }
        };

        if (importedTree[0]) addNewBookmarks(importedTree[0], data.roots.bookmark_bar);
        if (importedTree[1]) addNewBookmarks(importedTree[1], data.roots.other);

        this.store.setAll(data);
        return added;
    }

    setTree(tree: BookmarkNode[]): void {
        const data = this.store.getAll();
        if (tree[0]) data.roots.bookmark_bar = tree[0];
        if (tree[1]) data.roots.other = tree[1];
        this.store.setAll(data);
    }

    flushSync(): void {
        this.store.flushSync();
    }
}
