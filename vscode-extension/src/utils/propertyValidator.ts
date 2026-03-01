import { LintError, Severity } from '../models/LintError';
import { findBestMatch } from './helpers';
import { lintSource } from './lintSource';
import { ConfigManager } from '../config/ConfigManager';

export interface PropertyValidationOptions {
  key: string;
  validList: string[];
  lines: string[];
  lineIndex: number;
  category: string; // 'header', 'command', 'when'
  severity: Severity;
  configManager: ConfigManager;
}

/**
 * Centralized property validation utility
 * Eliminates duplication across validators
 */
export function validateProperty(options: PropertyValidationOptions): LintError | null {
  const { key, validList, lines, lineIndex, category, severity, configManager } = options;

  if (validList.includes(key)) {
    return null; // Valid
  }

  const ruleSeverity = configManager.getRuleSeverity(category as any, 'invalidProperty') as Severity;
  if (ruleSeverity === 'off') {
    return null;
  }

  const suggestion = findBestMatch(key, validList);
  const col = lines[lineIndex]?.indexOf(key) ?? 0;
  const message = suggestion
    ? `Propriedade inválida em ${category}: "${key}". Você quis dizer "${suggestion}"?`
    : `Propriedade inválida em ${category}: "${key}". Válidas: ${validList.join(', ')}`;

  return {
    message,
    line: lineIndex,
    column: col,
    endColumn: col + key.length,
    severity: ruleSeverity,
    source: lintSource(category, 'invalidProperty'),
  };
}
