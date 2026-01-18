/**
 * Mensagens de erro centralizadas
 * Facilita manutenção e internacionalização futura
 */

const ERROR_MESSAGES = {
  // Erros de arquivo
  APPID_MISSING: 'Parâmetro appId ausente (identificador da aplicação).',
  FILE_EMPTY: 'Arquivo YAML vazio ou inválido.',
  FILE_NOT_FOUND: (filePath) => `Arquivo não encontrado: "${filePath}"`,
  PATH_NOT_FOUND: (path) => `Caminho não encontrado: ${path}`,
  INVALID_PATH: (path) => `O caminho não é um arquivo ou pasta válido: ${path}`,
  
  // Erros de propriedades
  PROPERTY_INVALID: (key, line) => 
    `Propriedade inválida no cabeçalho: "${key}"${line ? ` (Linha ${line})` : ''}`,
  PROPERTY_TYPO: (wrong, correct, line) => 
    `Linha ${line}: Propriedade com erro de digitação "${wrong}" deveria ser "${correct}".`,
  PROPERTY_CASE_SENSITIVE: (wrong, correct, line) => 
    line ? `Linha ${line}: propriedade com sintaxe incorreta: "${wrong}" deveria ser "${correct}".`
         : `Propriedade com sintaxe incorreta: "${wrong}" deveria ser "${correct}".`,
  
  // Erros de tags
  TAG_MISSING: (allowedTags) => 
    `Tag de classificação ausente (${allowedTags.join(' ou ')}).`,
  
  // Erros de name
  NAME_MISSING: 'Parâmetro name ausente.',
  NAME_PATTERN_INVALID: 'Parâmetro name fora do padrão "[testKeyZephyrScale] - Nome do teste".',
  
  // Erros de setup/teardown
  SETUP_MISSING: (line) => 
    `onFlowStart deve incluir setup.yaml (workspace\\common\\subflows\\setup.yaml)${line ? ` (Linha ${line})` : ''}`,
  TEARDOWN_MISSING: (line) => 
    `onFlowComplete deve incluir teardown.yaml (workspace\\common\\subflows\\teardown.yaml)${line ? ` (Linha ${line})` : ''}`,
  
  // Erros de comandos
  COMMAND_INVALID: (command, line) => 
    line ? `Linha ${line}: comando inválido: "${command}".`
         : `Comando inválido: "${command}".`,
  COMMAND_INVALID_WITH_SUGGESTION: (command, suggestion, line) => 
    line ? `Linha ${line}: comando inválido "${command}", correto: "${suggestion}"?`
         : `Comando inválido "${command}", correto: "${suggestion}"?`,
  COMMAND_CASE_SENSITIVE: (wrong, correct, line) => 
    `Linha ${line}: Comando com sintaxe incorreta "${wrong}" deveria ser "${correct}".`,
  COMMAND_TYPO: (wrong, correct, line) => 
    line ? `Linha ${line}: comando com sintaxe incorreta: "${wrong}" deveria ser "${correct}".`
         : `Comando com sintaxe incorreta: "${wrong}" deveria ser "${correct}".`,
  
  // Erros de parsing
  PARSING_ERROR: (message) => `Erro na indentação do comando: ${message}`,
  INDENTATION_ERROR: (diagram) => `Erro de indentação:${diagram}`,
  INDENTATION_ERROR_SIMPLE: (message) => `Erro de indentação: ${message}`,
  COMMANDS_PARSING_ERROR: (message) => `Erro ao fazer indentação dos comandos: ${message}`,
  
  // Erros genéricos
  PROCESSING_ERROR: (message) => `Erro ao processar arquivo: ${message}`,
  FATAL_ERROR: 'Erro fatal',
  
  // Mensagens de validação de comandos
  COMMAND_REQUIRES_VALUE: (commandName, line) => 
    line ? `Linha ${line}: ${commandName} requer um valor.` 
         : `${commandName}: requer um valor.`,
  COMMAND_REQUIRES_PROPERTY: (commandName, properties, line) => 
    line ? `Linha ${line}: ${commandName} deve ter pelo menos uma propriedade: ${properties.join(' ou ')}.`
         : `${commandName}: deve ter pelo menos uma propriedade: ${properties.join(' ou ')}.`,
  COMMAND_EMPTY_VALUE: (commandName, line) => 
    line ? `Linha ${line}: ${commandName} seletor/valor não pode estar vazio.`
         : `${commandName}: seletor/valor não pode estar vazio.`,
  COMMAND_INVALID_PROPERTY: (commandName, property, line) => 
    line ? `Linha ${line}: ${commandName} propriedade inválida "${property}".`
         : `${commandName}: propriedade inválida "${property}".`,
  COMMAND_EMPTY_PROPERTY: (commandName, property, line) => 
    line ? `Linha ${line}: ${commandName} propriedade "${property}" não pode estar vazia.`
         : `${commandName}: propriedade "${property}" não pode estar vazia.`,
  
  // Erros de when
  WHEN_INVALID_TYPE: (line) => 
    `Linha ${line}: 'when' deve ser um objeto com propriedades (platform, visible, notVisible, true).`,
  WHEN_PROPERTY_WRONG_LEVEL: (property, line) => 
    `Linha ${line}: propriedade "${property}" está no nível errado (deve estar fora de 'when').`,
  WHEN_INVALID_PROPERTY: (property, validProps, line) => 
    `Linha ${line}: propriedade inválida "${property}" em 'when' (válidas: ${validProps.join(', ')}).`,
  WHEN_PLATFORM_INVALID_TYPE: (line) => 
    `Linha ${line}: platform deve ser uma string (android | ios | web).`,
  WHEN_PLATFORM_INVALID_VALUE: (value, line) => 
    `Linha ${line}: platform deve ser "android", "ios" ou "web", recebido "${value}".`,
  WHEN_PROPERTY_EMPTY: (property, line) => 
    `Linha ${line}: ${property} não pode ser vazio.`,
  WHEN_INDENTATION_ERROR: (property, expected, found, line) => 
    `Linha ${line}: Indentação incorreta em propriedade '${property}' sob 'when:'. Esperado ${expected} espaços, encontrado ${found}.`
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
