const ConfigManager = require('./ConfigManager');
const ValidationError = require('./validators/ValidationError');

class ErrorSeverityConverter {
  /**
   * Converte um erro em formato de string ou objeto em um ValidationError com severidade
   * @param {string|Object} error - Erro a converter
   * @param {string} category - Categoria da regra (header, command, when, filePath)
   * @param {string} ruleType - Tipo de regra para lookup na config
   * @returns {ValidationError} Objeto ValidationError com severidade
   */
  static convert(error, category = 'command', ruleType = 'invalidCommand') {
    let message = '';
    let lineNumber = null;

    if (error instanceof ValidationError) {
      message = error.message;
      lineNumber = error.lineNumber;
    } else if (typeof error === 'string') {
      message = error;
      const lineMatch = error.match(/Linha (\d+):/);
      if (lineMatch) {
        lineNumber = parseInt(lineMatch[1], 10);
      }
    } else if (error && error.message) {
      message = error.message;
      lineNumber = error.lineNumber || null;
    } else {
      message = String(error);
    }

    message = message.replace(/^❌\s*/, '').replace(/^⚠️\s*/, '').replace(/^ℹ️\s*/, '');

    const severity = ConfigManager.getSeverity(category, ruleType);

    return ValidationError.create(message)
      .atLine(lineNumber)
      .withSeverity(severity)
      .forRule(category, ruleType);
  }

  /**
   * Converte um array de erros
   * @param {Array} errors - Array de erros
   * @param {string} category - Categoria da regra
   * @param {string} ruleType - Tipo de regra
   * @returns {Object[]} Array de erros convertidos
   */
  static convertArray(errors, category = 'command', ruleType = 'invalidCommand') {
    if (!Array.isArray(errors)) {
      return [];
    }

    return errors
      .filter(e => e)
      .map(error => this.convert(error, category, ruleType))
      .filter(error => error.severity !== 'off');
  }
}

module.exports = ErrorSeverityConverter;
