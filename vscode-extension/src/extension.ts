import * as vscode from 'vscode';
import { MaestroLintProvider } from './providers/MaestroLintProvider';
import { MaestroCodeActionProvider } from './providers/CodeActionProvider';
import { ConfigManager } from './config/ConfigManager';
import { OutputManager } from './utils/OutputManager';
import { createDebouncedFn, DebouncedFn } from './utils/debounce';

let deactivateCallback: (() => void) | undefined;

export function activate(context: vscode.ExtensionContext) {
  const outputManager = new OutputManager();
  outputManager.log('🎯 Maestro Lint ativado!');
  context.subscriptions.push(outputManager);

  const configManager = new ConfigManager();

  const diagnosticCollection = vscode.languages.createDiagnosticCollection('maestro-lint');
  context.subscriptions.push(diagnosticCollection);

  const lintProvider = new MaestroLintProvider(diagnosticCollection, configManager, outputManager);
  let debouncedValidation: DebouncedFn | undefined;

  const validateWithDebounce = (document: vscode.TextDocument) => {
    const config = vscode.workspace.getConfiguration('maestroLint');
    const delay = config.get<number>('debounceDelay', 500);

    if (debouncedValidation) {
      debouncedValidation.cancel();
    }

    debouncedValidation = createDebouncedFn(() => {
      void lintProvider.validateDocument(document);
    }, delay);

    debouncedValidation();
  };

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

  // Validar ao trocar de editor
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        void lintProvider.validateDocument(editor.document);
      }
    })
  );

  // Validar em tempo real (on type)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event) => {
      const config = vscode.workspace.getConfiguration('maestroLint');
      if (!config.get<boolean>('validateOnType', true)) {
        return;
      }

      validateWithDebounce(event.document);
    })
  );

  // Validar ao salvar
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((document) => {
      const config = vscode.workspace.getConfiguration('maestroLint');
      if (config.get<boolean>('validateOnSave', true)) {
        void lintProvider.validateDocument(document);
      }
    })
  );

  // Limpar diagnósticos ao fechar documento
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((document) => {
      diagnosticCollection.delete(document.uri);
    })
  );

  // Recarregar config quando linter.config.json mudar
  const configWatcher = vscode.workspace.createFileSystemWatcher('**/linter.config.json');
  context.subscriptions.push(
    configWatcher.onDidChange(() => {
      outputManager.log('🔄 Configuração alterada, recarregando...');
      void configManager.reload();
      lintProvider.revalidateAll();
    }),
    configWatcher.onDidCreate(() => {
      void configManager.reload();
      lintProvider.revalidateAll();
    }),
    configWatcher.onDidDelete(() => {
      void configManager.reload();
      lintProvider.revalidateAll();
    }),
    configWatcher
  );

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
    debouncedValidation?.cancel();
    lintProvider.dispose();
  };

  outputManager.log('✅ Maestro Lint pronto!');
}

export function deactivate() {
  deactivateCallback?.();
}
