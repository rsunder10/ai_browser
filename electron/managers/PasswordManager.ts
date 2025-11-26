import { app, safeStorage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';

export interface SavedPassword {
    id: string;
    url: string;
    username: string;
    passwordEncrypted: string; // Base64 encoded encrypted buffer
    createdAt: number;
    lastUsed: number;
}

export class PasswordManager {
    private passwordsPath: string;
    private passwords: SavedPassword[] = [];

    constructor() {
        this.passwordsPath = path.join(app.getPath('userData'), 'passwords.json');
        this.loadPasswords();
    }

    private loadPasswords() {
        try {
            if (fs.existsSync(this.passwordsPath)) {
                const data = fs.readFileSync(this.passwordsPath, 'utf-8');
                this.passwords = JSON.parse(data);
            }
        } catch (error) {
            console.error('Failed to load passwords:', error);
            this.passwords = [];
        }
    }

    private savePasswords() {
        try {
            fs.writeFileSync(this.passwordsPath, JSON.stringify(this.passwords, null, 2));
        } catch (error) {
            console.error('Failed to save passwords:', error);
        }
    }

    async savePassword(url: string, username: string, passwordPlain: string): Promise<boolean> {
        if (!safeStorage.isEncryptionAvailable()) {
            console.error('Encryption is not available');
            return false;
        }

        try {
            const encrypted = safeStorage.encryptString(passwordPlain);
            const passwordEncrypted = encrypted.toString('base64');

            // Check if exists
            const existingIndex = this.passwords.findIndex(p => p.url === url && p.username === username);

            if (existingIndex >= 0) {
                this.passwords[existingIndex].passwordEncrypted = passwordEncrypted;
                this.passwords[existingIndex].lastUsed = Date.now();
            } else {
                this.passwords.push({
                    id: crypto.randomUUID(),
                    url,
                    username,
                    passwordEncrypted,
                    createdAt: Date.now(),
                    lastUsed: Date.now()
                });
            }

            this.savePasswords();
            return true;
        } catch (error) {
            console.error('Failed to encrypt password:', error);
            return false;
        }
    }

    async getCredentials(url: string): Promise<Array<{ username: string; password: string }>> {
        if (!safeStorage.isEncryptionAvailable()) {
            return [];
        }

        return this.passwords
            .filter(p => url.includes(new URL(p.url).hostname)) // Simple domain matching
            .map(p => {
                try {
                    const buffer = Buffer.from(p.passwordEncrypted, 'base64');
                    const password = safeStorage.decryptString(buffer);
                    return { username: p.username, password };
                } catch (error) {
                    console.error('Failed to decrypt password:', error);
                    return null;
                }
            })
            .filter((c): c is { username: string; password: string } => c !== null);
    }
}
