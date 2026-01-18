const { VALID_PLATFORMS } = require('./constants');

/**
 * Valida se uma plataforma é válida
 * @param {string} platform - Plataforma a validar
 * @returns {boolean} true se válida, false caso contrário
 */
function isValidPlatform(platform) {
  return typeof platform === 'string' && VALID_PLATFORMS.includes(platform.toLowerCase());
}

/**
 * Extrai o caminho do flow de um objeto ou valor
 * @param {*} step - Etapa a extrair o flow
 * @returns {string|null} Caminho do flow ou null
 */
function extractFlowPath(step) {
  if (typeof step === 'object' && step !== null) {
    // Support correct command and common mis-capitalizations for path detection
    if (step.runFlow) {
      return step.runFlow.file || step.runFlow;
    }
    if (step.runflow) {
      return step.runflow.file || step.runflow;
    }
  }
  return null;
}

/**
 * Encontra o número da linha de um termo específico no texto
 * @param {string} text - Texto completo do arquivo
 * @param {string} searchTerm - Termo a procurar
 * @param {string|null} context - Contexto opcional para busca mais precisa
 * @param {number} occurrence - Qual ocorrência procurar
 * @returns {number|null} Número da linha ou null se não encontrado
 */
function findLineNumber(text, searchTerm, context = null, occurrence = 1) {
  const lines = text.split('\n');
  let currentOccurrence = 0;
  let contextOccurrence = 0;

  const isCommentOrEmpty = line => /^\s*#/.test(line) || /^\s*$/.test(line);

  if (context) {
    for (let i = 0; i < lines.length; i++) {
      if (isCommentOrEmpty(lines[i])) {
        continue;
      }
      if (lines[i].includes(context)) {
        contextOccurrence++;
        if (contextOccurrence === occurrence) {
          const windowStart = i;
          const windowEnd = Math.min(lines.length, i + 20);
          for (let j = windowStart; j < windowEnd; j++) {
            if (isCommentOrEmpty(lines[j])) {
              continue;
            }
            if (lines[j].includes(searchTerm)) {
              return j + 1;
            }
          }
          break;
        }
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    if (isCommentOrEmpty(lines[i])) {
      continue;
    }
    if (lines[i].includes(searchTerm)) {
      currentOccurrence++;
      if (currentOccurrence === occurrence) {
        return i + 1;
      }
    }
  }
  return null;
}

/**
 * Normaliza caminhos para comparação
 * Converte diferentes formatos de caminho para um padrão único
 * @param {string} flowPath - Caminho do flow
 * @returns {string} Caminho normalizado
 */
function normalizeFlowPath(flowPath) {
  if (typeof flowPath !== 'string') {
    return '';
  }

  let normalized = flowPath.replace(/^['"]|['"]$/g, '').replace(/\\/g, '/');

  if (normalized.startsWith('../')) {
    normalized = normalized.replace(/^(\.\.\/)+/, '');
    if (!normalized.startsWith('workspace/')) {
      normalized = `workspace/${normalized}`;
    }
  } else if (!normalized.startsWith('workspace/') && normalized.includes('common/subflows')) {
    normalized = `workspace/${normalized}`;
  }

  return normalized;
}

/**
 * Calcula a distância de Levenshtein entre duas strings
 * @param {string} a - Primeira string
 * @param {string} b - Segunda string
 * @returns {number} Distância de edição
 */
function levenshteinDistance(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Encontra string similar usando distância de Levenshtein
 * @param {string} typo - String com possível erro
 * @param {string[]} validStrings - Lista de strings válidas
 * @param {number} tolerancePercentage - Percentual de tolerância (padrão: 0.3 = 30%)
 * @returns {string|null} String válida mais similar ou null
 */
function findSimilarString(typo, validStrings, tolerancePercentage = 0.3) {
  let bestMatch = null;
  let minDistance = Infinity;

  for (const validStr of validStrings) {
    const distance = levenshteinDistance(typo.toLowerCase(), validStr.toLowerCase());
    const maxAllowedDistance = Math.floor(validStr.length * tolerancePercentage);

    if (distance <= maxAllowedDistance && distance < minDistance) {
      minDistance = distance;
      bestMatch = validStr;
    }
  }

  return bestMatch;
}

module.exports = {
  isValidPlatform,
  extractFlowPath,
  findLineNumber,
  normalizeFlowPath,
  levenshteinDistance,
  findSimilarString
};
