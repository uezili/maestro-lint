/**
 * Detector de Regras
 * Responsabilidade: Detectar categoria e tipo de regra baseado na mensagem de erro
 */

const RULE_PATTERNS = [
  // Header rules
  { pattern: /appId ausente|Parâmetro appId ausente/, category: 'header', ruleType: 'appId' },
  { pattern: /tags ausente|Parâmetro tags ausente/, category: 'header', ruleType: 'tags' },
  {
    pattern: /Propriedade de header inválida|Propriedade inválida no cabeçalho/,
    category: 'header',
    ruleType: 'invalidProperty'
  },

  // When rules
  { pattern: /propriedade inválida.*em 'when'/, category: 'when', ruleType: 'invalidProperty' },
  { pattern: /platform deve ser/, category: 'when', ruleType: 'invalidPlatform' },
  { pattern: /Erro de indentação|Indentação incorreta/, category: 'when', ruleType: 'indentation' },

  // FilePath rules
  { pattern: /Arquivo não encontrado/, category: 'filePath', ruleType: 'fileNotFound' },
  { pattern: /Caminho inválido|invalidPath/, category: 'filePath', ruleType: 'invalidPath' },

  // Command rules
  { pattern: /comando inválido/, category: 'command', ruleType: 'invalidCommand' },
  {
    pattern: /propriedade inválida|deve ter pelo menos uma propriedade/,
    category: 'command',
    ruleType: 'invalidProperty'
  },
  { pattern: /requer um valor/, category: 'command', ruleType: 'missingValue' },
  { pattern: /está vazio|valor vazio/, category: 'command', ruleType: 'emptyValue' }
];

const DEFAULT_RULE = { category: 'command', ruleType: 'invalidCommand' };

class RuleDetector {
  /**
   * Detecta categoria e tipo de regra baseado na mensagem de erro
   * @param {string} message - Mensagem de erro
   * @returns {{ category: string, ruleType: string }} Categoria e tipo da regra
   */
  detect(message) {
    if (!message || typeof message !== 'string') {
      return DEFAULT_RULE;
    }

    for (const rule of RULE_PATTERNS) {
      if (rule.pattern.test(message)) {
        return { category: rule.category, ruleType: rule.ruleType };
      }
    }

    return DEFAULT_RULE;
  }

  /**
   * Adiciona um novo padrão de regra
   * @param {RegExp} pattern - Padrão regex
   * @param {string} category - Categoria
   * @param {string} ruleType - Tipo da regra
   */
  addPattern(pattern, category, ruleType) {
    RULE_PATTERNS.unshift({ pattern, category, ruleType });
  }
}

module.exports = new RuleDetector();
