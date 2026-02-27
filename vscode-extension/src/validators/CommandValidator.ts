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
  constructor(private configManager: ConfigManager) {}

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const lines = context.lines;
    const commands = context.commands;

    const separatorLine = findSeparatorLine(lines);
    let commandStartLine = separatorLine >= 0 ? separatorLine + 1 : 0;

    for (const command of commands) {
      if (typeof command === 'string') {
        const lineIndex = findCommandLine(lines, command, commandStartLine);
        errors.push(...this.validateCommandName(command, lines, lineIndex));
        commandStartLine = lineIndex + 1;
        continue;
      }

      if (isRecord(command)) {
        const commandObj = command;

        for (const [key, value] of Object.entries(commandObj)) {
          const lineIndex = findCommandLine(lines, key, commandStartLine);

          // Validate command name
          const nameErrors = this.validateCommandName(key, lines, lineIndex);
          if (nameErrors.length > 0) {
            errors.push(...nameErrors);
            commandStartLine = lineIndex + 1;
            continue;
          }

          // Skip property validation for array commands (handled by ArrayCommandValidator)
          if (isArrayCommand(key)) {
            commandStartLine = lineIndex + 1;
            continue;
          }

          // Validate requiresValue
          if (commandRequiresValue(key) && (value === null || value === undefined)) {
            const severity = this.configManager.getRuleSeverity('command', 'missingValue') as Severity;
            if (severity !== 'off') {
              errors.push({
                message: `Comando "${key}" requer um valor.`,
                line: lineIndex,
                column: 0,
                severity,
                source: lintSource('command', 'missingValue'),
              });
            }
          }

          // Validate empty value
          if (value === '' || value === null) {
            const def = getCommandDef(key);
            // Só reporta emptyValue se o comando requer valor
            if (def?.requiresValue) {
              const severity = this.configManager.getRuleSeverity('command', 'emptyValue') as Severity;
              if (severity !== 'off') {
                errors.push({
                  message: `Comando "${key}" com valor vazio.`,
                  line: lineIndex,
                  column: 0,
                  severity,
                  source: lintSource('command', 'emptyValue'),
                });
              }
            }
          }

          // Validate command properties
          if (isRecord(value)) {
            const allValidProps = getCommandProperties(key);
            if (allValidProps.length > 0) {
              const valueObj = value;
              for (const propKey of Object.keys(valueObj)) {
                // Skip meta-properties
                if (propKey === 'when' || propKey === 'label') {
                  continue;
                }

                if (!allValidProps.includes(propKey)) {
                  const propLineIndex = findPropertyLine(lines, propKey, lineIndex);
                  const severity = this.configManager.getRuleSeverity('command', 'invalidProperty') as Severity;

                  if (severity !== 'off') {
                    const suggestion = findBestMatch(propKey, allValidProps);
                    const col = lines[propLineIndex]?.indexOf(propKey) ?? 0;
                    const msg = suggestion
                      ? `${key}: propriedade inválida "${propKey}". Você quis dizer "${suggestion}"?`
                      : `${key}: propriedade inválida "${propKey}". Válidas: ${allValidProps.join(', ')}`;
                    errors.push({
                      message: msg,
                      line: propLineIndex,
                      column: col,
                      endColumn: col + propKey.length,
                      severity,
                      source: lintSource('command', 'invalidProperty'),
                    });
                  }
                }
              }
            }
          }

          commandStartLine = lineIndex + 1;
        }
      }
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

    // Levenshtein suggestion
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
