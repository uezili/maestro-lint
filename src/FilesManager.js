const fs = require('fs');
const path = require('path');
const fg = require('fast-glob');

class FilesManager {
  /**
   * Obtém a lista de arquivos a validar
   * @param {string|null} specificPath - Caminho específico (arquivo ou pasta)
   * @param {boolean} includeAllYaml - Se deve incluir todos os .yaml ou apenas os -test.yaml
   * @returns {Promise<string[]>} Array de caminhos de arquivos
   */
  // eslint-disable-next-line require-await
  async getFilesToLint(specificPath, includeAllYaml = false) {
    const pattern = includeAllYaml ? '**/*.yaml' : '**/*-test.yaml';

    if (!specificPath || specificPath.startsWith('-')) {
      throw new Error('Caminho não informado. Use: node maestro-linter.js <arquivo_ou_pasta>');
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

  /**
   * Valida se o caminho é válido
   * @param {string|null} specificPath - Caminho específico
   * @returns {boolean} true se válido
   */
  isValidPath(specificPath) {
    return specificPath && !specificPath.startsWith('-');
  }
}

module.exports = new FilesManager();
