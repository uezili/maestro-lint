const ValidationError = require('./ValidationError');
const ConfigManager = require('../ConfigManager');
const { BLOCK_COMMANDS, COMMAND_LIST_PROPERTIES, NESTED_PROPERTIES } = require('../constants');

class IndentationValidator {
  constructor() {
    this.BLOCK_COMMANDS = BLOCK_COMMANDS;
    this.COMMAND_LIST_PROPERTIES = COMMAND_LIST_PROPERTIES;
    this.NESTED_PROPERTIES = NESTED_PROPERTIES;
  }

  /**
   * Valida indentação de todo o arquivo YAML
   * @param {string} text - Conteúdo do arquivo
   * @returns {ValidationError[]} - Lista de erros encontrados
   */
  validate(text) {
    const errors = [];
    const lines = text.split('\n');
    const indentSize = ConfigManager.getIndentationSpaces();
    
    let inHeader = true;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      if (line.trim() === '---') {
        inHeader = false;
        continue;
      }
      
      if (this._shouldSkipLine(line)) {
        continue;
      }
      
      if (inHeader) {
        continue;
      }
      
      errors.push(...this._validateLine(line, lineNumber, lines, i, indentSize));
    }
    
    return errors;
  }

  /**
   * Valida uma linha individual
   * @private
   */
  _validateLine(line, lineNumber, lines, lineIndex, indentSize) {
    const errors = [];
    const currentIndent = this._getIndentation(line);
    const trimmedLine = line.trim();
    
    const parentContext = this._findParentContext(lines, lineIndex);
    
    if (this._isCommand(trimmedLine)) {
      if (parentContext.isInsideCommandsList) {

        const minExpectedIndent = parentContext.commandsIndent;
        const maxExpectedIndent = parentContext.commandsIndent + indentSize;
        
        if (currentIndent !== minExpectedIndent && currentIndent !== maxExpectedIndent) {
          errors.push(
            new ValidationError(
              `Indentação incorreta em comando aninhado. Esperado ${minExpectedIndent} ou ${maxExpectedIndent} espaços, encontrado ${currentIndent}.`,
              lineNumber
            )
          );
        }
      } else if (currentIndent !== 0) {
        errors.push(
          new ValidationError(
            `Indentação incorreta em comando. Comandos de nível raiz devem ter 0 espaços. Encontrado ${currentIndent}.`,
            lineNumber
          )
        );
      }
      return errors;
    }
    
    if (this._isProperty(trimmedLine)) {
      const propertyName = this._extractPropertyName(trimmedLine);
      
      if (parentContext.commandIndent !== null) {

        const commandPropertyIndent = parentContext.commandIndent + 2 + indentSize;
        
        if (parentContext.isInsideNestedProperty) {

          const nestedExpectedIndent = parentContext.nestedPropertyIndent + indentSize;
          if (currentIndent !== nestedExpectedIndent) {
            errors.push(
              new ValidationError(
                `Indentação incorreta em propriedade '${propertyName}'. Esperado ${nestedExpectedIndent} espaços, encontrado ${currentIndent}.`,
                lineNumber
              )
            );
          }
        } else if (currentIndent !== commandPropertyIndent) {
          errors.push(
            new ValidationError(
              `Indentação incorreta em propriedade '${propertyName}'. Esperado ${commandPropertyIndent} espaços, encontrado ${currentIndent}.`,
              lineNumber
            )
          );
        }
      }
    }
    
    return errors;
  }

  /**
   * Encontra o contexto do pai (comando, propriedade aninhada, etc.)
   * @private
   */
  _findParentContext(lines, lineIndex) {
    const context = {
      commandIndent: null,
      isInsideCommandsList: false,
      commandsIndent: 0,
      isInsideNestedProperty: false,
      nestedPropertyIndent: 0,
      immediateParentIndent: null
    };
    
    const currentLine = lines[lineIndex];
    const currentTrimmed = currentLine.trim();
    const currentIndent = this._getIndentation(currentLine);
    const isCurrentCommand = this._isCommand(currentTrimmed);
    
    for (let i = lineIndex - 1; i >= 0; i--) {
      const prevLine = lines[i];
      const prevTrimmed = prevLine.trim();
      
      if (prevTrimmed === '---' || prevTrimmed === '') continue;
      if (prevTrimmed.startsWith('#')) continue;
      
      const prevIndent = this._getIndentation(prevLine);

      if (isCurrentCommand) {
        if (this._isProperty(prevTrimmed) && prevIndent <= currentIndent) {
          const propName = this._extractPropertyName(prevTrimmed);
          
          if (this.COMMAND_LIST_PROPERTIES.includes(propName)) {
            context.isInsideCommandsList = true;
            context.commandsIndent = prevIndent;
          }
        }
        
        if (this._isCommand(prevTrimmed) && prevIndent < currentIndent) {
          context.commandIndent = prevIndent;
          break;
        }
      } else {
        if (prevIndent >= currentIndent) continue;
        
        if (context.immediateParentIndent === null) {
          context.immediateParentIndent = prevIndent;
        }
        
        if (this._isProperty(prevTrimmed)) {
          const propName = this._extractPropertyName(prevTrimmed);
          
          if (this.COMMAND_LIST_PROPERTIES.includes(propName)) {
            context.isInsideCommandsList = true;
            context.commandsIndent = prevIndent;
          }
          
          if (this.NESTED_PROPERTIES.includes(propName) && prevIndent === context.immediateParentIndent) {
            context.isInsideNestedProperty = true;
            context.nestedPropertyIndent = prevIndent;
          }
        }
        
        if (this._isCommand(prevTrimmed)) {
          context.commandIndent = prevIndent;
          break;
        }
      }
    }
    
    return context;
  }

  /**
   * Verifica se a linha deve ser pulada
   * @private
   */
  _shouldSkipLine(line) {
    const trimmed = line.trim();
    return trimmed === '' || trimmed.startsWith('#');
  }

  /**
   * Obtém o número de espaços de indentação
   * @private
   */
  _getIndentation(line) {
    const match = /^(\s*)/.exec(line);
    return match ? match[1].length : 0;
  }

  /**
   * Verifica se é um comando (começa com -)
   * @private
   */
  _isCommand(trimmedLine) {
    return trimmedLine.startsWith('- ');
  }

  /**
   * Verifica se é uma propriedade
   * @private
   */
  _isProperty(trimmedLine) {
    return /^[\w-]+:/.test(trimmedLine);
  }

  /**
   * Extrai o nome da propriedade
   * @private
   */
  _extractPropertyName(trimmedLine) {
    const match = /^([\w-]+):/.exec(trimmedLine);
    return match ? match[1] : null;
  }

}

module.exports = new IndentationValidator();
