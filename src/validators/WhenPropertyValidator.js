const { WHEN_PROPERTIES, SIBLING_PROPERTIES } = require('../constants');
const { isValidPlatform, findLineNumber } = require('../helpers');
const ValidationError = require('./ValidationError');

class WhenPropertyValidator {
  /**
   * Valida a propriedade 'when' de um comando
   * @param {*} whenValue - Valor do when
   * @param {string} text - Texto completo do arquivo
   * @param {string|null} commandName - Nome do comando pai
   * @param {number} commandOccurrence - Ocorrência do comando pai
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(whenValue, text, commandName = null, commandOccurrence = 1) {
    const errors = [];

    if (!this._isValidObject(whenValue)) {
      const lineNumber = text ? findLineNumber(text, 'when', commandName, commandOccurrence) : null;
      errors.push(
        new ValidationError(
          "'when' deve ser um objeto com propriedades (platform, visible, notVisible, true).",
          lineNumber
        )
      );
      return errors;
    }

    const whenKeys = Object.keys(whenValue);

    for (const key of whenKeys) {
      if (SIBLING_PROPERTIES.includes(key)) {
        const lineNumber = this._findLineNumber(text, key, commandName, commandOccurrence);
        errors.push(
          new ValidationError(
            `propriedade "${key}" está no nível errado (deve estar fora de 'when').`,
            lineNumber
          )
        );
        continue;
      }

      if (!WHEN_PROPERTIES.includes(key)) {
        const lineNumber = this._findLineNumber(text, key, commandName, commandOccurrence);
        errors.push(
          new ValidationError(
            `propriedade inválida "${key}" em 'when' (válidas: ${WHEN_PROPERTIES.join(', ')}).`,
            lineNumber
          )
        );
      }
    }

    errors.push(...this._validatePlatform(whenValue, text, commandName, commandOccurrence));
    errors.push(...this._validateEmptyProperties(whenValue, text));

    return errors;
  }

  /**
   * Valida plataforma
   * @private
   */
  _validatePlatform(whenValue, text, commandName, commandOccurrence) {
    const errors = [];

    if (!whenValue.platform) {
      return errors;
    }

    if (typeof whenValue.platform !== 'string') {
      const lineNumber = findLineNumber(text, 'platform', commandName, commandOccurrence);
      errors.push(
        new ValidationError(
          'platform deve ser uma string (android | ios | web).',
          lineNumber
        )
      );
      return errors;
    }

    if (!isValidPlatform(whenValue.platform)) {
      const lineNumber = findLineNumber(text, 'platform', commandName, commandOccurrence);
      errors.push(
        new ValidationError(
          `platform deve ser "android", "ios" ou "web", recebido "${whenValue.platform}".`,
          lineNumber
        )
      );
    }

    return errors;
  }

  /**
   * Valida propriedades que não podem estar vazias
   * @private
   */
  _validateEmptyProperties(whenValue, text) {
    const errors = [];
    const emptyProps = ['visible', 'notVisible', 'true'];

    for (const prop of emptyProps) {
      if (whenValue[prop] !== undefined) {
        const value = whenValue[prop];
        if (this._isEmpty(value)) {
          const lineNumber = findLineNumber(text, prop);
          errors.push(
            new ValidationError(
              `${prop} não pode ser vazio.`,
              lineNumber
            )
          );
        }
      }
    }

    return errors;
  }

  /**
   * Verifica se um valor está vazio
   * @private
   */
  _isEmpty(value) {
    return value === null || value === '' || (typeof value === 'string' && value.trim() === '');
  }

  /**
   * Verifica se é um objeto válido
   * @private
   */
  _isValidObject(value) {
    return typeof value === 'object' && value !== null;
  }

  /**
   * Encontra número da linha com fallback
   * @private
   */
  _findLineNumber(text, key, commandName, commandOccurrence) {
    return text
      ? findLineNumber(text, key, commandName, commandOccurrence) || findLineNumber(text, key)
      : null;
  }
}

module.exports = new WhenPropertyValidator();
