import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
    {
        ignores: ['dist/**', 'release/**', 'node_modules/**'],
    },
    {
        ...js.configs.recommended,
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            ...js.configs.recommended.languageOptions,
            globals: {
                ...globals.node,
            },
            sourceType: 'module',
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-console': 'off',
        },
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ['**/*.{ts,tsx}'],
    })),
    {
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parserOptions: {
                ecmaFeatures: {
                    jsx: true,
                },
            },
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        plugins: {
            'react-hooks': reactHooks,
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'no-console': 'off',
            'no-undef': 'off',
            'prefer-const': 'off',
            'react-hooks/exhaustive-deps': 'off',
            'react-hooks/rules-of-hooks': 'error',
        },
    },
];
