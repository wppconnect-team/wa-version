const eslint = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');
const headerPlugin = require('@tony.ganchev/eslint-plugin-header');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', 'prettier.config.js'],
  },
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      header: headerPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      ...tseslint.configs['eslint-recommended'].overrides[0].rules,
      ...tseslint.configs.recommended.rules,
      ...prettier.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'header/header': [
        2,
        'block',
        [
          '!',
          {
            pattern: ' \\* Copyright \\d{4} WPPConnect Team$',
            template: ' * Copyright 2022 WPPConnect Team',
          },
          ' *',
          ' * Licensed under the Apache License, Version 2.0 (the "License");',
          ' * you may not use this file except in compliance with the License.',
          ' * You may obtain a copy of the License at',
          ' *',
          ' *     http://www.apache.org/licenses/LICENSE-2.0',
          ' *',
          ' * Unless required by applicable law or agreed to in writing, software',
          ' * distributed under the License is distributed on an "AS IS" BASIS,',
          ' * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
          ' * See the License for the specific language governing permissions and',
          ' * limitations under the License.',
          ' ',
        ],
        2,
      ],
    },
  },
];
