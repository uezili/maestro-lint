import { LintError, Severity } from '../models/LintError';
import { VALID_COMMANDS, getCommandProperties } from '../constants/commands';
import { lintSource } from '../utils/lintSource';
import { ConfigManager } from '../config/ConfigManager';
import { ValidationContext, Validator } from './Validator';

interface CommandItemIndentationContext {
  allowsDeeperNesting: boolean;
  trimmed: string;
  indent: number;
  expectedNestedIndent: number;
  commandName: string;
  blockName: string;
  lineText: string;
  lineIndex: number;
  severity: Severity;
}

/**
 * Text-based structural validator that detects indentation hierarchy
 * errors in command blocks. Runs on raw text without depending on
 * YAML parsing, so it catches issues even when the YAML is malformed.
 */
export class StructuralValidator implements Validator {
  private static readonly COMMAND_PATTERN = /^- ([A-Za-z_]\w*)\s*:/;
  private static readonly KEY_PATTERN = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:/;
  private static readonly COMMAND_ITEM_PATTERN = /^- ([A-Za-z_]\w*)(?:\s*:|$)/;

  constructor(private readonly configManager: ConfigManager) {}

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
      const commandMatch = StructuralValidator.COMMAND_PATTERN.exec(trimmed);
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

      if (this.isIgnorableLine(trimmed)) {
        continue;
      }

      const indent = this.getIndentation(line, trimmed);

      // We left the block if indent is at or below the command level
      if (this.hasExitedBlock(indent, commandIndent)) {
        break;
      }

      // A sibling command (`- command`) with intermediate indentation is invalid.
      // It should be at the same level as the parent command, not inside command properties.
      // Skip nested `commands:` items which are expected to be deeper than expectedPropIndent.
      if (trimmed.startsWith('- ') && indent <= expectedPropIndent) {
        const commandItemMatch = StructuralValidator.COMMAND_ITEM_PATTERN.exec(trimmed);
        const nestedCommand = commandItemMatch ? commandItemMatch[1] : 'comando';
        errors.push(
          this.createIndentationError(
            `${commandName}: comando "${nestedCommand}" está com indentação incorreta (${indent} espaços). Deve estar no nível ${commandIndent}.`,
            line,
            nestedCommand,
            i,
            severity
          )
        );
        break;
      }

      const propertyKey = this.extractKey(trimmed);
      if (!propertyKey || !validProps.includes(propertyKey)) {
        continue;
      }
      errors.push(
        ...this.validateCommandPropertyIndentation({
          commandName,
          propertyKey,
          lines,
          line,
          lineIndex: i,
          indent,
          expectedPropIndent,
          severity,
        })
      );
    }

    return errors;
  }

  private checkNestedBlockIndentation(
    commandName: string,
    blockName: string,
    lines: string[],
    blockLineIndex: number,
    blockIndent: number,
    expectedNestedIndent: number,
    severity: Severity
  ): LintError[] {
    const errors: LintError[] = [];
    const allowsDeeperNesting = blockName === 'commands';

    for (let i = blockLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();

      if (this.isIgnorableLine(trimmed)) {
        continue;
      }

      const indent = this.getIndentation(line, trimmed);

      if (this.isAboveParentBlock(indent, blockIndent)) {
        break;
      }

      if (this.isAtParentBlockLevel(indent, blockIndent)) {
        break;
      }

      const commandItemError = this.validateCommandItemIndentation({
        allowsDeeperNesting,
        trimmed,
        indent,
        expectedNestedIndent,
        commandName,
        blockName,
        lineText: line,
        lineIndex: i,
        severity,
      });

      if (commandItemError) {
        errors.push(commandItemError);
        continue;
      }

      const nestedKey = this.extractKey(trimmed);
      if (!nestedKey) {
        continue;
      }

      if (this.isExpectedNestedIndent(indent, expectedNestedIndent)) {
        continue;
      }

      if (this.isAllowedDeeperNesting(allowsDeeperNesting, indent, expectedNestedIndent)) {
        continue;
      }

      errors.push(
        this.createIndentationError(
          `${commandName}: propriedade "${nestedKey}" em "${blockName}" está com indentação incorreta (${indent} espaços). Deve estar no nível ${expectedNestedIndent}.`,
          line,
          nestedKey,
          i,
          severity
        )
      );
    }

    return errors;
  }

  private isIgnorableLine(trimmed: string): boolean {
    return trimmed === '' || trimmed.startsWith('#');
  }

  private getIndentation(line: string, trimmed: string): number {
    return line.length - trimmed.length;
  }

  private hasExitedBlock(indent: number, baseIndent: number): boolean {
    return indent <= baseIndent;
  }

  private isAboveParentBlock(indent: number, blockIndent: number): boolean {
    return indent < blockIndent;
  }

  private isAtParentBlockLevel(indent: number, blockIndent: number): boolean {
    return indent === blockIndent;
  }

  private isExpectedNestedIndent(indent: number, expectedNestedIndent: number): boolean {
    return indent === expectedNestedIndent;
  }

  private isAllowedDeeperNesting(
    allowsDeeperNesting: boolean,
    indent: number,
    expectedNestedIndent: number
  ): boolean {
    return allowsDeeperNesting && indent > expectedNestedIndent;
  }

  private extractKey(trimmed: string): string | null {
    const keyMatch = StructuralValidator.KEY_PATTERN.exec(trimmed);
    return keyMatch ? keyMatch[1] : null;
  }

  private isNestedBlockProperty(propertyKey: string): boolean {
    return propertyKey === 'env' || propertyKey === 'when' || propertyKey === 'commands';
  }

  private validateCommandPropertyIndentation(context: {
    commandName: string;
    propertyKey: string;
    lines: string[];
    line: string;
    lineIndex: number;
    indent: number;
    expectedPropIndent: number;
    severity: Severity;
  }): LintError[] {
    const {
      commandName,
      propertyKey,
      lines,
      line,
      lineIndex,
      indent,
      expectedPropIndent,
      severity,
    } = context;

    const errors: LintError[] = [];

    if (indent !== expectedPropIndent) {
      errors.push(
        this.createIndentationError(
          `${commandName}: propriedade "${propertyKey}" está com indentação incorreta (${indent} espaços). Deve estar no nível ${expectedPropIndent} (mesmo nível das demais propriedades do comando).`,
          line,
          propertyKey,
          lineIndex,
          severity
        )
      );
    }

    if (!this.isNestedBlockProperty(propertyKey)) {
      return errors;
    }

    const expectedNestedIndent = expectedPropIndent + 2;
    errors.push(
      ...this.checkNestedBlockIndentation(
        commandName,
        propertyKey,
        lines,
        lineIndex,
        expectedPropIndent,
        expectedNestedIndent,
        severity
      )
    );

    return errors;
  }

  private validateCommandItemIndentation(context: CommandItemIndentationContext): LintError | null {
    const {
      allowsDeeperNesting,
      trimmed,
      indent,
      expectedNestedIndent,
      commandName,
      blockName,
      lineText,
      lineIndex,
      severity,
    } = context;

    if (!allowsDeeperNesting || !trimmed.startsWith('- ')) {
      return null;
    }

    const itemMatch = StructuralValidator.COMMAND_ITEM_PATTERN.exec(trimmed);
    if (!itemMatch) {
      return null;
    }

    const itemKey = itemMatch[1];
    if (indent === expectedNestedIndent) {
      return null;
    }

    return this.createIndentationError(
      `${commandName}: propriedade "${itemKey}" em "${blockName}" está com indentação incorreta (${indent} espaços). Deve estar no nível ${expectedNestedIndent}.`,
      lineText,
      itemKey,
      lineIndex,
      severity
    );
  }

  private createIndentationError(
    message: string,
    lineText: string,
    key: string,
    lineIndex: number,
    severity: Severity
  ): LintError {
    const col = lineText.indexOf(key);
    return {
      message,
      line: lineIndex,
      column: Math.max(0, col),
      endColumn: col >= 0 ? col + key.length : key.length,
      severity,
      source: lintSource('command', 'indentation'),
    };
  }
}
