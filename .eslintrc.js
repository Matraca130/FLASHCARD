// Configuración de respaldo para ESLint v9
// Este archivo proporciona compatibilidad adicional

module.exports = {
  env: {
    browser: true,
    es2023: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
  },
  globals: {
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
    structuredClone: 'readonly',
    // Third-party libraries
    Chart: 'readonly',
    particlesJS: 'readonly',
    gsap: 'readonly',
    // Test globals
    describe: 'readonly',
    it: 'readonly',
    test: 'readonly',
    expect: 'readonly',
    beforeEach: 'readonly',
    afterEach: 'readonly',
    beforeAll: 'readonly',
    afterAll: 'readonly',
    vi: 'readonly',
    cy: 'readonly',
    Cypress: 'readonly',
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
    'no-console': 'off',

    // Code quality
    'prefer-const': 'warn',
    'no-var': 'warn',
    eqeqeq: ['warn', 'always'],

    // Best practices
    curly: ['warn', 'all'],
    'dot-notation': 'warn',
    'no-eval': 'error',
    'no-implied-eval': 'error',

    indent: ['warn', 2, { SwitchCase: 1 }],
    quotes: ['warn', 'single', { avoidEscape: true }],
    semi: ['warn', 'always'],
  },
  ignorePatterns: [
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
  overrides: [
    {
      files: ['**/*.service.js'],
      rules: {
        'no-unused-vars': 'off',
      },
    },
    {
      files: [
        'cypress/**/*.js',
        '**/*.cy.js',
        '**/*.spec.js',
        'tests/**/*.js',
        '**/*.test.js',
      ],
      rules: {
        'no-unused-vars': 'off',
        'no-undef': 'off',
      },
    },
    {
      files: ['*.config.js', 'vite.config.js', 'vitest.config.js'],
      rules: {
        'no-undef': 'off',
      },
    },
  ],
};
