import js from '';
import  from '';
import cypress from '';

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
      ecmaVersion: 2023,
      sourceType: 'module',
      : {
        ....browser,
        ....node,
        // Node 20+ 
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
        structuredClone: 'readonly',
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
      : {
        ....browser,
        // Cypress 
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
      'no-undef': 'off', // Cypress  are defined above
    },
  },
  {
    // Vitest test files
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      : {
        ....node,
        // Vitest 
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
      : {
        ....node,
      },
    },
    rules: {
      'no-undef': 'off', // Config files may use build-time variables
    },
  },
];
