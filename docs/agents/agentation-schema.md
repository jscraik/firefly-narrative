# Annotation Schema Reference

Complete data schema for `Agentation` annotations and events.

Source: [agentation.dev/schema](https://agentation.dev/schema)

---

## Annotation Object

### Required Fields

| Field         | Type     | Description                                |
| ------------- | -------- | ------------------------------------------ |
| `id`          | `string` | Unique identifier for the annotation       |
| `comment`     | `string` | User's annotation text                     |
| `elementPath` | `string` | CSS selector path to the annotated element |
| `timestamp`   | `number` | Unix timestamp (ms)                        |
| `x`           | `number` | X position (% of `viewport` width, 0-100)  |
| `y`           | `number` | Y position (`px` from document top)        |
| `element`     | `string` | HTML tag name of the annotated element     |

### Recommended Fields

| Field         | Type                    | Description                  |
| ------------- | ----------------------- | ---------------------------- |
| `url`         | `string`                | Current page URL             |
| `boundingBox` | `{x, y, width, height}` | Element's bounding rectangle |

### Optional Context Fields

| Field             | Type          | Description                |               |                |                   |
| ----------------- | ------------- | -------------------------- | ------------- | -------------- | ----------------- |
| `reactComponents` | `string`      | React component name(s)    |               |                |                   |
| `cssClasses`      | `string`      | CSS classes on the element |               |                |                   |
| `computedStyles`  | `string`      | Computed CSS styles        |               |                |                   |
| `accessibility`   | `string`      | ARIA labels, roles, etc.   |               |                |                   |
| `nearbyText`      | `string`      | Surrounding text context   |               |                |                   |
| `selectedText`    | `string`      | User's text selection      |               |                |                   |
| `intent`          | `"fix" \      | "change" \                 | "question" \  | "approve"`     | Annotation intent |
| `severity`        | `"blocking" \ | "important" \              | "suggestion"` | Severity level |                   |

### Lifecycle Fields

| Field        | Type              | Description                 |                 |              |                |
| ------------ | ----------------- | --------------------------- | --------------- | ------------ | -------------- |
| `status`     | `"pending" \      | "acknowledged" \            | "resolved" \    | "dismissed"` | Current status |
| `resolvedAt` | `string`          | ISO timestamp when resolved |                 |              |                |
| `resolvedBy` | `"human" \        | "agent"`                    | Who resolved it |              |                |
| `thread`     | `ThreadMessage[]` | Conversation thread         |                 |              |                |

### Browser Component Fields

| Field            | Type      | Description                       |
| ---------------- | --------- | --------------------------------- |
| `isFixed`        | `boolean` | Whether element is position:fixed |
| `isMultiSelect`  | `boolean` | Part of multi-select annotation   |
| `fullPath`       | `string`  | Full DOM path                     |
| `nearbyElements` | `string`  | Nearby element context            |

---

## ThreadMessage Object

| Field       | Type       | Description         |                      |
| ----------- | ---------- | ------------------- | -------------------- |
| `id`        | `string`   | Message ID          |                      |
| `role`      | `"human" \ | "agent"`            | Who sent the message |
| `content`   | `string`   | Message content     |                      |
| `timestamp` | `number`   | Unix timestamp (ms) |                      |

---

## AgentationEvent Envelope

This envelope wraps all events:

| Field       | Type                  | Description               |                 |                |            |
| ----------- | --------------------- | ------------------------- | --------------- | -------------- | ---------- |
| `type`      | `AgentationEventType` | Event type (see below)    |                 |                |            |
| `timestamp` | `string`              | ISO 8601 timestamp        |                 |                |            |
| `sessionId` | `string`              | Session identifier        |                 |                |            |
| `sequence`  | `number`              | Monotonic sequence number |                 |                |            |
| `payload`   | `Annotation \         | Session \                 | ThreadMessage \ | ActionRequest` | Event data |

### Event Types

```typescript
type AgentationEventType =
  | "annotation.created"
  | "annotation.updated"
  | "annotation.deleted"
  | "session.created"
  | "session.updated"
  | "session.closed"
  | "thread.message"
  | "action.requested";
```

---

## Usage in This Project

The Narrative app includes the `Agentation` React component in `src/App.tsx`:

```tsx
{import.meta.env.DEV && (
  <Agentation
    endpoint="http://localhost:4747"
    webhookUrl={import.meta.env.VITE_AGENTATION_WEBHOOK_URL}
    onSessionCreated={(sessionId) => {
      console.log("Session started:", sessionId);
    }}
  />
)}
```

Configure the MCP server in `~/.claude/settings.json` for Claude Code integration.
