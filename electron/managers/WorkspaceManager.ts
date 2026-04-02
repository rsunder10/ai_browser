import { Store } from '../utils/Store';
import { v4 as uuidv4 } from 'uuid';

export interface WorkspaceTab {
    url: string;
    title: string;
    groupId?: string;
}

export interface WorkspaceGroup {
    id: string;
    name: string;
    color: string;
}

export interface Workspace {
    id: string;
    name: string;
    icon: string;
    tabs: WorkspaceTab[];
    groups: WorkspaceGroup[];
    createdAt: number;
    updatedAt: number;
}

interface WorkspaceData {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
}

export class WorkspaceManager {
    private store: Store<WorkspaceData>;

    constructor() {
        this.store = new Store<WorkspaceData>({
            configName: 'workspaces',
            defaults: { workspaces: [], activeWorkspaceId: null }
        });
    }

    getAll(): Workspace[] {
        return this.store.getAll().workspaces || [];
    }

    getActiveId(): string | null {
        return this.store.getAll().activeWorkspaceId;
    }

    setActiveId(id: string | null): void {
        this.store.set('activeWorkspaceId', id);
    }

    get(id: string): Workspace | null {
        return this.getAll().find(w => w.id === id) || null;
    }

    save(name: string, icon: string, tabs: WorkspaceTab[], groups: WorkspaceGroup[]): Workspace {
        const workspaces = this.getAll();
        const workspace: Workspace = {
            id: uuidv4(),
            name,
            icon,
            tabs,
            groups,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };
        workspaces.push(workspace);
        this.store.set('workspaces', workspaces);
        return workspace;
    }

    update(id: string, tabs: WorkspaceTab[], groups: WorkspaceGroup[]): boolean {
        const workspaces = this.getAll();
        const workspace = workspaces.find(w => w.id === id);
        if (!workspace) return false;
        workspace.tabs = tabs;
        workspace.groups = groups;
        workspace.updatedAt = Date.now();
        this.store.set('workspaces', workspaces);
        return true;
    }

    rename(id: string, name: string, icon: string): boolean {
        const workspaces = this.getAll();
        const workspace = workspaces.find(w => w.id === id);
        if (!workspace) return false;
        workspace.name = name;
        workspace.icon = icon;
        workspace.updatedAt = Date.now();
        this.store.set('workspaces', workspaces);
        return true;
    }

    remove(id: string): boolean {
        const workspaces = this.getAll();
        const index = workspaces.findIndex(w => w.id === id);
        if (index === -1) return false;
        workspaces.splice(index, 1);
        this.store.set('workspaces', workspaces);
        if (this.getActiveId() === id) {
            this.setActiveId(null);
        }
        return true;
    }

    flushSync(): void {
        this.store.flushSync();
    }
}
