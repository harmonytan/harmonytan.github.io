# Callout

A shared semantic aside for notes, cautions, and important claims. It uses Theme tokens and therefore works in every current Theme.

## Syntax

```markdown
:::component{name="shared.callout" title="Build-time contract" tone="note" size="normal"}
This content remains ordinary Markdown.
:::
```

## Properties

| Property | Required | Values | Default |
| --- | --- | --- | --- |
| `name` | yes | `shared.callout` | — |
| `title` | no | text | `Note` |
| `tone` | no | `note`, `caution`, `claim` | `note` |
| `size` | no | `compact`, `normal`, `prominent` | `normal` |

Properties are declared and validated by `component.yaml`. Unknown properties,
invalid enum values, and titles longer than 120 characters fail the content
build instead of silently falling back.

## Theme compatibility

The component requires no optional Theme capabilities. It consumes the shared color, typography, and spacing tokens from `themes/base.css`.

`size` is semantic rather than a raw CSS value. Each Theme may map the three
sizes to typography that fits its own reading scale.

## No-JavaScript behavior

The entire component is rendered to semantic HTML during the content build. It has no client module and works without JavaScript.

## Accessibility

The output is an `<aside>` with a visible label. Do not use it for information that must remain in the main reading sequence.
