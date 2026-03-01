import { LintError, Severity } from '../models/LintError';
import { lintSource } from '../utils/lintSource';

export interface IndentationCheckOptions {
  actualIndent: number;
  expectedIndent: number;
  context: string; // e.g., "header", "command", "when"
  key?: string;
  line: number;
  lines: string[];
  severity: Severity;
}

/**
 * Utility class for indentation validation
 * Consolidates indentation checking logic used across validators
 */
export class IndentationValidator {
  /**
   * Check if indentation is correct
   * Returns error if not, null if valid
   */
  static validateIndent(options: IndentationCheckOptions): LintError | null {
    const { actualIndent, expectedIndent, context, key, line, lines, severity } = options;

    if (actualIndent !== expectedIndent) {
      const lineText = lines[line] ?? '';
      return {
        message: `${context}: indentação incorreta${
          key ? ` em "${key}"` : ''
        }. Esperado ${expectedIndent} espaços, encontrado ${actualIndent}.`,
        line,
        column: 0,
        endColumn: actualIndent,
        severity,
        source: lintSource(context, 'indentation'),
      };
    }

    return null;
  }

  /**
   * Calculate expected indentation for nested properties
   */
  static calculatePropertyIndent(parentIndent: number, nestingLevel: number = 1): number {
    const INDENT_STEP = 2;
    return parentIndent + INDENT_STEP * nestingLevel;
  }

  /**
   * Check if we've exited a block based on indentation
   */
  static hasExitedBlock(currentIndent: number, blockBaseIndent: number): boolean {
    return currentIndent <= blockBaseIndent;
  }
}
