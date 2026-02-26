export {
  COMMAND_SCHEMA,
  VALID_COMMANDS,
  ARRAY_COMMANDS,
  NESTED_OBJECT_COMMANDS,
  getCommandProperties,
  getCommandDef,
  isArrayCommand,
  commandRequiresValue,
} from './commandSchema';
export type { CommandDef, NestedObjectDef } from './commandSchema';

export const VALID_HEADER_PROPERTIES: string[] = [
  'appId',
  'tags',
  'name',
  'env',
  'onFlowStart',
  'onFlowComplete',
];

export const VALID_WHEN_PROPERTIES: string[] = ['visible', 'notVisible', 'platform', 'true'];

export const VALID_PLATFORMS: string[] = ['android', 'ios', 'web'];

export const VALID_MEDIA_EXTENSIONS = ['.png', '.jpeg', '.jpg', '.gif', '.mp4'];
