import { LintError } from '../models/LintError';

export interface ValidationContext {
  text: string;
  lines: string[];
  filePath: string;
  header: Record<string, unknown> | null;
  commands: unknown[];
}

export interface Validator {
  validate(context: ValidationContext): LintError[] | Promise<LintError[]>;
}
