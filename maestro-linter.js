const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const fg = require('fast-glob');

const { TAG_ONE_OF, NAME_PATTERN, VALID_PROPERTIES } = require('./src/constants');

const { extractFlowPath, findLineNumber, isValidFlowPath, findSimilarString } = require('./src/helpers');
const { validateCommands, validateWhenPropertyIndentation, validateFilePaths } = require('./src/validators');
const { detectMultipleParsingErrors } = require('./src/yamlError');
const { ERROR_MESSAGES } = require('./src/messages');

/**
 * Detecta se um arquivo é um subflow
 * @param {string} filePath - Caminho do arquivo
 * @returns {boolean} true se é um subflow
 */
function isSubflow(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return normalizedPath.includes('/subflows/');
}

/**
 * Valida comandos por análise de texto quando YAML não faz parse
 * @param {string} text - Texto do arquivo
 * @param {string[]} errors - Array para adicionar erros
 */
function tryValidateCommandsByText(text, errors) {
  validateCommandsByPattern(text, errors);
  validatePropertiesByPattern(text, errors);
}

/**
 * Valida comandos usando regex
 * @param {string} text - Texto do arquivo
 * @param {string[]} errors - Array para adicionar erros
 */
function validateCommandsByPattern(text, errors) {
  const { VALID_COMMANDS } = require('./src/constants');
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
      errors.push(ERROR_MESSAGES.COMMAND_CASE_SENSITIVE(commandName, similar, lineNumber));
    } else {
      const closeMatch = findSimilarString(commandName, VALID_COMMANDS);

      if (closeMatch) {
        errors.push(ERROR_MESSAGES.COMMAND_INVALID_WITH_SUGGESTION(commandName, closeMatch, lineNumber));
      } else {
        errors.push(ERROR_MESSAGES.COMMAND_INVALID(commandName, lineNumber));
      }
    }
  }
}

/**
 * Valida propriedades conhecidas com erros de digitação
 * @param {string} text - Texto do arquivo
 * @param {string[]} errors - Array para adicionar erros
 */
function validatePropertiesByPattern(text, errors) {
  const PROPERTY_TYPO_MAP = {
    pltform: 'platform',
    visibile: 'visible',
    notVisibile: 'notVisible'
  };

  const propertyPattern = /([a-zA-Z]+):\s*(\w+)?/gm;
  const reportedProps = new Set();
  let match;

  while ((match = propertyPattern.exec(text)) !== null) {
    const beforeMatch = text.substring(Math.max(0, match.index - 20), match.index);
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
        ERROR_MESSAGES.PROPERTY_TYPO(propName, PROPERTY_TYPO_MAP[propName], lineNumber)
      );
    }
  }
}

/**
 * Valida um arquivo YAML de teste Maestro
 * @param {string} filePath - Caminho do arquivo a validar
 * @returns {string[]} Array de erros encontrados
 */
function lintFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const errors = [];
  const isSubflowFile = isSubflow(filePath);

  if (!text.includes('appId:')) {
    errors.push(ERROR_MESSAGES.APPID_MISSING);
  }

  const docs = text.split('---');
  if (docs.length < 1) {
    errors.push(ERROR_MESSAGES.FILE_EMPTY);
    return errors;
  }

  let doc = null;
  let parsingError = false;

  try {
    doc = yaml.load(docs[0]);

    if (!doc) {
      errors.push(ERROR_MESSAGES.FILE_EMPTY);
      parsingError = true;
    }
  } catch (error) {
    const parsingErrors = detectMultipleParsingErrors(text);

    if (parsingErrors.length > 0) {
      parsingErrors.forEach((err, idx) => {
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

    parsingError = true;
    doc = null;
  }

  try {
    if (doc && !parsingError) {
      if (!isSubflowFile) {
        const docKeys = Object.keys(doc);
        docKeys.forEach(key => {
          if (!VALID_PROPERTIES.includes(key)) {
            const similarProp = VALID_PROPERTIES.find(vp => vp.toLowerCase() === key.toLowerCase());
            const lineNumber = findLineNumber(text, key);
            if (similarProp) {
              errors.push(
                lineNumber
                  ? `Linha ${lineNumber}: propriedade com sintaxe incorreta: "${key}" deveria ser "${similarProp}".`
                  : `Propriedade com sintaxe incorreta: "${key}" deveria ser "${similarProp}".`
              );
            } else {
              errors.push(`Propriedade inválida no cabeçalho: "${key}"${lineNumber ? ` (Linha ${lineNumber})` : ''}`);
            }
          }
        });
        const tags = doc.tags || [];
        if (!TAG_ONE_OF.some(t => tags.includes(t))) {
          errors.push('Tag de classificação ausente (smoke ou functional).');
        }

        if (!doc.name) {
          errors.push('Parâmetro name ausente.');
        } else if (!NAME_PATTERN.test(doc.name)) {
          errors.push('Parâmetro name fora do padrão "[testKeyZephyrScale] - Nome do teste".');
        }
        const onFlowStartProp = doc.onFlowStart || doc[docKeys.find(k => k.toLowerCase() === 'onflowstart')];

        if (onFlowStartProp) {
          const hasSetup = (onFlowStartProp || []).some(step => {
            const flowPath = extractFlowPath(step);
            return typeof flowPath === 'string' && isValidFlowPath(flowPath, 'setup.yaml');
          });

          if (!hasSetup) {
            const lineNumber = findLineNumber(text, 'setup.yaml');
            errors.push(
              `onFlowStart deve incluir setup.yaml (workspace\\common\\subflows\\setup.yaml)${lineNumber ? ` (Linha ${lineNumber})` : ''}`
            );
          }
        }
        const onFlowCompleteProp = doc.onFlowComplete || doc[docKeys.find(k => k.toLowerCase() === 'onflowcomplete')];

        if (onFlowCompleteProp) {
          const hasTeardown = (onFlowCompleteProp || []).some(step => {
            const flowPath = extractFlowPath(step);
            return typeof flowPath === 'string' && isValidFlowPath(flowPath, 'teardown.yaml');
          });

          if (!hasTeardown) {
            const lineNumber = findLineNumber(text, 'teardown.yaml');
            errors.push(
              `onFlowComplete deve incluir teardown.yaml (workspace\\common\\subflows\\teardown.yaml)${lineNumber ? ` (Linha ${lineNumber})` : ''}`
            );
          }
        }

        if (onFlowStartProp && Array.isArray(onFlowStartProp)) {
          validateCommands(onFlowStartProp, errors, text);
        }

        if (onFlowCompleteProp && Array.isArray(onFlowCompleteProp)) {
          validateCommands(onFlowCompleteProp, errors, text);
        }
      }
      if (docs.length > 1) {
        try {
          const commands = yaml.load(docs[1]);
          if (Array.isArray(commands)) {
            validateCommands(commands, errors, text);
          }
        } catch (commandError) {
          const commandParsingErrors = detectMultipleParsingErrors(text);
          if (commandParsingErrors.length > 0) {
            commandParsingErrors.forEach((err, idx) => {
              const lines = err.split('\n');
              const diagram = lines.slice(1).join('\n');
              
              if (diagram.trim()) {
                errors.push(`Erro de indentação:${diagram}`);
              } else {
                errors.push(`Erro de indentação: ${lines[0]}`);
              }
            });
          } else {
            errors.push(`Erro ao fazer indentação dos comandos: ${commandError.message}`);
          }
          tryValidateCommandsByText(text, errors);
        }
      }
    }

    if (parsingError && docs.length > 1) {
      try {
        const commands = yaml.load(docs[1]);
        if (Array.isArray(commands)) {
          validateCommands(commands, errors, text);
        }
      } catch (commandError) {
        tryValidateCommandsByText(text, errors);
      }
    }

    if (parsingError && docs.length === 1) {
      tryValidateCommandsByText(text, errors);
    }

    const whenIndentationErrors = validateWhenPropertyIndentation(text);
    errors.push(...whenIndentationErrors);

    const filePathErrors = validateFilePaths(text, filePath);
    errors.push(...filePathErrors);
  } catch (error) {
    errors.push(`Erro ao processar arquivo: ${error.message}`);
  }

  return errors;
}

/**
 * Exibe o resultado do linting
 * @param {number} passed - Quantidade de arquivos aprovados
 * @param {number} failed - Quantidade de arquivos reprovados
 * @param {number} total - Quantidade total de arquivos
 * @returns {boolean} true se todos passaram
 */
function displayResults(passed, failed, total) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Resultados:');
  console.log(`   ✓ Aprovados: ${passed}`);
  console.log(`   ✗ Reprovados: ${failed}`);
  console.log(`   📁 Total de arquivos: ${total}`);
  console.log(`${'='.repeat(60)}\n`);

  if (failed === 0) {
    console.log('✅ Todos os testes passaram no linter!\n');
    return true;
  }

  console.log('❌ Alguns testes falharam no linter.\n');
  return false;
}

/**
 * Processa e exibe erros de um arquivo
 * @param {string} filePath - Caminho do arquivo
 * @param {string[]} errors - Array de erros
 * @returns {boolean} true se passou, false se falhou
 */
function displayFileResult(filePath, errors) {
  if (errors.length) {
    console.log(`\n❌ ${path.basename(filePath)}`);
    errors.forEach(error => {
      console.log(`   - ${error}`);
    });
    return false;
  }
  return true;
}

/**
 * Obtém a lista de arquivos a validar
 * @param {string|null} specificPath - Caminho específico (arquivo ou pasta)
 * @returns {Promise<string[]>} Array de caminhos de arquivos
 */
function getFilesToLint(specificPath) {
  const includeAllYaml = process.argv.includes('--all-yaml');
  const pattern = includeAllYaml ? '**/*.yaml' : '**/*-test.yaml';

  if (specificPath === '.') {
    specificPath = null;
  }

  if (!specificPath) {
    return fg(`../workspace/tests/${pattern}`, { dot: false });
  }

  const resolvedPath = path.resolve(specificPath);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Caminho não encontrado: ${specificPath}`);
  }

  const stat = fs.statSync(resolvedPath);

  if (stat.isFile()) {
    return [resolvedPath];
  }

  if (stat.isDirectory()) {
    const normalizedPath = resolvedPath.replace(/\\/g, '/');
    return fg(`${normalizedPath}/${pattern}`, { dot: false });
  }

  throw new Error(`O caminho não é um arquivo ou pasta válido: ${specificPath}`);
}

async function main() {
  console.log('🔍 Executando Maestro Linter...\n');

  const specificPath = process.argv[2];
  let files;

  try {
    files = await getFilesToLint(specificPath);
  } catch (error) {
    console.log(`❌ ${error.message}\n`);
    process.exitCode = 1;
    return;
  }

  if (files.length === 0) {
    console.log('⚠️  Nenhum arquivo de teste encontrado.');
    return;
  }

  displayPathInfo(specificPath);

  let failed = 0;
  let passed = 0;

  for (const file of files) {
    const errors = lintFile(file);
    if (displayFileResult(file, errors)) {
      passed++;
    } else {
      failed++;
    }
  }

  const isSuccess = displayResults(passed, failed, files.length);
  process.exitCode = isSuccess ? 0 : 1;
}

/**
 * Exibe informação sobre o caminho sendo validado
 * @param {string|null} specificPath - Caminho específico
 */
function displayPathInfo(specificPath) {
  if (!specificPath) {
    return;
  }

  const stat = fs.statSync(path.resolve(specificPath));
  const type = stat.isDirectory() ? '📁 Verificando pasta' : '📄 Verificando arquivo';
  console.log(`${type}: ${specificPath}\n`);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
 