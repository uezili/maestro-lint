const fs = require('fs');
// js-yaml: usado para parsing de documentos YAML (yaml.load) — header (docs[0]) e seção de comandos (docs[1])
const yaml = require('js-yaml');
const { detectMultipleParsingErrors } = require('./YamlError');
const ErrorSeverityConverter = require('./ErrorSeverityConverter');
const ValidationError = require('./validators/ValidationError');
const ConfigManager = require('./ConfigManager');
const RuleDetector = require('./RuleDetector');
const { VALID_COMMANDS, LIMITS, PROPERTY_TYPO_MAP } = require('./constants');
const { findSimilarString } = require('./helpers');
const commandValidator = require('./validators/CommandValidator');
const headerValidator = require('./validators/HeaderValidator');
const IndentationValidator = require('./validators/IndentationValidator');
const FilePathValidator = require('./validators/FilePathValidator');

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
      errors.push('Parâmetro appId ausente.');
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
   * Valida indentação de propriedades usando IndentationValidator
   * @private
   */
  _validateIndentation(text) {
    return IndentationValidator.validate(text);
  }

  /**
   * Valida caminhos de arquivos usando FilePathValidator
   * @private
   */
  _validateFilePaths(text, currentFilePath) {
    return FilePathValidator.validate(text, currentFilePath);
  }

  /**
   * Trata erros de parsing
   * @private
   */
  _handleParsingError(error, text) {
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
