import { LintError, Severity } from '../models/LintError';
import { VALID_MEDIA_EXTENSIONS, getCommandDef, ARRAY_COMMANDS } from '../constants/commands';
import { ConfigManager } from '../config/ConfigManager';

export class ArrayCommandValidator {
  constructor(private configManager: ConfigManager) {}

  validate(commands: unknown[], text: string): LintError[] {
    const errors: LintError[] = [];
    const lines = text.split('\n');

    for (const command of commands) {
      if (typeof command !== 'object' || command === null) {
        continue;
      }

      const commandObj = command as Record<string, unknown>;

      for (const arrayCmd of ARRAY_COMMANDS) {
        if (arrayCmd in commandObj) {
          const items = commandObj[arrayCmd];
          if (Array.isArray(items)) {
            const lineIndex = this.findCommandLine(lines, arrayCmd);
            const def = getCommandDef(arrayCmd);
            const itemType = def?.arrayItemType ?? 'string';
            errors.push(...this.validateArrayItems(arrayCmd, items, lines, lineIndex, itemType));
          }
        }
      }
    }

    return errors;
  }

  private validateArrayItems(
    commandName: string,
    items: unknown[],
    lines: string[],
    startLine: number,
    itemType: string
  ): LintError[] {
    const errors: LintError[] = [];
    const severity = this.configManager.getRuleSeverity('command', 'invalidProperty') as Severity;
    if (severity === 'off') {
      return errors;
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemLine = startLine + 1 + i;
      const line = itemLine < lines.length ? itemLine : startLine;

      if (typeof item !== 'string') {
        errors.push({
          message: `${commandName} item ${i + 1}: deve ser uma string.`,
          line,
          column: 0,
          severity,
          source: `maestro-lint(command.${commandName})`,
        });
        continue;
      }

      if (item === '') {
        errors.push({
          message: `${commandName} item ${i + 1}: caminho não pode ser vazio.`,
          line,
          column: 0,
          severity,
          source: `maestro-lint(command.${commandName})`,
        });
        continue;
      }

      if (itemType === 'relativePath') {
        errors.push(...this.validateRelativePath(commandName, item, i, line, severity));
      }
    }

    return errors;
  }

  private validateRelativePath(
    commandName: string,
    item: string,
    index: number,
    line: number,
    severity: Severity
  ): LintError[] {
    const errors: LintError[] = [];

    if (!item.startsWith('./') && !item.startsWith('../')) {
      errors.push({
        message: `${commandName} item ${index + 1}: caminho deve ser relativo (começar com ./ ou ../).`,
        line,
        column: 0,
        severity,
        source: `maestro-lint(command.${commandName})`,
      });
    }

    const dotIndex = item.lastIndexOf('.');
    if (dotIndex >= 0) {
      const ext = item.substring(dotIndex).toLowerCase();
      if (!VALID_MEDIA_EXTENSIONS.includes(ext)) {
        errors.push({
          message: `${commandName} item ${index + 1}: extensão de arquivo inválida. Extensões válidas: ${VALID_MEDIA_EXTENSIONS.join(', ')}.`,
          line,
          column: 0,
          severity,
          source: `maestro-lint(command.${commandName})`,
        });
      }
    }

    return errors;
  }

  private findCommandLine(lines: string[], key: string): number {
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith(`- ${key}:`)) {
        return i;
      }
    }
    return 0;
  }
}
