import { LintError, Severity } from '../models/LintError';
import { VALID_HEADER_PROPERTIES, HEADER_PROPERTY_SCHEMA } from '../constants/commands';
import { findCaseSensitiveMatch, findBestMatch } from '../utils/helpers';
import { ConfigManager } from '../config/ConfigManager';
import { lintSource } from '../utils/lintSource';
import { findHeaderKeyLine } from '../utils/lineLocator';
import { ValidationContext, Validator } from './Validator';

export class HeaderValidator implements Validator {
  constructor(private configManager: ConfigManager) {}

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const lines = context.lines;
    const headerObj = context.header;

    if (!headerObj) {
      return errors;
    }

    for (const key of Object.keys(headerObj)) {
      const lineIndex = findHeaderKeyLine(lines, key);

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
            source: lintSource('header', 'caseSensitivity'),
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
            source: lintSource('header', 'invalidProperty'),
          });
        }
      }
    }

    // Header property value validation
    for (const [key, value] of Object.entries(headerObj)) {
      const schema = HEADER_PROPERTY_SCHEMA[key];
      if (!schema) {
        continue;
      }

      const strValue = String(value);
      if (!schema.allowedValues.includes(strValue)) {
        const severity = this.configManager.getRuleSeverity('header', 'invalidValue') as Severity;
        if (severity !== 'off') {
          const lineIndex = findHeaderKeyLine(lines, key);
          const line = lines[lineIndex] ?? '';
          const valStart = line.indexOf(strValue);
          const col = valStart >= 0 ? valStart : (line.indexOf(':') + 2);
          errors.push({
            message: `Valor inválido "${strValue}" para "${key}". Valores aceitos: ${schema.allowedValues.join(', ')}`,
            line: lineIndex,
            column: col,
            endColumn: col + strValue.length,
            severity,
            source: lintSource('header', 'invalidValue'),
          });
        }
      }
    }

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
            source: lintSource('header', 'tags'),
          });
        }
      } else {
        const hasRequired = tags.some((tag: string) => config.tags.requiredOneOf.includes(tag));
        if (!hasRequired) {
          const lineIndex = findHeaderKeyLine(lines, 'tags');
          errors.push({
            message: `Nenhuma tag obrigatória encontrada. Requer pelo menos uma de: ${config.tags.requiredOneOf.join(', ')}`,
            line: lineIndex,
            column: 0,
            severity: this.configManager.getRuleSeverity('header', 'tags') as Severity,
            source: lintSource('header', 'tags'),
          });
        }
      }
    }

    return errors;
  }
}
