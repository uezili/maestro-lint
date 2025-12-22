/**
 * Funções auxiliares para o Maestro Linter
 */

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

  // Se temos um contexto específico, primeiro contamos as ocorrências de contexto
  if (context) {
    for (let i = 0; i < lines.length; i++) {
      if (isCommentOrEmpty(lines[i])) continue;
      if (lines[i].includes(context)) {
        contextOccurrence++;
        if (contextOccurrence === occurrence) {
          // Encontramos o contexto correto, agora procura por searchTerm próximo
          // Aumenta a janela de busca para 20 linhas para melhor cobertura
          const windowStart = i;
          const windowEnd = Math.min(lines.length, i + 20);
          for (let j = windowStart; j < windowEnd; j++) {
            if (isCommentOrEmpty(lines[j])) continue;
            if (lines[j].includes(searchTerm)) {
              return j + 1;
            }
          }
          break;
        }
      }
    }
  }

  // Busca com ocorrência especificada (ignorando comentários e linhas vazias)
  for (let i = 0; i < lines.length; i++) {
    if (isCommentOrEmpty(lines[i])) continue;
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
  if (typeof flowPath !== 'string') {return '';}

  // Remove aspas e converte barras invertidas para barras normais
  let normalized = flowPath.replace(/^['"]|['"]$/g, '').replace(/\\/g, '/');

  // Remove todos os ../ e fica apenas com o resto do caminho
  if (normalized.startsWith('../')) {
    normalized = normalized.replace(/^(\.\.\/)+/, '');
    // Adiciona workspace/ se não começar com ele
    if (!normalized.startsWith('workspace/')) {
      normalized = `workspace/${normalized}`;
    }
  } else if (!normalized.startsWith('workspace/') && normalized.includes('common/subflows')) {
    // Se tem common/subflows mas não começa com workspace/, adiciona
    normalized = `workspace/${normalized}`;
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
  if (!flowPath) {
    return false;
  }

  const normalized = normalizeFlowPath(flowPath);
  const expectedPath = `workspace/common/subflows/${targetFile}`;

  return normalized === expectedPath;
}

module.exports = {
  isValidPlatform,
  extractFlowPath,
  findLineNumber,
  normalizeFlowPath,
  isValidFlowPath
};
