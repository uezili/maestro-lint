import * as fs from 'fs';
import * as path from 'path';
import { LintError, Severity } from '../models/LintError';
import { ConfigManager } from '../config/ConfigManager';

export class FilePathValidator {
  constructor(private configManager: ConfigManager) {}

  validate(commands: unknown[], text: string, documentPath: string): LintError[] {
    const errors: LintError[] = [];
    const lines = text.split('\n');
    const basePath = path.dirname(documentPath);

    let searchStartLine = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        searchStartLine = i + 1;
        break;
      }
    }

    for (const command of commands) {
      if (typeof command !== 'object' || command === null) {
        continue;
      }

      const commandObj = command as Record<string, unknown>;

      for (const [key, value] of Object.entries(commandObj)) {
        if (key !== 'runFlow' && key !== 'runScript') {
          continue;
        }


        const commandLineIndex = this.findCommandLine(lines, key, searchStartLine);

        let filePath: string | null = null;

        if (typeof value === 'string') {
          filePath = value;
        } else if (typeof value === 'object' && value !== null) {
          const valueObj = value as Record<string, unknown>;
          if (typeof valueObj['file'] === 'string') {
            filePath = valueObj['file'];
          }
        }

        searchStartLine = commandLineIndex + 1;

        if (!filePath) {
          continue;
        }

        const fileLineIndex = this.findFileLineInBlock(lines, filePath, commandLineIndex);
        const resolvedPath = path.resolve(basePath, filePath);

        if (!fs.existsSync(resolvedPath)) {
          const severity = this.configManager.getRuleSeverity('filePath', 'fileNotFound') as Severity;
          if (severity !== 'off') {
            const col = lines[fileLineIndex]?.indexOf(filePath) ?? 0;
            errors.push({
              message: `Arquivo não encontrado: "${filePath}" (resolvido: ${resolvedPath})`,
              line: fileLineIndex,
              column: col >= 0 ? col : 0,
              endColumn: col >= 0 ? col + filePath.length : filePath.length,
              severity,
              source: 'maestro-lint(filePath.fileNotFound)',
            });
          }
        }
      }
    }

    return errors;
  }


  private findCommandLine(lines: string[], command: string, startLine: number): number {
    for (let i = startLine; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      if (trimmed.startsWith(`- ${command}:`) || trimmed.startsWith(`- ${command}`)) {
        return i;
      }
    }
    return startLine;
  }

  private findFileLineInBlock(lines: string[], filePath: string, commandLine: number): number {
    if (lines[commandLine]?.includes(filePath)) {
      return commandLine;
    }

    for (let i = commandLine + 1; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();

      if (trimmed.startsWith('- ') && !trimmed.startsWith('- ')) {
        break;
      }

      const indent = lines[i].length - trimmed.length;
      if (indent === 0 && trimmed.startsWith('- ')) {
        break;
      }

      if (lines[i].includes(filePath)) {
        return i;
      }
    }

    return commandLine;
  }
}
