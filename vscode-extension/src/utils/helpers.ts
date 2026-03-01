/**
 * Calcula a distância de Levenshtein entre duas strings
 * Com caching para evitar recálculos
 */
class LevenshteinCache {
  private readonly cache = new Map<string, number>();

  distance(a: string, b: string): number {
    const key = this.createKey(a, b);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = this.calculateDistance(a, b);
    this.cache.set(key, result);
    return result;
  }

  private createKey(a: string, b: string): string {
    // Normalize: distance(a,b) === distance(b,a)
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  private calculateDistance(a: string, b: string): number {
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

  clear(): void {
    this.cache.clear();
  }
}

// Export singleton instance
const cache = new LevenshteinCache();

export function levenshteinDistance(a: string, b: string): number {
  return cache.distance(a, b);
}

export function clearLevenshteinCache(): void {
  cache.clear();
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
