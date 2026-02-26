/**
 * Calcula a distância de Levenshtein entre duas strings
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
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
 * Encontra a melhor sugestão para uma string inválida
 */
export function findBestMatch(input: string, candidates: string[]): string | null {
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(input, candidate);
    if (distance < bestDistance && distance <= 3) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * Verifica se uma string é um erro de case-sensitivity de outra
 * Retorna a versão correta se for, ou null se não for
 */
export function findCaseSensitiveMatch(input: string, candidates: string[]): string | null {
  const inputLower = input.toLowerCase();
  for (const candidate of candidates) {
    if (candidate.toLowerCase() === inputLower && candidate !== input) {
      return candidate;
    }
  }
  return null;
}

/**
 * Encontra o número da linha de uma propriedade/comando no texto YAML
 */
export function findLineNumber(text: string, key: string, startLine: number = 0): number {
  const lines = text.split('\n');
  for (let i = startLine; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith(`${key}:`) || trimmed.startsWith(`- ${key}:`) || trimmed.startsWith(`- ${key}`)) {
      return i;
    }
  }
  return startLine;
}

/**
 * Encontra todas as ocorrências de uma key no texto e retorna as linhas
 */
export function findAllLineNumbers(text: string, key: string): number[] {
  const lines = text.split('\n');
  const result: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (trimmed.startsWith(`${key}:`) || trimmed.startsWith(`- ${key}:`) || trimmed.startsWith(`- ${key}`)) {
      result.push(i);
    }
  }
  return result;
}
