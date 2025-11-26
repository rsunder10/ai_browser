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
            return newBookmark;
        }

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
        const data = this.store.getAll();
        return this.checkUrlInNode(data.roots.bookmark_bar, url) ||
            this.checkUrlInNode(data.roots.other, url);
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

    private checkUrlInNode(node: BookmarkNode, url: string): boolean {
        if (node.url === url) return true;

        if (node.children) {
            for (const child of node.children) {
                if (this.checkUrlInNode(child, url)) {
                    return true;
                }
            }
        }
        return false;
    }
}
