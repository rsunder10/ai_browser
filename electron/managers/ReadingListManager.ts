import { Store } from '../utils/Store';
import { v4 as uuidv4 } from 'uuid';

export interface ReadingListItem {
    id: string;
    url: string;
    title: string;
    excerpt?: string;
    favicon?: string;
    dateAdded: number;
    isRead: boolean;
}

interface ReadingListData {
    items: ReadingListItem[];
}

export class ReadingListManager {
    private store: Store<ReadingListData>;

    constructor() {
        this.store = new Store<ReadingListData>({
            configName: 'reading-list',
            defaults: { items: [] }
        });
    }

    getAll(): ReadingListItem[] {
        return this.store.get('items') || [];
    }

    add(item: Omit<ReadingListItem, 'id' | 'dateAdded' | 'isRead'>): ReadingListItem {
        const items = this.getAll();
        // Don't add duplicates
        if (items.some(i => i.url === item.url)) {
            return items.find(i => i.url === item.url)!;
        }
        const newItem: ReadingListItem = {
            ...item,
            id: uuidv4(),
            dateAdded: Date.now(),
            isRead: false,
        };
        items.unshift(newItem);
        this.store.set('items', items);
        return newItem;
    }

    remove(id: string): boolean {
        const items = this.getAll();
        const index = items.findIndex(i => i.id === id);
        if (index === -1) return false;
        items.splice(index, 1);
        this.store.set('items', items);
        return true;
    }

    toggleRead(id: string): boolean {
        const items = this.getAll();
        const item = items.find(i => i.id === id);
        if (!item) return false;
        item.isRead = !item.isRead;
        this.store.set('items', items);
        return item.isRead;
    }

    isInList(url: string): boolean {
        return this.getAll().some(i => i.url === url);
    }

    flushSync(): void {
        this.store.flushSync();
    }
}
