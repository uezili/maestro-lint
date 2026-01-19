const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this.config = this._loadConfig();
  }

  /**
   * Carrega a configuração do arquivo
   * @private
   * @returns {Object} Configuração carregada
   */
  _loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'linter.config.json');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(content);
      }

      return this._getDefaultConfig();
    } catch (error) {
      console.warn('⚠️ Erro ao carregar configuração:', error.message);
      return this._getDefaultConfig();
    }
  }

  /**
   * Retorna a configuração padrão
   * @private
   * @returns {Object} Configuração padrão
   */
  _getDefaultConfig() {
    return {
      tags: {
        requiredOneOf: []
      },
      rules: {
        header: {
          appId: 'error',
          tags: 'error',
          name: 'off',
          env: 'off',
          onFlowStart: 'off',
          onFlowComplete: 'off',
          invalidProperty: 'warning'
        },
        command: {
          invalidCommand: 'error',
          invalidProperty: 'error',
          missingValue: 'error',
          emptyValue: 'warning'
        },
        when: {
          invalidProperty: 'error',
          invalidPlatform: 'error',
          indentation: 'warning'
        },
        filePath: {
          fileNotFound: 'error',
          invalidPath: 'warning'
        }
      },
      settings: {
        reportUnusedDisableDirectives: 'warning',
        maxWarnings: -1
      }
    };
  }

  /**
   * Obtém a severidade de uma regra
   * @param {string} category - Categoria da regra (header, command, when, filePath)
   * @param {string} ruleName - Nome da regra
   * @returns {string} Severidade (error, warning, info, off)
   */
  getSeverity(category, ruleName) {
    const VALID_SEVERITIES = ['off', 'error', 'warning', 'info'];
    const rule = this.config.rules?.[category]?.[ruleName];

    return VALID_SEVERITIES.includes(rule) ? rule : 'error';
  }

  /**
   * Verifica se uma regra está habilitada
   * @param {string} category - Categoria da regra
   * @param {string} ruleName - Nome da regra
   * @returns {boolean} True se habilitada
   */
  isRuleEnabled(category, ruleName) {
    return this.getSeverity(category, ruleName) !== 'off';
  }

  /**
   * Retorna as configurações
   * @returns {Object} Objeto de configuração
   */
  getConfig() {
    return this.config;
  }

  /**
   * Retorna o limite máximo de warnings
   * @returns {number} Máximo de warnings (-1 para ilimitado)
   */
  getMaxWarnings() {
    return this.config.settings?.maxWarnings ?? -1;
  }

  /**
   * Retorna as tags obrigatórias configuradas
   * @returns {string[]} Array de tags que devem estar presentes (uma delas)
   */
  getRequiredTags() {
    return this.config.tags?.requiredOneOf ?? [];
  }

  /**
   * Recarrega a configuração
   * @returns {Object} Configuração recarregada
   */
  reload() {
    this.config = this._loadConfig();
    return this.config;
  }
}

module.exports = new ConfigManager();
