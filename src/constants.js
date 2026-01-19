const COMMAND_PROPERTIES = require('./config/commandProperties.json');

const VALID_PROPERTIES = ['appId', 'tags', 'onFlowStart', 'onFlowComplete', 'env', 'name'];

// Derivar VALID_COMMANDS das chaves do commandProperties.json (DRY principle)
const VALID_COMMANDS = Object.keys(COMMAND_PROPERTIES);

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

// Extensões de mídia suportadas para comandos como addMedia
const MEDIA_EXTENSIONS = ['.png', '.jpeg', '.jpg', '.gif', '.mp4'];

// Mapa de erros de digitação comuns para propriedades
const PROPERTY_TYPO_MAP = {
  pltform: 'platform',
  visibile: 'visible',
  notVisibile: 'notVisible'
};

// Níveis de severidade válidos
const SEVERITY_LEVELS = {
  OFF: 'off',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

const VALID_SEVERITIES = Object.values(SEVERITY_LEVELS);

module.exports = {
  VALID_PROPERTIES,
  VALID_COMMANDS,
  WHEN_PROPERTIES,
  SIBLING_PROPERTIES,
  VALID_PLATFORMS,
  COMMAND_PROPERTIES,
  LIMITS,
  MEDIA_EXTENSIONS,
  PROPERTY_TYPO_MAP,
  SEVERITY_LEVELS,
  VALID_SEVERITIES
};
