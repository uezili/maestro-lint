/**
 * Maestro Linter - Validador de testes Maestro em YAML
 * Orquestrador principal do linter
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const fg = require('fast-glob');

const { TAG_ONE_OF, NAME_PATTERN, VALID_PROPERTIES } = require('./src/constants');

const { extractFlowPath, findLineNumber, isValidFlowPath } = require('./src/helpers');
const { validateCommands } = require('./src/validators');
const { validateIndentation } = require('./src/indentation-validator');

/**
 * Valida um arquivo YAML de teste Maestro
 * @param {string} filePath - Caminho do arquivo a validar
 * @returns {string[]} Array de erros encontrados
 */
function lintFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const errors = [];

  // Validar indentação primeiro (antes do parsing)
  const indentErrors = validateIndentation(text);
  errors.push(...indentErrors);

  try {
    // Maestro usa múltiplos documentos YAML separados por '---'
    // Precisamos fazer o parse apenas do primeiro documento (metadados)
    const docs = text.split('---');
    if (docs.length < 1) {
      errors.push('Arquivo YAML vazio ou inválido.');
      return errors;
    }

    const doc = yaml.load(docs[0]);

    if (!doc) {
      errors.push('Arquivo YAML vazio ou inválido.');
      return errors;
    }

    // Validar propriedades do cabeçalho
    const docKeys = Object.keys(doc);
    docKeys.forEach(key => {
      if (!VALID_PROPERTIES.includes(key)) {
        // Busca uma propriedade válida com capitalização similar
        const similarProp = VALID_PROPERTIES.find(
          vp => vp.toLowerCase() === key.toLowerCase()
        );
        const lineNumber = findLineNumber(text, key);
        if (similarProp) {
          errors.push(
            lineNumber
              ? `Linha ${lineNumber}: propriedade com sintaxe incorreta: "${key}" deveria ser "${similarProp}".`
              : `Propriedade com sintaxe incorreta: "${key}" deveria ser "${similarProp}".`
          );
        } else {
          errors.push(`Propriedade inválida no cabeçalho: "${key}"${getLineInfo(lineNumber)}`);
        }
      }
    });

    // Validar appId (obrigatório)
    if (!doc.appId) {
      errors.push('Parâmetro appId ausente (identificador da aplicação).');
    }

    // Validar tags
    const tags = doc.tags || [];
    if (!TAG_ONE_OF.some(t => tags.includes(t))) {
      errors.push('Tag de classificação ausente (smoke ou functional).');
    }

    // Validar name
    if (!doc.name) {
      errors.push('Parâmetro name ausente.');
    } else if (!NAME_PATTERN.test(doc.name)) {
      errors.push('Parâmetro name fora do padrão "[testKeyZephyrScale] - Nome do teste".');
    }

    // Validar onFlowStart - aceita caminhos relativos também
    const onFlowStartProp = doc.onFlowStart || doc[docKeys.find(k => k.toLowerCase() === 'onflowstart')];

    if (onFlowStartProp) {
      const hasSetup = (onFlowStartProp || []).some(step => {
        const flowPath = extractFlowPath(step);
        return typeof flowPath === 'string' && isValidFlowPath(flowPath, 'setup.yaml');
      });

      if (!hasSetup) {
        const lineNumber = findLineNumber(text, 'setup.yaml');
        errors.push(`onFlowStart deve incluir setup.yaml (workspace\\common\\subflows\\setup.yaml)${getLineInfo(lineNumber)}`);
      }
    }

    // Validar onFlowComplete - aceita caminhos relativos também
    const onFlowCompleteProp = doc.onFlowComplete || doc[docKeys.find(k => k.toLowerCase() === 'onflowcomplete')];

    if (onFlowCompleteProp) {
      const hasTeardown = (onFlowCompleteProp || []).some(step => {
        const flowPath = extractFlowPath(step);
        return typeof flowPath === 'string' && isValidFlowPath(flowPath, 'teardown.yaml');
      });

      if (!hasTeardown) {
        const lineNumber = findLineNumber(text, 'teardown.yaml');
        errors.push(`onFlowComplete deve incluir teardown.yaml (workspace\\common\\subflows\\teardown.yaml)${getLineInfo(lineNumber)}`);
      }
    }

    // Validar comandos no onFlowStart
    if (onFlowStartProp && Array.isArray(onFlowStartProp)) {
      validateCommands(onFlowStartProp, errors, text);
    }

    // Validar comandos no onFlowComplete
    if (onFlowCompleteProp && Array.isArray(onFlowCompleteProp)) {
      validateCommands(onFlowCompleteProp, errors, text);
    }

    // Validar comandos do segundo documento (após o ---)
    if (docs.length > 1) {
      try {
        const commands = yaml.load(docs[1]);
        if (Array.isArray(commands)) {
          validateCommands(commands, errors, text);
        }
      } catch (error) {
        // Ignora erros de parsing do segundo documento
      }
    }
  } catch (error) {
    errors.push(`Erro ao fazer parsing do YAML: ${error.message}`);
  }

  return errors;
}

/**
 * Exibe o resultado do linting
 * @param {number} passed - Quantidade de arquivos aprovados
 * @param {number} failed - Quantidade de arquivos reprovados
 * @param {number} total - Quantidade total de arquivos
 */
function displayResults(passed, failed, total) {
  console.log(`\n${  '='.repeat(60)}`);
  console.log('📊 Resultados:');
  console.log(`   ✓ Aprovados: ${passed}`);
  console.log(`   ✗ Reprovados: ${failed}`);
  console.log(`   📁 Total de arquivos: ${total}`);
  console.log(`${'='.repeat(60)  }\n`);

  if (failed === 0) {
    console.log('✅ Todos os testes passaram no linter!\n');
    return true;
  } else {
    console.log('❌ Alguns testes falharam no linter.\n');
    return false;
  }
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
    errors.forEach(e => console.log(`   - ${e}`));
    return false;
  }
  return true;
}

/**
 * Obtém a lista de arquivos a validar
 * @param {string|null} specificPath - Caminho específico (arquivo ou pasta)
 * @returns {Promise<string[]>} Array de caminhos de arquivos
 */
async function getFilesToLint(specificPath) {
  let files;

  // Se passou "." (pasta atual), assume como se fosse todos os testes
  if (specificPath === '.') {
    specificPath = null;
  }

  if (specificPath) {
    const resolvedPath = path.resolve(specificPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Caminho não encontrado: ${specificPath}`);
    }

    const stat = fs.statSync(resolvedPath);

    if (stat.isDirectory()) {
      // Se é uma pasta, busca todos os arquivos -test.yaml
      const normalizedPath = resolvedPath.replace(/\\/g, '/');
      files = await fg(`${normalizedPath}/*-test.yaml`, { dot: false });

      // Se não encontrou no primeiro nível, tenta recursivamente
      if (files.length === 0) {
        files = await fg(`${normalizedPath}/**/*-test.yaml`, { dot: false });
      }
    } else if (stat.isFile()) {
      // Se é um arquivo, verifica apenas ele
      files = [resolvedPath];
    } else {
      throw new Error(`O caminho não é um arquivo ou pasta válido: ${specificPath}`);
    }
  } else {
    // Valida todos os testes por padrão
    files = await fg('../workspace/tests/**/*-test.yaml', { dot: false });
  }

  return files;
}

/**
 * Função principal do linter
 */
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

  if (specificPath) {
    if (fs.statSync(path.resolve(specificPath)).isDirectory()) {
      console.log(`📁 Verificando pasta: ${specificPath}\n`);
    } else {
      console.log(`📄 Verificando arquivo: ${specificPath}\n`);
    }
  }

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

main().catch(err => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
