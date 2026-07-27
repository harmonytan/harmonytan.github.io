---
title: Rendering Playground
date: 2025-11-21
category: Test
summary: A living fixture for Markdown, theme, and component contracts.
theme: anthropic
visibility: public
---

Use this post to quickly verify whether the renderer, KaTeX, and styling look right after changes.

:::component{name="shared.callout" title="Build-time contract" tone="note"}
This block is a public Markdown component. Its manifest is validated against the active Theme before the article is generated.
:::

:::component{name="local.render-spec" title="Article-private module"}
This component lives beside this article. Open it to inspect which guarantees belong to this document alone.
:::

## Inline vs block math

Inline math should sit inside text: $e^{i\pi} + 1 = 0$ and $\nabla \cdot \vec{E} = \rho / \varepsilon_0$.

Block math via dollar fences:

$$
\mathbf{Ax} = \mathbf{b}, \quad
A = \begin{bmatrix}
1 & 2 & 3 \\
0 & 4 & 5 \\
0 & 0 & 6
\end{bmatrix}
$$

Bracket-delimited math should also work:

\[
\int_{-\infty}^{\infty} e^{-x^2} \; dx = \sqrt{\pi}
\]

## Code fences

```js
function hello(name) {
  return `Hello, ${name}!`;
}

console.log(hello("world"));
```

```python
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
```

## Lists & quotes

- Item one
- Item two with `inline code`
- Item three with **bold** and *italic*

> A short blockquote to check spacing.

## Intentional external links

- Direct resource link → [Visit MDN](https://developer.mozilla.org/)
- A bare resource URL should autolink: https://example.com/tooling?ref=render-playground
- Evidence and source material should use citations instead: this sentence cites two sources together [1, 2].

## Nested headings

### Level 3 heading

This verifies that stable heading anchors remain available without rendering a table of contents [2].

## Tables

| Item   | Qty | Note      |
| ------ | --- | --------- |
| Coffee | 2   | Drip brew |
| Tea    | 1   | Earl Grey |
| Cocoa  | 1   | With milk |

### Wide content table (wrap test)

| Column    | Detail                                                                                                                                                                                                            |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Long text | This cell contains a deliberately long sentence to check how the table handles wrapping inside narrow columns without breaking the layout. It should wrap naturally instead of overflowing outside the container. |
| URL       | https://example.com/this/is/a/very/long/path/that/should/wrap/rather/than/stretching-the-table-layout                                                                                                             |
| Mixed     | Short line<br>Another short line                                                                                                                                                                                  |

## Quote styling

> **Q. So AI is going to do the meaning-making for me?**
>
> No. This is neither about you, nor the AI.
>
> Meaning happens in the middle, *between us*. The machinery supports and hinders: scale and speed help, homogenization and fixity hurt. The goal isn't to spam or abdicate judgement just because generation is cheap.
>
> This is about how you and I relate via mostly-ignorable infrastructure. Like the internet: it fades into the background when it works. Interfaces should flex to context instead of forcing one-size-fits-all structures.

## Discussion

The discussion remains part of the main reading sequence. It can introduce open questions before comments and replications.[^end-matter]

## Comments & Replications

:::component{name="shared.comment" title="Replication & Further Results" author="Example Contributor" affiliation="Independent Researcher" url="https://example.com"}
I reproduced the rendering checks in a second browser and found the same typography, citation, and end-matter behavior. This block demonstrates the shared response primitive.
:::

## Appendix

The appendix is written as ordinary Markdown but is moved into the structured end-matter region during the content build.

## Acknowledgements

Thanks to readers who reported layout regressions across narrow and wide viewports.

## Author Contributions

Hongming Tan designed the article architecture, wrote the fixture, and reviewed the rendered output.

[^end-matter]: Discussion and response sections stay in the article body; this note is collected into Footnotes below Citation Information.


[1]: Tan, H. “Rendering Playground sanity checks.” 2025. https://example.com/paper
[2]: Tan, H. “Rendering Playground sanity checks.” 2025. https://example.com/paper
