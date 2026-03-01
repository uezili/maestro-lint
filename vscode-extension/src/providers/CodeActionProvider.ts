import * as vscode from 'vscode';

export class MaestroCodeActionProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [vscode.CodeActionKind.QuickFix];
  private static readonly SUGGESTION_PATTERN = /Você quis dizer "([^"]+)"\?/;

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (!diagnostic.source?.startsWith('maestro-lint')) {
        continue;
      }

      // Case-sensitivity fix
      if (diagnostic.source.includes('caseSensitivity')) {
        const action = this.createCaseSensitivityFix(document, diagnostic);
        if (action) {
          actions.push(action);
        }
      }

      // Typo fix (Levenshtein suggestion)
      if (diagnostic.message.includes('Você quis dizer')) {
        const action = this.createTypoFix(document, diagnostic);
        if (action) {
          actions.push(action);
        }
      }
    }

    return actions;
  }

  private createCaseSensitivityFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | null {
    const suggestion = this.extractSuggestion(diagnostic.message);
    if (!suggestion) {
      return null;
    }

    const action = new vscode.CodeAction(
      `Corrigir para "${suggestion}"`,
      vscode.CodeActionKind.QuickFix
    );

    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, suggestion);
    action.isPreferred = true;
    action.diagnostics = [diagnostic];

    return action;
  }

  private createTypoFix(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic
  ): vscode.CodeAction | null {
    const suggestion = this.extractSuggestion(diagnostic.message);
    if (!suggestion) {
      return null;
    }

    const action = new vscode.CodeAction(
      `Substituir por "${suggestion}"`,
      vscode.CodeActionKind.QuickFix
    );

    action.edit = new vscode.WorkspaceEdit();
    action.edit.replace(document.uri, diagnostic.range, suggestion);
    action.diagnostics = [diagnostic];

    return action;
  }

  private extractSuggestion(message: string): string | null {
    const match = MaestroCodeActionProvider.SUGGESTION_PATTERN.exec(message);
    return match ? match[1] : null;
  }
}
