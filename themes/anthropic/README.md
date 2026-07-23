# Anthropic Editorial Theme

An editorial research layout inspired by Anthropic's engineering articles. It
uses a warm paper palette, a sans-serif display face paired with serif reading
text, a 640px reading column, wide figure lanes, and a geometric article hero.

Select it in article front matter:

```yaml
theme: anthropic
```

The Theme is self-contained and works as a static GitHub Pages build. It does
not download Anthropic's proprietary fonts or reuse Anthropic brand artwork;
the font stack is local-first. The hero motif is a personal three-by-three
identity field combining the H/HT marks with water, light, conversation,
knowledge, manuscript, HTML, and Markdown symbols. The modules are mixed by
visual weight rather than grouped by category, while a shared grid and drawing
weight keep the composition coherent without reusing Anthropic's symbol set.

## Writing contract

Markdown parsing, components, citations, footnotes, figures, and end matter are
shared with the Distill Theme. The following level-two headings are moved into
the structured end-matter region automatically:

- `## Appendix`
- `## Acknowledgements` (or `## Acknowledgments`)
- `## Author Contributions`
- `## Citation Information`

`Discussion`, `Comments`, and `Replications` remain in the main reading flow.
The machine-readable capability contract is defined in `theme.yaml`.
