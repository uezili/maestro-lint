export interface NestedObjectDef {
  isMap: boolean;
  validKeys: string[];
  validValues: string[];
}

export interface CommandDef {
  properties: string[];
  optional: string[];
  requiresValue?: boolean;
  isArrayCommand?: boolean;
  arrayItemType?: string;
  nestedObject?: Record<string, NestedObjectDef>;
  allowedValues?: string[];
}

export const COMMAND_SCHEMA: Record<string, CommandDef> = {
  addMedia: {
    properties: [],
    optional: [],
    requiresValue: false,
    isArrayCommand: true,
    arrayItemType: 'relativePath',
  },
  tapOn: {
    properties: [],
    optional: [
      'id', 'text', 'point', 'repeat', 'delay', 'retryTapIfNoChange',
      'waitToSettleTimeoutMs', 'index', 'above', 'optional', 'enabled',
      'rightOf', 'below', 'leftOf', 'childOf', 'containsChild',
      'containsDescendants', 'traits', 'label',
    ],
    requiresValue: true,
  },
  doubleTapOn: {
    properties: [],
    optional: [
      'id', 'text', 'point', 'repeat', 'delay', 'retryTapIfNoChange',
      'waitToSettleTimeoutMs', 'index', 'above', 'optional', 'enabled',
    ],
    requiresValue: true,
  },
  longPressOn: {
    properties: [],
    optional: [
      'id', 'text', 'point', 'repeat', 'delay', 'retryTapIfNoChange',
      'waitToSettleTimeoutMs', 'index', 'above', 'optional', 'enabled',
    ],
    requiresValue: true,
  },
  assertVisible: {
    properties: [],
    optional: ['text', 'id', 'enabled', 'checked', 'focused', 'selected'],
    requiresValue: true,
  },
  assertNoDefectsWithAI: {
    properties: [],
    optional: [],
    requiresValue: true,
  },
  assertNotVisible: {
    properties: [],
    optional: ['text', 'id', 'enabled', 'checked', 'focused', 'selected'],
    requiresValue: true,
  },
  assertWithAI: {
    properties: [],
    optional: ['assertion'],
    requiresValue: true,
  },
  setLocation: {
    properties: [],
    optional: ['latitude', 'longitude'],
    requiresValue: true,
  },
  setAirplaneMode: {
    properties: [],
    optional: [],
  },
  toggleAirplaneMode: {
    properties: [],
    optional: [],
  },
  copyTextFrom: {
    properties: [],
    optional: ['id', 'text'],
    requiresValue: true,
  },
  scrollUntilVisible: {
    properties: ['element'],
    optional: ['direction', 'timeout', 'speed', 'visibilityPercentage', 'centerElement', 'when'],
  },
  inputText: {
    properties: [],
    optional: [],
    requiresValue: true,
  },
  pasteText: {
    properties: [],
    optional: [],
  },
  eraseText: {
    properties: [],
    optional: [],
  },
  pressKey: {
    properties: [],
    optional: [
      'home', 'back', 'volume up', 'volume down', 'enter',
      'tab', 'lock', 'power', 'backspace',
    ],
    requiresValue: true,
  },
  scroll: {
    properties: [],
    optional: [],
  },
  setPermissions: {
    properties: [],
    optional: ['permissions', 'appId'],
    requiresValue: false,
    nestedObject: {
      permissions: {
        isMap: true,
        validKeys: [
          'camera', 'notifications', 'microphone', 'calendar', 'contacts',
          'location', 'storage', 'photos', 'health', 'homekit', 'medialibrary',
          'motion', 'reminders', 'siri', 'speech', 'usertracking', 'bluetooth',
          'phone', 'sms',
        ],
        validValues: ['allow', 'deny', 'unset'],
      },
    },
  },
  swipe: {
    properties: [],
    optional: ['from', 'direction', 'start', 'end', 'duration'],
    requiresValue: true,
  },
  extendedWaitUntil: {
    properties: ['visible', 'notVisible'],
    optional: ['timeout'],
  },
  repeat: {
    properties: ['times', 'while'],
    optional: ['commands'],
  },
  retry: {
    properties: ['commands'],
    optional: ['maxRetries'],
  },
  runFlow: {
    properties: [],
    optional: ['env', 'when', 'file', 'commands', 'label'],
  },
  runScript: {
    properties: [],
    optional: ['file', 'env', 'when'],
    requiresValue: true,
  },
  takeScreenshot: {
    properties: [],
    optional: ['path'],
  },
  killApp: {
    properties: [],
    optional: [],
  },
  stopApp: {
    properties: [],
    optional: [],
  },
  startRecording: {
    properties: [],
    optional: [],
  },
  stopRecording: {
    properties: [],
    optional: [],
  },
  launchApp: {
    properties: [],
    optional: ['appId', 'clearState', 'arguments', 'clearKeychain', 'stopApp', 'permissions'],
  },
  clearState: {
    properties: [],
    optional: [],
  },
  clearKeychain: {
    properties: [],
    optional: [],
  },
  back: {
    properties: [],
    optional: [],
  },
  hideKeyboard: {
    properties: [],
    optional: [],
  },
  openLink: {
    properties: [],
    optional: [],
    requiresValue: true,
  },
  evalScript: {
    properties: [],
    optional: [],
    requiresValue: true,
  },
  assertTrue: {
    properties: [],
    optional: ['label', 'condition'],
  },
  travel: {
    properties: [],
    optional: ['points', 'speed'],
    requiresValue: true,
  },
  waitForAnimationToEnd: {
    properties: [],
    optional: ['timeout'],
  },
  inputRandomNumber: {
    properties: [],
    optional: ['min', 'max', 'length'],
    requiresValue: false,
  },
  inputRandomColorName: {
    properties: [],
    optional: [],
    requiresValue: false,
  },
  inputRandomPersonName: {
    properties: [],
    optional: [],
    requiresValue: false,
  },
  inputRandomText: {
    properties: [],
    optional: [],
    requiresValue: false,
  },
  inputRandomCityName: {
    properties: [],
    optional: [],
    requiresValue: false,
  },
  inputRandomCountryName: {
    properties: [],
    optional: [],
    requiresValue: false,
  },
  inputRandomEmail: {
    properties: [],
    optional: [],
    requiresValue: false,
  },
  assertScreenshot: {
    properties: [],
    optional: ['path', 'cropOn', 'thresholdPercentage', 'label'],
    requiresValue: false,
  },
  extractTextWithAI: {
    properties: [],
    optional: ['query', 'outputVariable', 'optional'],
    requiresValue: true,
  },
  setClipboard: {
    properties: [],
    optional: [],
    requiresValue: true,
  },
  setOrientation: {
    properties: [],
    optional: [],
    requiresValue: true,
    allowedValues: ['PORTRAIT', 'LANDSCAPE_LEFT', 'LANDSCAPE_RIGHT', 'UPSIDE_DOWN'],
  },
};

// --- Derivados automaticamente do schema ---

export const VALID_COMMANDS: string[] = Object.keys(COMMAND_SCHEMA);

export const ARRAY_COMMANDS: string[] = Object.entries(COMMAND_SCHEMA)
  .filter(([, def]) => def.isArrayCommand)
  .map(([name]) => name);

export const NESTED_OBJECT_COMMANDS: string[] = Object.entries(COMMAND_SCHEMA)
  .filter(([, def]) => def.nestedObject)
  .map(([name]) => name);

export function getCommandProperties(command: string): string[] {
  const def = COMMAND_SCHEMA[command];
  if (!def) { return []; }
  return [...def.properties, ...def.optional];
}

export function getCommandDef(command: string): CommandDef | undefined {
  return COMMAND_SCHEMA[command];
}

export function isArrayCommand(command: string): boolean {
  return COMMAND_SCHEMA[command]?.isArrayCommand === true;
}

export function commandRequiresValue(command: string): boolean {
  return COMMAND_SCHEMA[command]?.requiresValue === true;
}
