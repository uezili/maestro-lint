import { LintError, Severity } from '../models/LintError';
import { VALID_HEADER_PROPERTIES } from '../constants/commands';
import { findCaseSensitiveMatch, findBestMatch } from '../utils/helpers';
import { ConfigManager } from '../config/ConfigManager';

export class HeaderValidator {
  constructor(private configManager: ConfigManager) {}

  validate(headerObj: Record<string, unknown>, text: string): LintError[] {
    const errors: LintError[] = [];
    const lines = text.split('\n');

    for (const key of Object.keys(headerObj)) {
      const lineIndex = this.findHeaderLine(lines, key);

      // Case-sensitivity check
      const caseSensitiveMatch = findCaseSensitiveMatch(key, VALID_HEADER_PROPERTIES);
      if (caseSensitiveMatch) {
        const severity = this.configManager.getRuleSeverity('header', 'invalidProperty') as Severity;
        if (severity !== 'off') {
          const col = lines[lineIndex]?.indexOf(key) ?? 0;
          errors.push({
            message: `Propriedade "${key}" possui erro de capitalização. Você quis dizer "${caseSensitiveMatch}"?`,
            line: lineIndex,
            column: col,
            endColumn: col + key.length,
            severity,
            source: 'maestro-lint(header.caseSensitivity)',
          });
        }
        continue;
      }

      // Invalid property check
      if (!VALID_HEADER_PROPERTIES.includes(key)) {
        const severity = this.configManager.getRuleSeverity('header', 'invalidProperty') as Severity;
        if (severity !== 'off') {
          const suggestion = findBestMatch(key, VALID_HEADER_PROPERTIES);
          const col = lines[lineIndex]?.indexOf(key) ?? 0;
          const msg = suggestion
            ? `Propriedade inválida no header: "${key}". Você quis dizer "${suggestion}"?`
            : `Propriedade inválida no header: "${key}".`;

          errors.push({
            message: msg,
            line: lineIndex,
            column: col,
            endColumn: col + key.length,
            severity,
            source: 'maestro-lint(header.invalidProperty)',
          });
        }
      }
    }

    // Tag validation
    const config = this.configManager.getConfig();
    if (config.tags.requiredOneOf.length > 0) {
      const tags = headerObj['tags'];
      if (!tags || !Array.isArray(tags)) {
        const severity = this.configManager.getRuleSeverity('header', 'tags') as Severity;
        if (severity !== 'off') {
          errors.push({
            message: `Tags obrigatórias não encontradas. Requer pelo menos uma de: ${config.tags.requiredOneOf.join(', ')}`,
            line: 0,
            column: 0,
            severity,
            source: 'maestro-lint(header.tags)',
          });
        }
      } else {
        const hasRequired = tags.some((tag: string) => config.tags.requiredOneOf.includes(tag));
        if (!hasRequired) {
          const lineIndex = this.findHeaderLine(lines, 'tags');
          errors.push({
            message: `Nenhuma tag obrigatória encontrada. Requer pelo menos uma de: ${config.tags.requiredOneOf.join(', ')}`,
            line: lineIndex,
            column: 0,
            severity: this.configManager.getRuleSeverity('header', 'tags') as Severity,
            source: 'maestro-lint(header.tags)',
          });
        }
      }
    }

    return errors;
  }

  private findHeaderLine(lines: string[], key: string): number {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '---') {
        break;
      }
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith(`${key}:`)) {
        return i;
      }
    }
    return 0;
  }
}
