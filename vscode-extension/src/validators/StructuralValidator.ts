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
    const blocksWithProperties = new Set(['env', 'when', 'commands']); // blocos que contêm sub-propriedades

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

      // Propriedade esperada deveria estar no nível expectedPropIndent
      if (indent !== expectedPropIndent) {
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

      // Se é um bloco aninhado (env, when, commands), valida as sub-propriedades
      if (blocksWithProperties.has(propertyKey)) {
        const expectedNestedIndent = expectedPropIndent + 2;
        errors.push(
          ...this.checkNestedBlockIndentation(
            commandName,
            propertyKey,
            lines,
            i,
            expectedPropIndent,
            expectedNestedIndent,
            severity
          )
        );
      }
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

      if (trimmed === '' || trimmed.startsWith('#')) {
        continue;
      }

      const indent = line.length - trimmed.length;

      // Exit nested block if we return to the parent command's indentation level or less
      // If indent === blockIndent, we've returned to sibling properties of the command
      // If indent < blockIndent, we've exited the command entirely
      if (indent < blockIndent) {
        break;
      }

      // If indent === blockIndent, we're back at the command level (sibling properties)
      // These should not be validated as nested block properties
      if (indent === blockIndent) {
        break;
      }

      // In `commands`, list items (`- cmd`) must be direct children of the
      // block and therefore must keep the expected indentation.
      // Properties of these command objects can have deeper indentation.
      if (allowsDeeperNesting && trimmed.startsWith('- ')) {
        const itemMatch = trimmed.match(/^- ([A-Za-z_][A-Za-z0-9_]*)(?:\s*:|$)/);
        if (!itemMatch) {
          continue;
        }

        const itemKey = itemMatch[1];
        if (indent !== expectedNestedIndent) {
          const col = line.indexOf(itemKey);
          errors.push({
            message: `${commandName}: propriedade "${itemKey}" em "${blockName}" está com indentação incorreta (${indent} espaços). Deve estar no nível ${expectedNestedIndent}.`,
            line: i,
            column: col >= 0 ? col : 0,
            endColumn: col >= 0 ? col + itemKey.length : itemKey.length,
            severity,
            source: lintSource('command', 'indentation'),
          });
        }
        continue;
      }

      const keyMatch = trimmed.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:/);
      if (!keyMatch) {
        continue;
      }

      const nestedKey = keyMatch[1];

      // Only validate keys that are direct children of the nested block
      if (indent === expectedNestedIndent) {
        // This is a direct child of the nested block - validate its indentation
        // (already correct if we got here)
        continue;
      }

      // In blocks that allow nested arrays/objects (`commands`), deeper
      // indentation can be valid (e.g. properties of `- tapOn:`).
      if (allowsDeeperNesting && indent > expectedNestedIndent) {
        continue;
      }

      // If we get here, indent is incorrect for this nested block
      const col = line.indexOf(nestedKey);
      errors.push({
        message: `${commandName}: propriedade "${nestedKey}" em "${blockName}" está com indentação incorreta (${indent} espaços). Deve estar no nível ${expectedNestedIndent}.`,
        line: i,
        column: col >= 0 ? col : 0,
        endColumn: col >= 0 ? col + nestedKey.length : nestedKey.length,
        severity,
        source: lintSource('command', 'indentation'),
      });
    }

    return errors;
  }
}
