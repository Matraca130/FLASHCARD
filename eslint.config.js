import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        history: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        prompt: 'readonly',
        FormData: 'readonly',
        AbortController: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        
        // Third-party libraries
        Chart: 'readonly',
        particlesJS: 'readonly',
        gsap: 'readonly',
        
        // Cypress globals
        cy: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        before: 'readonly',
        after: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        expect: 'readonly',
        
        // Node.js globals (for build tools)
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly'
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
    }
  }
];

