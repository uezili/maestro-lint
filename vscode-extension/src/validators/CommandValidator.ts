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

export class CommandValidator {
  constructor(private configManager: ConfigManager) {}

  validate(commands: unknown[], text: string): LintError[] {
    const errors: LintError[] = [];
    const lines = text.split('\n');

    let commandStartLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        commandStartLine = i + 1;
        break;
      }
    }

    for (const command of commands) {
      if (typeof command === 'string') {
        const lineIndex = this.findCommandLine(lines, command, commandStartLine);
        errors.push(...this.validateCommandName(command, lines, lineIndex));
        commandStartLine = lineIndex + 1;
        continue;
      }

      if (typeof command === 'object' && command !== null) {
        const commandObj = command as Record<string, unknown>;

        for (const [key, value] of Object.entries(commandObj)) {
          const lineIndex = this.findCommandLine(lines, key, commandStartLine);

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
                source: 'maestro-lint(command.missingValue)',
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
                  source: 'maestro-lint(command.emptyValue)',
                });
              }
            }
          }

          // Validate command properties
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            const allValidProps = getCommandProperties(key);
            if (allValidProps.length > 0) {
              const valueObj = value as Record<string, unknown>;
              for (const propKey of Object.keys(valueObj)) {
                // Skip meta-properties
                if (propKey === 'when' || propKey === 'label') {
                  continue;
                }

                if (!allValidProps.includes(propKey)) {
                  const propLineIndex = this.findPropertyLine(lines, propKey, lineIndex);
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
                      source: 'maestro-lint(command.invalidProperty)',
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
        source: 'maestro-lint(command.caseSensitivity)',
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
      source: 'maestro-lint(command.invalidCommand)',
    });

    return errors;
  }

  private findCommandLine(lines: string[], key: string, startLine: number): number {
    for (let i = startLine; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      if (
        trimmed.startsWith(`- ${key}:`) ||
        trimmed.startsWith(`- ${key}`) ||
        trimmed === `- ${key}`
      ) {
        return i;
      }
    }
    return startLine;
  }

  private findPropertyLine(lines: string[], key: string, startLine: number): number {
    for (let i = startLine + 1; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith('- ')) {
        break;
      }
      if (trimmed.startsWith(`${key}:`)) {
        return i;
      }
    }
    return startLine;
  }
}
