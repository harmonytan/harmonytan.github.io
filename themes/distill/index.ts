import {
  renderArticleDocument,
  type ArticleRenderContext,
} from "../../core/build/template.ts";

export function renderPage(context: ArticleRenderContext): string {
  return renderArticleDocument(context);
}
