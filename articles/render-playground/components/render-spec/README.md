# Render Spec

This is a private component owned by `render-playground`. It demonstrates that an article can ship isolated HTML, CSS, and JavaScript without registering a public writing primitive.

## Syntax

```markdown
:::component{name="local.render-spec" title="Article-private module"}
Private explanatory content.
:::
```

## Theme compatibility

- Requires no optional capabilities.
- Allowed Theme: `distill`

The build must fail if another article or Theme attempts to use this component.

## JavaScript behavior

The build emits readable collapsed markup. Vite bundles `client.js`, and the shared component runtime calls its `hydrate()` export. No global variables are created.

## Accessibility

The disclosure trigger is a native button and maintains `aria-expanded`. Its content remains in the document even before hydration.
