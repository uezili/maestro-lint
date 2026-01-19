const { COMMAND_PROPERTIES } = require('../constants');
const { ERROR_MESSAGES } = require('../messages');
const { findLineNumber } = require('../helpers');
const ValidationError = require('./ValidationError');

class CommandPropertyValidator {
  /**
   * Valida as propriedades de um comando
   * @param {string} commandName - Nome do comando
   * @param {*} commandValue - Valor/conteúdo do comando
   * @param {string} text - Texto completo do arquivo
   * @param {number} occurrence - Ocorrência do comando
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(commandName, commandValue, text, occurrence = 1) {
    const errors = [];
    const schema = COMMAND_PROPERTIES[commandName];

    if (!schema) {
      return errors;
    }

    if (commandValue === null || commandValue === undefined) {
      errors.push(...this._validateMissingValue(commandName, schema, text, occurrence));
      return errors;
    }

    if (typeof commandValue === 'string' || typeof commandValue === 'number') {
      errors.push(...this._validateSimpleValue(commandName, commandValue, text, occurrence));
      return errors;
    }

    if (typeof commandValue === 'object' && commandValue !== null) {
      errors.push(...this._validateObjectValue(commandName, commandValue, schema, text, occurrence));
    }

    return errors;
  }

  /**
   * Valida valor ausente ou null
   * @private
   */
  _validateMissingValue(commandName, schema, text, occurrence) {
    const errors = [];
    const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;

    if (schema.properties && schema.properties.length > 0) {
      errors.push(
        new ValidationError(
          ERROR_MESSAGES.COMMAND_REQUIRES_PROPERTY(commandName, schema.properties),
          lineNumber
        )
      );
      return errors;
    }

    if (schema.requiresValue) {
      errors.push(
        new ValidationError(
          ERROR_MESSAGES.COMMAND_REQUIRES_VALUE(commandName),
          lineNumber
        )
      );
    }

    return errors;
  }

  /**
   * Valida valores simples (string ou número)
   * @private
   */
  _validateSimpleValue(commandName, commandValue, text, occurrence) {
    const errors = [];

    if (!commandValue || (typeof commandValue === 'string' && commandValue.trim() === '')) {
      const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
      errors.push(
        new ValidationError(
          ERROR_MESSAGES.COMMAND_EMPTY_VALUE(commandName),
          lineNumber
        )
      );
    }

    return errors;
  }

  /**
   * Valida valores objetos
   * @private
   */
  _validateObjectValue(commandName, commandValue, schema, text, occurrence) {
    const errors = [];

    errors.push(...this._validateObjectProperties(commandName, commandValue, schema, text, occurrence));
    errors.push(...this._validateRequiredProperties(commandName, commandValue, schema, text, occurrence));
    errors.push(...this._validatePropertyValues(commandName, commandValue, schema, text, occurrence));

    if (commandValue.when) {
      const whenValidator = require('./WhenPropertyValidator');
      const whenErrors = whenValidator.validate(commandValue.when, text, commandName, occurrence);
      errors.push(...whenErrors);
    }

    return errors;
  }

  /**
   * Valida se propriedades do objeto são válidas
   * @private
   */
  _validateObjectProperties(commandName, commandValue, schema, text, _occurrence) {
    const errors = [];
    const cmdKeys = Object.keys(commandValue);
    const validKeys = [...(schema.properties || []), ...(schema.optional || [])];

    for (const key of cmdKeys) {
      if (!validKeys.includes(key)) {
        const lineNumber = text ? findLineNumber(text, key) : null;
        errors.push(
          new ValidationError(
            ERROR_MESSAGES.COMMAND_INVALID_PROPERTY(commandName, key),
            lineNumber
          )
        );
      }
    }

    return errors;
  }

  /**
   * Valida propriedades obrigatórias
   * @private
   */
  _validateRequiredProperties(commandName, commandValue, schema, text, occurrence) {
    const errors = [];

    if (!schema.properties || schema.properties.length === 0) {
      return errors;
    }

    const hasAnyRequired = schema.properties.some(prop => commandValue[prop] !== undefined);

    if (!hasAnyRequired) {
      const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
      errors.push(
        new ValidationError(
          `${commandName} deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`,
          lineNumber
        )
      );
    }

    return errors;
  }

  /**
   * Valida se valores de propriedades não estão vazios
   * @private
   */
  _validatePropertyValues(commandName, commandValue, schema, text, occurrence) {
    const errors = [];

    if (!schema.properties || schema.properties.length === 0) {
      return errors;
    }

    for (const prop of schema.properties) {
      if (commandValue[prop] !== undefined) {
        if (this._isEmpty(commandValue[prop])) {
          const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
          errors.push(
            new ValidationError(
              `${commandName} propriedade "${prop}" não pode estar vazia.`,
              lineNumber
            )
          );
        }
      }
    }

    return errors;
  }

  /**
   * Valida se requiresValue é satisfeito
   * @private
   */
  _validateRequiresValue(commandName, commandValue, schema, text, _occurrence) {
    const errors = [];

    if (schema.requiresValue && (!commandValue || Object.keys(commandValue).length === 0)) {
      const lineNumber = text ? findLineNumber(text, commandName, null, _occurrence) : null;
      errors.push(
        new ValidationError(
          `${commandName} requer um valor.`,
          lineNumber
        )
      );
    }

    return errors;
  }

  /**
   * Verifica se um valor está vazio
   * @private
   */
  _isEmpty(value) {
    return !value || (typeof value === 'string' && value.toString().trim() === '');
  }
}

module.exports = new CommandPropertyValidator();
