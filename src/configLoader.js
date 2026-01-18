const fs = require('fs');
const path = require('path');
const rulesConfig = require('./../config.lint.json');

const DEFAULT_CONFIG = {
  rules: {
    requiredTags: {
      enabled: true,
      allowedTags: ['smoke', 'functional'],
      message: 'Tag de classificação ausente (smoke ou functional).'
    },
    validProperties: {
      enabled: true,
      properties: ['appId', 'tags', 'onFlowStart', 'onFlowComplete', 'env']
    },
    requiredAppId: {
      enabled: true,
      message: 'Parâmetro appId ausente.'
    },
    requiredSetup: {
      enabled: true,
      message: 'onFlowStart deve incluir setup.yaml (workspace\\common\\subflows\\setup.yaml)',
      expectedFile: 'setup.yaml'
    },
    requiredTeardown: {
      enabled: true,
      message: 'onFlowComplete deve incluir teardown.yaml (workspace\\common\\subflows\\teardown.yaml)',
      expectedFile: 'teardown.yaml'
    },
    validateCommands: {
      enabled: true
    },
    validateFilePaths: {
      enabled: true
    }
  }
};

/**
 * Carrega a configuração do arquivo config.lint.json
 * @param {string} configPath - Caminho para o arquivo de configuração (opcional)
 * @returns {object} Configuração carregada ou padrão
 */
function loadConfig(configPath = null) {
  // Tenta carregar o arquivo de configuração
  const possiblePaths = [
    configPath,
    path.join(process.cwd(), 'config.lint.json'),
    path.join(process.cwd(), '.maestro-lint.json'),
    path.join(__dirname, '..', 'config.lint.json')
  ].filter(Boolean);

  for (const filePath of possiblePaths) {
    try {
      if (fs.existsSync(filePath)) {
        const configContent = fs.readFileSync(filePath, 'utf8');
        const userConfig = JSON.parse(configContent);
        
        // Mescla a configuração do usuário com a padrão
        return mergeConfig(DEFAULT_CONFIG, userConfig);
      }
    } catch (error) {
      console.warn(`⚠️  Erro ao carregar configuração de ${filePath}: ${error.message}`);
    }
  }

  // Retorna configuração padrão se nenhum arquivo for encontrado
  return DEFAULT_CONFIG;
}

/**
 * Mescla a configuração do usuário com a configuração padrão
 * @param {object} defaultConfig - Configuração padrão
 * @param {object} userConfig - Configuração do usuário
 * @returns {object} Configuração mesclada
 */
function mergeConfig(defaultConfig, userConfig) {
  const merged = JSON.parse(JSON.stringify(defaultConfig));

  if (userConfig.rules) {
    Object.keys(userConfig.rules).forEach(ruleName => {
      if (merged.rules[ruleName]) {
        merged.rules[ruleName] = {
          ...merged.rules[ruleName],
          ...userConfig.rules[ruleName]
        };
      } else {
        merged.rules[ruleName] = userConfig.rules[ruleName];
      }
    });
  }

  return merged;
}

/**
 * Verifica se uma regra está habilitada
 * @param {object} config - Configuração carregada
 * @param {string} ruleName - Nome da regra
 * @returns {boolean} true se a regra está habilitada
 */
function isRuleEnabled(config, ruleName) {
  return config.rules[ruleName]?.enabled !== false;
}

/**
 * Obtém a configuração de uma regra específica
 * @param {object} config - Configuração carregada
 * @param {string} ruleName - Nome da regra
 * @returns {object|null} Configuração da regra ou null
 */
function getRuleConfig(config, ruleName) {
  return config.rules[ruleName] || null;
}

module.exports = {
  loadConfig,
  isRuleEnabled,
  getRuleConfig,
  DEFAULT_CONFIG
};
