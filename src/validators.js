/**
 * Funções de validação para o Maestro Linter
 */

const { VALID_COMMANDS, COMMAND_PROPERTIES, WHEN_PROPERTIES, SIBLING_PROPERTIES } = require('./constants');
const { isValidPlatform, findLineNumber } = require('./helpers');

/**
 * Valida as propriedades de um comando
 * @param {string} commandName - Nome do comando
 * @param {*} commandValue - Valor/conteúdo do comando
 * @param {string} text - Texto completo do arquivo
 * @param {number} occurrence - Ocorrência do comando
 * @returns {string[]} Array de erros encontrados
 */
function validateCommandProperties(commandName, commandValue, text, occurrence = 1) {
  const errors = [];
  const schema = COMMAND_PROPERTIES[commandName];

  if (!schema) {
    return errors; // Comando não tem schema definido
  }

  // Se o comando tem valor null ou undefined
  if (commandValue === null || commandValue === undefined) {
    const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
    // Se o schema requer propriedades obrigatórias, reporta erro
    if (schema.properties && schema.properties.length > 0) {
      errors.push(
        lineNumber
          ? `Linha ${lineNumber}: ${commandName} deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
          : `${commandName}: deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
      );
      return errors;
    }
    // Se o schema requer um valor direto (requiresValue), reporta erro
    if (schema.requiresValue) {
      errors.push(
        lineNumber
          ? `Linha ${lineNumber}: ${commandName} requer um valor.`
          : `${commandName}: requer um valor.`
      );
      return errors;
    }
    return errors;
  }

  // Se o comando tem um valor simples (string ou número)
  if (typeof commandValue === 'string' || typeof commandValue === 'number') {
    // Valida se não está vazio
    if (!commandValue || (typeof commandValue === 'string' && commandValue.trim() === '')) {
      const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
      errors.push(
        lineNumber
          ? `Linha ${lineNumber}: ${commandName} seletor/valor não pode estar vazio.`
          : `${commandName}: seletor/valor não pode estar vazio.`
      );
    }
    return errors;
  }

  // Se o comando é um objeto, valida as propriedades
  if (typeof commandValue === 'object' && commandValue !== null) {
    const cmdKeys = Object.keys(commandValue);
    const validKeys = [...(schema.properties || []), ...(schema.optional || [])];

    // Verifica propriedades inválidas
    cmdKeys.forEach(key => {
      if (!validKeys.includes(key)) {
        // Busca pela propriedade inválida como contexto
        const lineNumber = text ? findLineNumber(text, key) : null;
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: ${commandName} propriedade inválida "${key}".`
            : `${commandName}: propriedade inválida "${key}".`
        );
      }
    });

    // Valida propriedades obrigatórias
    if (schema.properties && schema.properties.length > 0) {
      const hasAnyRequired = schema.properties.some(prop => commandValue[prop] !== undefined);
      if (!hasAnyRequired) {
        // Se há propriedades inválidas no comando, usa uma delas como contexto
        const invalidKey = cmdKeys.find(k => !validKeys.includes(k));
        const lineNumber = text ? findLineNumber(text, invalidKey || commandName, null, occurrence) : null;
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: ${commandName} deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
            : `${commandName}: deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
        );
      }

      // Valida seletores não vazios
      schema.properties.forEach(prop => {
        if (commandValue[prop] !== undefined && (!commandValue[prop] || commandValue[prop].toString().trim() === '')) {
          const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
          errors.push(
            lineNumber
              ? `Linha ${lineNumber}: ${commandName} propriedade "${prop}" não pode estar vazia.`
              : `${commandName}: propriedade "${prop}" não pode estar vazia.`
          );
        }
      });
    }

    // Se requer valor mas nenhum foi fornecido
    if (schema.requiresValue && (!commandValue || Object.keys(commandValue).length === 0)) {
      const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
      errors.push(
        lineNumber
          ? `Linha ${lineNumber}: ${commandName} requer um valor.`
          : `${commandName}: requer um valor.`
      );
    }

    // Valida propriedades aninhadas 'when'
    if (commandValue.when) {
      const whenErrors = validateWhenProperty(commandValue.when, text, commandName, occurrence);
      errors.push(...whenErrors);
    }
  }

  return errors;
}

/**
 * Valida a propriedade 'when' de um comando
 * @param {*} whenValue - Valor do when
 * @param {string} text - Texto completo do arquivo
 * @param {string|null} commandName - Nome do comando pai
 * @param {number} commandOccurrence - Ocorrência do comando pai
 * @returns {string[]} Array de erros encontrados
 */
function validateWhenProperty(whenValue, text, commandName = null, commandOccurrence = 1) {
  const errors = [];

  if (typeof whenValue !== 'object' || whenValue === null) {
    const lineNumber = text ? findLineNumber(text, 'when', commandName, commandOccurrence) : null;
    errors.push(
      `Linha ${lineNumber}: 'when' deve ser um objeto com propriedades (platform, visible, notVisible, true).`
    );
    return errors;
  }

  const whenKeys = Object.keys(whenValue);

  // Verifica propriedades inválidas em 'when'
  whenKeys.forEach(key => {
    // Verifica se é uma propriedade que deveria estar no nível do comando, não dentro de 'when'
    if (SIBLING_PROPERTIES.includes(key)) {
      const lineNumber =
        text ? findLineNumber(text, key, commandName, commandOccurrence) || findLineNumber(text, key) : null;
      const safeLine = lineNumber !== null ? lineNumber : '?';
      errors.push(`Linha ${safeLine}: propriedade "${key}" está no nível errado (deve estar fora de 'when').`);
      return;
    }

    if (!WHEN_PROPERTIES.includes(key)) {
      const lineNumber =
        text ? findLineNumber(text, key, commandName, commandOccurrence) || findLineNumber(text, key) : null;
      const safeLine = lineNumber !== null ? lineNumber : '?';
      errors.push(
        `Linha ${safeLine}: propriedade inválida "${key}" em 'when' (válidas: ${WHEN_PROPERTIES.join(', ')}).`
      );
    }
  });

  // platform: android | ios | web
  if (whenValue.platform) {
    if (typeof whenValue.platform !== 'string') {
      const lineNumber = text ? findLineNumber(text, 'platform', commandName, commandOccurrence) : null;
      errors.push(`Linha ${lineNumber}: platform deve ser uma string (android | ios | web).`);
    } else if (!isValidPlatform(whenValue.platform)) {
      const lineNumber = text ? findLineNumber(text, 'platform', commandName, commandOccurrence) : null;
      errors.push(
        `Linha ${lineNumber}: platform deve ser "android", "ios" ou "web", recebido "${whenValue.platform}".`
      );
    }
  }

  // visible / notVisible: exigem matcher não vazio
  ['visible', 'notVisible'].forEach(prop => {
    if (whenValue[prop] !== undefined) {
      const val = whenValue[prop];
      if (val === null || val === '' || (typeof val === 'string' && val.trim() === '')) {
        const lineNumber = text ? findLineNumber(text, prop) : null;
        errors.push(`Linha ${lineNumber}: ${prop} não pode ser vazio.`);
      }
    }
  });

  // true: exige valor truthy / não vazio
  if (whenValue.true !== undefined) {
    const val = whenValue.true;
    const isEmptyString = typeof val === 'string' && val.trim() === '';
    if (val === null || val === undefined || isEmptyString === true) {
      const lineNumber = text ? findLineNumber(text, 'true') : null;
      errors.push(`Linha ${lineNumber}: true não pode ser vazio.`);
    }
  }

  return errors;
}

/**
 * Valida um array de comandos
 * @param {*[]} commands - Array de comandos a validar
 * @param {string[]} errors - Array de erros (será mutado)
 * @param {string} text - Texto completo do arquivo
 * @param {Object} commandOccurrences - Mapa de ocorrências de cada comando
 * @returns {string[]} Array de erros encontrados
 */
function validateCommands(commands, errors = [], text = '', commandOccurrences = {}) {
  if (!Array.isArray(commands)) {
    return errors;
  }

  commands.forEach(cmd => {
    if (!cmd || typeof cmd !== 'object') {
      return;
    }

    const commandKeys = Object.keys(cmd);
    const commandName = commandKeys[0];

    // Incrementa ocorrência do comando
    commandOccurrences[commandName] = (commandOccurrences[commandName] || 0) + 1;

    // Valida o nome do comando
    if (!VALID_COMMANDS.includes(commandName)) {
      // Busca um comando válido com capitalização similar
      const similarCommand = VALID_COMMANDS.find(
        vc => vc.toLowerCase() === commandName.toLowerCase()
      );
      const lineNumber = text ? findLineNumber(text, commandName) : null;
      if (similarCommand) {
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: comando com sintaxe incorreta: "${commandName}" deveria ser "${similarCommand}".`
            : `Comando com sintaxe incorreta: "${commandName}" deveria ser "${similarCommand}".`
        );
      } else {
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: comando inválido: "${commandName}".`
            : `Comando inválido: "${commandName}".`
        );
      }
      return;
    }

    // Valida as propriedades do comando
    const commandValue = cmd[commandName];
    const propErrors = validateCommandProperties(commandName, commandValue, text, commandOccurrences[commandName]);
    errors.push(...propErrors);

    // Valida comandos aninhados (runFlow, repeat, retry, etc)
    if (typeof commandValue === 'object' && commandValue !== null) {
      if (commandValue.commands && Array.isArray(commandValue.commands)) {
        validateCommands(commandValue.commands, errors, text, commandOccurrences);
      }
    }
  });

  return errors;
}

module.exports = {
  validateCommandProperties,
  validateWhenProperty,
  validateCommands
};
