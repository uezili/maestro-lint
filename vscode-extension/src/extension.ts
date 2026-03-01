import * as vscode from 'vscode';
import { MaestroLintProvider } from './providers/MaestroLintProvider';
import { MaestroCodeActionProvider } from './providers/CodeActionProvider';
import { ConfigManager } from './config/ConfigManager';
import { OutputManager } from './utils/OutputManager';
import { CONFIG_DEFAULTS } from './config/ConfigConstants';
import { registerValidationListeners, registerFileSystemWatchers, registerDebounceListener } from './extension/listeners';

let deactivateCallback: (() => void) | undefined;

export function activate(context: vscode.ExtensionContext) {
  const outputManager = new OutputManager();
  outputManager.log('🎯 Maestro Lint ativado!');
  context.subscriptions.push(outputManager);

  const configManager = new ConfigManager();

  const diagnosticCollection = vscode.languages.createDiagnosticCollection('maestro-lint');
  context.subscriptions.push(diagnosticCollection);

  const lintProvider = new MaestroLintProvider(diagnosticCollection, configManager, outputManager);

  // Registrar Code Action Provider (Quick Fixes)
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { language: 'yaml', scheme: 'file' },
      new MaestroCodeActionProvider(),
      { providedCodeActionKinds: MaestroCodeActionProvider.providedCodeActionKinds }
    )
  );

  // Validar documento ativo ao abrir
  if (vscode.window.activeTextEditor) {
    void lintProvider.validateDocument(vscode.window.activeTextEditor.document);
  }

  // Validar todos os documentos já abertos na ativação
  for (const document of vscode.workspace.textDocuments) {
    void lintProvider.validateDocument(document);
  }

  // Em alguns cenários de startup remoto, os editores chegam após a ativação
  setTimeout(() => {
    lintProvider.revalidateAll();
  }, CONFIG_DEFAULTS.STARTUP_VALIDATION_DELAY_MS);

  // Register all validation listeners
  registerValidationListeners(context, lintProvider, outputManager);

  // Register file system watchers
  registerFileSystemWatchers(context, configManager, lintProvider, outputManager);

  // Register debounce listener for on-type validation
  registerDebounceListener(context, lintProvider);

  // Comandos
  context.subscriptions.push(
    vscode.commands.registerCommand('maestroLint.validateFile', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        void lintProvider.validateDocument(editor.document);
        outputManager.log(`📄 Validado: ${editor.document.fileName}`);
      }
    }),

    vscode.commands.registerCommand('maestroLint.validateWorkspace', () => {
      lintProvider.validateWorkspace();
    }),

    vscode.commands.registerCommand('maestroLint.restart', () => {
      void configManager.reload();
      diagnosticCollection.clear();
      lintProvider.revalidateAll();
      outputManager.log('🔄 Maestro Lint reiniciado!');
      vscode.window.showInformationMessage('Maestro Lint reiniciado!');
    }),

    vscode.commands.registerCommand('maestroLint.showOutput', () => {
      outputManager.show();
    })
  );

  deactivateCallback = () => {
    lintProvider.dispose();
  };

  outputManager.log('✅ Maestro Lint pronto!');
}

export function deactivate() {
  deactivateCallback?.();
}
