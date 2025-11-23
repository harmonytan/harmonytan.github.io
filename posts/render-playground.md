---
title: Rendering Playground
date: 2025-11-21
summary: A quick-hit page to sanity check math, code fences, lists, and headings.
category: Notebook
subtitle: Markdown parsing + MathJax + styles in one place
author: Hongming Tan
image: assets/rendering-playground.png
---

Use this post to quickly verify whether the renderer, MathJax, and styling look right after changes.

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

## External links

- Markdown link → [Visit MDN](https://developer.mozilla.org/)
- Plain URL should autolink: https://example.com/tooling?ref=render-playground
- Reference-style cite inline: This sentence cites a paper [1].

## Nested headings

### Level 3 heading

This helps verify the right sidebar TOC picks up h2/h3 entries in order [2].

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


[1]: Tan, H. “Rendering Playground sanity checks.” 2025. https://example.com/paper
[2]: Tan, H. “Rendering Playground sanity checks.” 2025. https://example.com/paper
