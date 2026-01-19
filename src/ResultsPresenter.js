const path = require('path');
const { LIMITS } = require('./constants');

class ResultsPresenter {
  /**
   * Exibe informação sobre o caminho sendo validado
   * @param {string} specificPath - Caminho específico
   */
  displayPathInfo(specificPath) {
    if (!specificPath) {
      return;
    }

    const fs = require('fs');
    const stat = fs.statSync(path.resolve(specificPath));
    const type = stat.isDirectory() ? '📁 Verificando pasta' : '📄 Verificando arquivo';
    console.log(`${type}: ${specificPath}\n`);
  }

  /**
   * Processa e exibe erros de um arquivo
   * @param {string} filePath - Caminho do arquivo
   * @param {Object[]} errors - Array de ValidationError com severidade
   * @returns {boolean} true se passou (sem errors), false se falhou
   */
  displayFileResult(filePath, errors) {
    if (!errors || errors.length === 0) {
      return true;
    }

    const errorsByType = {
      error: [],
      warning: [],
      info: []
    };

    errors.forEach(error => {
      const severity = error.severity || 'error';
      if (severity !== 'off') {
        if (!errorsByType[severity]) {
          errorsByType[severity] = [];
        }
        errorsByType[severity].push(error);
      }
    });

    const hasErrors = errorsByType.error.length > 0;

    const statusIcon = hasErrors ? '❌' : '⚠️';
    console.log(`\n${statusIcon} ${path.basename(filePath)}`);

    errorsByType.error.forEach(error => {
      const lineInfo = error.lineNumber ? ` (Linha ${error.lineNumber})` : '';
      console.log(`   - ❌ ${error.message}${lineInfo}`);
    });

    errorsByType.warning.forEach(error => {
      const lineInfo = error.lineNumber ? ` (Linha ${error.lineNumber})` : '';
      console.log(`   - ⚠️  ${error.message}${lineInfo} [AVISO]`);
    });

    errorsByType.info.forEach(error => {
      const lineInfo = error.lineNumber ? ` (Linha ${error.lineNumber})` : '';
      console.log(`   - ℹ️  ${error.message}${lineInfo} [INFO]`);
    });

    return !hasErrors;
  }

  /**
   * Exibe o resultado final do linting
   * @param {number} passed - Quantidade de arquivos aprovados
   * @param {number} failed - Quantidade de arquivos reprovados
   * @param {number} total - Quantidade total de arquivos
   * @param {Object} stats - Estatísticas de erros e warnings
   * @returns {boolean} true se todos passaram
   */
  displayResults(passed, failed, total, stats = {}) {
    const { errors = 0, warnings = 0, infos = 0 } = stats;

    console.log(`\n${'='.repeat(LIMITS.SEPARATOR_WIDTH)}`);
    console.log('📊 Resultados:');
    console.log(`   ✓ Aprovados: ${passed}`);
    console.log(`   ✗ Reprovados: ${failed}`);
    console.log(`   📁 Total de arquivos: ${total}`);

    if (errors > 0 || warnings > 0 || infos > 0) {
      console.log('\n   Detalhes:');
      if (errors > 0) {
        console.log(`   ❌ Errors: ${errors}`);
      }
      if (warnings > 0) {
        console.log(`   ⚠️  Warnings: ${warnings}`);
      }
      if (infos > 0) {
        console.log(`   ℹ️  Infos: ${infos}`);
      }
    }

    console.log(`${'='.repeat(LIMITS.SEPARATOR_WIDTH)}\n`);

    if (failed === 0) {
      console.log('✅ Todos os testes passaram no linter!\n');
      return true;
    }

    console.log('❌ Alguns testes falharam no linter.\n');
    return false;
  }

  /**
   * Exibe mensagem de erro
   * @param {string} message - Mensagem
   */
  displayError(message) {
    console.log(`❌ ${message}\n`);
  }

  /**
   * Exibe mensagem de informação
   * @param {string} message - Mensagem
   */
  displayInfo(message) {
    console.log(`${message}\n`);
  }
}

module.exports = new ResultsPresenter();
