import { LintError, Severity } from '../models/LintError';
import { VALID_WHEN_PROPERTIES, WHEN_PROPERTY_SCHEMA } from '../constants/commands';
import { findBestMatch } from '../utils/helpers';
import { ConfigManager } from '../config/ConfigManager';
import { lintSource } from '../utils/lintSource';
import { ValidationContext, Validator } from './Validator';

export class WhenValidator implements Validator {
  constructor(private configManager: ConfigManager) {}

  private normalizeScalarValue(value: string): string {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith('"') && trimmed.endsWith('"'))
    ) {
      return trimmed.substring(1, trimmed.length - 1);
    }

    return trimmed;
  }

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const lines = context.lines;
    const indentationSpaces = this.configManager.getSettings().indentationSpaces;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();

      if (!trimmed.startsWith('when:')) {
        continue;
      }

      const whenIndent = line.length - trimmed.length;
      const expectedPropertyIndent = whenIndent + indentationSpaces;

      for (let j = i + 1; j < lines.length; j++) {
        const propLine = lines[j];
        const propTrimmed = propLine.trimStart();

        if (propTrimmed === '' || propTrimmed.startsWith('#')) {
          continue;
        }

        const propIndent = propLine.length - propTrimmed.length;

        if (propIndent <= whenIndent) {
          break;
        }

        if (propIndent !== expectedPropertyIndent) {
          const severity = this.configManager.getRuleSeverity('when', 'indentation') as Severity;
          if (severity !== 'off') {
            const propKey = propTrimmed.split(':')[0].trim();
            errors.push({
              message: `Indentação incorreta em propriedade '${propKey}' sob 'when:'. Esperado ${expectedPropertyIndent} espaços, encontrado ${propIndent}.`,
              line: j,
              column: 0,
              endColumn: propIndent,
              severity,
              source: lintSource('when', 'indentation'),
            });
          }
        }

        const colonIndex = propTrimmed.indexOf(':');
        if (colonIndex > 0) {
          const propKey = propTrimmed.substring(0, colonIndex).trim();

          if (!VALID_WHEN_PROPERTIES.includes(propKey)) {
            const severity = this.configManager.getRuleSeverity('when', 'invalidProperty') as Severity;
            if (severity !== 'off') {
              const suggestion = findBestMatch(propKey, VALID_WHEN_PROPERTIES);
              const col = propLine.indexOf(propKey);
              const msg = suggestion
                ? `Propriedade inválida em 'when': "${propKey}". correto: "${suggestion}"`
                : `Propriedade inválida em 'when': "${propKey}".`;
              errors.push({
                message: msg,
                line: j,
                column: col,
                endColumn: col + propKey.length,
                severity,
                source: lintSource('when', 'invalidProperty'),
              });
            }
          }

          const whenSchema = WHEN_PROPERTY_SCHEMA[propKey];
          if (whenSchema?.allowedValues) {
            const propValue = propTrimmed.substring(colonIndex + 1).trim();
            const normalizedValue = this.normalizeScalarValue(propValue);
            if (propValue && !whenSchema.allowedValues.includes(normalizedValue)) {
              const severity = this.configManager.getRuleSeverity('when', 'invalidValue') as Severity;
              if (severity !== 'off') {
                const col = propLine.indexOf(propValue);
                errors.push({
                  message: `Valor inválido "${propValue}" para "${propKey}" em 'when'. Valores aceitos: ${whenSchema.allowedValues.join(', ')}`,
                  line: j,
                  column: col,
                  endColumn: col + propValue.length,
                  severity,
                  source: lintSource('when', 'invalidValue'),
                });
              }
            }
          }
        }
      }
    }

    return errors;
  }
}
