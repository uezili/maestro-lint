export function lintSource(category: string, rule: string): string {
  return `maestro-lint(${category}.${rule})`;
}
