import { LintError, Severity } from '../models/LintError';
import { NESTED_OBJECT_COMMANDS, getCommandDef } from '../constants/commands';
import type { NestedObjectDef } from '../constants/commands';
import { ConfigManager } from '../config/ConfigManager';
import { findKeyLine } from '../utils/lineLocator';
import { lintSource } from '../utils/lintSource';
import { isRecord } from '../utils/typeGuards';
import { ValidationContext, Validator } from './Validator';

export class NestedObjectValidator implements Validator {
  constructor(private configManager: ConfigManager) {}

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const lines = context.lines;
    const commands = context.commands;

    for (const command of commands) {
      if (!isRecord(command)) {
        continue;
      }

      const commandObj = command;

      for (const nestedCmd of NESTED_OBJECT_COMMANDS) {
        if (nestedCmd in commandObj) {
          const value = commandObj[nestedCmd];
          if (isRecord(value)) {
            const def = getCommandDef(nestedCmd);
            if (def?.nestedObject) {
              errors.push(
                ...this.validateNestedObject(
                  nestedCmd,
                  value,
                  def.nestedObject,
                  lines
                )
              );
            }
          }
        }
      }
    }

    return errors;
  }

  private validateNestedObject(
    commandName: string,
    value: Record<string, unknown>,
    nestedDefs: Record<string, NestedObjectDef>,
    lines: string[]
  ): LintError[] {
    const errors: LintError[] = [];
    const severity = this.configManager.getRuleSeverity('command', 'invalidProperty') as Severity;
    if (severity === 'off') {
      return errors;
    }

    for (const [nestedKey, nestedDef] of Object.entries(nestedDefs)) {
      const nestedValue = value[nestedKey];
      if (!nestedValue || typeof nestedValue !== 'object') {
        continue;
      }

      if (nestedDef.isMap) {
        const map = nestedValue as Record<string, unknown>;
        for (const [key, val] of Object.entries(map)) {
          const lineIndex = findKeyLine(lines, key);

          // Validate key
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

          // Validate value
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
      }
    }

    return errors;
  }
}
