import { LintError, Severity } from '../models/LintError';
import { VALID_MEDIA_EXTENSIONS, getCommandDef, ARRAY_COMMANDS } from '../constants/commands';
import { ConfigManager } from '../config/ConfigManager';
import { lintSource } from '../utils/lintSource';
import { findCommandLine, findSeparatorLine } from '../utils/lineLocator';
import { isRecord } from '../utils/typeGuards';
import { ValidationContext, Validator } from './Validator';

export class ArrayCommandValidator implements Validator {
  constructor(private readonly configManager: ConfigManager) {}

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const lines = context.lines;
    const commands = context.commands;
    const separatorLine = findSeparatorLine(lines);
    let commandStartLine = separatorLine >= 0 ? separatorLine + 1 : 0;

    for (const command of commands) {
      if (!isRecord(command)) {
        continue;
      }

      const commandObj = command;

      for (const arrayCmd of ARRAY_COMMANDS) {
        if (arrayCmd in commandObj) {
          const items = commandObj[arrayCmd];
          if (Array.isArray(items)) {
            const lineIndex = findCommandLine(lines, arrayCmd, commandStartLine);
            const def = getCommandDef(arrayCmd);
            const itemType = def?.arrayItemType ?? 'string';
            errors.push(...this.validateArrayItems(arrayCmd, items, lines, lineIndex, itemType));
            commandStartLine = lineIndex + 1;
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
          source: lintSource('command', commandName),
        });
        continue;
      }

      if (item === '') {
        errors.push({
          message: `${commandName} item ${i + 1}: caminho não pode ser vazio.`,
          line,
          column: 0,
          severity,
          source: lintSource('command', commandName),
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
        source: lintSource('command', commandName),
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
          source: lintSource('command', commandName),
        });
      }
    }

    return errors;
  }
}
