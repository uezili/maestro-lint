const {
  commandValidator,
  commandPropertyValidator,
  whenPropertyValidator,
  whenIndentationValidator,
  filePathValidator
} = require('./validators/index');

/**
 * Valida propriedades de um comando
 * @deprecated Use CommandPropertyValidator.validate() diretamente
 */
function validateCommandProperties(commandName, commandValue, text, occurrence = 1) {
  const validationErrors = commandPropertyValidator.validate(commandName, commandValue, text, occurrence);
  return validationErrors.map(err => err.toString());
}

/**
 * Valida propriedade 'when' de um comando
 * @deprecated Use WhenPropertyValidator.validate() diretamente
 */
function validateWhenProperty(whenValue, text, commandName = null, commandOccurrence = 1) {
  const validationErrors = whenPropertyValidator.validate(whenValue, text, commandName, commandOccurrence);
  return validationErrors.map(err => err.toString());
}

/**
 * Valida um array de comandos
 * @deprecated Use CommandValidator.validate() diretamente
 */
function validateCommands(commands, errors = [], text = '', commandOccurrences = {}) {
  const validationErrors = commandValidator.validate(commands, text, commandOccurrences);
  const stringErrors = validationErrors.map(err => err.toString());
  errors.push(...stringErrors);
  return errors;
}

/**
 * Valida indentação de propriedades 'when'
 * @deprecated Use WhenIndentationValidator.validate() diretamente
 */
function validateWhenPropertyIndentation(text) {
  const validationErrors = whenIndentationValidator.validate(text);
  return validationErrors.map(err => err.toString());
}

/**
 * Valida caminhos de arquivos
 * @deprecated Use FilePathValidator.validate() diretamente
 */
function validateFilePaths(text, currentFilePath) {
  const validationErrors = filePathValidator.validate(text, currentFilePath);
  return validationErrors.map(err => err.toString());
}

module.exports = {
  validateCommandProperties,
  validateWhenProperty,
  validateCommands,
  validateWhenPropertyIndentation,
  validateFilePaths
};
