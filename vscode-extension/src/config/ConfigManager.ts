import * as vscode from 'vscode';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';

export interface LinterRules {
  header: Record<string, string>;
  command: Record<string, string>;
  when: Record<string, string>;
  filePath: Record<string, string>;
}

export interface LinterSettings {
  reportUnusedDisableDirectives: string;
  maxWarnings: number;
  indentationSpaces: number;
}

export interface LinterConfig {
  tags: {
    requiredOneOf: string[];
  };
  rules: LinterRules;
  settings: LinterSettings;
}

const DEFAULT_CONFIG: LinterConfig = {
  tags: {
    requiredOneOf: [],
  },
  rules: {
    header: {
      appId: 'error',
      tags: 'off',
      name: 'off',
      env: 'off',
      onFlowStart: 'off',
      onFlowComplete: 'off',
      invalidProperty: 'warning',
    },
    command: {
      invalidCommand: 'error',
      invalidProperty: 'error',
      missingValue: 'error',
      emptyValue: 'warning',
    },
    when: {
      invalidProperty: 'error',
      invalidPlatform: 'error',
      indentation: 'warning',
    },
    filePath: {
      fileNotFound: 'error',
      invalidPath: 'error',
    },
  },
  settings: {
    reportUnusedDisableDirectives: 'warning',
    maxWarnings: -1,
    indentationSpaces: 2,
  },
};

export class ConfigManager {
  private config: LinterConfig = DEFAULT_CONFIG;

  async reload(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      this.config = this.cloneDefaultConfig();
      return;
    }

    const vsConfig = vscode.workspace.getConfiguration('maestroLint');
    const configPath = vsConfig.get<string>('configPath', 'linter.config.json');

    for (const folder of workspaceFolders) {
      const fullPath = path.join(folder.uri.fsPath, configPath);
      try {
        const rawContent = await fs.readFile(fullPath, 'utf-8');
        const parsed = JSON.parse(rawContent) as Partial<LinterConfig>;
        this.config = this.mergeConfig(DEFAULT_CONFIG, parsed);
        return;
      } catch {
        // Falha ao ler config, tentar próximo workspace folder
      }
    }

    this.config = this.cloneDefaultConfig();
  }

  getConfig(): LinterConfig {
    return this.config;
  }

  getRuleSeverity(category: keyof LinterRules, rule: string): string {
    return this.config.rules[category]?.[rule] ?? 'error';
  }

  getSettings(): LinterSettings {
    return this.config.settings;
  }

  private mergeConfig(defaults: LinterConfig, overrides: Partial<LinterConfig>): LinterConfig {
    return {
      tags: {
        requiredOneOf: overrides.tags?.requiredOneOf ?? defaults.tags.requiredOneOf,
      },
      rules: {
        header: { ...defaults.rules.header, ...overrides.rules?.header },
        command: { ...defaults.rules.command, ...overrides.rules?.command },
        when: { ...defaults.rules.when, ...overrides.rules?.when },
        filePath: { ...defaults.rules.filePath, ...overrides.rules?.filePath },
      },
      settings: { ...defaults.settings, ...overrides.settings },
    };
  }

  private cloneDefaultConfig(): LinterConfig {
    return {
      tags: {
        requiredOneOf: [...DEFAULT_CONFIG.tags.requiredOneOf],
      },
      rules: {
        header: { ...DEFAULT_CONFIG.rules.header },
        command: { ...DEFAULT_CONFIG.rules.command },
        when: { ...DEFAULT_CONFIG.rules.when },
        filePath: { ...DEFAULT_CONFIG.rules.filePath },
      },
      settings: { ...DEFAULT_CONFIG.settings },
    };
  }
}
