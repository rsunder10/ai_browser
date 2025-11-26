import { app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

export interface SitePermission {
    origin: string;
    permission: string; // 'media', 'geolocation', 'notifications', etc.
    status: 'allow' | 'deny' | 'prompt';
}

export class PermissionsManager {
    private permissionsPath: string;
    private permissions: SitePermission[] = [];

    constructor() {
        this.permissionsPath = path.join(app.getPath('userData'), 'permissions.json');
        this.loadPermissions();
    }

    private loadPermissions() {
        try {
            if (fs.existsSync(this.permissionsPath)) {
                const data = fs.readFileSync(this.permissionsPath, 'utf-8');
                this.permissions = JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load permissions:', error);
            this.permissions = [];
        }
    }

    private savePermissions() {
        try {
            fs.writeFileSync(this.permissionsPath, JSON.stringify(this.permissions, null, 2));
        } catch (error) {
            console.error('Failed to save permissions:', error);
        }
    }

    setPermission(origin: string, permission: string, status: 'allow' | 'deny' | 'prompt') {
        const index = this.permissions.findIndex(p => p.origin === origin && p.permission === permission);
        if (index >= 0) {
            this.permissions[index].status = status;
        } else {
            this.permissions.push({ origin, permission, status });
        }
        this.savePermissions();
    }

    getPermission(origin: string, permission: string): 'allow' | 'deny' | 'prompt' {
        const perm = this.permissions.find(p => p.origin === origin && p.permission === permission);
        return perm ? perm.status : 'prompt';
    }

    getAllPermissions(): SitePermission[] {
        return this.permissions;
    }

    clearPermissions() {
        this.permissions = [];
        this.savePermissions();
    }

    clearPermissionsForOrigin(origin: string) {
        this.permissions = this.permissions.filter(p => p.origin !== origin);
        this.savePermissions();
    }
}
