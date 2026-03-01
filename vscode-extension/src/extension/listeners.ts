import * as vscode from 'vscode';
import { MaestroLintProvider } from '../providers/MaestroLintProvider';
import { OutputManager } from '../utils/OutputManager';
import { ConfigManager } from '../config/ConfigManager';
import { DebouncedFn, createDebouncedFn } from '../utils/debounce';

/**
 * Register all validation event listeners
 * Consolidates listener registration logic
 */
export function registerValidationListeners(
  context: vscode.ExtensionContext,
  lintProvider: MaestroLintProvider,
  outputManager: OutputManager
): void {
  const config = vscode.workspace.getConfiguration('maestroLint');

  // Helper function to safely validate
  async function validateDocument(document: vscode.TextDocument) {
    try {
      await lintProvider.validateDocument(document);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      outputManager.error(`Erro ao validar ${document.fileName}: ${msg}`);
    }
  }

  // Listen to text editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        void validateDocument(editor.document);
      }
    })
  );

  // Listen to document open
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      void validateDocument(document);
    })
  );

  // Listen to document save
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (config.get<boolean>('validateOnSave', true)) {
        void validateDocument(document);
      }
    })
  );

  // Listen to document close
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      lintProvider.clearDocumentDiagnostics(document.uri);
    })
  );
}

/**
 * Register file system watchers for configuration changes
 */
export function registerFileSystemWatchers(
  context: vscode.ExtensionContext,
  configManager: ConfigManager,
  lintProvider: MaestroLintProvider,
  outputManager: OutputManager
): void {
  const configWatcher = vscode.workspace.createFileSystemWatcher('**/linter.config.json');

  const reloadConfig = async () => {
    outputManager.log('🔄 Configuração alterada, recarregando...');
    await configManager.reload();
    lintProvider.revalidateAll();
  };

  context.subscriptions.push(
    configWatcher.onDidChange(() => void reloadConfig()),
    configWatcher.onDidCreate(() => void reloadConfig()),
    configWatcher.onDidDelete(() => void reloadConfig()),
    configWatcher
  );
}

/**
 * Register debounced validation listener for on-type validation
 */
export function registerDebounceListener(
  context: vscode.ExtensionContext,
  lintProvider: MaestroLintProvider
): void {
  let debouncedValidation: DebouncedFn | null = null;

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const config = vscode.workspace.getConfiguration('maestroLint');
      if (!config.get<boolean>('validateOnType', true)) {
        return;
      }

      const delay = config.get<number>('debounceDelay', 500);

      if (debouncedValidation) {
        debouncedValidation.cancel();
      }

      debouncedValidation = createDebouncedFn(() => {
        void lintProvider.validateDocument(event.document);
      }, delay);

      debouncedValidation();
    })
  );
}
