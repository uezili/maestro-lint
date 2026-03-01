import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { HeaderValidator } from '../validators/HeaderValidator';
import { CommandValidator } from '../validators/CommandValidator';
import { WhenValidator } from '../validators/WhenValidator';
import { FilePathValidator } from '../validators/FilePathValidator';
import { NestedObjectValidator } from '../validators/NestedObjectValidator';
import { ArrayCommandValidator } from '../validators/ArrayCommandValidator';
import { ValidationContext } from '../validators/Validator';
import { ConfigManager, LinterConfig, LinterSettings } from '../config/ConfigManager';

class ConfigManagerStub {
  constructor(
    private readonly config: LinterConfig,
    private readonly settings: LinterSettings
  ) {}

  getConfig(): LinterConfig {
    return this.config;
  }

  getRuleSeverity(): string {
    return 'error';
  }

  getSettings(): LinterSettings {
    return this.settings;
  }
}

function createContext(text: string): ValidationContext {
  return {
    text,
    lines: text.split('\n'),
    filePath: path.join(process.cwd(), 'workspace', 'tests', 'test-context.yaml'),
    header: null,
    commands: [],
  };
}

function createContextWithFile(text: string, filePath: string): ValidationContext {
  return {
    text,
    lines: text.split('\n'),
    filePath,
    header: null,
    commands: [],
  };
}

function createConfigStub(): ConfigManager {
  const config: LinterConfig = {
    tags: { requiredOneOf: [] },
    rules: {
      header: { invalidProperty: 'error', appId: 'error', tags: 'error', env: 'off', name: 'off', onFlowStart: 'off', onFlowComplete: 'off' },
      command: { invalidCommand: 'error', invalidProperty: 'error', missingValue: 'error', emptyValue: 'warning' },
      when: { invalidProperty: 'error', invalidPlatform: 'error', invalidValue: 'error', indentation: 'warning' },
      filePath: { fileNotFound: 'error', invalidPath: 'error' },
    },
    settings: { reportUnusedDisableDirectives: 'warning', maxWarnings: -1, indentationSpaces: 2 },
  };

  return new ConfigManagerStub(config, config.settings) as unknown as ConfigManager;
}

test('HeaderValidator reports case-sensitivity issues', () => {
  const validator = new HeaderValidator(createConfigStub());
  const text = 'appid: com.app\n---\n- tapOn: Login';
  const context = createContext(text);
  context.header = { appid: 'com.app' };

  const result = validator.validate(context);
  assert.equal(result.length, 1);
  assert.match(result[0].message, /capitalização/i);
});

test('HeaderValidator reports missing required appId', () => {
  const validator = new HeaderValidator(createConfigStub());
  const text = 'tags:\n  - smoke\n---\n- tapOn: Login';
  const context = createContext(text);
  context.header = { tags: ['smoke'] };

  const result = validator.validate(context);
  const appIdErrors = result.filter((error) => /header\.appId/.test(error.source));

  assert.equal(appIdErrors.length, 1);
  assert.match(appIdErrors[0].message, /appId/);
});

test('CommandValidator reports invalid command with suggestion', () => {
  const validator = new CommandValidator(createConfigStub());
  const text = 'appId: com.app\n---\n- tapon: Login';
  const context = createContext(text);
  context.commands = [{ tapon: 'Login' }];

  const result = validator.validate(context);
  assert.equal(result.length, 1);
  assert.match(result[0].source, /command\.caseSensitivity/);
});

test('CommandValidator reports missingValue when required command has undefined value', () => {
  const validator = new CommandValidator(createConfigStub());
  const text = 'appId: com.app\n---\n- tapOn:';
  const context = createContext(text);
  context.commands = [{ tapOn: undefined }];

  const result = validator.validate(context);
  assert.equal(result.length, 1);
  assert.match(result[0].source, /command\.missingValue/);
});

test('CommandValidator reports emptyValue when required command has empty string', () => {
  const validator = new CommandValidator(createConfigStub());
  const text = 'appId: com.app\n---\n- inputText: ""';
  const context = createContext(text);
  context.commands = [{ inputText: '' }];

  const result = validator.validate(context);
  assert.equal(result.length, 1);
  assert.match(result[0].source, /command\.emptyValue/);
});

test('StructuralValidator reports file property misplaced under env (text-based, no parse needed)', () => {
  const { StructuralValidator } = require('../validators/StructuralValidator');
  const validator = new StructuralValidator(createConfigStub());
  const text = [
    '- runFlow:',
    '    when:',
    '      platform: android',
    '    env:',
    "        PRODUCT: 'Test'",
    "      file: 'test.yaml'",
  ].join('\n');
  const context = createContext(text);
  // commands is empty — simulates YAML parse failure
  context.commands = [];

  const result = validator.validate(context);
  const indentationErrors = result.filter((error: { source: string; message: string }) =>
    error.source === 'maestro-lint(command.indentation)' && /propriedade "file" está com indentação incorreta/i.test(error.message)
  );

  assert.equal(indentationErrors.length, 1);
});

test('StructuralValidator reports over-indented env property in runFlow', () => {
  const { StructuralValidator } = require('../validators/StructuralValidator');
  const validator = new StructuralValidator(createConfigStub());
  const text = [
    '- runFlow:',
    '    when:',
    '      platform: android',
    '    env:',
    "        PRODUCT: 'Test'",
    "    file: 'test.yaml'",
  ].join('\n');
  const context = createContext(text);
  context.commands = [];

  const result = validator.validate(context);
  const productIndentationErrors = result.filter((error: { source: string; message: string }) =>
    error.source === 'maestro-lint(command.indentation)' && /propriedade "PRODUCT" em "env" está com indentação incorreta/i.test(error.message)
  );

  assert.equal(productIndentationErrors.length, 1);
});

test('StructuralValidator reports over-indented command item inside runFlow commands', () => {
  const { StructuralValidator } = require('../validators/StructuralValidator');
  const validator = new StructuralValidator(createConfigStub());
  const text = [
    '- runFlow:',
    '    when:',
    '      platform: android',
    '    commands:',
    "        - tapOn: '.*Número do celular.*'",
  ].join('\n');
  const context = createContext(text);
  context.commands = [];

  const result = validator.validate(context);
  const commandIndentationErrors = result.filter((error: { source: string; message: string }) =>
    error.source === 'maestro-lint(command.indentation)' && /propriedade "tapOn" em "commands" está com indentação incorreta/i.test(error.message)
  );

  assert.equal(commandIndentationErrors.length, 1);
});

test('WhenValidator reports invalid platform via schema', () => {
  const validator = new WhenValidator(createConfigStub());
  const text = 'appId: com.app\n---\n- tapOn:\n    text: Login\n    when:\n      platform: windows';
  const context = createContext(text);

  const result = validator.validate(context);
  assert.equal(result.length, 1);
  assert.match(result[0].message, /windows/);
  assert.match(result[0].message, /android, ios, web/);
  assert.match(result[0].source, /when\.invalidValue/);
});

test('WhenValidator accepts quoted platform via schema', () => {
  const validator = new WhenValidator(createConfigStub());
  const text = 'appId: com.app\n---\n- runFlow:\n    when:\n      platform: "android"\n    commands:\n      - tapOn: Login';
  const context = createContext(text);

  const result = validator.validate(context);
  const invalidValueErrors = result.filter((error) => /when\.invalidValue/.test(error.source));

  assert.equal(invalidValueErrors.length, 0);
});

test('WhenValidator reports invalid nested env and file inside when', () => {
  const validator = new WhenValidator(createConfigStub());
  const text = [
    '- runFlow:',
    '    when:',
    '      platform: android',
    '      env:',
    "        PRODUCT: 'Test'",
    "      file: 'test.yaml'",
  ].join('\n');
  const context = createContext(text);

  const result = validator.validate(context);
  const invalidWhenProps = result.filter((error) => /when\.invalidProperty/.test(error.source));

  assert.equal(invalidWhenProps.length, 3);
  assert.ok(invalidWhenProps.some((error) => /"env"/.test(error.message)));
  assert.ok(invalidWhenProps.some((error) => /"file"/.test(error.message)));
  assert.ok(invalidWhenProps.some((error) => /"PRODUCT"/.test(error.message)));
});

test('FilePathValidator reports missing runFlow file', async () => {
  const validator = new FilePathValidator(createConfigStub());
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-lint-'));
  const flowFile = path.join(tempDir, 'flow.yaml');

  const text = 'appId: com.app\n---\n- runFlow: ./missing-flow.yaml';
  const context = createContextWithFile(text, flowFile);
  context.commands = [{ runFlow: './missing-flow.yaml' }];

  const result = await validator.validate(context);
  assert.equal(result.length, 1);
  assert.match(result[0].source, /filePath\.fileNotFound/);
});

test('FilePathValidator does not report existing runScript file', async () => {
  const validator = new FilePathValidator(createConfigStub());
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-lint-'));
  const flowFile = path.join(tempDir, 'flow.yaml');
  const scriptPath = path.join(tempDir, 'scripts', 'login.js');

  await fs.mkdir(path.dirname(scriptPath), { recursive: true });
  await fs.writeFile(scriptPath, '// script', 'utf-8');

  const text = [
    'appId: com.app',
    '---',
    '- runScript:',
    '    file: ./scripts/login.js',
  ].join('\n');

  const context = createContextWithFile(text, flowFile);
  context.commands = [{ runScript: { file: './scripts/login.js' } }];

  const result = await validator.validate(context);
  assert.equal(result.length, 0);
});

test('FilePathValidator reports missing runFlow in header hooks', async () => {
  const validator = new FilePathValidator(createConfigStub());
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-lint-'));
  const flowFile = path.join(tempDir, 'flow.yaml');

  const text = [
    'appId: com.test.hierarchy',
    'tags:',
    '  - smoke',
    'onFlowComplete:',
    "  - runFlow: '../../common/subflows/teardown.yaml'",
    '---',
    '- launchApp',
  ].join('\n');

  const context = createContextWithFile(text, flowFile);
  context.header = {
    appId: 'com.test.hierarchy',
    onFlowComplete: [
      { runFlow: '../../common/subflows/teardown.yaml' },
    ],
  };

  const result = await validator.validate(context);
  assert.equal(result.length, 1);
  assert.match(result[0].source, /filePath\.fileNotFound/);
  assert.match(result[0].message, /teardown\.yaml/);
});

test('NestedObjectValidator reports invalid setPermissions key and value', () => {
  const validator = new NestedObjectValidator(createConfigStub());
  const text = [
    'appId: com.app',
    '---',
    '- setPermissions:',
    '    permissions:',
    '      cameraa: allow',
    '      camera: maybe',
  ].join('\n');

  const context = createContext(text);
  context.commands = [
    {
      setPermissions: {
        permissions: {
          cameraa: 'allow',
          camera: 'maybe',
        },
      },
    },
  ];

  const result = validator.validate(context);
  assert.equal(result.length, 2);
  assert.match(result[0].message, /chave inválida/i);
  assert.match(result[1].message, /valor inválido/i);
});

test('ArrayCommandValidator reports invalid relative path and extension', () => {
  const validator = new ArrayCommandValidator(createConfigStub());
  const text = [
    'appId: com.app',
    '---',
    '- addMedia:',
    '  - image.bmp',
  ].join('\n');

  const context = createContext(text);
  context.commands = [{ addMedia: ['image.bmp'] }];

  const result = validator.validate(context);
  assert.equal(result.length, 2);
  assert.match(result[0].message, /caminho deve ser relativo/i);
  assert.match(result[1].message, /extensão de arquivo inválida/i);
});

test('ArrayCommandValidator accepts valid relative media path', () => {
  const validator = new ArrayCommandValidator(createConfigStub());
  const text = [
    'appId: com.app',
    '---',
    '- addMedia:',
    '  - ./assets/image.png',
  ].join('\n');

  const context = createContext(text);
  context.commands = [{ addMedia: ['./assets/image.png'] }];

  const result = validator.validate(context);
  assert.equal(result.length, 0);
});

test('HeaderValidator flags invalid value for androidWebViewHierarchy', () => {
  const validator = new HeaderValidator(createConfigStub());
  const text = [
    'appId: com.app',
    'androidWebViewHierarchy: chromium',
    '---',
    '- launchApp',
  ].join('\n');

  const context = createContext(text);
  context.header = { appId: 'com.app', androidWebViewHierarchy: 'chromium' };

  const result = validator.validate(context);
  const valueError = result.find(e => e.source?.includes('invalidValue'));
  assert.ok(valueError, 'should flag invalid value');
  if (!valueError) {
    return;
  }
  assert.match(valueError.message, /chromium/);
  assert.match(valueError.message, /devtools/);
});

test('HeaderValidator accepts valid value for androidWebViewHierarchy', () => {
  const validator = new HeaderValidator(createConfigStub());
  const text = [
    'appId: com.app',
    'androidWebViewHierarchy: devtools',
    '---',
    '- launchApp',
  ].join('\n');

  const context = createContext(text);
  context.header = { appId: 'com.app', androidWebViewHierarchy: 'devtools' };

  const result = validator.validate(context);
  const valueError = result.find(e => e.source?.includes('invalidValue'));
  assert.equal(valueError, undefined, 'should not flag valid value');
});

// ─── CommandValidator: Value Validation ──────────────────────────────
test('CommandValidator flags invalid value for setOrientation', () => {
  const validator = new CommandValidator(createConfigStub());
  const text = [
    'appId: com.app',
    '---',
    '- setOrientation: DIAGONAL',
  ].join('\n');

  const context = createContext(text);
  context.commands = [{ setOrientation: 'DIAGONAL' }];

  const result = validator.validate(context);
  const valueError = result.find(e => e.source?.includes('invalidValue'));
  assert.ok(valueError, 'should flag invalid value');
  if (!valueError) {
    return;
  }
  assert.match(valueError.message, /DIAGONAL/);
  assert.match(valueError.message, /PORTRAIT/);
});

test('CommandValidator accepts valid value for setOrientation', () => {
  const validator = new CommandValidator(createConfigStub());
  const text = [
    'appId: com.app',
    '---',
    '- setOrientation: LANDSCAPE_LEFT',
  ].join('\n');

  const context = createContext(text);
  context.commands = [{ setOrientation: 'LANDSCAPE_LEFT' }];

  const result = validator.validate(context);
  const valueError = result.find(e => e.source?.includes('invalidValue'));
  assert.equal(valueError, undefined, 'should not flag valid value');
});