import js from '@eslint/js';
import prettier from 'eslint-config-prettier';

export default [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                Buffer: 'readonly',
                setInterval: 'readonly',
                setTimeout: 'readonly',
                clearInterval: 'readonly',
                clearTimeout: 'readonly'
            }
        },
        rules: {
            // Errores comunes
            'no-unused-vars': ['warn', {
                'argsIgnorePattern': '^_',
                'varsIgnorePattern': '^_'
            }],
            'no-undef': 'error',
            'no-console': 'off', // Permitir console.log en desarrollo

            // Mejores prácticas
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'no-var': 'error',
            'prefer-const': 'warn',
            'no-multi-spaces': 'warn',

            // ES6+
            'arrow-spacing': 'warn',
            'no-duplicate-imports': 'error',
            'prefer-template': 'warn',

            // Async/Await
            'no-async-promise-executor': 'error',
            'require-await': 'warn'
        }
    },
    {
        ignores: [
            'node_modules/',
            'dist/',
            'build/',
            'coverage/',
            'src/_archive/',
            'src/public/js/lib/',
            '*.min.js'
        ]
    }
];
