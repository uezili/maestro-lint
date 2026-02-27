import { LintError, Severity } from '../models/LintError';
import { VALID_WHEN_PROPERTIES, VALID_PLATFORMS } from '../constants/commands';
import { findBestMatch } from '../utils/helpers';
import { ConfigManager } from '../config/ConfigManager';
import { lintSource } from '../utils/lintSource';
import { ValidationContext, Validator } from './Validator';

export class WhenValidator implements Validator {
  constructor(private configManager: ConfigManager) {}

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

          if (propKey === 'platform') {
            const platformValue = propTrimmed.substring(colonIndex + 1).trim();
            if (platformValue && !VALID_PLATFORMS.includes(platformValue)) {
              const severity = this.configManager.getRuleSeverity('when', 'invalidPlatform') as Severity;
              if (severity !== 'off') {
                errors.push({
                  message: `Plataforma inválida: "${platformValue}". Válidas: ${VALID_PLATFORMS.join(', ')}`,
                  line: j,
                  column: propLine.indexOf(platformValue),
                  endColumn: propLine.indexOf(platformValue) + platformValue.length,
                  severity,
                  source: lintSource('when', 'invalidPlatform'),
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
