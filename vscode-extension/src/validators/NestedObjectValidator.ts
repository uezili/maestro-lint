import { LintError, Severity } from '../models/LintError';
import { NESTED_OBJECT_COMMANDS, getCommandDef } from '../constants/commands';
import type { NestedObjectDef } from '../constants/commands';
import { ConfigManager } from '../config/ConfigManager';

export class NestedObjectValidator {
  constructor(private configManager: ConfigManager) {}

  validate(commands: unknown[], text: string): LintError[] {
    const errors: LintError[] = [];
    const lines = text.split('\n');

    for (const command of commands) {
      if (typeof command !== 'object' || command === null) {
        continue;
      }

      const commandObj = command as Record<string, unknown>;

      for (const nestedCmd of NESTED_OBJECT_COMMANDS) {
        if (nestedCmd in commandObj) {
          const value = commandObj[nestedCmd];
          if (typeof value === 'object' && value !== null) {
            const def = getCommandDef(nestedCmd);
            if (def?.nestedObject) {
              errors.push(
                ...this.validateNestedObject(
                  nestedCmd,
                  value as Record<string, unknown>,
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
          const lineIndex = this.findKeyLine(lines, key);

          // Validate key
          if (!nestedDef.validKeys.includes(key)) {
            errors.push({
              message: `${commandName} em "${nestedKey}": chave inválida "${key}". Válidas: ${nestedDef.validKeys.join(', ')}`,
              line: lineIndex,
              column: lines[lineIndex]?.indexOf(key) ?? 0,
              endColumn: (lines[lineIndex]?.indexOf(key) ?? 0) + key.length,
              severity,
              source: `maestro-lint(command.${commandName})`,
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
              source: `maestro-lint(command.${commandName})`,
            });
          }
        }
      }
    }

    return errors;
  }

  private findKeyLine(lines: string[], key: string): number {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith(`${key}:`)) {
        return i;
      }
    }
    return 0;
  }
}
