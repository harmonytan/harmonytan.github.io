# Callout

A shared semantic aside for notes, cautions, and important claims. It uses Theme tokens and therefore works in every current Theme.

## Syntax

```markdown
:::component{name="shared.callout" title="Build-time contract" tone="note"}
This content remains ordinary Markdown.
:::
```

## Properties

| Property | Required | Values | Default |
| --- | --- | --- | --- |
| `name` | yes | `shared.callout` | — |
| `title` | no | text | `Note` |
| `tone` | no | `note`, `caution`, `claim` | `note` |

## Theme compatibility

The component requires no optional Theme capabilities. It consumes the shared color, typography, and spacing tokens from `themes/base.css`.

## No-JavaScript behavior

The entire component is rendered to semantic HTML during the content build. It has no client module and works without JavaScript.

## Accessibility

The output is an `<aside>` with a visible label. Do not use it for information that must remain in the main reading sequence.

