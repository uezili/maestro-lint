/**
 * Centralized regex patterns used across validators
 * Prevents recompilation on every execution and ensures consistency
 */
export class RegexPatterns {
  // Command detection
  static readonly COMMAND_LINE = /^- ([A-Za-z_][A-Za-z0-9_]*)\s*:/;

  // Key-value pairs
  static readonly KEY_VALUE = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:/;
  static readonly KEY_VALUE_WITH_SPACE = /^\s*([A-Za-z_][A-Za-z0-9_-]*)\s*:/;

  // Properties
  static readonly PROPERTY = /^([A-Za-z_][A-Za-z0-9_]*)\s*:/;

  // Indentation-aware matches
  static readonly INDENTED_KEY = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)\s*:/;

  // Template variables
  static readonly TEMPLATE_VAR = /\$\{[^}]+\}/g;

  /**
   * Extract command name from a line like "- commandName:"
   * Returns null if not a valid command line
   */
  static extractCommand(line: string): string | null {
    const trimmed = line.trimStart();
    const match = trimmed.match(this.COMMAND_LINE);
    return match ? match[1] : null;
  }

  /**
   * Extract key from a line like "key: value"
   * Works with any indentation
   */
  static extractKey(line: string): string | null {
    const match = line.match(this.INDENTED_KEY);
    return match ? match[2] : null;
  }

  /**
   * Get indentation level from a line
   */
  static getIndentation(line: string): number {
    return line.length - line.trimStart().length;
  }

  /**
   * Check if a line is a command definition
   */
  static isCommandDefinition(line: string): boolean {
    return this.COMMAND_LINE.test(line.trimStart());
  }

  /**
   * Check if a line has a key-value pair
   */
  static hasKeyValue(line: string): boolean {
    return this.INDENTED_KEY.test(line);
  }

  /**
   * Check if a line has template variables
   */
  static hasTemplateVar(line: string): boolean {
    return this.TEMPLATE_VAR.test(line);
  }
}
