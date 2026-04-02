import { vi } from 'vitest';

vi.mock('electron', () => ({
    app: {
        getPath: (name: string) => {
            if (name !== 'userData') {
                throw new Error(`Unexpected path lookup: ${name}`);
            }

            const userDataDir = process.env.NEURALWEB_TEST_USER_DATA_DIR;
            if (!userDataDir) {
                throw new Error('NEURALWEB_TEST_USER_DATA_DIR is not set');
            }

            return userDataDir;
        },
    },
}));
