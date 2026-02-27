import { promises as fs } from 'fs';
import * as path from 'path';
import { LintError, Severity } from '../models/LintError';
import { ConfigManager } from '../config/ConfigManager';
import { findCommandLine, findSeparatorLine } from '../utils/lineLocator';
import { lintSource } from '../utils/lintSource';
import { isRecord } from '../utils/typeGuards';
import { ValidationContext, Validator } from './Validator';

export class FilePathValidator implements Validator {
  constructor(private configManager: ConfigManager) {}

  async validate(context: ValidationContext): Promise<LintError[]> {
    const errors: LintError[] = [];
    const lines = context.lines;
    const commands = context.commands;
    const basePath = path.dirname(context.filePath);

    const separatorLine = findSeparatorLine(lines);
    let searchStartLine = separatorLine >= 0 ? separatorLine + 1 : 0;

    const headerPathItems = this.extractHeaderFilePaths(context.header);
    for (const { filePath } of headerPathItems) {
      const lineIndex = this.findHeaderFileLine(lines, filePath, separatorLine);
      const error = await this.validatePath(filePath, basePath, lines, lineIndex);
      if (error) {
        errors.push(error);
      }
    }

    for (const command of commands) {
      if (!isRecord(command)) {
        continue;
      }

      const commandObj = command;

      for (const [key, value] of Object.entries(commandObj)) {
        if (key !== 'runFlow' && key !== 'runScript') {
          continue;
        }


        const commandLineIndex = findCommandLine(lines, key, searchStartLine);

        let filePath: string | null = null;

        if (typeof value === 'string') {
          filePath = value;
        } else if (isRecord(value)) {
          const valueObj = value;
          if (typeof valueObj['file'] === 'string') {
            filePath = valueObj['file'];
          }
        }

        searchStartLine = commandLineIndex + 1;

        if (!filePath) {
          continue;
        }

        const fileLineIndex = this.findFileLineInBlock(lines, filePath, commandLineIndex);
        const error = await this.validatePath(filePath, basePath, lines, fileLineIndex);
        if (error) {
          errors.push(error);
        }
      }
    }

    return errors;
  }

  private async validatePath(
    filePath: string,
    basePath: string,
    lines: string[],
    lineIndex: number
  ): Promise<LintError | null> {
    const resolvedPath = path.resolve(basePath, filePath);

    let fileExists = true;
    try {
      await fs.access(resolvedPath);
    } catch {
      fileExists = false;
    }

    if (fileExists) {
      return null;
    }

    const severity = this.configManager.getRuleSeverity('filePath', 'fileNotFound') as Severity;
    if (severity === 'off') {
      return null;
    }

    const col = lines[lineIndex]?.indexOf(filePath) ?? 0;
    return {
      message: `Arquivo não encontrado: "${filePath}" (resolvido: ${resolvedPath})`,
      line: lineIndex,
      column: col >= 0 ? col : 0,
      endColumn: col >= 0 ? col + filePath.length : filePath.length,
      severity,
      source: lintSource('filePath', 'fileNotFound'),
    };
  }

  private extractHeaderFilePaths(header: Record<string, unknown> | null): Array<{ filePath: string }> {
    if (!header) {
      return [];
    }

    const result: Array<{ filePath: string }> = [];
    const headerHooks = ['onFlowStart', 'onFlowComplete'];

    for (const hook of headerHooks) {
      const hookValue = header[hook];
      if (!Array.isArray(hookValue)) {
        continue;
      }

      for (const item of hookValue) {
        if (typeof item === 'string') {
          result.push({ filePath: item });
          continue;
        }

        if (!isRecord(item)) {
          continue;
        }

        const runFlow = item['runFlow'];
        if (typeof runFlow === 'string') {
          result.push({ filePath: runFlow });
        }

        const runScript = item['runScript'];
        if (typeof runScript === 'string') {
          result.push({ filePath: runScript });
        } else if (isRecord(runScript) && typeof runScript['file'] === 'string') {
          result.push({ filePath: runScript['file'] });
        }
      }
    }

    return result;
  }

  private findHeaderFileLine(lines: string[], filePath: string, separatorLine: number): number {
    const end = separatorLine >= 0 ? separatorLine : lines.length;
    for (let i = 0; i < end; i++) {
      if (lines[i].includes(filePath)) {
        return i;
      }
    }

    return 0;
  }

  private findFileLineInBlock(lines: string[], filePath: string, commandLine: number): number {
    if (lines[commandLine]?.includes(filePath)) {
      return commandLine;
    }

    const commandIndent = lines[commandLine].length - lines[commandLine].trimStart().length;

    for (let i = commandLine + 1; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      const indent = lines[i].length - trimmed.length;

      if (trimmed.startsWith('- ') && indent <= commandIndent) {
        break;
      }

      if (lines[i].includes(filePath)) {
        return i;
      }
    }

    return commandLine;
  }
}
