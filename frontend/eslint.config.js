import js from '@eslint/js'
import globals from 'globals'
import pluginReact from 'eslint-plugin-react'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  pluginReact.configs.flat.recommended,
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    plugins: { js, react: pluginReact },
    extends: ['js/recommended'],
    ignores: ['**/dist/**', '**/build/**', '**/node_modules/**'],
    languageOptions: { globals: globals.browser },
    rules: {
      'comma-dangle': 'off',
      'function-paren-newline': 'off',
      'implicit-arrow-linebreak': 'off',
      'jsx-quotes': 'off',
      'max-len': 'off',
      'no-confusing-arrow': 'off',
      'no-console': 'off',
      'no-extra-semi': 'off',
      'no-param-reassign': 'warn',
      'no-plusplus': 'off',
      'no-return-assign': 'warn',
      'no-underscore-dangle': 'off',
      'object-curly-newline': 'off',
      'operator-linebreak': 'off',
      semi: 'off',
      'react/forbid-prop-types': 'off',
      'react/jsx-curly-newline': 'off',
      'react/jsx-filename-extension': 'off',
      'react/jsx-one-expression-per-line': 'off',
      'react/jsx-props-no-spreading': 'off',
      'react/jsx-wrap-multilines': 'off',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react/require-default-props': 'off',
      'no-unused-vars': 'warn',
    },
  },
])
