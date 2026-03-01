import { LintError, Severity } from '../models/LintError';
import {
  VALID_COMMANDS,
  getCommandProperties,
  getCommandDef,
  commandRequiresValue,
  isArrayCommand,
} from '../constants/commands';
import { findCaseSensitiveMatch, findBestMatch } from '../utils/helpers';
import { ConfigManager } from '../config/ConfigManager';
import { lintSource } from '../utils/lintSource';
import { findCommandLine, findPropertyLine, findSeparatorLine } from '../utils/lineLocator';
import { isRecord } from '../utils/typeGuards';
import { ValidationContext, Validator } from './Validator';

export class CommandValidator implements Validator {
  constructor(private readonly configManager: ConfigManager) {}

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const lines = context.lines;
    const commands = context.commands;

    const separatorLine = findSeparatorLine(lines);
    let commandStartLine = separatorLine >= 0 ? separatorLine + 1 : 0;

    for (const command of commands) {
      if (typeof command === 'string') {
        const stringResult = this.validateStringCommand(command, lines, commandStartLine);
        errors.push(...stringResult.errors);
        commandStartLine = stringResult.nextStartLine;
        continue;
      }

      if (!isRecord(command)) {
        continue;
      }

      const objectResult = this.validateCommandObject(command, lines, commandStartLine);
      errors.push(...objectResult.errors);
      commandStartLine = objectResult.nextStartLine;
    }

    return errors;
  }

  private validateStringCommand(
    command: string,
    lines: string[],
    commandStartLine: number
  ): { errors: LintError[]; nextStartLine: number } {
    const lineIndex = findCommandLine(lines, command, commandStartLine);
    return {
      errors: this.validateCommandName(command, lines, lineIndex),
      nextStartLine: lineIndex + 1,
    };
  }

  private validateCommandObject(
    commandObj: Record<string, unknown>,
    lines: string[],
    commandStartLine: number
  ): { errors: LintError[]; nextStartLine: number } {
    const errors: LintError[] = [];
    let nextStartLine = commandStartLine;

    for (const [key, value] of Object.entries(commandObj)) {
      const entryResult = this.validateCommandEntry(key, value, lines, nextStartLine);
      errors.push(...entryResult.errors);
      nextStartLine = entryResult.nextStartLine;
    }

    return { errors, nextStartLine };
  }

  private validateCommandEntry(
    key: string,
    value: unknown,
    lines: string[],
    commandStartLine: number
  ): { errors: LintError[]; nextStartLine: number } {
    const errors: LintError[] = [];
    const lineIndex = findCommandLine(lines, key, commandStartLine);
    const nextStartLine = lineIndex + 1;

    const nameErrors = this.validateCommandName(key, lines, lineIndex);
    if (nameErrors.length > 0) {
      return { errors: nameErrors, nextStartLine };
    }

    if (isArrayCommand(key)) {
      return { errors, nextStartLine };
    }

    const def = getCommandDef(key);
    const validationErrors = [
      ...this.validateMissingValue(key, value, lineIndex),
      ...this.validateAllowedValues(key, value, def?.allowedValues ?? [], lines, lineIndex),
      ...this.validateEmptyValue(key, value, !!def?.requiresValue, lineIndex),
      ...this.validateCommandProperties(key, value, lines, lineIndex),
    ];
    errors.push(...validationErrors);

    return { errors, nextStartLine };
  }

  private validateMissingValue(key: string, value: unknown, lineIndex: number): LintError[] {
    if (!commandRequiresValue(key) || (value !== null && value !== undefined)) {
      return [];
    }

    const severity = this.configManager.getRuleSeverity('command', 'missingValue') as Severity;
    if (severity === 'off') {
      return [];
    }

    return [{
      message: `Comando "${key}" requer um valor.`,
      line: lineIndex,
      column: 0,
      severity,
      source: lintSource('command', 'missingValue'),
    }];
  }

  private validateAllowedValues(
    key: string,
    value: unknown,
    allowedValues: string[],
    lines: string[],
    lineIndex: number
  ): LintError[] {
    if (
      allowedValues.length === 0 ||
      (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean')
    ) {
      return [];
    }

    const strValue = String(value);
    if (allowedValues.includes(strValue)) {
      return [];
    }

    const severity = this.configManager.getRuleSeverity('command', 'invalidValue') as Severity;
    if (severity === 'off') {
      return [];
    }

    const line = lines[lineIndex] ?? '';
    const valStart = line.indexOf(strValue);
    const col = valStart >= 0 ? valStart : line.indexOf(':') + 2;
    return [{
      message: `Valor inválido "${strValue}" para "${key}". Valores aceitos: ${allowedValues.join(', ')}`,
      line: lineIndex,
      column: col,
      endColumn: col + strValue.length,
      severity,
      source: lintSource('command', 'invalidValue'),
    }];
  }

  private validateEmptyValue(
    key: string,
    value: unknown,
    requiresValue: boolean,
    lineIndex: number
  ): LintError[] {
    if (!(value === '' || value === null) || !requiresValue) {
      return [];
    }

    const severity = this.configManager.getRuleSeverity('command', 'emptyValue') as Severity;
    if (severity === 'off') {
      return [];
    }

    return [{
      message: `Comando "${key}" com valor vazio.`,
      line: lineIndex,
      column: 0,
      severity,
      source: lintSource('command', 'emptyValue'),
    }];
  }

  private validateCommandProperties(
    commandKey: string,
    value: unknown,
    lines: string[],
    lineIndex: number
  ): LintError[] {
    if (!isRecord(value)) {
      return [];
    }

    const allValidProps = getCommandProperties(commandKey);
    if (allValidProps.length === 0) {
      return [];
    }

    const errors: LintError[] = [];
    for (const propKey of Object.keys(value)) {
      if (propKey === 'when' || propKey === 'label' || allValidProps.includes(propKey)) {
        continue;
      }

      const severity = this.configManager.getRuleSeverity('command', 'invalidProperty') as Severity;
      if (severity === 'off') {
        continue;
      }

      const propLineIndex = findPropertyLine(lines, propKey, lineIndex);
      const suggestion = findBestMatch(propKey, allValidProps);
      const col = lines[propLineIndex]?.indexOf(propKey) ?? 0;
      const msg = suggestion
        ? `${commandKey}: propriedade inválida "${propKey}". Você quis dizer "${suggestion}"?`
        : `${commandKey}: propriedade inválida "${propKey}". Válidas: ${allValidProps.join(', ')}`;

      errors.push({
        message: msg,
        line: propLineIndex,
        column: col,
        endColumn: col + propKey.length,
        severity,
        source: lintSource('command', 'invalidProperty'),
      });
    }

    return errors;
  }

  private validateCommandName(name: string, lines: string[], lineIndex: number): LintError[] {
    const errors: LintError[] = [];

    if (VALID_COMMANDS.includes(name)) {
      return errors;
    }

    const severity = this.configManager.getRuleSeverity('command', 'invalidCommand') as Severity;
    if (severity === 'off') {
      return errors;
    }

    const col = lines[lineIndex]?.indexOf(name) ?? 0;

    // Case-sensitivity check first
    const caseSensitiveMatch = findCaseSensitiveMatch(name, VALID_COMMANDS);
    if (caseSensitiveMatch) {
      errors.push({
        message: `Comando "${name}" possui erro de capitalização. Você quis dizer "${caseSensitiveMatch}"?`,
        line: lineIndex,
        column: col,
        endColumn: col + name.length,
        severity,
        source: lintSource('command', 'caseSensitivity'),
      });
      return errors;
    }

    const suggestion = findBestMatch(name, VALID_COMMANDS);
    const msg = suggestion
      ? `Comando inválido: "${name}". Você quis dizer "${suggestion}"?`
      : `Comando inválido: "${name}".`;
    errors.push({
      message: msg,
      line: lineIndex,
      column: col,
      endColumn: col + name.length,
      severity,
      source: lintSource('command', 'invalidCommand'),
    });

    return errors;
  }
}
