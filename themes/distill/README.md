# Distill Theme

Transformer Circuits-inspired research layout. It renders a centered research title, structured author metadata, centered figures, compact citation popovers, and a shared end-matter appendix. It intentionally does not render a table of contents.

Select it in article front matter:

```yaml
theme: distill
```

The machine-readable capability contract is defined in `theme.yaml`. Markdown parsing remains shared with every other Theme.

## End matter

The following level-two Markdown headings are moved into the shaded appendix automatically:

- `## Appendix`
- `## Acknowledgements` (or `## Acknowledgments`)
- `## Author Contributions`
- `## Citation Information` when a custom citation block is needed

`Discussion`, `Comments`, `Replications`, and `Comments & Replications` remain ordinary sections in the article body. Citation Information is generated automatically unless the article supplies its own section. Footnotes and numbered references are collected into the appendix after it.
