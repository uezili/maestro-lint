const COMMAND_PROPERTIES = require('./config/commandProperties.json');

const VALID_PROPERTIES = ['appId', 'tags', 'onFlowStart', 'onFlowComplete', 'env', 'name'];

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
const SIBLING_PROPERTIES = ['commands', 'file', 'env'];
const VALID_PLATFORMS = ['android', 'ios', 'web'];

const LIMITS = {
  MAX_YAML_PARSE_ITERATIONS: 50,
  CONTEXT_WINDOW_BEFORE: 20,
  CONTEXT_WINDOW_AFTER: 20,
  MAX_LOOKAHEAD_LINES: 10,
  SEPARATOR_WIDTH: 60,
  LEVENSHTEIN_TOLERANCE: 0.3
};

module.exports = {
  VALID_PROPERTIES,
  VALID_COMMANDS,
  WHEN_PROPERTIES,
  SIBLING_PROPERTIES,
  VALID_PLATFORMS,
  COMMAND_PROPERTIES,
  LIMITS
};
