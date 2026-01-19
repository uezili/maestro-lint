const fs = require('fs');
const path = require('path');
const ValidationError = require('./ValidationError');
const { LIMITS } = require('../constants');

const TEMPLATE_PATTERN = /\$\{/;
const IGNORE_FILES = new Set(['setup.yaml', 'teardown.yaml']);
const SCRIPT_EXTENSIONS = ['.js'];
const FLOW_EXTENSIONS = ['.yaml', '.yml'];

class FilePathValidator {
  /**
   * Valida caminhos de arquivos em runScript e runFlow
   * @param {string} text - Texto completo do arquivo
   * @param {string} currentFilePath - Caminho do arquivo sendo validado
   * @returns {ValidationError[]} Array de erros encontrados
   */
  validate(text, currentFilePath) {
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
        this._validateRunFlowBlock(lines, i, currentDir, errors);
      }
    }

    return errors;
  }

  /**
   * Valida um bloco runFlow
   * @private
   */
  _validateRunFlowBlock(lines, startIndex, currentDir, errors) {
    for (let j = startIndex + 1; j < Math.min(startIndex + LIMITS.MAX_LOOKAHEAD_LINES, lines.length); j++) {
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

  /**
   * Valida se um arquivo existe
   * @private
   */
  _validateFile(filePath, baseDir, lineNumber, commandType, errors) {
    if (TEMPLATE_PATTERN.test(filePath)) {
      return;
    }

    const fileName = path.basename(filePath);
    if (IGNORE_FILES.has(fileName)) {
      return;
    }

    const absolutePath = path.resolve(baseDir, filePath);

    if (!fs.existsSync(absolutePath)) {
      if (!this._tryExtensions(absolutePath, commandType)) {
        errors.push(new ValidationError(`Arquivo não encontrado: "${filePath}"`, lineNumber));
      }
    }
  }

  /**
   * Tenta diferentes extensões de arquivo
   * @private
   */
  _tryExtensions(basePath, commandType) {
    const ext = path.extname(basePath);

    if (!ext) {
      const extensions = commandType === 'runScript' ? SCRIPT_EXTENSIONS : FLOW_EXTENSIONS;

      for (const extension of extensions) {
        if (fs.existsSync(basePath + extension)) {
          return true;
        }
      }
    }

    return false;
  }
}

module.exports = new FilePathValidator();
