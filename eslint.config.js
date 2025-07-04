import js from '@eslint/js';
import globals from 'globals';
import cypress from 'eslint-plugin-cypress';

export default [
  js.configs.recommended,
  {
    ignores: [
      'dist/**/*',
      'build/**/*',
      '*.min.js',
      '*.min.css',
      'index-*.js',
      'index-*.css',
      '*-[A-Za-z0-9]*.js',
      '*-[A-Za-z0-9]*.css',
      'sw.js',
      'node_modules/**/*',
      'logs/**/*',
      'backend_app/**/*',
      'venv/**/*',
      '__pycache__/**/*',
      '*.py',
    ],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Node 20+ globals
        FormData: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        // Third-party libraries
        Chart: 'readonly',
        particlesJS: 'readonly',
        gsap: 'readonly',
      },
    },
    rules: {
      // Error prevention
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'no-undef': 'error',
      'no-console': 'off', // Allow console for debugging

      // Code quality
      'prefer-const': 'warn',
      'no-var': 'warn',
      eqeqeq: ['warn', 'always'],

      // Best practices
      curly: ['warn', 'all'],
      'dot-notation': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',

      // Case declarations - require braces
      'no-case-declarations': 'error',

      // Style (basic)
      indent: ['warn', 2, { SwitchCase: 1 }],
      quotes: ['warn', 'single', { avoidEscape: true }],
      semi: ['warn', 'always'],
    },
  },
  {
    // Specific rules for service files
    files: ['**/*.service.js'],
    rules: {
      'no-unused-vars': 'off', // Services may export functions not used in same file
    },
  },
  {
    // Cypress test files
    files: ['cypress/**/*.js', '**/*.cy.js', '**/*.spec.js'],
    plugins: {
      cypress,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        // Cypress globals
        cy: 'readonly',
        Cypress: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
        assert: 'readonly',
        context: 'readonly',
      },
    },
    rules: {
      ...cypress.configs.recommended.rules,
      'no-unused-vars': 'off',
      'no-undef': 'off', // Cypress globals are defined above
    },
  },
  {
    // Vitest test files
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        // Vitest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off',
    },
  },
  {
    // Config files
    files: ['*.config.js', 'vite.config.js', 'vitest.config.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off', // Config files may use build-time variables
    },
  },
];
