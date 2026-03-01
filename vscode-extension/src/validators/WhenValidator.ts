import { LintError, Severity } from '../models/LintError';
import { VALID_WHEN_PROPERTIES, WHEN_PROPERTY_SCHEMA } from '../constants/commands';
import { findBestMatch } from '../utils/helpers';
import { ConfigManager } from '../config/ConfigManager';
import { lintSource } from '../utils/lintSource';
import { ValidationContext, Validator } from './Validator';

export class WhenValidator implements Validator {
  constructor(private readonly configManager: ConfigManager) {}

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

      errors.push(...this.validateWhenBlock(lines, i, indentationSpaces));
    }

    return errors;
  }

  private validateWhenBlock(lines: string[], whenLineIndex: number, indentationSpaces: number): LintError[] {
    const errors: LintError[] = [];
    const whenLine = lines[whenLineIndex];
    const whenTrimmed = whenLine.trimStart();
    const whenIndent = whenLine.length - whenTrimmed.length;
    const expectedPropertyIndent = whenIndent + indentationSpaces;

    for (let j = whenLineIndex + 1; j < lines.length; j++) {
      const propLine = lines[j];
      const propTrimmed = propLine.trimStart();

      if (propTrimmed === '' || propTrimmed.startsWith('#')) {
        continue;
      }

      const propIndent = propLine.length - propTrimmed.length;
      if (propIndent <= whenIndent) {
        break;
      }

      const lineErrors = [
        ...this.validateWhenPropertyIndentation(propTrimmed, propIndent, expectedPropertyIndent, j),
        ...this.validateWhenPropertyKeyValue(propLine, propTrimmed, j),
      ];
      errors.push(...lineErrors);
    }

    return errors;
  }

  private validateWhenPropertyIndentation(
    propTrimmed: string,
    propIndent: number,
    expectedPropertyIndent: number,
    lineIndex: number
  ): LintError[] {
    if (propIndent === expectedPropertyIndent) {
      return [];
    }

    const severity = this.configManager.getRuleSeverity('when', 'indentation') as Severity;
    if (severity === 'off') {
      return [];
    }

    const propKey = propTrimmed.split(':')[0].trim();
    return [{
      message: `Indentação incorreta em propriedade '${propKey}' sob 'when:'. Esperado ${expectedPropertyIndent} espaços, encontrado ${propIndent}.`,
      line: lineIndex,
      column: 0,
      endColumn: propIndent,
      severity,
      source: lintSource('when', 'indentation'),
    }];
  }

  private validateWhenPropertyKeyValue(
    propLine: string,
    propTrimmed: string,
    lineIndex: number
  ): LintError[] {
    const errors: LintError[] = [];
    const colonIndex = propTrimmed.indexOf(':');
    if (colonIndex <= 0) {
      return errors;
    }

    const propKey = propTrimmed.substring(0, colonIndex).trim();
    const keyValueErrors = [
      ...this.validateWhenPropertyKey(propLine, propKey, lineIndex),
      ...this.validateWhenPropertyValue(propLine, propTrimmed, propKey, colonIndex, lineIndex),
    ];
    errors.push(...keyValueErrors);

    return errors;
  }

  private validateWhenPropertyKey(propLine: string, propKey: string, lineIndex: number): LintError[] {
    if (VALID_WHEN_PROPERTIES.includes(propKey)) {
      return [];
    }

    const severity = this.configManager.getRuleSeverity('when', 'invalidProperty') as Severity;
    if (severity === 'off') {
      return [];
    }

    const suggestion = findBestMatch(propKey, VALID_WHEN_PROPERTIES);
    const col = propLine.indexOf(propKey);
    const message = suggestion
      ? `Propriedade inválida em 'when': "${propKey}". Você quis dizer "${suggestion}"?`
      : `Propriedade inválida em 'when': "${propKey}".`;

    return [{
      message,
      line: lineIndex,
      column: col,
      endColumn: col + propKey.length,
      severity,
      source: lintSource('when', 'invalidProperty'),
    }];
  }

  private validateWhenPropertyValue(
    propLine: string,
    propTrimmed: string,
    propKey: string,
    colonIndex: number,
    lineIndex: number
  ): LintError[] {
    const whenSchema = WHEN_PROPERTY_SCHEMA[propKey];
    if (!whenSchema?.allowedValues) {
      return [];
    }

    const propValue = propTrimmed.substring(colonIndex + 1).trim();
    const normalizedValue = this.normalizeScalarValue(propValue);
    if (!propValue || whenSchema.allowedValues.includes(normalizedValue)) {
      return [];
    }

    const severity = this.configManager.getRuleSeverity('when', 'invalidValue') as Severity;
    if (severity === 'off') {
      return [];
    }

    const col = propLine.indexOf(propValue);
    return [{
      message: `Valor inválido "${propValue}" para "${propKey}" em 'when'. Valores aceitos: ${whenSchema.allowedValues.join(', ')}`,
      line: lineIndex,
      column: col,
      endColumn: col + propValue.length,
      severity,
      source: lintSource('when', 'invalidValue'),
    }];
  }
}
