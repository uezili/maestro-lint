import { LintError, Severity } from '../models/LintError';
import { VALID_COMMANDS, getCommandProperties } from '../constants/commands';
import { lintSource } from '../utils/lintSource';
import { ConfigManager } from '../config/ConfigManager';
import { ValidationContext, Validator } from './Validator';

/**
 * Text-based structural validator that detects indentation hierarchy
 * errors in command blocks. Runs on raw text without depending on
 * YAML parsing, so it catches issues even when the YAML is malformed.
 */
export class StructuralValidator implements Validator {
  constructor(private configManager: ConfigManager) {}

  validate(context: ValidationContext): LintError[] {
    const errors: LintError[] = [];
    const lines = context.lines;
    const severity = this.configManager.getRuleSeverity('command', 'invalidProperty') as Severity;

    if (severity === 'off') {
      return errors;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();

      // Detect `- commandName:` lines
      const commandMatch = trimmed.match(/^- ([A-Za-z_][A-Za-z0-9_]*)\s*:/);
      if (!commandMatch) {
        continue;
      }

      const commandName = commandMatch[1];
      if (!VALID_COMMANDS.includes(commandName)) {
        continue;
      }

      const validProps = getCommandProperties(commandName);
      if (validProps.length === 0) {
        continue;
      }

      const commandIndent = line.length - trimmed.length;
      // Properties of a command should be at commandIndent + 4
      // (2 for `- ` + 2 for standard yaml indent)
      const expectedPropIndent = commandIndent + 4;

      errors.push(
        ...this.checkBlockIndentation(
          commandName,
          lines,
          i,
          commandIndent,
          expectedPropIndent,
          validProps,
          severity
        )
      );
    }

    return errors;
  }

  private checkBlockIndentation(
    commandName: string,
    lines: string[],
    commandLineIndex: number,
    commandIndent: number,
    expectedPropIndent: number,
    validProps: string[],
    severity: Severity
  ): LintError[] {
    const errors: LintError[] = [];

    for (let i = commandLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();

      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }

      const indent = line.length - trimmed.length;

      // We left the block if indent is at or below the command level
      if (indent <= commandIndent) {
        break;
      }

      const keyMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:/);
      if (!keyMatch) {
        continue;
      }

      const propertyKey = keyMatch[1];

      // Only check known properties of this command
      if (!validProps.includes(propertyKey)) {
        continue;
      }

      if (indent > expectedPropIndent) {
        const col = line.indexOf(propertyKey);
        errors.push({
          message: `${commandName}: propriedade "${propertyKey}" está com indentação incorreta (${indent} espaços). Deve estar no nível ${expectedPropIndent} (mesmo nível das demais propriedades do comando).`,
          line: i,
          column: col >= 0 ? col : 0,
          endColumn: col >= 0 ? col + propertyKey.length : propertyKey.length,
          severity,
          source: lintSource('command', 'indentation'),
        });
      }
    }

    return errors;
  }
}
