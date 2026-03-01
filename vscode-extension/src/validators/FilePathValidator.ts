import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { LintError, Severity } from '../models/LintError';
import { ConfigManager } from '../config/ConfigManager';
import { findCommandLine, findSeparatorLine } from '../utils/lineLocator';
import { lintSource } from '../utils/lintSource';
import { isRecord } from '../utils/typeGuards';
import { ValidationContext, Validator } from './Validator';

export class FilePathValidator implements Validator {
  constructor(private readonly configManager: ConfigManager) {}

  async validate(context: ValidationContext): Promise<LintError[]> {
    const errors: LintError[] = [];
    const lines = context.lines;
    const basePath = path.dirname(context.filePath);

    const separatorLine = findSeparatorLine(lines);
    await this.validateHeaderPaths(context.header, lines, separatorLine, basePath, errors);
    await this.validateCommandPaths(context.commands, lines, separatorLine, basePath, errors);

    return errors;
  }

  private async validateHeaderPaths(
    header: Record<string, unknown> | null,
    lines: string[],
    separatorLine: number,
    basePath: string,
    errors: LintError[]
  ): Promise<void> {
    const headerPathItems = this.extractHeaderFilePaths(header);
    for (const { filePath } of headerPathItems) {
      const lineIndex = this.findHeaderFileLine(lines, filePath, separatorLine);
      const error = await this.validatePath(filePath, basePath, lines, lineIndex);
      if (error) {
        errors.push(error);
      }
    }
  }

  private async validateCommandPaths(
    commands: unknown[],
    lines: string[],
    separatorLine: number,
    basePath: string,
    errors: LintError[]
  ): Promise<void> {
    let searchStartLine = separatorLine >= 0 ? separatorLine + 1 : 0;

    for (const command of commands) {
      if (!isRecord(command)) {
        continue;
      }

      for (const [key, value] of Object.entries(command)) {
        searchStartLine = await this.processCommandPathEntry(
          key,
          value,
          searchStartLine,
          lines,
          basePath,
          errors
        );
      }
    }
  }

  private async processCommandPathEntry(
    key: string,
    value: unknown,
    searchStartLine: number,
    lines: string[],
    basePath: string,
    errors: LintError[]
  ): Promise<number> {
    if (key !== 'runFlow' && key !== 'runScript') {
      return searchStartLine;
    }

    const commandLineIndex = findCommandLine(lines, key, searchStartLine);
    const nextSearchStartLine = commandLineIndex + 1;
    const commandFilePath = this.extractCommandFilePath(value);
    if (!commandFilePath) {
      return nextSearchStartLine;
    }

    const fileLineIndex = this.findFileLineInBlock(lines, commandFilePath, commandLineIndex);
    const error = await this.validatePath(commandFilePath, basePath, lines, fileLineIndex);
    if (error) {
      errors.push(error);
    }

    return nextSearchStartLine;
  }

  private extractCommandFilePath(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (!isRecord(value)) {
      return null;
    }

    return typeof value['file'] === 'string' ? value['file'] : null;
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
      column: Math.max(0, col),
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
        const hookPaths = this.extractHookItemPaths(item);
        for (const filePath of hookPaths) {
          result.push({ filePath });
        }
      }
    }

    return result;
  }

  private extractHookItemPaths(item: unknown): string[] {
    if (typeof item === 'string') {
      return [item];
    }

    if (!isRecord(item)) {
      return [];
    }

    const result: string[] = [];
    const runFlow = item['runFlow'];
    if (typeof runFlow === 'string') {
      result.push(runFlow);
    }

    const runScript = item['runScript'];
    if (typeof runScript === 'string') {
      result.push(runScript);
    } else if (isRecord(runScript) && typeof runScript['file'] === 'string') {
      result.push(runScript['file']);
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
    if (lines.length === 0) {
      return 0;
    }

    const safeCommandLine = Math.max(0, Math.min(commandLine, lines.length - 1));

    if (lines[safeCommandLine]?.includes(filePath)) {
      return safeCommandLine;
    }

    const commandLineText = lines[safeCommandLine] ?? '';
    const commandIndent = commandLineText.length - commandLineText.trimStart().length;

    for (let i = safeCommandLine + 1; i < lines.length; i++) {
      const trimmed = lines[i].trimStart();
      const indent = lines[i].length - trimmed.length;

      if (trimmed.startsWith('- ') && indent <= commandIndent) {
        break;
      }

      if (lines[i].includes(filePath)) {
        return i;
      }
    }

    return safeCommandLine;
  }
}
