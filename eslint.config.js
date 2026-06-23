// @ts-check
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const prettier = require('eslint-config-prettier');

module.exports = tseslint.config(
    {
        // Never lint build output, caches, deps, or the design reference kit.
        ignores: [
            'dist/**',
            '.angular/**',
            'coverage/**',
            'node_modules/**',
            'design-reference/**',
        ],
    },
    {
        files: ['**/*.ts'],
        extends: [
            js.configs.recommended,
            ...tseslint.configs.recommended,
            ...tseslint.configs.stylistic,
            ...angular.configs.tsRecommended,
            prettier,
        ],
        processor: angular.processInlineTemplates,
        rules: {
            // This project intentionally uses NgModules (standalone: false everywhere).
            '@angular-eslint/prefer-standalone': 'off',
            // Components use two prefixes: feature components are `app-*`,
            // shared design-system components are `hf-*`.
            '@angular-eslint/directive-selector': [
                'error',
                { type: 'attribute', prefix: ['app', 'hf'], style: 'camelCase' },
            ],
            '@angular-eslint/component-selector': [
                'error',
                { type: 'element', prefix: ['app', 'hf'], style: 'kebab-case' },
            ],
        },
    },
    {
        files: ['**/*.html'],
        extends: [
            ...angular.configs.templateRecommended,
            ...angular.configs.templateAccessibility,
            prettier,
        ],
        rules: {},
    },
);
