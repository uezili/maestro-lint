const fs = require('fs');
const path = require('path');
const { VALID_COMMANDS, COMMAND_PROPERTIES, WHEN_PROPERTIES, SIBLING_PROPERTIES } = require('./constants');
const { isValidPlatform, findLineNumber, levenshteinDistance } = require('./helpers');

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
    return errors;
  }

  if (commandValue === null || commandValue === undefined) {
    const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
    if (schema.properties && schema.properties.length > 0) {
      errors.push(
        lineNumber
          ? `Linha ${lineNumber}: ${commandName} deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
          : `${commandName}: deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
      );
      return errors;
    }
    if (schema.requiresValue) {
      errors.push(
        lineNumber ? `Linha ${lineNumber}: ${commandName} requer um valor.` : `${commandName}: requer um valor.`
      );
      return errors;
    }
    return errors;
  }

  if (typeof commandValue === 'string' || typeof commandValue === 'number') {
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

  if (typeof commandValue === 'object' && commandValue !== null) {
    const cmdKeys = Object.keys(commandValue);
    const validKeys = [...(schema.properties || []), ...(schema.optional || [])];

    cmdKeys.forEach(key => {
      if (!validKeys.includes(key)) {
        const lineNumber = text ? findLineNumber(text, key) : null;
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: ${commandName} propriedade inválida "${key}".`
            : `${commandName}: propriedade inválida "${key}".`
        );
      }
    });

    if (schema.properties && schema.properties.length > 0) {
      const hasAnyRequired = schema.properties.some(prop => commandValue[prop] !== undefined);
      if (!hasAnyRequired) {
        const invalidKey = cmdKeys.find(k => !validKeys.includes(k));
        const lineNumber = text ? findLineNumber(text, invalidKey || commandName, null, occurrence) : null;
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: ${commandName} deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
            : `${commandName}: deve ter pelo menos uma propriedade: ${schema.properties.join(' ou ')}.`
        );
      }

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

    if (schema.requiresValue && (!commandValue || Object.keys(commandValue).length === 0)) {
      const lineNumber = text ? findLineNumber(text, commandName, null, occurrence) : null;
      errors.push(
        lineNumber ? `Linha ${lineNumber}: ${commandName} requer um valor.` : `${commandName}: requer um valor.`
      );
    }

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

  whenKeys.forEach(key => {
    if (SIBLING_PROPERTIES.includes(key)) {
      const lineNumber = text
        ? findLineNumber(text, key, commandName, commandOccurrence) || findLineNumber(text, key)
        : null;
      const safeLine = lineNumber !== null ? lineNumber : '?';
      errors.push(`Linha ${safeLine}: propriedade "${key}" está no nível errado (deve estar fora de 'when').`);
      return;
    }

    if (!WHEN_PROPERTIES.includes(key)) {
      const lineNumber = text
        ? findLineNumber(text, key, commandName, commandOccurrence) || findLineNumber(text, key)
        : null;
      const safeLine = lineNumber !== null ? lineNumber : '?';
      errors.push(
        `Linha ${safeLine}: propriedade inválida "${key}" em 'when' (válidas: ${WHEN_PROPERTIES.join(', ')}).`
      );
    }
  });

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

  ['visible', 'notVisible'].forEach(prop => {
    if (whenValue[prop] !== undefined) {
      const val = whenValue[prop];
      if (val === null || val === '' || (typeof val === 'string' && val.trim() === '')) {
        const lineNumber = text ? findLineNumber(text, prop) : null;
        errors.push(`Linha ${lineNumber}: ${prop} não pode ser vazio.`);
      }
    }
  });

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

    commandOccurrences[commandName] = (commandOccurrences[commandName] || 0) + 1;

    if (!VALID_COMMANDS.includes(commandName)) {
      const similarCommand = VALID_COMMANDS.find(vc => vc.toLowerCase() === commandName.toLowerCase());
      const closeMatch = findSimilarCommandName(commandName);
      const lineNumber = text ? findLineNumber(text, commandName) : null;

      if (similarCommand) {
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: comando com sintaxe incorreta: "${commandName}" deveria ser "${similarCommand}".`
            : `Comando com sintaxe incorreta: "${commandName}" deveria ser "${similarCommand}".`
        );
      } else if (closeMatch) {
        errors.push(
          lineNumber
            ? `Linha ${lineNumber}: comando inválido "${commandName}", correto: "${closeMatch}"?`
            : `Comando inválido "${commandName}", correto: "${closeMatch}"?`
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

    const commandValue = cmd[commandName];
    const propErrors = validateCommandProperties(commandName, commandValue, text, commandOccurrences[commandName]);
    errors.push(...propErrors);

    if (typeof commandValue === 'object' && commandValue !== null) {
      if (commandValue.commands && Array.isArray(commandValue.commands)) {
        validateCommands(commandValue.commands, errors, text, commandOccurrences);
      }
    }
  });

  return errors;
}

function findSimilarCommandName(typo) {
  let bestMatch = null;
  let minDistance = Infinity;

  VALID_COMMANDS.forEach(validCmd => {
    const distance = levenshteinDistance(typo.toLowerCase(), validCmd.toLowerCase());
    const maxAllowedDistance = Math.max(1, Math.floor(validCmd.length * 0.3));

    if (distance <= maxAllowedDistance && distance < minDistance) {
      minDistance = distance;
      bestMatch = validCmd;
    }
  });

  return bestMatch;
}

/**
 * Valida indentação excessiva em properties de when: (que js-yaml não consegue detectar)
 * @param {string} text - Texto completo do arquivo
 * @returns {string[]} Array de erros encontrados
 */
function validateWhenPropertyIndentation(text) {
  const errors = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const whenMatch = /^\s+when:\s*$/.test(line);

    if (whenMatch) {
      const whenIndent = /^(\s*)/.exec(line)[1].length;
      const expectedIndent = whenIndent + 2;
      const nextLine = lines[i + 1];
      const nextLineIndent = /^(\s*)/.exec(nextLine)[1].length;
      const isProperty = /^(\s*)([\w-]+):/.test(nextLine);

      if (isProperty) {
        if (nextLineIndent !== expectedIndent) {
          const propertyName = /^(\s*)([\w-]+):/.exec(nextLine)[2];
          errors.push(
            `Linha ${i + 2}: Indentação incorreta em propriedade '${propertyName}' sob 'when:'. Esperado ${expectedIndent} espaços, encontrado ${nextLineIndent}.`
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Valida caminhos de arquivos em runScript e runFlow
 * @param {string} text - Texto completo do arquivo
 * @param {string} currentFilePath - Caminho do arquivo sendo validado
 * @returns {string[]} Array de erros encontrados
 */
function validateFilePaths(text, currentFilePath) {
  const errors = [];
  const lines = text.split('\n');
  const currentDir = path.dirname(currentFilePath);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inlineScriptMatch = line.match(/^\s*-?\s*runScript:\s*['"]?([^'"#\n]+?)['"]?\s*$/);
    const inlineFlowMatch = line.match(/^\s*-?\s*runFlow:\s*['"]?([^'"#\n]+?)['"]?\s*$/);

    if (inlineScriptMatch) {
      const filePath = inlineScriptMatch[1].trim();
      validateFileExists(filePath, currentDir, i + 1, 'runScript', errors);
    }

    if (inlineFlowMatch) {
      const filePath = inlineFlowMatch[1].trim();
      validateFileExists(filePath, currentDir, i + 1, 'runFlow', errors);
    }

    const runFlowMatch = line.match(/^\s*-?\s*runFlow:\s*$/);
    if (runFlowMatch && i + 1 < lines.length) {
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j];
        const fileMatch = nextLine.match(/^\s*file:\s*['"]?([^'"#\n]+?)['"]?\s*$/);

        if (fileMatch) {
          const filePath = fileMatch[1].trim();
          validateFileExists(filePath, currentDir, j + 1, 'runFlow', errors);
          break;
        }

        if (/^\s*-\s*\w+:/.test(nextLine)) {
          break;
        }
      }
    }
  }

  return errors;
}

/**
 * Valida se um arquivo existe
 * @param {string} filePath - Caminho do arquivo a verificar
 * @param {string} baseDir - Diretório base para resolver caminhos relativos
 * @param {number} lineNumber - Número da linha onde o caminho foi encontrado
 * @param {string} commandType - Tipo do comando (runScript ou runFlow)
 * @param {string[]} errors - Array para adicionar erros
 */
function validateFileExists(filePath, baseDir, lineNumber, commandType, errors) {
  if (filePath.includes('${')) {
    return;
  }

  const absolutePath = path.resolve(baseDir, filePath);

  if (!fs.existsSync(absolutePath)) {
    const ext = path.extname(filePath);
    let found = false;

    if (!ext) {
      const extensions = commandType === 'runScript' ? ['.js'] : ['.yaml', '.yml'];

      for (const extension of extensions) {
        if (fs.existsSync(absolutePath + extension)) {
          found = true;
          break;
        }
      }
    }

    if (!found) {
      errors.push(`Linha ${lineNumber}: Arquivo não encontrado: "${filePath}"`);
    }
  }
}

module.exports = {
  validateCommandProperties,
  validateWhenProperty,
  validateCommands,
  validateWhenPropertyIndentation,
  validateFilePaths
};
 