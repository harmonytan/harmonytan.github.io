---
title: Math Typesetting Demo
date: 2025-11-22
summary: Quick reference showing how inline and block formulas render on the site.
category: Notebook
subtitle: Inline + block equations powered by MathJax
author: Harmony Tan
---

# Math Typesetting Demo

Inline math works by wrapping expressions in dollar signs: $E = mc^2$ or $\nabla \cdot \vec{E} = \rho / \varepsilon_0$.

## Block equations

Use double dollar signs for centered display math:
$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$
You can also use the bracket delimiters:

\[
\mathbf{Ax} = \mathbf{b}, \quad
A = \begin{bmatrix}
1 & 2 & 3 \\
0 & 4 & 5 \\
0 & 0 & 6
\end{bmatrix}
\]

## Mixed text and math

When describing derivations, keep prose and equations close together:

Let $f(x) = x^3 - 3x + 1$. Its derivative is $f'(x) = 3x^2 - 3$. Setting $f'(x)=0$ gives the stationary points

$$
x = \pm 1,
\qquad
f(\pm 1) = \mp 1.
$$
