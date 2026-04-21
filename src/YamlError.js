// js-yaml: usado para tentar fazer parse iterativo do YAML (yaml.load) e capturar erros de indentação/sintaxe
const yaml = require('js-yaml');
const { LIMITS } = require('./constants');

/**
 * Detecta erros em um documento YAML específico com múltiplas tentativas
 * @param {string} docText - Conteúdo do documento YAML
 * @param {number} lineOffset - Offset de linha para ajustar numeração
 * @returns {string[]} Array de erros encontrados
 */
function detectErrorsInDocument(docText, lineOffset = 0) {
  const errors = [];
  let currentText = docText;
  let iterations = 0;
  const problemLines = new Set();
  const reportedLines = new Set();

  while (iterations < LIMITS.MAX_YAML_PARSE_ITERATIONS) {
    iterations++;

    try {
      yaml.load(currentText);
      break;
    } catch (error) {
      const errorMsg = error.message;
      const actualLine = error.mark && error.mark.line !== undefined ? error.mark.line + 1 + lineOffset : null;

      const isParsingError =
        errorMsg.toLowerCase().includes('indentation') ||
        errorMsg.toLowerCase().includes('mapping') ||
        errorMsg.toLowerCase().includes('sequence') ||
        errorMsg.toLowerCase().includes('expected') ||
        errorMsg.toLowerCase().includes('bad');

      if (isParsingError) {
        const alreadyReported = actualLine !== null && reportedLines.has(actualLine);

        let adjustedError = errorMsg;
        if (!alreadyReported && lineOffset > 0 && error.mark && error.mark.line !== undefined) {
          const lines = errorMsg.split('\n');
          const adjustedLines = lines.map(line => {
            return line.replace(/^\s*(\d+)\s*\|/, (match, lineNum) => {
              const adjusted = parseInt(lineNum) + lineOffset;
              return match.replace(lineNum, adjusted);
            });
          });
          adjustedError = adjustedLines.join('\n');
        }

        if (!alreadyReported) {
          errors.push(adjustedError);
          if (actualLine !== null) {
            reportedLines.add(actualLine);
          }
        }

        if (error.mark && error.mark.line !== undefined) {
          const lines = currentText.split('\n');
          const problemLineNum = error.mark.line;

          if (problemLineNum >= 0 && problemLineNum < lines.length && !problemLines.has(problemLineNum)) {
            const baseIndent = (lines[problemLineNum].match(/^(\s*)/) || ['', ''])[1].length;
            let endLine = problemLineNum + 1;
            while (endLine < lines.length) {
              const line = lines[endLine];
              if (!line.trim()) {
                endLine++;
                continue;
              }
              const indent = (line.match(/^(\s*)/) || ['', ''])[1].length;
              if (indent > baseIndent) {
                endLine++;
                continue;
              }
              break;
            }

            for (let i = problemLineNum; i < endLine; i++) {
              problemLines.add(i);
            }
            lines.splice(problemLineNum, endLine - problemLineNum);
            currentText = lines.join('\n');
          } else {
            break;
          }
        } else {
          break;
        }
      } else {
        break;
      }
    }
  }

  return errors;
}

/**
 * Captura TODOS os erros de parsing da biblioteca js-yaml
 * Trata documento de header e comandos separadamente
 * @param {string} text - Conteúdo do arquivo YAML completo
 * @returns {string[]} Array de TODOS os erros de indentação encontrados
 */
function detectMultipleParsingErrors(text) {
  const errors = [];
  const docs = text.split(/^---$/m);

  if (docs[0]) {
    const headerErrors = detectErrorsInDocument(docs[0], 0);
    errors.push(...headerErrors);
  }

  if (docs[1]) {
    const headerLines = docs[0] ? docs[0].split('\n').length : 0;
    const lineOffset = headerLines + 1;

    const commandsErrors = detectErrorsInDocument(docs[1], lineOffset);
    errors.push(...commandsErrors);
  }

  return errors;
}

module.exports = {
  detectMultipleParsingErrors
};
