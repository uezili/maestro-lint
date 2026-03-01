import * as vscode from 'vscode';

export type Severity = 'error' | 'warning' | 'info' | 'off';

export interface LintError {
  message: string;
  line: number;
  column: number;
  endColumn?: number;
  severity: Severity;
  source: string; // ex: 'maestro-lint(header.invalidProperty)'
}

export function severityToDiagnostic(severity: Severity): vscode.DiagnosticSeverity {
  switch (severity) {
    case 'error':
      return vscode.DiagnosticSeverity.Error;
    case 'warning':
      return vscode.DiagnosticSeverity.Warning;
    case 'info':
      return vscode.DiagnosticSeverity.Information;
    default:
      return vscode.DiagnosticSeverity.Hint;
  }
}
