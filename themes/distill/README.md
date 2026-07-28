# Distill Theme

Transformer Circuits-inspired research layout. It renders a centered research title, structured author metadata, centered figures, compact citation popovers, and a shared end-matter appendix. It intentionally does not render a table of contents.

Select it in article front matter:

```yaml
theme: distill
```

The machine-readable capability contract is defined in `theme.yaml`. Markdown parsing remains shared with every other Theme.

## Mathematics

Use ordinary `$...$` delimiters for inline math and `$$...$$` for display math. Each display block is centered independently, so keep separate mathematical statements in separate blocks:

```latex
$$
H(X)=-\sum_x p(x)\log p(x)
$$
$$
IG(X;Y=y)=H(X)-H(X \mid Y=y)
$$
```

Use `aligned` only for an equation system whose alignment carries meaning. The renderer preserves the author's notation and does not rewrite variable names automatically.

Display math is normalized to the article's body scale. The Theme also keeps a small vertical safety area around each formula so tall operators, cases, superscripts, and subscripts are not clipped.

## End matter

The following level-two Markdown headings are moved into the shaded appendix automatically:

- `## Appendix`
- `## Acknowledgements` (or `## Acknowledgments`)
- `## Author Contributions`
- `## Citation Information` when a custom citation block is needed

`Discussion`, `Comments`, `Replications`, and `Comments & Replications` remain ordinary sections in the article body. Citation Information is generated automatically unless the article supplies its own section. Footnotes and numbered references are collected into the appendix after it.
