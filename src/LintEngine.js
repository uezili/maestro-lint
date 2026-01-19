const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { detectMultipleParsingErrors } = require('./YamlError');
const ErrorSeverityConverter = require('./ErrorSeverityConverter');
const ValidationError = require('./validators/ValidationError');
const ConfigManager = require('./ConfigManager');
const RuleDetector = require('./RuleDetector');
const { VALID_COMMANDS, LIMITS, PROPERTY_TYPO_MAP } = require('./constants');
const { findSimilarString } = require('./helpers');
const { commandValidator, headerValidator } = require('./validators/index');

const SUBFLOW_PATTERN = /\/subflows\//;

class LintEngine {
  /**
   * Valida um arquivo YAML de teste Maestro
   * @param {string} filePath - Caminho do arquivo a validar
   * @returns {string[]} Array de erros encontrados
   */
  lint(filePath) {
    const text = fs.readFileSync(filePath, 'utf8');
    const errors = [];
    const isSubflowFile = this._isSubflow(filePath);

    if (!text.includes('appId:')) {
      errors.push('Parâmetro appId ausente (identificador da aplicação).');
    }

    const docs = text.split('---');
    if (docs.length < 1) {
      errors.push('Arquivo YAML vazio ou inválido.');
      return errors;
    }

    let headerDoc = null;
    let hasParsingError = false;

    try {
      headerDoc = yaml.load(docs[0]);

      if (!headerDoc) {
        errors.push('Arquivo YAML vazio ou inválido.');
        hasParsingError = true;
      }
    } catch (error) {
      errors.push(...this._handleParsingError(error, text, docs[0]));
      hasParsingError = true;
      headerDoc = null;
    }

    try {
      if (headerDoc && !hasParsingError) {
        if (!isSubflowFile) {
          errors.push(...this._validateHeader(headerDoc, text));
        }
        errors.push(...this._validateFlowCommands(headerDoc, text));
      }

      errors.push(...this._validateCommandsSection(docs, text, hasParsingError));

      errors.push(...this._validateIndentation(text));
      errors.push(...this._validateFilePaths(text, filePath));
    } catch (error) {
      errors.push(`Erro ao processar arquivo: ${error.message}`);
    }

    // Converter erros para objetos com severidade
    return errors.map(error => {
      if (typeof error === 'string') {
        return ErrorSeverityConverter.convert(error, 'command', 'invalidCommand');
      }
      if (error instanceof ValidationError) {
        const { category, ruleType } = RuleDetector.detect(error.message);
        const severity = ConfigManager.getSeverity(category, ruleType);
        error.severity = severity;
        error.ruleCategory = category;
        error.ruleType = ruleType;
      }
      return error;
    });
  }

  /**
   * Valida o cabeçalho do arquivo
   * @private
   */
  _validateHeader(headerDoc, text) {
    return headerValidator.validate(headerDoc, text);
  }

  /**
   * Valida comandos do flow (onFlowStart, onFlowComplete)
   * @private
   */
  _validateFlowCommands(headerDoc, text) {
    const errors = [];
    const docKeys = Object.keys(headerDoc);

    const onFlowStartProp =
      headerDoc.onFlowStart ||
      (docKeys.find(k => k.toLowerCase() === 'onflowstart') &&
        headerDoc[docKeys.find(k => k.toLowerCase() === 'onflowstart')]);

    const onFlowCompleteProp =
      headerDoc.onFlowComplete ||
      (docKeys.find(k => k.toLowerCase() === 'onflowcomplete') &&
        headerDoc[docKeys.find(k => k.toLowerCase() === 'onflowcomplete')]);

    if (onFlowStartProp && Array.isArray(onFlowStartProp)) {
      errors.push(...commandValidator.validate(onFlowStartProp, text));
    }

    if (onFlowCompleteProp && Array.isArray(onFlowCompleteProp)) {
      errors.push(...commandValidator.validate(onFlowCompleteProp, text));
    }

    return errors;
  }

  /**
   * Valida seção de comandos
   * @private
   */
  _validateCommandsSection(docs, text, hasParsingError) {
    const errors = [];

    if (docs.length > 1) {
      try {
        const commands = yaml.load(docs[1]);
        if (Array.isArray(commands)) {
          errors.push(...commandValidator.validate(commands, text));
        }
      } catch (commandError) {
        errors.push(...this._handleParsingError(commandError, text, docs[1]));
        this._validateCommandsByPattern(text, errors);
      }
    }

    if (hasParsingError && docs.length === 1) {
      this._validateCommandsByPattern(text, errors);
    }

    return errors;
  }

  /**
   * Valida comandos por pattern quando YAML falha
   * @private
   */
  _validateCommandsByPattern(text, errors) {
    this._validateCommandsPattern(text, errors);
    this._validatePropertiesPattern(text, errors);
  }

  /**
   * Valida comandos usando regex
   * @private
   */
  _validateCommandsPattern(text, errors) {
    const commandPattern = /^\s*-\s+([a-zA-Z]+):/gm;
    let match;

    while ((match = commandPattern.exec(text)) !== null) {
      const commandName = match[1];
      const lineNumber = text.substring(0, match.index).split('\n').length + 1;

      if (VALID_COMMANDS.includes(commandName)) {
        continue;
      }

      const similar = VALID_COMMANDS.find(cmd => cmd.toLowerCase() === commandName.toLowerCase());

      if (similar) {
        errors.push(`Linha ${lineNumber}: Comando com sintaxe incorreta "${commandName}" deveria ser "${similar}".`);
      } else {
        const closeMatch = findSimilarString(commandName, VALID_COMMANDS);

        if (closeMatch) {
          errors.push(`Linha ${lineNumber}: comando inválido "${commandName}", correto: "${closeMatch}"?`);
        } else {
          errors.push(`Linha ${lineNumber}: comando inválido: "${commandName}".`);
        }
      }
    }
  }

  /**
   * Valida propriedades conhecidas com erros de digitação
   * @private
   */
  _validatePropertiesPattern(text, errors) {
    const propertyPattern = /([a-zA-Z]+):\s*(\w+)?/gm;
    const reportedProps = new Set();
    let match;

    while ((match = propertyPattern.exec(text)) !== null) {
      const beforeMatch = text.substring(Math.max(0, match.index - LIMITS.CONTEXT_WINDOW_BEFORE), match.index);
      if (beforeMatch.includes('-')) {
        continue;
      }

      const propName = match[1];
      const lineNumber = text.substring(0, match.index).split('\n').length;
      const propKey = `${propName}@${lineNumber}`;

      if (reportedProps.has(propKey)) {
        continue;
      }
      reportedProps.add(propKey);

      if (PROPERTY_TYPO_MAP[propName]) {
        errors.push(
          `Linha ${lineNumber}: Propriedade com erro de digitação "${propName}" deveria ser "${PROPERTY_TYPO_MAP[propName]}".`
        );
      }
    }
  }

  /**
   * Valida indentação de propriedades 'when'
   * @private
   */
  _validateIndentation(text) {
    const errors = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];

      if (/^\s+when:\s*$/.test(line)) {
        const whenIndent = /^(\s*)/.exec(line)[1].length;
        const expectedIndent = whenIndent + 2;
        const nextLine = lines[i + 1];
        const nextLineIndent = /^(\s*)/.exec(nextLine)[1].length;
        const isProperty = /^(\s*)([\w-]+):/.test(nextLine);

        if (isProperty && nextLineIndent !== expectedIndent) {
          const propertyName = /^(\s*)([\w-]+):/.exec(nextLine)[2];
          errors.push(
            `Linha ${i + 2}: Indentação incorreta em propriedade '${propertyName}' sob 'when:'. Esperado ${expectedIndent} espaços, encontrado ${nextLineIndent}.`
          );
        }
      }
    }

    return errors;
  }

  /**
   * Valida caminhos de arquivos
   * @private
   */
  _validateFilePaths(text, currentFilePath) {
    const errors = [];
    const lines = text.split('\n');
    const currentDir = path.dirname(currentFilePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const inlineScriptMatch = line.match(/^\s*-?\s*runScript:\s*['"]?([^'"#\n]+?)['"]?\s*$/);
      const inlineFlowMatch = line.match(/^\s*-?\s*runFlow:\s*['"]?([^'"#\n]+?)['"]?\s*$/);

      if (inlineScriptMatch) {
        const filePath = inlineScriptMatch[1].trim();
        this._validateFile(filePath, currentDir, i + 1, 'runScript', errors);
      }

      if (inlineFlowMatch) {
        const filePath = inlineFlowMatch[1].trim();
        this._validateFile(filePath, currentDir, i + 1, 'runFlow', errors);
      }

      const runFlowMatch = line.match(/^\s*-?\s*runFlow:\s*$/);
      if (runFlowMatch && i + 1 < lines.length) {
        for (let j = i + 1; j < Math.min(i + LIMITS.MAX_LOOKAHEAD_LINES, lines.length); j++) {
          const nextLine = lines[j];
          const fileMatch = nextLine.match(/^\s*file:\s*['"]?([^'"#\n]+?)['"]?\s*$/);

          if (fileMatch) {
            const filePath = fileMatch[1].trim();
            this._validateFile(filePath, currentDir, j + 1, 'runFlow', errors);
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
   * Valida existência de um arquivo
   * @private
   */
  _validateFile(filePath, baseDir, lineNumber, commandType, errors) {
    if (filePath.includes('${')) {
      return;
    }

    const fileName = path.basename(filePath);
    if (fileName === 'setup.yaml' || fileName === 'teardown.yaml') {
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

  /**
   * Trata erros de parsing
   * @private
   */
  _handleParsingError(error, text, _docText) {
    const errors = [];
    const parsingErrors = detectMultipleParsingErrors(text);

    if (parsingErrors.length > 0) {
      parsingErrors.forEach(err => {
        const lines = err.split('\n');
        const diagram = lines.slice(1).join('\n');

        if (diagram.trim()) {
          errors.push(`Erro de indentação:${diagram}`);
        } else {
          errors.push(`Erro de indentação: ${lines[0]}`);
        }
      });
    } else {
      errors.push(`Erro na indentação do comando: ${error.message}`);
    }

    return errors;
  }

  /**
   * Detecta se um arquivo é um subflow
   * @private
   */
  _isSubflow(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    return SUBFLOW_PATTERN.test(normalizedPath);
  }
}

module.exports = new LintEngine();
