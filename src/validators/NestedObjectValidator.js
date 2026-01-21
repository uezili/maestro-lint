const ValidationError = require('./ValidationError');
const { findLineNumber } = require('../helpers');
const { NESTED_OBJECT_MESSAGES } = require('../messages');

class NestedObjectValidator {
  /**
   * Valida estrutura de objeto aninhado
   * @param {string} commandName - Nome do comando (ex: setPermissions)
   * @param {Object} commandValue - Valor do comando
   * @param {Object} schema - Definição do schema com nestedObject
   * @param {string} text - Texto completo do arquivo
   * @param {number} occurrence - Ocorrência do comando
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(commandName, commandValue, schema, text, occurrence = 1) {
    const errors = [];

    if (!schema.nestedObject) {
      return errors;
    }

    for (const [nestedKey, nestedSchema] of Object.entries(schema.nestedObject)) {
      if (!commandValue[nestedKey]) {
        continue;
      }

      if (nestedSchema.isMap) {
        errors.push(
          ...this._validateMapObject(commandName, nestedKey, commandValue[nestedKey], nestedSchema, text, occurrence)
        );
      } else if (nestedSchema.isArray) {
        errors.push(
          ...this._validateArrayObject(commandName, nestedKey, commandValue[nestedKey], nestedSchema, text, occurrence)
        );
      } else {
        errors.push(
          ...this._validateObjectProperties(
            commandName,
            nestedKey,
            commandValue[nestedKey],
            nestedSchema,
            text,
            occurrence
          )
        );
      }
    }

    return errors;
  }

  /**
   * Valida mapa (objeto com chaves/valores customizados)
   * @private
   */
  _validateMapObject(commandName, nestedKey, mapValue, schema, text, occurrence) {
    const errors = [];

    if (typeof mapValue !== 'object' || mapValue === null) {
      const lineNumber = findLineNumber(text, nestedKey);
      errors.push(ValidationError.create(NESTED_OBJECT_MESSAGES.MUST_BE_OBJECT(commandName, nestedKey), lineNumber));
      return errors;
    }

    const validKeys = schema.validKeys || [];
    const validValues = schema.validValues || [];

    for (const [key, value] of Object.entries(mapValue)) {
      if (validKeys.length > 0 && !validKeys.includes(key)) {
        const lineNumber = findLineNumber(text, key);
        errors.push(
          ValidationError.create(NESTED_OBJECT_MESSAGES.INVALID_KEY(commandName, nestedKey, key, validKeys), lineNumber)
        );
      }

      if (validValues.length > 0 && !validValues.includes(value)) {
        const lineNumber = findLineNumber(text, value);
        errors.push(
          ValidationError.create(
            NESTED_OBJECT_MESSAGES.INVALID_VALUE(commandName, nestedKey, key, value, validValues),
            lineNumber
          )
        );
      }
    }

    return errors;
  }

  /**
   * Valida array aninhado
   * @private
   */
  _validateArrayObject(commandName, nestedKey, arrayValue, schema, text, occurrence) {
    const errors = [];

    if (!Array.isArray(arrayValue)) {
      const lineNumber = findLineNumber(text, nestedKey);
      errors.push(ValidationError.create(NESTED_OBJECT_MESSAGES.MUST_BE_ARRAY(commandName, nestedKey), lineNumber));
      return errors;
    }

    const validItems = schema.validItems || [];

    if (validItems.length > 0) {
      for (const item of arrayValue) {
        if (!validItems.includes(item)) {
          const lineNumber = findLineNumber(text, item);
          errors.push(
            ValidationError.create(
              NESTED_OBJECT_MESSAGES.INVALID_ITEM(commandName, nestedKey, item, validItems),
              lineNumber
            )
          );
        }
      }
    }

    return errors;
  }

  /**
   * Valida propriedades de um objeto aninhado
   * @private
   */
  _validateObjectProperties(commandName, nestedKey, objectValue, schema, text, occurrence) {
    const errors = [];

    if (typeof objectValue !== 'object' || objectValue === null) {
      const lineNumber = findLineNumber(text, nestedKey);
      errors.push(ValidationError.create(NESTED_OBJECT_MESSAGES.MUST_BE_OBJECT(commandName, nestedKey), lineNumber));
      return errors;
    }

    const validProps = schema.properties || [];
    const optionalProps = schema.optional || [];
    const allowedKeys = [...validProps, ...optionalProps];

    for (const key of Object.keys(objectValue)) {
      if (!allowedKeys.includes(key)) {
        const lineNumber = findLineNumber(text, key);
        errors.push(
          ValidationError.create(NESTED_OBJECT_MESSAGES.INVALID_PROPERTY(commandName, nestedKey, key), lineNumber)
        );
      }
    }

    return errors;
  }
}

module.exports = new NestedObjectValidator();
