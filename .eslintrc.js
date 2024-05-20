/* eslint-env node */

module.exports = {
  plugins: [ 'metafizzy' ],
  extends: 'plugin:metafizzy/browser',
  env: {
    browser: true,
    es6: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  globals: {
    Flickity: 'readonly',
    QUnit: 'readonly',
  },
  rules: {
    'prefer-object-spread': 'error',
  },
  ignorePatterns: [ 'bower_components' ],
};
