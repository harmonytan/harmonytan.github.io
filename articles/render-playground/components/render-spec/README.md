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
- Allowed Themes: `distill` and `anthropic`

The build must fail if another article or an unlisted Theme attempts to use this component.

## Properties

| Property | Required | Default |
| --- | --- | --- |
| `title` | no | `Render specification` |

The title is declared in `component.yaml`, defaults centrally, and is limited
to 120 characters.

## JavaScript behavior

The build emits readable collapsed markup. Vite bundles `client.ts`, and the shared component runtime calls its `hydrate()` export. No global variables are created.

## Accessibility

The disclosure trigger is a native button and maintains `aria-expanded`. Its content remains in the document even before hydration.
