
// Mock Store and dependencies
class Store<T> {
    private data: any;
    constructor(opts: any) {
        this.data = opts.defaults;
    }
    get(key: string) { return this.data[key]; }
    set(key: string, val: any) { this.data[key] = val; }
    getAll() { return this.data; }
    setAll(data: any) { this.data = data; }
}

const uuidv4 = () => 'test-uuid-' + Math.random();

interface BookmarkNode {
    id: string;
    parentId?: string;
    title: string;
    url?: string;
    children?: BookmarkNode[];
    dateAdded: number;
}

// Copied and adapted BookmarksManager logic
class BookmarksManager {
    private store: Store<any>;

    constructor() {
        this.store = new Store<any>({
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

    addBookmark(bookmark: any, parentId: string = 'bookmark_bar'): BookmarkNode {
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
}

// Test execution
async function runTests() {
    console.log('Starting Logic Verification...');
    const manager = new BookmarksManager();
    const url = 'https://example.com';
    const title = 'Example Domain';

    // Test 1: Add
    const added = manager.addBookmark({ title, url });
    console.log('Added:', added.id);

    // Test 2: Get by URL
    const retrieved = manager.getBookmarkByUrl(url);
    if (retrieved && retrieved.id === added.id) {
        console.log('PASS: Get by URL works');
    } else {
        console.error('FAIL: Get by URL failed');
        process.exit(1);
    }

    // Test 3: Remove
    const removed = manager.removeBookmark(added.id);
    if (removed) {
        console.log('PASS: Remove works');
    } else {
        console.error('FAIL: Remove failed');
        process.exit(1);
    }

    // Test 4: Verify gone
    const check = manager.getBookmarkByUrl(url);
    if (!check) {
        console.log('PASS: Verify gone works');
    } else {
        console.error('FAIL: Still exists');
        process.exit(1);
    }
}

runTests();
