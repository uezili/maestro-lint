/**
 * Default configuration values for Maestro Lint
 * Centralize all defaults to avoid hardcoding scattered in code
 */
export const CONFIG_DEFAULTS = {
  // Debounce
  DEBOUNCE_DELAY_MS: 500,

  // Validation
  ENABLE: true,
  VALIDATE_ON_SAVE: true,
  VALIDATE_ON_TYPE: true,
  FILE_PATTERN: '**/*.yaml',

  // Indentation
  INDENTATION_SPACES: 2,

  // Output
  OUTPUT_CHANNEL_NAME: 'Maestro Lint',
  LOG_LEVEL: 'info' as const,

  // Startup
  STARTUP_VALIDATION_DELAY_MS: 250,
} as const;

export type ConfigKey = keyof typeof CONFIG_DEFAULTS;
