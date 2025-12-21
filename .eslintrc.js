module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Melhores práticas
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-console': 'off', // Permitido para CLI tools
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',

    // Estilo de código
    indent: ['error', 2, { SwitchCase: 1 }],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'arrow-spacing': 'error',
    'space-before-blocks': 'error',
    'keyword-spacing': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': ['error', 'always'],

    // Qualidade do código
    curly: ['error', 'all'],
    eqeqeq: ['error', 'always'],
    'no-throw-literal': 'error',
    'no-return-await': 'error',
    'require-await': 'error',

    // Array e objetos
    'array-bracket-spacing': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'comma-spacing': ['error', { before: false, after: true }],

    // Funções
    'func-call-spacing': ['error', 'never'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'never',
        named: 'never',
        asyncArrow: 'always'
      }
    ]
  }
};
