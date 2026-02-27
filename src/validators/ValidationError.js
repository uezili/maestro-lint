/**
 * Representa um erro de validação
 */
class ValidationError {
  /**
   * Construtor com suporte a parâmetros legados
   * @param {string} message - Mensagem de erro
   * @param {number|null} lineNumber - Número da linha (opcional, legado)
   * @param {string|null} commandName - Nome do comando (opcional, legado)
   */
  constructor(message, lineNumber = null, commandName = null) {
    this.message = message;
    this.lineNumber = lineNumber;
    this.commandName = commandName;
    this.severity = 'error';
    this.ruleCategory = 'command';
    this.ruleType = 'invalidCommand';
  }

  /**
   * Define o número da linha
   * @param {number} line - Número da linha
   * @returns {ValidationError} this para encadeamento
   */
  atLine(line) {
    this.lineNumber = line;
    return this;
  }

  /**
   * Define o nome do comando
   * @param {string} name - Nome do comando
   * @returns {ValidationError} this para encadeamento
   */
  forCommand(name) {
    this.commandName = name;
    return this;
  }

  /**
   * Define a severidade
   * @param {string} level - Nível (error, warning, info, off)
   * @returns {ValidationError} this para encadeamento
   */
  withSeverity(level) {
    this.severity = level;
    return this;
  }

  /**
   * Define a categoria e tipo da regra
   * @param {string} category - Categoria (header, command, when, filePath)
   * @param {string} type - Tipo da regra
   * @returns {ValidationError} this para encadeamento
   */
  forRule(category, type) {
    this.ruleCategory = category;
    this.ruleType = type;
    return this;
  }

  /**
   * Cria um novo ValidationError (factory method)
   * @param {string} message - Mensagem de erro
   * @returns {ValidationError} Nova instância
   */
  static create(message) {
    return new ValidationError(message);
  }

  toString() {
    const prefix =
      {
        error: '❌ ',
        warning: '⚠️ ',
        info: 'ℹ️ ',
        off: ''
      }[this.severity] || '';

    if (this.lineNumber) {
      return `${prefix} Linha ${this.lineNumber}: ${this.message}`;
    }

    return `${prefix} ${this.message}`;
  }
}

module.exports = ValidationError;
