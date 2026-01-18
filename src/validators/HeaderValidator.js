const { VALID_PROPERTIES, TAG_ONE_OF, NAME_PATTERN } = require('../constants');
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
    errors.push(...this._validateName(doc));

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
          errors.push(
            new ValidationError(
              `propriedade com sintaxe incorreta: "${key}" deveria ser "${similarProp}".`,
              lineNumber
            )
          );
        } else {
          errors.push(
            new ValidationError(
              `Propriedade inválida no cabeçalho: "${key}"`,
              lineNumber
            )
          );
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
    const tags = doc.tags || [];

    if (!TAG_ONE_OF.some(t => tags.includes(t))) {
      errors.push(
        new ValidationError(
          `Tag de classificação ausente (${TAG_ONE_OF.join(' ou ')}).`
        )
      );
    }

    return errors;
  }

}

module.exports = new HeaderValidator();
