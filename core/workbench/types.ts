import type {
  ComponentPropSchema,
  ComponentScope,
} from "../build/component-contract.ts";

export interface WorkbenchTheme {
  id: string;
  label: string;
  capabilities: string[];
}

export interface WorkbenchArticle {
  slug: string;
  title: string;
  theme: string;
  draft: boolean;
}

export interface WorkbenchExample {
  name: string;
  source: string;
  props: Record<string, string>;
  body: string;
}

export interface WorkbenchComponent {
  key: string;
  reference: string;
  name: string;
  scope: ComponentScope;
  ownerArticle?: string;
  description: string;
  requires: string[];
  themes?: {
    only: string[];
  };
  props: ComponentPropSchema;
  readme: string;
  examples: WorkbenchExample[];
}

export interface WorkbenchCatalog {
  themes: WorkbenchTheme[];
  articles: WorkbenchArticle[];
  components: WorkbenchComponent[];
}

export interface WorkbenchRenderRequest {
  theme: string;
  articleSlug?: string;
  componentKey: string;
  props: Record<string, unknown>;
  body: string;
}

export interface WorkbenchRenderResponse {
  document: string;
  markdown: string;
}
