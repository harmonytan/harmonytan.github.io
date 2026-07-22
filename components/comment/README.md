# Comment

A shared Distill-style block for comments, replications, and external responses. Place it beneath an ordinary `## Comments & Replications`, `## Comments`, or `## Replications` heading; those sections remain in the main article flow.

## Syntax

```markdown
## Comments & Replications

:::component{name="shared.comment" title="Replication & Further Results" author="Reader Name" affiliation="Research Lab" url="https://example.com"}
The response body is ordinary **Markdown** and may contain links, lists, or math.
:::
```

## Properties

| Property | Required | Default |
| --- | --- | --- |
| `title` | no | `Comment` |
| `author` | no | `Guest contributor` |
| `affiliation` | no | empty |
| `url` | no | no author link |

## Theme compatibility

The component requires the `commentary` capability. A Theme without that capability is rejected during the content build.

## No-JavaScript behavior

The component is rendered at build time and needs no browser JavaScript.

