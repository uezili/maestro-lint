const ValidationError = require('./ValidationError');

const EXPECTED_INDENT_INCREASE = 2;

class WhenIndentationValidator {
  /**
   * Valida indentação excessiva em properties de when
   * @param {string} text - Texto completo do arquivo
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(text) {
    const errors = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];

      if (this._isWhenLine(line)) {
        errors.push(...this._validateWhenBlockIndentation(lines, i));
      }
    }

    return errors;
  }

  /**
   * Verifica se a linha é um bloco 'when:'
   * @private
   */
  _isWhenLine(line) {
    return /^\s+when:\s*$/.test(line);
  }

  /**
   * Valida indentação do bloco when
   * @private
   */
  _validateWhenBlockIndentation(lines, whenLineIndex) {
    const errors = [];
    const whenLine = lines[whenLineIndex];
    const whenIndent = this._getIndentation(whenLine);
    const expectedIndent = whenIndent + EXPECTED_INDENT_INCREASE;

    const nextLine = lines[whenLineIndex + 1];
    if (!nextLine) {
      return errors;
    }

    const nextLineIndent = this._getIndentation(nextLine);
    const isProperty = /^(\s*)([\w-]+):/.test(nextLine);

    if (isProperty && nextLineIndent !== expectedIndent) {
      const propertyName = /^(\s*)([\w-]+):/.exec(nextLine)[2];
      errors.push(
        new ValidationError(
          `Indentação incorreta em propriedade '${propertyName}' sob 'when:'. Esperado ${expectedIndent} espaços, encontrado ${nextLineIndent}.`,
          whenLineIndex + 2
        )
      );
    }

    return errors;
  }

  /**
   * Obtém número de espaços de indentação
   * @private
   */
  _getIndentation(line) {
    const match = /^(\s*)/.exec(line);
    return match ? match[1].length : 0;
  }
}

module.exports = new WhenIndentationValidator();
