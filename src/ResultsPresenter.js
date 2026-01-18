const path = require('path');

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
   * @param {string[]} errors - Array de erros
   * @returns {boolean} true se passou, false se falhou
   */
  displayFileResult(filePath, errors) {
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
   * Exibe o resultado final do linting
   * @param {number} passed - Quantidade de arquivos aprovados
   * @param {number} failed - Quantidade de arquivos reprovados
   * @param {number} total - Quantidade total de arquivos
   * @returns {boolean} true se todos passaram
   */
  displayResults(passed, failed, total) {
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
