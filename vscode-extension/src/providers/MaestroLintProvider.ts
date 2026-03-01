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
import { StructuralValidator } from '../validators/StructuralValidator';
import { LintError, severityToDiagnostic } from '../models/LintError';
import { VALID_COMMANDS } from '../constants/commands';
import { Validator, ValidationContext } from '../validators/Validator';
import { isRecord } from '../utils/typeGuards';
import { RangeCalculator } from '../utils/rangeCalculator';

export class MaestroLintProvider {
  private readonly validators: Validator[];
  private  headerValidator: HeaderValidator;
  private commandValidator: CommandValidator;
  private whenValidator: WhenValidator;
  private filePathValidator: FilePathValidator;
  private arrayCommandValidator: ArrayCommandValidator;
  private nestedObjectValidator: NestedObjectValidator;
  private structuralValidator: StructuralValidator;

  constructor(
    private diagnosticCollection: vscode.DiagnosticCollection,
    configManager: ConfigManager,
    private outputManager: OutputManager
  ) {
    this.headerValidator = new HeaderValidator(configManager);
    this.commandValidator = new CommandValidator(configManager);
    this.whenValidator = new WhenValidator(configManager);
    this.filePathValidator = new FilePathValidator(configManager);
    this.arrayCommandValidator = new ArrayCommandValidator(configManager);
    this.nestedObjectValidator = new NestedObjectValidator(configManager);
    this.structuralValidator = new StructuralValidator(configManager);
    this.validators = [
      this.structuralValidator,
      this.headerValidator,
      this.commandValidator,
      this.filePathValidator,
      this.arrayCommandValidator,
      this.nestedObjectValidator,
      this.whenValidator,
    ];
  }

  async validateDocument(document: vscode.TextDocument): Promise<void> {
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
      const errors = await this.lint(text, document.fileName);
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
      } else {
        const err = e instanceof Error ? e : new Error(String(e));
        this.outputManager.error(`Falha ao validar ${document.fileName}: ${err.message}`);
        const diagnostic = new vscode.Diagnostic(
          new vscode.Range(0, 0, 0, 1),
          `Erro interno do Maestro Lint: ${err.message}`,
          vscode.DiagnosticSeverity.Error
        );
        diagnostic.source = 'maestro-lint(runtime)';
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
      const errors = await this.lint(text, document.fileName);

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
    for (const document of vscode.workspace.textDocuments) {
      void this.validateDocument(document);
    }
  }

  clearDocumentDiagnostics(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }

  dispose(): void {
    this.diagnosticCollection?.clear();
  }

  private parseYaml<T = unknown>(text: string): T | null {
    try {
      return yaml.load(text) as T | null;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.outputManager.warn(`Erro ao fazer parse YAML: ${msg}`);
      return null;
    }
  }

  private async lint(text: string, filePath: string): Promise<LintError[]> {
    const errors: LintError[] = [];
    const documents = text.split('---');
    let header: Record<string, unknown> | null = null;
    let commands: unknown[] = [];

    // Parse header with type safety
    if (documents.length >= 1) {
      const headerText = documents[0];
      const headerObj = this.parseYaml<Record<string, unknown> | null>(headerText);
      if (isRecord(headerObj)) {
        header = headerObj;
      }
    }

    // Parse commands with validation
    if (documents.length >= 2) {
      const commandsText = documents.slice(1).join('---');
      const commandsArray = this.parseYaml<unknown[]>(commandsText);
      if (Array.isArray(commandsArray) && commandsArray.length > 0) {
        // Validate that each item is an object (or string for simple commands)
        commands = commandsArray.filter((cmd) => isRecord(cmd) || typeof cmd === 'string');
      }
    }

    const context: ValidationContext = {
      text,
      lines: text.split('\n'),
      filePath,
      header,
      commands,
    };

    for (const validator of this.validators) {
      const result = await validator.validate(context);
      errors.push(...result);
    }

    return errors.filter((e) => e.severity !== 'off');
  }

  private errorsToDiagnostics(errors: LintError[], document: vscode.TextDocument): vscode.Diagnostic[] {
    return errors.map((error) => {
      const range = RangeCalculator.createDiagnosticRange(error, document);
      const diagnostic = new vscode.Diagnostic(range, error.message, severityToDiagnostic(error.severity));
      diagnostic.source = error.source;
      return diagnostic;
    });
  }

  private isMaestroFile(text: string): boolean {
    const hasKnownCommand = VALID_COMMANDS.some((command) => text.includes(command));

    return (
      text.includes('appId:') ||
      hasKnownCommand
    );
  }
}
