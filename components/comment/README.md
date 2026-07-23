# Comment

A shared Distill-style block for comments, replications, and external responses. Place it beneath an ordinary `## Comments & Replications`, `## Comments`, or `## Replications` heading; those sections remain in the main article flow.

## Syntax

```markdown
## Comments & Replications

:::component{name="shared.comment" title="Replication & Further Results" author="Reader Name" affiliation="Research Lab" url="https://example.com" size="normal"}
The response body is ordinary **Markdown** and may contain links, lists, or math.
:::
```

## Properties

| Property | Required | Values | Default |
| --- | --- | --- | --- |
| `title` | no | text | `Comment` |
| `author` | no | text | `Guest contributor` |
| `affiliation` | no | text | empty |
| `url` | no | absolute HTTP(S) URL | no author link |
| `size` | no | `compact`, `normal`, `prominent` | `normal` |

Properties are declared and validated by `component.yaml`. `url` must be an
absolute HTTP or HTTPS URL when supplied. Unknown properties and unsupported
values fail the content build.

## Theme compatibility

The component requires the `commentary` capability. A Theme without that capability is rejected during the content build.

`size` is a semantic scale. Themes retain control over the exact title, byline,
and body sizes.

## No-JavaScript behavior

The component is rendered at build time and needs no browser JavaScript.
