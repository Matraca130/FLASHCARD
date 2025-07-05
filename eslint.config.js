import js from '@eslint/js';
import globals from 'globals';

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
      'cypress/**/*',
      'logs/**/*',
      'backend_app/**/*',
      '*.py'
    ]
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        // Third-party libraries
        Chart: 'readonly',
        particlesJS: 'readonly',
        gsap: 'readonly'
      }
    },
    rules: {
      // Error prevention
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
      'no-undef': 'error',
      'no-console': 'off', // Allow console for debugging
      
      // Code quality
      'prefer-const': 'warn',
      'no-var': 'warn',
      'eqeqeq': ['warn', 'always'],
      
      // Best practices
      'curly': ['warn', 'all'],
      'dot-notation': 'warn',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      
      // Allow case declarations (common pattern)
      'no-case-declarations': 'off',
      
      // Style (basic)
      'indent': ['warn', 2, { SwitchCase: 1 }],
      'quotes': ['warn', 'single', { avoidEscape: true }],
      'semi': ['warn', 'always']
    }
  },
  {
    // Specific rules for service files
    files: ['**/*.service.js'],
    rules: {
      'no-unused-vars': 'off' // Services may export functions not used in same file
    }
  },
  {
    // Specific rules for test files
    files: ['**/*.spec.js', '**/cypress/**/*.js'],
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'off' // Cypress globals are handled above
    }
  },
  {
    // Specific rules for config files
    files: ['*.config.js', 'vite.config.js'],
    languageOptions: {
      sourceType: 'module'
    },
    rules: {
      'no-undef': 'off' // Config files may use build-time variables
    }
  }
];

