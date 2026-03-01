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
  'androidWebViewHierarchy',
];

export interface HeaderPropertyDef {
  allowedValues: string[];
}

export const HEADER_PROPERTY_SCHEMA: Record<string, HeaderPropertyDef> = {
  androidWebViewHierarchy: {
    allowedValues: ['devtools'],
  },
};

export const VALID_WHEN_PROPERTIES: string[] = ['visible', 'notVisible', 'platform', 'true'];

export interface WhenPropertyDef {
  allowedValues?: string[];
}

export const WHEN_PROPERTY_SCHEMA: Record<string, WhenPropertyDef> = {
  platform: {
    allowedValues: ['android', 'ios', 'web'],
  },
};

export const VALID_MEDIA_EXTENSIONS = ['.png', '.jpeg', '.jpg', '.gif', '.mp4'];
