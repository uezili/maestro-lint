import { LintError, Severity } from '../models/LintError';
import { NESTED_OBJECT_COMMANDS, getCommandDef } from '../constants/commands';
import type { NestedObjectDef } from '../constants/commands';
import { ConfigManager } from '../config/ConfigManager';
import { findCommandLine, findSeparatorLine } from '../utils/lineLocator';
import { lintSource } from '../utils/lintSource';
import { isRecord } from '../utils/typeGuards';
import { ValidationContext, Validator } from './Validator';

interface MapValidationContext {
  lines: string[];
  commandLineIndex: number;
  commandIndent: number;
  severity: Severity;
}

export class NestedObjectValidator implements Validator {
  constructor(private readonly configManager: ConfigManager) {}

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const { lines, commands } = context;

    const separatorLine = findSeparatorLine(lines);
    let commandStartLine = separatorLine >= 0 ? separatorLine + 1 : 0;

    for (const command of commands) {
      if (!isRecord(command)) {
        continue;
      }

      commandStartLine = this.validateNestedCommands(command, lines, commandStartLine, errors);
    }

    return errors;
  }

  private validateNestedCommands(
    commandObj: Record<string, unknown>,
    lines: string[],
    commandStartLine: number,
    errors: LintError[]
  ): number {
    let currentStartLine = commandStartLine;

    for (const nestedCmd of NESTED_OBJECT_COMMANDS) {
      if (!(nestedCmd in commandObj)) {
        continue;
      }

      const value = commandObj[nestedCmd];
      const commandLineIndex = findCommandLine(lines, nestedCmd, currentStartLine);
      currentStartLine = commandLineIndex + 1;

      if (!isRecord(value)) {
        continue;
      }

      const nestedDef = getCommandDef(nestedCmd)?.nestedObject;
      if (!nestedDef) {
        continue;
      }

      errors.push(...this.validateNestedObject(nestedCmd, value, nestedDef, lines, commandLineIndex));
    }

    return currentStartLine;
  }

  private validateNestedObject(
    commandName: string,
    value: Record<string, unknown>,
    nestedDefs: Record<string, NestedObjectDef>,
    lines: string[],
    commandLineIndex: number
  ): LintError[] {
    const errors: LintError[] = [];
    const severity = this.configManager.getRuleSeverity('command', 'invalidProperty') as Severity;
    if (severity === 'off') {
      return errors;
    }

    const commandIndent = lines[commandLineIndex].length - lines[commandLineIndex].trimStart().length;

    for (const [nestedKey, nestedDef] of Object.entries(nestedDefs)) {
      if (!nestedDef.isMap) {
        continue;
      }

      const nestedValue = value[nestedKey];
      if (!nestedValue || typeof nestedValue !== 'object') {
        continue;
      }

      const map = nestedValue as Record<string, unknown>;
      errors.push(
        ...this.validateMapEntries(
          commandName,
          nestedKey,
          nestedDef,
          map,
          {
            lines,
            commandLineIndex,
            commandIndent,
            severity,
          }
        )
      );
    }

    return errors;
  }

  private validateMapEntries(
    commandName: string,
    nestedKey: string,
    nestedDef: NestedObjectDef,
    map: Record<string, unknown>,
    context: MapValidationContext
  ): LintError[] {
    const errors: LintError[] = [];
    const { lines, commandLineIndex, commandIndent, severity } = context;

    for (const [key, val] of Object.entries(map)) {
      const lineIndex = this.findKeyLineInBlock(lines, key, commandLineIndex, commandIndent);

      if (!nestedDef.validKeys.includes(key)) {
        errors.push({
          message: `${commandName} em "${nestedKey}": chave inválida "${key}". Válidas: ${nestedDef.validKeys.join(', ')}`,
          line: lineIndex,
          column: lines[lineIndex]?.indexOf(key) ?? 0,
          endColumn: (lines[lineIndex]?.indexOf(key) ?? 0) + key.length,
          severity,
          source: lintSource('command', commandName),
        });
      }

      if (typeof val === 'string' && !nestedDef.validValues.includes(val)) {
        errors.push({
          message: `${commandName} em "${nestedKey}.${key}": valor inválido "${val}" (válidos: ${nestedDef.validValues.join(', ')})`,
          line: lineIndex,
          column: lines[lineIndex]?.indexOf(val) ?? 0,
          endColumn: (lines[lineIndex]?.indexOf(val) ?? 0) + val.length,
          severity,
          source: lintSource('command', commandName),
        });
      }
    }

    return errors;
  }

  private findKeyLineInBlock(
    lines: string[],
    key: string,
    blockStartLine: number,
    blockIndent: number
  ): number {
    // Procura pela chave dentro do bloco de comando, não no arquivo inteiro
    for (let i = blockStartLine + 1; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      const indent = lines[i].length - trimmed.length;

      // Para quando encontra próximo comando (mesmo indent ou menor)
      if (trimmed.startsWith('- ') && indent <= blockIndent) {
        break;
      }

      if (trimmed.startsWith(`${key}:`)) {
        return i;
      }
    }

    return blockStartLine;
  }
}
