export const COMPONENT_API_VERSION = 1 as const;

export type ComponentScope = "shared" | "local";
export type ComponentPropType =
  | "string"
  | "enum"
  | "boolean"
  | "number"
  | "integer"
  | "url";
export type ComponentPropValue = string | boolean | number;

export interface ComponentPropDefinition {
  type: ComponentPropType;
  description?: string;
  required?: true;
  default?: ComponentPropValue;
  values?: string[];
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
}

export type ComponentPropSchema = Record<string, ComponentPropDefinition>;
export type ComponentProps = Record<string, ComponentPropValue>;

export interface ComponentManifest {
  [key: string]: unknown;
  apiVersion: typeof COMPONENT_API_VERSION;
  name: string;
  scope: ComponentScope;
  description: string;
  requires: string[];
  themes?: {
    only: string[];
  };
  fallback?: "content";
  props: ComponentPropSchema;
}

export interface ManifestValidationOptions {
  manifestPath?: string;
  expectedName?: string;
  expectedScope?: ComponentScope;
}

const COMPONENT_SCOPES = new Set<ComponentScope>(["shared", "local"]);
const PROP_TYPES = new Set<ComponentPropType>([
  "string",
  "enum",
  "boolean",
  "number",
  "integer",
  "url",
]);
const COMMON_PROP_KEYS = new Set(["type", "description", "required", "default"]);
const TYPE_PROP_KEYS: Record<ComponentPropType, ReadonlySet<string>> = {
  string: new Set(["minLength", "maxLength"]),
  enum: new Set(["values"]),
  boolean: new Set(),
  number: new Set(["min", "max"]),
  integer: new Set(["min", "max"]),
  url: new Set(),
};

export function validateComponentManifest(
  source: unknown,
  {
    manifestPath = "component.yaml",
    expectedName,
    expectedScope,
  }: ManifestValidationOptions = {}
): ComponentManifest {
  if (!isRecord(source)) {
    throw new Error(`${manifestPath}: component manifest must be a YAML object.`);
  }
  if (source.apiVersion !== COMPONENT_API_VERSION) {
    throw new Error(
      `${manifestPath}: apiVersion must be ${COMPONENT_API_VERSION}.`
    );
  }

  const name = requireIdentifier(source.name, `${manifestPath}: name`);
  const scope = String(source.scope ?? "");
  if (!isComponentScope(scope)) {
    throw new Error(`${manifestPath}: scope must be "shared" or "local".`);
  }
  if (expectedName && name !== expectedName) {
    throw new Error(`${manifestPath}: expected name "${expectedName}", received "${name}".`);
  }
  if (expectedScope && scope !== expectedScope) {
    throw new Error(`${manifestPath}: expected scope "${expectedScope}", received "${scope}".`);
  }

  if (typeof source.description !== "string" || !source.description.trim()) {
    throw new Error(`${manifestPath}: description must be a non-empty string.`);
  }
  const description = source.description.trim();

  const requires = normalizeIdentifierList(
    source.requires,
    `${manifestPath}: requires`
  );
  const themes = normalizeThemes(source.themes, manifestPath);
  const fallback = source.fallback;
  if (fallback !== undefined && fallback !== "content") {
    throw new Error(`${manifestPath}: fallback must be "content" when provided.`);
  }

  const propsSource = source.props ?? {};
  if (!isRecord(propsSource)) {
    throw new Error(`${manifestPath}: props must be a YAML object.`);
  }
  const props: ComponentPropSchema = {};
  for (const [propName, definition] of Object.entries(propsSource)) {
    requirePropName(propName, `${manifestPath}: props`);
    props[propName] = normalizePropDefinition(
      definition,
      `${manifestPath}: props.${propName}`
    );
  }

  return {
    ...source,
    apiVersion: COMPONENT_API_VERSION,
    name,
    scope,
    description,
    requires,
    ...(themes ? { themes } : {}),
    ...(fallback ? { fallback } : {}),
    props,
  };
}

export function normalizeComponentProps(
  reference: string,
  schema: ComponentPropSchema,
  rawProps: Record<string, unknown> = {}
): ComponentProps {
  if (!isRecord(schema)) {
    throw new Error(`${reference}: component property schema is invalid.`);
  }
  if (!isRecord(rawProps)) {
    throw new Error(`${reference}: component properties must be an object.`);
  }

  const knownNames = Object.keys(schema);
  const unknownNames = Object.keys(rawProps).filter((name) => !Object.hasOwn(schema, name));
  if (unknownNames.length > 0) {
    const suffix = knownNames.length
      ? ` Available properties: ${knownNames.join(", ")}.`
      : " This component does not accept properties.";
    throw new Error(
      `${reference}: unknown ${pluralize("property", unknownNames.length)} ${unknownNames
        .map((name) => `"${name}"`)
        .join(", ")}.${suffix}`
    );
  }

  const normalized: ComponentProps = {};
  for (const [name, definition] of Object.entries(schema)) {
    if (Object.hasOwn(rawProps, name)) {
      normalized[name] = normalizePropValue(
        rawProps[name],
        definition,
        `${reference}: property "${name}"`
      );
      continue;
    }
    if (Object.hasOwn(definition, "default")) {
      normalized[name] = definition.default as ComponentPropValue;
      continue;
    }
    if (definition.required) {
      throw new Error(`${reference}: required property "${name}" is missing.`);
    }
  }
  return normalized;
}

function normalizePropDefinition(
  source: unknown,
  label: string
): ComponentPropDefinition {
  if (!isRecord(source)) {
    throw new Error(`${label} must be an object.`);
  }

  const type = String(source.type ?? "");
  if (!isComponentPropType(type)) {
    throw new Error(
      `${label}.type must be one of: ${[...PROP_TYPES].join(", ")}.`
    );
  }
  const allowedKeys = new Set([...COMMON_PROP_KEYS, ...TYPE_PROP_KEYS[type]]);
  const unknownKeys = Object.keys(source).filter((key) => !allowedKeys.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`${label} has unknown fields: ${unknownKeys.join(", ")}.`);
  }

  const required = source.required ?? false;
  if (typeof required !== "boolean") {
    throw new Error(`${label}.required must be a boolean.`);
  }
  if (required && Object.hasOwn(source, "default")) {
    throw new Error(`${label} cannot declare both required: true and a default.`);
  }
  if (source.description !== undefined && typeof source.description !== "string") {
    throw new Error(`${label}.description must be a string.`);
  }

  const definition: ComponentPropDefinition = {
    type,
    ...(source.description ? { description: source.description.trim() } : {}),
    ...(required ? { required: true } : {}),
  };

  if (type === "enum") {
    if (!Array.isArray(source.values) || source.values.length === 0) {
      throw new Error(`${label}.values must be a non-empty array.`);
    }
    const values = source.values.map((value, index) => {
      if (typeof value !== "string" || !value) {
        throw new Error(`${label}.values[${index}] must be a non-empty string.`);
      }
      return value;
    });
    if (new Set(values).size !== values.length) {
      throw new Error(`${label}.values must not contain duplicates.`);
    }
    definition.values = values;
  }

  if (type === "string") {
    Object.assign(definition, normalizeLengthBounds(source, label));
  }
  if (type === "number" || type === "integer") {
    Object.assign(definition, normalizeNumberBounds(source, label));
  }

  if (Object.hasOwn(source, "default")) {
    definition.default = normalizePropValue(
      source.default,
      definition,
      `${label}.default`
    );
  }
  return definition;
}

function normalizePropValue(
  value: unknown,
  definition: ComponentPropDefinition,
  label: string
): ComponentPropValue {
  let normalized: ComponentPropValue;
  switch (definition.type) {
    case "string":
      if (typeof value !== "string") {
        throw new Error(`${label} must be a string.`);
      }
      normalized = value;
      break;
    case "enum":
      if (
        typeof value !== "string"
        || !(definition.values ?? []).includes(value)
      ) {
        throw new Error(
          `${label} must be one of: ${(definition.values ?? []).join(", ")}. Received ${JSON.stringify(value)}.`
        );
      }
      normalized = value;
      break;
    case "boolean":
      if (typeof value === "boolean") {
        normalized = value;
      } else if (value === "true" || value === "false") {
        normalized = value === "true";
      } else {
        throw new Error(`${label} must be "true" or "false".`);
      }
      break;
    case "number":
    case "integer":
      normalized = normalizeNumber(value, definition.type, label);
      break;
    case "url":
      normalized = normalizeUrl(value, label);
      break;
    default:
      throw new Error(`${label} uses unsupported type "${definition.type}".`);
  }

  if (typeof normalized === "string" && definition.type === "string") {
    if (definition.minLength !== undefined && normalized.length < definition.minLength) {
      throw new Error(`${label} must contain at least ${definition.minLength} characters.`);
    }
    if (definition.maxLength !== undefined && normalized.length > definition.maxLength) {
      throw new Error(`${label} must contain at most ${definition.maxLength} characters.`);
    }
  }
  if (typeof normalized === "number") {
    if (definition.min !== undefined && normalized < definition.min) {
      throw new Error(`${label} must be at least ${definition.min}.`);
    }
    if (definition.max !== undefined && normalized > definition.max) {
      throw new Error(`${label} must be at most ${definition.max}.`);
    }
  }
  return normalized;
}

function normalizeNumber(
  value: unknown,
  type: "number" | "integer",
  label: string
): number {
  const source = typeof value === "string" ? value.trim() : value;
  if (source === "") throw new Error(`${label} must be a ${type}.`);
  const normalized = typeof source === "number" ? source : Number(source);
  if (!Number.isFinite(normalized)) {
    throw new Error(`${label} must be a finite ${type}.`);
  }
  if (type === "integer" && !Number.isInteger(normalized)) {
    throw new Error(`${label} must be an integer.`);
  }
  return normalized;
}

function normalizeUrl(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} must be a non-empty URL.`);
  }
  const normalized = value.trim();
  let parsed;
  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error(`${label} must be a valid absolute URL.`);
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${label} must use http or https.`);
  }
  return normalized;
}

function normalizeLengthBounds(
  source: Record<string, unknown>,
  label: string
): Pick<ComponentPropDefinition, "minLength" | "maxLength"> {
  const bounds: Pick<ComponentPropDefinition, "minLength" | "maxLength"> = {};
  for (const key of ["minLength", "maxLength"] as const) {
    const value = source[key];
    if (value === undefined) continue;
    if (!Number.isInteger(value) || (value as number) < 0) {
      throw new Error(`${label}.${key} must be a non-negative integer.`);
    }
    bounds[key] = value as number;
  }
  if (
    bounds.minLength !== undefined
    && bounds.maxLength !== undefined
    && bounds.minLength > bounds.maxLength
  ) {
    throw new Error(`${label}.minLength must not exceed maxLength.`);
  }
  return bounds;
}

function normalizeNumberBounds(
  source: Record<string, unknown>,
  label: string
): Pick<ComponentPropDefinition, "min" | "max"> {
  const bounds: Pick<ComponentPropDefinition, "min" | "max"> = {};
  for (const key of ["min", "max"] as const) {
    if (source[key] === undefined) continue;
    if (typeof source[key] !== "number" || !Number.isFinite(source[key])) {
      throw new Error(`${label}.${key} must be a finite number.`);
    }
    bounds[key] = source[key] as number;
  }
  if (bounds.min !== undefined && bounds.max !== undefined && bounds.min > bounds.max) {
    throw new Error(`${label}.min must not exceed max.`);
  }
  return bounds;
}

function normalizeThemes(
  source: unknown,
  manifestPath: string
): ComponentManifest["themes"] | undefined {
  if (source === undefined) return undefined;
  if (!isRecord(source)) {
    throw new Error(`${manifestPath}: themes must be an object.`);
  }
  const unknownKeys = Object.keys(source).filter((key) => key !== "only");
  if (unknownKeys.length > 0) {
    throw new Error(`${manifestPath}: themes has unknown fields: ${unknownKeys.join(", ")}.`);
  }
  if (source.only === undefined) {
    throw new Error(`${manifestPath}: themes.only is required when themes is provided.`);
  }
  const only = normalizeIdentifierList(source.only, `${manifestPath}: themes.only`, {
    allowEmpty: false,
  });
  return { only };
}

function normalizeIdentifierList(
  source: unknown,
  label: string,
  { allowEmpty = true }: { allowEmpty?: boolean } = {}
): string[] {
  if (source === undefined) return [];
  if (!Array.isArray(source)) {
    throw new Error(`${label} must be an array.`);
  }
  if (!allowEmpty && source.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }
  const values = source.map((value, index) =>
    requireIdentifier(value, `${label}[${index}]`)
  );
  if (new Set(values).size !== values.length) {
    throw new Error(`${label} must not contain duplicates.`);
  }
  return values;
}

function requireIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string.`);
  }
  const normalized = value;
  if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) {
    throw new Error(`${label} must use lowercase letters, numbers, and hyphens.`);
  }
  return normalized;
}

function requirePropName(value: string, label: string): void {
  if (!/^[a-z][a-zA-Z0-9-]*$/.test(value)) {
    throw new Error(
      `${label} property "${value}" must start with a lowercase letter and use letters, numbers, or hyphens.`
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isComponentScope(value: string): value is ComponentScope {
  return COMPONENT_SCOPES.has(value as ComponentScope);
}

function isComponentPropType(value: string): value is ComponentPropType {
  return PROP_TYPES.has(value as ComponentPropType);
}

function pluralize(word: string, count: number): string {
  return count === 1 ? word : `${word}s`;
}
