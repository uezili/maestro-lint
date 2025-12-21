/**
 * Funções auxiliares para o Maestro Linter
 */

const { VALID_PLATFORMS } = require('./constants');

/**
 * Formata informação de linha para exibição em mensagens de erro
 * @param {number|null} lineNumber - Número da linha
 * @returns {string} String formatada com número de linha ou vazia
 */
function getLineInfo(lineNumber) {
  return lineNumber ? ` (linha ${lineNumber})` : '';
}

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

  // Se temos um contexto específico, primeiro contamos as ocorrências de contexto
  if (context) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(context)) {
        contextOccurrence++;
        if (contextOccurrence === occurrence) {
          // Encontramos o contexto correto, agora procura por searchTerm próximo
          const windowStart = i;
          const windowEnd = Math.min(lines.length, i + 10); // Procura até 10 linhas à frente
          for (let j = windowStart; j < windowEnd; j++) {
            if (lines[j].includes(searchTerm)) {
              return j + 1;
            }
          }
          break;
        }
      }
    }
  }

  // Busca com ocorrência especificada
  for (let i = 0; i < lines.length; i++) {
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
  if (typeof flowPath !== 'string') return '';

  // Remove aspas simples/duplas
  let normalized = flowPath.replace(/^['"]|['"]$/g, '');

  // Converte barras invertidas para barras normais
  normalized = normalized.replace(/\\/g, '/');

  // Resolve caminhos relativos como ../../common/subflows/setup.yaml
  // e converte para workspace/common/subflows/setup.yaml
  if (normalized.startsWith('../')) {
    const parts = normalized.split('/');
    let upLevels = 0;
    let pathIndex = 0;

    // Conta quantos níveis subir
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '..') {
        upLevels++;
      } else {
        pathIndex = i;
        break;
      }
    }

    // Se tem ../../ no início, assume que vem de tests/<produto>/
    // Então ../../common/subflows/setup.yaml equivale a workspace/common/subflows/setup.yaml
    if (upLevels >= 2) {
      normalized = parts.slice(pathIndex).join('/');
      if (!normalized.startsWith('workspace/')) {
        normalized = 'workspace/' + normalized;
      }
    }
  }

  // Garante que começa com workspace/ ou common/
  if (!normalized.startsWith('workspace/') && !normalized.startsWith('common/')) {
    // Se tem common/subflows, adiciona workspace/ na frente
    if (normalized.includes('common/subflows')) {
      normalized = 'workspace/' + normalized;
    }
  }

  return normalized;
}

/**
 * Valida se o caminho aponta para setup.yaml ou teardown.yaml correto
 * @param {string} flowPath - Caminho do flow
 * @param {string} targetFile - Nome do arquivo alvo (setup.yaml ou teardown.yaml)
 * @returns {boolean} true se caminho aponta para o arquivo correto
 */
function isValidFlowPath(flowPath, targetFile = 'setup.yaml') {
  if (!flowPath) return false;

  const normalized = normalizeFlowPath(flowPath);
  const expectedPath = `workspace/common/subflows/${targetFile}`;

  return normalized === expectedPath;
}

module.exports = {
  getLineInfo,
  isValidPlatform,
  extractFlowPath,
  findLineNumber,
  normalizeFlowPath,
  isValidFlowPath
};
