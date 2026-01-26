---
id: trace-exporter
title: "Trace exporter"
---

## Introduction

Playwright Trace Exporter converts recorded Playwright traces into LLM-friendly Markdown files for AI-assisted debugging and analysis. The exported Markdown contains the same information as the [Trace Viewer](./trace-viewer.md) GUI, optimized for LLM consumption and self-troubleshooting.

For information on recording traces, see [Recording a trace](./trace-viewer.md#recording-a-trace). For viewing traces in the GUI, see [Trace Viewer](./trace-viewer.md).

## Exporting traces
* langs: js

```bash js
npx playwright export-trace path/to/trace.zip -o ./trace-export
```

**Options:**
- `-o, --output <dir>` - Output directory (default: `./trace-export`)

## Exported content

The export creates Markdown files and assets that mirror the Trace Viewer:

### Timeline (`timeline.md`)

A hierarchical view of all actions performed during the test. Each action shows:
- Action name and locator used
- Duration
- Links to before/after DOM snapshots
- Links to attachments

For screenshots captured during test execution, see [Filmstrip](#filmstrip-filmstripmd).

### Timeline Log (`timeline-log.md`)

Detailed Playwright processing logs for each action. Shows how Playwright resolved locators, waited for elements, and performed actions. Example log entries:

```
waiting for getByRole('dialog', { name: 'Find in diff' }).getByRole('textbox', { name: 'Search term' }) (2ms)
  locator resolved to <input value="" type="text" placeholder="Find..." aria-label="Search term"/> (1ms)
  fill("cleanup") (0ms)
attempting fill action (2ms)
  waiting for element to be visible, enabled and editable (6ms)
```

Each log entry shows:
- The operation being performed (waiting, resolving, filling, clicking)
- The element or locator involved
- Duration until the next log entry

### Errors (`errors.md`)

Full error messages and stack traces for failed tests. Includes the exact line of code where the error occurred.

### Console (`console.md`)

Browser console logs captured during the test, including:
- Log messages
- Warnings
- Errors
- Debug output

### Network (`network.md`)

All network requests made during the test:
- Request URL and method
- Status code
- Content type
- Response size

### Metadata (`metadata.md`)

Test environment information:
- Browser name and version
- Viewport size
- Test duration
- Platform details

### DOM Snapshots (`assets/snapshots/`)

Complete HTML snapshots of the page at each action, with CSS styling preserved. Snapshots render identically to what's shown in the [Trace Viewer](./trace-viewer.md), including click target highlighting (blue outline on the target element and red circle at click coordinates). Three snapshot types are captured:
- **Before** - Page state when action is called
- **Input** - Page state at the moment of input with click target highlighting
- **After** - Page state after the action completes

### Filmstrip (`filmstrip.md`)

A timeline of all screenshots captured during the test:
- Timestamp relative to test start
- Links to screenshot images

### Attachments (`attachments.md`, `assets/attachments/`)

All test attachments (files, screenshots, etc.) saved with original filenames:
- Attachment name and content type
- Associated action
- Download links

## Viewing exported snapshots

The exported DOM snapshots include CSS and can be viewed in a browser. Since snapshots use relative paths, you need to serve them via HTTP:

```bash js
# Using npx serve
cd ./trace-export && npx serve

# Or using Python
cd ./trace-export && python -m http.server 8000
```

Then open `http://localhost:3000/assets/snapshots/after@call@123.html` (or port 8000 for Python).

## Loading snapshots via MCP

If you're using an AI agent with Model Context Protocol (MCP) support such as Claude Code, Cursor, GitHub Copilot, and others, the agent can load snapshots directly via the [Playwright MCP server](./mcp.md):

```js
// The AI agent can use browser_navigate to load the snapshot
await mcp.browser_navigate({ url: 'http://localhost:3000/assets/snapshots/after@call@123.html' });

// Use browser_snapshot to get an accessibility tree for analysis
const snapshot = await mcp.browser_snapshot();

// Use browser_evaluate to inspect runtime properties like computed styles
const styles = await mcp.browser_evaluate({
  function: '() => getComputedStyle(document.querySelector(".error-message")).color'
});
```

This enables AI agents to visually inspect the captured page state, perform automated analysis of the DOM structure, and inspect runtime properties such as computed styles, element dimensions, and other layout information.
