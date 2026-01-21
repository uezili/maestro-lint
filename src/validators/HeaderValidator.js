const { VALID_PROPERTIES } = require('../constants');
const ConfigManager = require('../ConfigManager');
const { ERROR_MESSAGES } = require('../messages');
const { findLineNumber } = require('../helpers');
const ValidationError = require('./ValidationError');

class HeaderValidator {
  /**
   * Valida o cabeçalho do arquivo
   * @param {Object} doc - Documento YAML parseado
   * @param {string} text - Texto completo do arquivo
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(doc, text) {
    const errors = [];

    if (!doc) {
      return errors;
    }

    errors.push(...this._validateProperties(doc, text));
    errors.push(...this._validateTags(doc));

    return errors;
  }

  /**
   * Valida propriedades do cabeçalho
   * @private
   */
  _validateProperties(doc, text) {
    const errors = [];
    const docKeys = Object.keys(doc);

    for (const key of docKeys) {
      if (!VALID_PROPERTIES.includes(key)) {
        const similarProp = VALID_PROPERTIES.find(vp => vp.toLowerCase() === key.toLowerCase());
        const lineNumber = findLineNumber(text, key);

        if (similarProp) {
          errors.push(new ValidationError(ERROR_MESSAGES.PROPERTY_CASE_SENSITIVE(key, similarProp), lineNumber));
        } else {
          errors.push(new ValidationError(ERROR_MESSAGES.PROPERTY_INVALID(key), lineNumber));
        }
      }
    }

    return errors;
  }

  /**
   * Valida tags
   * @private
   */
  _validateTags(doc) {
    const errors = [];
    const requiredTags = ConfigManager.getRequiredTags();

    // Se não há tags configuradas, não valida
    if (!requiredTags || requiredTags.length === 0) {
      return errors;
    }

    const tags = doc.tags || [];

    if (!requiredTags.some(t => tags.includes(t))) {
      errors.push(new ValidationError(ERROR_MESSAGES.TAG_MISSING(requiredTags)));
    }

    return errors;
  }
}

module.exports = new HeaderValidator();
