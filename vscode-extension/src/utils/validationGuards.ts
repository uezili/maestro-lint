import { ValidationContext } from '../validators/Validator';
import { isRecord } from './typeGuards';

/**
 * Guard functions for input validation
 * Prevents null/undefined errors and ensures safe processing
 */
export class ValidationGuards {
  /**
   * Ensure lines array is valid and not empty
   */
  static assertLinesValid(lines: string[] | undefined): lines is string[] {
    return Array.isArray(lines) && lines.length > 0;
  }

  /**
   * Ensure header object is valid and not empty
   */
  static assertHeaderValid(header: unknown): header is Record<string, unknown> {
    if (typeof header !== 'object' || header === null) {
      return false;
    }
    return Object.keys(header as any).length > 0;
  }

  /**
   * Ensure commands array is valid
   */
  static assertCommandsValid(commands: unknown): commands is unknown[] {
    return Array.isArray(commands) && commands.length > 0;
  }

  /**
   * Ensure line index is valid for given lines array
   */
  static assertLineIndexValid(lineIndex: number, lines: string[]): boolean {
    return lineIndex >= 0 && lineIndex < lines.length;
  }

  /**
   * Create validation guard for context
   */
  static assertContextValid(context: ValidationContext | undefined): context is ValidationContext {
    if (!context) return false;
    if (!this.assertLinesValid(context.lines)) return false;
    return true;
  }
}
