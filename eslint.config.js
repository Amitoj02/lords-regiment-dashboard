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
            // Both of the below are new in angular-eslint 22's recommended set, and
            // both are architectural migrations rather than defects. They are off
            // here so that an Angular version bump stays a version bump; each is
            // worth doing on its own branch, where it can be reviewed as the change
            // it actually is.
            //
            // prefer-inject (60 sites): constructor injection -> inject(). Angular
            // ships `ng generate @angular/core:inject` for it, so it is mechanical,
            // but it rewrites every component and service constructor in the repo.
            '@angular-eslint/prefer-inject': 'off',
            // prefer-on-push (48 components): there is no safe codemod for this one.
            // OnPush changes *when* Angular re-renders, and the failure mode is a
            // view that silently stops updating — which no unit test in this suite
            // would catch, on a site that is live. It needs component-by-component
            // review with eyes on the result.
            '@angular-eslint/prefer-on-push-component-change-detection': 'off',
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
