import * as vscode from 'vscode';

export class OutputManager {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel('Maestro Lint');
  }

  log(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.outputChannel.appendLine(`[${timestamp}] ${message}`);
  }

  error(message: string): void {
    this.log(`❌ ${message}`);
  }

  warn(message: string): void {
    this.log(`⚠️  ${message}`);
  }

  show(): void {
    this.outputChannel.show();
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
