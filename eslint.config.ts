import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';
import type { Linter, ESLint } from 'eslint';

const config: Linter.Config[] = [
  // Base JS recommended rules
  js.configs.recommended,

  // TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname // or process.cwd()
        // Enable if you need JSX
        // ecmaFeatures: { jsx: true }
      },
      globals: {
        ...globals.node,
        ...globals.browser // add if browser code exists
      }
    },
    plugins: {
      '@typescript-eslint': tsPlugin as unknown as ESLint.Plugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      // Optional: stricter type-aware rules
      // ...tsPlugin.configs['recommended-type-checked'].rules,

      // Custom overrides
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': 'off'
    }
  },

  // Ignores
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.d.ts']
  }
];

export default config;
