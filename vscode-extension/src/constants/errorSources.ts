/**
 * Centralized list of all error sources used in diagnostics
 * Prevents hardcoding and ensures consistency across validators
 */
export enum ErrorSource {
  // Header
  HEADER_CASE_SENSITIVITY = 'header:caseSensitivity',
  HEADER_INVALID_PROPERTY = 'header:invalidProperty',
  HEADER_INVALID_VALUE = 'header:invalidValue',
  HEADER_TAGS = 'header:tags',

  // Command
  COMMAND_INVALID_NAME = 'command:invalidName',
  COMMAND_INVALID_PROPERTY = 'command:invalidProperty',
  COMMAND_INVALID_VALUE = 'command:invalidValue',
  COMMAND_MISSING_VALUE = 'command:missingValue',
  COMMAND_EMPTY_VALUE = 'command:emptyValue',
  COMMAND_INDENTATION = 'command:indentation',

  // When
  WHEN_INVALID_PROPERTY = 'when:invalidProperty',
  WHEN_INVALID_VALUE = 'when:invalidValue',
  WHEN_INDENTATION = 'when:indentation',

  // File Path
  FILE_PATH_NOT_FOUND = 'filePath:fileNotFound',
  FILE_PATH_INVALID = 'filePath:invalid',

  // Array Command
  ARRAY_COMMAND_INVALID = 'arrayCommand:invalid',
  ARRAY_COMMAND_VALUE = 'arrayCommand:value',

  // Nested Object
  NESTED_OBJECT_INVALID_KEY = 'nestedObject:invalidKey',
  NESTED_OBJECT_INVALID_VALUE = 'nestedObject:invalidValue',

  // YAML
  YAML_SYNTAX_ERROR = 'maestro-lint:yaml.syntax',

  // Runtime
  RUNTIME_ERROR = 'maestro-lint:runtime',
}

/**
 * Helper to get error source category from enum value
 */
export function getSourceCategory(source: ErrorSource): string {
  return source.split(':')[0];
}

/**
 * Helper to get error source rule from enum value
 */
export function getSourceRule(source: ErrorSource): string {
  return source.split(':')[1];
}
