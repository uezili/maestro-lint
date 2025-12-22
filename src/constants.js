/**
 * Constantes do Maestro Linter
 */

const TAG_ONE_OF = ['smoke', 'functional'];

const NAME_PATTERN = /^\[.+\]\s-\s.+$/; // [testKeyZephyrScale] - Nome do teste

const VALID_PROPERTIES = ['appId', 'tags', 'name', 'onFlowStart', 'onFlowComplete', 'env'];

const VALID_COMMANDS = [
  'assertVisible',
  'assertNotVisible',
  'assertTrue',
  'copyTextFrom',
  'evalScript',
  'eraseText',
  'extendedWaitUntil',
  'inputText',
  'killApp',
  'pressKey',
  'pasteText',
  'repeat',
  'retry',
  'runFlow',
  'runScript',
  'scroll',
  'scrollUntilVisible',
  'stopApp',
  'swipe',
  'takeScreenshot',
  'tapOn',
  'doubleTapOn',
  'longPressOn',
  'waitForAnimationToEnd',
  'launchApp',
  'clearState',
  'clearKeychain',
  'back',
  'hide',
  'openLink'
];

const WHEN_PROPERTIES = ['platform', 'visible', 'notVisible', 'true'];

// Propriedades que devem estar no mesmo nível de 'when', não dentro dele
const SIBLING_PROPERTIES = ['commands', 'file', 'env'];

const VALID_PLATFORMS = ['android', 'ios', 'web'];

const COMMAND_PROPERTIES = {
  tapOn: {
    properties: [],
    optional: [
      'id',
      'text',
      'point',
      'repeat',
      'delay',
      'retryTapIfNoChange',
      'waitToSettleTimeoutMs',
      'index',
      'above',
      'optional',
      'enabled',
      'when'
    ],
    requiresValue: true
  },
  doubleTapOn: {
    properties: [],
    optional: [
      'id',
      'text',
      'point',
      'repeat',
      'delay',
      'retryTapIfNoChange',
      'waitToSettleTimeoutMs',
      'index',
      'above',
      'optional',
      'enabled',
      'when'
    ],
    requiresValue: true
  },
  longPressOn: {
    properties: [],
    optional: [
      'id',
      'text',
      'point',
      'repeat',
      'delay',
      'retryTapIfNoChange',
      'waitToSettleTimeoutMs',
      'index',
      'above',
      'optional',
      'enabled',
      'when'
    ],
    requiresValue: true
  },
  assertVisible: {
    properties: [],
    optional: ['text', 'id', 'enabled', 'checked', 'focused', 'selected'],
    requiresValue: true
  },
  assertNotVisible: {
    properties: [],
    optional: ['text', 'id', 'enabled', 'checked', 'focused', 'selected'],
    requiresValue: true
  },
  copyTextFrom: {
    properties: [],
    optional: ['id', 'text'],
    requiresValue: true
  },
  scrollUntilVisible: {
    properties: ['element'],
    optional: ['direction', 'timeout', 'speed', 'visibilityPercentage', 'centerElement', 'when']
  },
  inputText: {
    properties: [],
    optional: [],
    requiresValue: true
  },
  pasteText: {
    properties: [],
    optional: []
  },
  eraseText: {
    properties: [],
    optional: []
  },
  pressKey: {
    properties: [],
    optional: ['home', 'back', 'volume up', 'volume down', 'enter', 'tab', 'lock', 'power', 'backspace'],
    requiresValue: true
  },
  scroll: {
    properties: [],
    optional: []
  },
  swipe: {
    properties: [],
    optional: ['from', 'direction', 'start', 'end'],
    requiresValue: true
  },
  extendedWaitUntil: {
    properties: ['visible', 'notVisible'],
    optional: ['timeout']
  },
  repeat: {
    properties: ['times', 'while'],
    optional: ['commands']
  },
  retry: {
    properties: ['commands'],
    optional: ['maxRetries']
  },
  runFlow: {
    properties: [],
    optional: ['env', 'when', 'file', 'commands']
  },
  runScript: {
    properties: [],
    optional: [],
    requiresValue: true
  },
  takeScreenshot: {
    properties: [],
    optional: ['path']
  },
  killApp: {
    properties: [],
    optional: []
  },
  stopApp: {
    properties: [],
    optional: []
  },
  launchApp: {
    properties: [],
    optional: []
  },
  clearState: {
    properties: [],
    optional: []
  },
  clearKeychain: {
    properties: [],
    optional: []
  },
  back: {
    properties: [],
    optional: []
  },
  hide: {
    properties: [],
    optional: []
  },
  openLink: {
    properties: [],
    optional: [],
    requiresValue: true
  },
  evalScript: {
    properties: [],
    optional: [],
    requiresValue: true
  },
  assertTrue: {
    properties: [],
    optional: ['label', 'condition']
  },
  waitForAnimationToEnd: {
    properties: [],
    optional: ['timeout']
  }
};

module.exports = {
  TAG_ONE_OF,
  NAME_PATTERN,
  VALID_PROPERTIES,
  VALID_COMMANDS,
  WHEN_PROPERTIES,
  SIBLING_PROPERTIES,
  VALID_PLATFORMS,
  COMMAND_PROPERTIES
};
