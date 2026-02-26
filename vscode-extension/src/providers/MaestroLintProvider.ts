import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import { ConfigManager } from '../config/ConfigManager';
import { OutputManager } from '../utils/OutputManager';
import { HeaderValidator } from '../validators/HeaderValidator';
import { CommandValidator } from '../validators/CommandValidator';
import { WhenValidator } from '../validators/WhenValidator';
import { FilePathValidator } from '../validators/FilePathValidator';
import { ArrayCommandValidator } from '../validators/ArrayCommandValidator';
import { NestedObjectValidator } from '../validators/NestedObjectValidator';
import { LintError, severityToDiagnostic } from '../models/LintError';

export class MaestroLintProvider {
  private diagnosticCollection!: vscode.DiagnosticCollection;
  private headerValidator: HeaderValidator;
  private commandValidator: CommandValidator;
  private whenValidator: WhenValidator;
  private filePathValidator: FilePathValidator;
  private arrayCommandValidator: ArrayCommandValidator;
  private nestedObjectValidator: NestedObjectValidator;

  constructor(
    private configManager: ConfigManager,
    private outputManager: OutputManager
  ) {
    this.headerValidator = new HeaderValidator(configManager);
    this.commandValidator = new CommandValidator(configManager);
    this.whenValidator = new WhenValidator(configManager);
    this.filePathValidator = new FilePathValidator(configManager);
    this.arrayCommandValidator = new ArrayCommandValidator(configManager);
    this.nestedObjectValidator = new NestedObjectValidator(configManager);
  }

  setDiagnosticCollection(collection: vscode.DiagnosticCollection): void {
    this.diagnosticCollection = collection;
  }

  validateDocument(document: vscode.TextDocument): void {
    const config = vscode.workspace.getConfiguration('maestroLint');
    if (!config.get<boolean>('enable', true)) {
      return;
    }

    if (document.languageId !== 'yaml' && !document.fileName.endsWith('.yaml') && !document.fileName.endsWith('.yml')) {
      return;
    }

    // Verifica se é um arquivo Maestro (contém appId ou ---)
    const text = document.getText();
    if (!this.isMaestroFile(text)) {
      this.diagnosticCollection.delete(document.uri);
      return;
    }

    try {
      const errors = this.lint(text, document.fileName);
      const diagnostics = this.errorsToDiagnostics(errors, document);
      this.diagnosticCollection.set(document.uri, diagnostics);

      if (errors.length > 0) {
        this.outputManager.log(`📄 ${document.fileName}: ${errors.length} problema(s) encontrado(s)`);
      }
    } catch (e) {
      if (e instanceof yaml.YAMLException) {
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(
            (e.mark?.line ?? 0),
            (e.mark?.column ?? 0),
            (e.mark?.line ?? 0),
            (e.mark?.column ?? 0) + 1
          ),
          `Erro de sintaxe YAML: ${e.message}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = 'maestro-lint(yaml.syntax)';
        this.diagnosticCollection.set(document.uri, [diagnostic]);
      }
    }
  }

  async validateWorkspace(): Promise<void> {
    const config = vscode.workspace.getConfiguration('maestroLint');
    const pattern = config.get<string>('filePattern', '**/*.yaml');

    const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    let total = 0;
    let withErrors = 0;

    for (const file of files) {
      const document = await vscode.workspace.openTextDocument(file);
      const text = document.getText();

      if (!this.isMaestroFile(text)) {
        continue;
      }

      total++;
      const errors = this.lint(text, document.fileName);

      if (errors.length > 0) {
        withErrors++;
      }

      const diagnostics = this.errorsToDiagnostics(errors, document);
      this.diagnosticCollection.set(document.uri, diagnostics);
    }

    this.outputManager.log(`📊 Workspace validado: ${total} arquivo(s), ${withErrors} com problema(s)`);
    vscode.window.showInformationMessage(
      `Maestro Lint: ${total} arquivo(s) validado(s), ${withErrors} com problema(s).`
    );
  }

  revalidateAll(): void {
    // Revalidar todos os documentos abertos
    for (const editor of vscode.window.visibleTextEditors) {
      this.validateDocument(editor.document);
    }
  }

  dispose(): void {
    this.diagnosticCollection?.clear();
  }

  private lint(text: string, filePath: string): LintError[] {
    const errors: LintError[] = [];
    const documents = text.split('---');

    // Parse header (primeira parte)
    if (documents.length >= 1) {
      const headerText = documents[0];
      try {
        const headerObj = yaml.load(headerText) as Record<string, unknown> | null;
        if (headerObj && typeof headerObj === 'object') {
          errors.push(...this.headerValidator.validate(headerObj, text));
        }
      } catch {
        // Erro de parsing do header será capturado acima
      }
    }

    // Parse commands (segunda parte, após ---)
    if (documents.length >= 2) {
      const commandsText = documents.slice(1).join('---');
      try {
        const commandsObj = yaml.load(commandsText);
        if (Array.isArray(commandsObj)) {
          errors.push(...this.commandValidator.validate(commandsObj, text));
          errors.push(...this.filePathValidator.validate(commandsObj, text, filePath));
          errors.push(...this.arrayCommandValidator.validate(commandsObj, text));
          errors.push(...this.nestedObjectValidator.validate(commandsObj, text));
        }
      } catch {
        // Erro de parsing dos comandos
      }
    }

    // When validation (trabalha com texto diretamente)
    errors.push(...this.whenValidator.validate(text));

    return errors.filter((e) => e.severity !== 'off');
  }

  private errorsToDiagnostics(errors: LintError[], document: vscode.TextDocument): vscode.Diagnostic[] {
    return errors.map((error) => {
      const line = Math.min(error.line, document.lineCount - 1);
      const lineText = document.lineAt(line).text;
      const startCol = Math.min(error.column, lineText.length);
      const endCol = error.endColumn
        ? Math.min(error.endColumn, lineText.length)
        : lineText.length;

      const range = new vscode.Range(line, startCol, line, endCol);
      const diagnostic = new vscode.Diagnostic(
        range,
        error.message,
        severityToDiagnostic(error.severity)
      );
      diagnostic.source = error.source;
      return diagnostic;
    });
  }

  private isMaestroFile(text: string): boolean {
    // Um arquivo Maestro geralmente tem:
    // - appId no header
    // - separador ---
    // - comandos como tapOn, assertVisible, etc.
    return (
      text.includes('appId:') ||
      (text.includes('---') &&
        (text.includes('tapOn') ||
          text.includes('assertVisible') ||
          text.includes('runFlow') ||
          text.includes('launchApp') ||
          text.includes('inputText') ||
          text.includes('pressKey') ||
          text.includes('scroll')))
    );
  }
}
