/**
 * Stable author-facing types for shared and article-private components.
 *
 * Component modules should import from "@blog/component-api" instead of
 * reaching into core/build with directory-depth-dependent relative paths.
 */
export type {
  ComponentContext,
  ComponentContextWithEscape,
  ComponentModule,
  ThemeManifest,
} from "./build/components.ts";
export type {
  ComponentManifest,
  ComponentPropDefinition,
  ComponentPropSchema,
  ComponentProps,
  ComponentPropType,
  ComponentPropValue,
  ComponentScope,
} from "./build/component-contract.ts";
