const { VALID_COMMANDS } = require('../constants');
const { findLineNumber, levenshteinDistance } = require('../helpers');
const ValidationError = require('./ValidationError');
const commandPropertyValidator = require('./CommandPropertyValidator');

class CommandValidator {
  /**
   * Valida um array de comandos
   * @param {*[]} commands - Array de comandos a validar
   * @param {string} text - Texto completo do arquivo
   * @param {Object} commandOccurrences - Mapa de ocorrências de cada comando
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(commands, text = '', commandOccurrences = {}) {
    const errors = [];

    if (!Array.isArray(commands)) {
      return errors;
    }

    for (const cmd of commands) {
      errors.push(...this._validateCommand(cmd, text, commandOccurrences));
    }

    return errors;
  }

  /**
   * Valida um comando individual
   * @private
   */
  _validateCommand(cmd, text, commandOccurrences) {
    const errors = [];

    if (!cmd || typeof cmd !== 'object') {
      return errors;
    }

    const commandKeys = Object.keys(cmd);
    const commandName = commandKeys[0];

    commandOccurrences[commandName] = (commandOccurrences[commandName] || 0) + 1;

    if (!VALID_COMMANDS.includes(commandName)) {
      errors.push(...this._validateCommandName(commandName, text));
      return errors;
    }

    const commandValue = cmd[commandName];
    const propErrors = commandPropertyValidator.validate(
      commandName,
      commandValue,
      text,
      commandOccurrences[commandName]
    );
    errors.push(...propErrors);

    if (typeof commandValue === 'object' && commandValue !== null) {
      if (commandValue.commands && Array.isArray(commandValue.commands)) {
        const nestedErrors = this.validate(commandValue.commands, text, commandOccurrences);
        errors.push(...nestedErrors);
      }
    }

    return errors;
  }

  /**
   * Valida nome do comando (sintaxe, sugestões)
   * @private
   */
  _validateCommandName(commandName, text) {
    const errors = [];
    const lineNumber = text ? findLineNumber(text, commandName) : null;

    const similarCommand = VALID_COMMANDS.find(vc => vc.toLowerCase() === commandName.toLowerCase());
    if (similarCommand) {
      errors.push(
        new ValidationError(
          `comando com sintaxe incorreta: "${commandName}" deveria ser "${similarCommand}".`,
          lineNumber
        )
      );
      return errors;
    }

    const closeMatch = this._findSimilarCommandName(commandName);
    if (closeMatch) {
      errors.push(
        new ValidationError(
          `comando inválido "${commandName}", correto: "${closeMatch}"?`,
          lineNumber
        )
      );
    } else {
      errors.push(
        new ValidationError(
          `comando inválido: "${commandName}".`,
          lineNumber
        )
      );
    }

    return errors;
  }

  /**
   * Encontra comando similar por distância de Levenshtein
   * @private
   */
  _findSimilarCommandName(typo) {
    let bestMatch = null;
    let minDistance = Infinity;

    for (const validCmd of VALID_COMMANDS) {
      const distance = levenshteinDistance(typo.toLowerCase(), validCmd.toLowerCase());
      const maxAllowedDistance = Math.max(1, Math.floor(validCmd.length * 0.3));

      if (distance <= maxAllowedDistance && distance < minDistance) {
        minDistance = distance;
        bestMatch = validCmd;
      }
    }

    return bestMatch;
  }
}

module.exports = new CommandValidator();
