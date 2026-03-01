import * as vscode from 'vscode';
import { LintError } from '../models/LintError';

/**
 * Utility class for calculating and normalizing text ranges
 * Eliminates repeated range calculation logic across validators
 */
export class RangeCalculator {
  /**
   * Find the column index where a key appears in a line
   * Returns 0 if not found (safe default)
   */
  static findKeyColumn(line: string, key: string, startIndex: number = 0): number {
    const index = line.indexOf(key, startIndex);
    return Math.max(0, index);
  }

  /**
   * Calculate start and end column for a key in a line
   * Handles edge cases like key not found or at end of line
   */
  static getKeyRange(line: string, key: string): { start: number; end: number } {
    const start = this.findKeyColumn(line, key);
    const end = start > 0 ? start + key.length : Math.min(line.length, key.length);
    return {
      start: Math.max(0, start),
      end: Math.max(start, end),
    };
  }

  /**
   * Normalize a range to be within document bounds
   * Ensures line is valid and columns are within line length
   */
  static normalizeRange(
    line: number,
    startCol: number,
    endCol: number,
    document: vscode.TextDocument
  ): { line: number; startCol: number; endCol: number } {
    const maxLine = Math.max(document.lineCount - 1, 0);
    const normalizedLine = Math.max(0, Math.min(line, maxLine));

    if (normalizedLine >= document.lineCount) {
      return { line: normalizedLine, startCol: 0, endCol: 0 };
    }

    const lineText = document.lineAt(normalizedLine).text;
    const normalizedStart = Math.max(0, Math.min(startCol, lineText.length));
    const normalizedEnd = Math.max(normalizedStart, Math.min(endCol, lineText.length));

    return {
      line: normalizedLine,
      startCol: normalizedStart,
      endCol: normalizedEnd,
    };
  }

  /**
   * Create a VS Code Range from line and column info
   * Guaranteed to be valid for any document
   */
  static createDiagnosticRange(
    error: { line: number; column: number; endColumn?: number },
    document: vscode.TextDocument
  ): vscode.Range {
    const normalized = this.normalizeRange(
      error.line,
      error.column ?? 0,
      error.endColumn ?? (error.column ?? 0) + 1,
      document
    );

    return new vscode.Range(normalized.line, normalized.startCol, normalized.line, normalized.endCol);
  }
}
