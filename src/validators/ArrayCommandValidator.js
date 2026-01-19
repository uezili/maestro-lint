const ValidationError = require('./ValidationError');
const { findLineNumber } = require('../helpers');
const { ERROR_MESSAGES, ARRAY_COMMAND_MESSAGES } = require('../messages');
const { MEDIA_EXTENSIONS } = require('../constants');

/**
 * Validador para comandos que recebem arrays como valor (ex: addMedia)
 * Responsabilidade: Validar estrutura e itens de comandos baseados em array
 */
class ArrayCommandValidator {
  /**
   * Valida comando que é um array
   * @param {string} commandName - Nome do comando
   * @param {Array} commandValue - Array de valores
   * @param {Object} schema - Schema do comando
   * @param {string} text - Texto completo do arquivo
   * @param {number} occurrence - Ocorrência do comando
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(commandName, commandValue, schema, text, occurrence = 1) {
    const errors = [];
    const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;

    if (!schema.isArrayCommand) {
      errors.push(
        ValidationError.create(
          ARRAY_COMMAND_MESSAGES.NOT_SUPPORTED(commandName),
          lineNumber
        )
      );
      return errors;
    }

    if (commandValue.length === 0) {
      errors.push(
        ValidationError.create(
          ARRAY_COMMAND_MESSAGES.EMPTY_ARRAY(commandName),
          lineNumber
        )
      );
      return errors;
    }

    for (let i = 0; i < commandValue.length; i++) {
      const item = commandValue[i];
      const itemLineNumber = text ? findLineNumber(text, item, null, 1) : lineNumber;

      if (typeof item !== 'string') {
        errors.push(
          ValidationError.create(
            ARRAY_COMMAND_MESSAGES.ITEM_NOT_STRING(commandName, i + 1),
            itemLineNumber
          )
        );
        continue;
      }

      errors.push(...this._validateItemByType(commandName, item, schema.arrayItemType, itemLineNumber, i + 1));
    }

    return errors;
  }

  /**
   * Valida item baseado no tipo definido no schema
   * @private
   */
  _validateItemByType(commandName, item, itemType, lineNumber, itemIndex) {
    switch (itemType) {
      case 'relativePath':
        return this._validateRelativePath(commandName, item, lineNumber, itemIndex);
      case 'url':
        return this._validateUrl(commandName, item, lineNumber, itemIndex);
      default:
        return [];
    }
  }

  /**
   * Valida se um item é um path relativo válido
   * @private
   */
  _validateRelativePath(commandName, path, lineNumber, itemIndex) {
    const errors = [];

    if (!path || path.trim() === '') {
      errors.push(
        ValidationError.create(
          ARRAY_COMMAND_MESSAGES.PATH_EMPTY(commandName, itemIndex),
          lineNumber
        )
      );
      return errors;
    }

    if (!path.startsWith('./') && !path.startsWith('../')) {
      errors.push(
        ValidationError.create(
          ARRAY_COMMAND_MESSAGES.PATH_NOT_RELATIVE(commandName, itemIndex),
          lineNumber
        )
      );
    }

    const hasValidExtension = MEDIA_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));
    
    if (!hasValidExtension) {
      errors.push(
        ValidationError.create(
          ARRAY_COMMAND_MESSAGES.INVALID_EXTENSION(commandName, itemIndex, MEDIA_EXTENSIONS),
          lineNumber
        )
      );
    }

    return errors;
  }

  /**
   * Valida se um item é uma URL válida
   * @private
   */
  _validateUrl(commandName, url, lineNumber, itemIndex) {
    const errors = [];

    if (!url || url.trim() === '') {
      errors.push(
        ValidationError.create(
          ARRAY_COMMAND_MESSAGES.URL_EMPTY(commandName, itemIndex),
          lineNumber
        )
      );
      return errors;
    }

    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(url)) {
      errors.push(
        ValidationError.create(
          ARRAY_COMMAND_MESSAGES.URL_INVALID(commandName, itemIndex),
          lineNumber
        )
      );
    }

    return errors;
  }
}

module.exports = new ArrayCommandValidator();
