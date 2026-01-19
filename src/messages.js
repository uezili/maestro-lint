/**
 * Mensagens de erro centralizadas
 * Nota: Números de linha são tratados pelo ValidationError, não precisam estar nas mensagens
 */
const ERROR_MESSAGES = {
  // Erros gerais de arquivo
  APPID_MISSING: 'Parâmetro appId ausente (identificador da aplicação).',
  FILE_EMPTY: 'Arquivo YAML vazio ou inválido.',
  FILE_NOT_FOUND: (filePath) => `Arquivo não encontrado: "${filePath}"`,
  PATH_NOT_FOUND: (path) => `Caminho não encontrado: ${path}`,
  INVALID_PATH: (path) => `O caminho não é um arquivo ou pasta válido: ${path}`,

  // Erros de propriedades do cabeçalho
  PROPERTY_INVALID: (key) => `Propriedade inválida no cabeçalho: "${key}"`,
  PROPERTY_TYPO: (wrong, correct) =>
    `Propriedade com erro de digitação "${wrong}" deveria ser "${correct}".`,
  PROPERTY_CASE_SENSITIVE: (wrong, correct) =>
    `propriedade com sintaxe incorreta: "${wrong}" deveria ser "${correct}".`,

  // Erros de tags
  TAG_MISSING: (allowedTags) =>
    `Tag de classificação ausente (${allowedTags.join(' ou ')}).`,

  // Erros de comandos
  COMMAND_INVALID: (command) => `comando inválido: "${command}".`,
  COMMAND_INVALID_WITH_SUGGESTION: (command, suggestion) =>
    `comando inválido "${command}", correto: "${suggestion}"`,
  COMMAND_CASE_SENSITIVE: (wrong, correct) =>
    `Comando com sintaxe incorreta "${wrong}" deveria ser "${correct}".`,
  COMMAND_TYPO: (wrong, correct) =>
    `comando com sintaxe incorreta: "${wrong}" deveria ser "${correct}".`,

  // Erros de parsing
  PARSING_ERROR: (message) => `Erro na indentação do comando: ${message}`,
  INDENTATION_ERROR: (diagram) => `Erro de indentação:${diagram}`,
  INDENTATION_ERROR_SIMPLE: (message) => `Erro de indentação: ${message}`,
  COMMANDS_PARSING_ERROR: (message) => `Erro ao fazer indentação dos comandos: ${message}`,

  // Erros de processamento
  PROCESSING_ERROR: (message) => `Erro ao processar arquivo: ${message}`,
  FATAL_ERROR: 'Erro fatal',

  // Erros de propriedades de comandos
  COMMAND_REQUIRES_VALUE: (commandName) => `${commandName} requer um valor.`,
  COMMAND_REQUIRES_PROPERTY: (commandName, properties) =>
    `${commandName} deve ter pelo menos uma propriedade: ${properties.join(' ou ')}.`,
  COMMAND_EMPTY_VALUE: (commandName) =>
    `${commandName} seletor/valor não pode estar vazio.`,
  COMMAND_INVALID_PROPERTY: (commandName, property) =>
    `${commandName} propriedade inválida "${property}".`,
  COMMAND_EMPTY_PROPERTY: (commandName, property) =>
    `${commandName} propriedade "${property}" não pode estar vazia.`,

  // Erros de 'when'
  WHEN_INVALID_TYPE: () =>
    '\'when\' deve ser um objeto com propriedades (platform, visible, notVisible, true).',
  WHEN_PROPERTY_WRONG_LEVEL: (property) =>
    `propriedade "${property}" está no nível errado (deve estar fora de 'when').`,
  WHEN_INVALID_PROPERTY: (property, validProps) =>
    `propriedade inválida "${property}" em 'when' (válidas: ${validProps.join(', ')}).`,
  WHEN_PLATFORM_INVALID_TYPE: () =>
    'platform deve ser uma string (android | ios | web).',
  WHEN_PLATFORM_INVALID_VALUE: (value) =>
    `platform deve ser "android", "ios" ou "web", recebido "${value}".`,
  WHEN_PROPERTY_EMPTY: (property) => `${property} não pode ser vazio.`,
  WHEN_INDENTATION_ERROR: (property, expected, found) =>
    `Indentação incorreta em propriedade '${property}' sob 'when:'. Esperado ${expected} espaços, encontrado ${found}.`
};

const SUCCESS_MESSAGES = {
  ALL_PASSED: '✅ Todos os testes passaram no linter!',
  SOME_FAILED: '❌ Alguns testes falharam no linter.',
  NO_FILES: '⚠️  Nenhum arquivo de teste encontrado.'
};

const INFO_MESSAGES = {
  EXECUTING: '🔍 Executando Maestro Linter...',
  CHECKING_FILE: (path) => `📄 Verificando arquivo: ${path}`,
  CHECKING_FOLDER: (path) => `📁 Verificando pasta: ${path}`,
  RESULTS: '📊 Resultados:'
};

module.exports = {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  INFO_MESSAGES
};
