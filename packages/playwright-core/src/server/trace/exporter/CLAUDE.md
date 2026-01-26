# Trace Exporter

Converts Playwright trace ZIP files into LLM-friendly Markdown for AI-assisted debugging and analysis. Should provide feature parity with the original [trace-viewer.md](../../../../../docs/src/trace-viewer.md).

**Docs:** [trace-exporter.md](../../../../../docs/src/trace-exporter.md)

## What It Does

Takes a `.zip` trace file (recorded via `trace: 'on'` in Playwright config) and outputs:

- **Markdown files** - `index.md`, `timeline.md`, `errors.md`, `console.md`, `network.md`, `metadata.md`, `filmstrip.md`, `attachments.md`
- **DOM snapshots** - HTML files in `assets/snapshots/` with CSS preserved
- **Resources** - Screenshots, attachments in `assets/resources/` and `assets/attachments/`

## CLI Usage

```bash
npx playwright export-trace path/to/trace.zip -o ./trace-export
```

## Architecture

### Entry Point

`exportTraceToMarkdown(traceFile, options)` in `traceExporter.ts`:

1. `parseTrace()` - Reads the ZIP, parses `.trace` and `.network` NDJSON files
2. `extractAssets()` - Extracts resources and renders HTML snapshots
3. Generates all Markdown files

### Trace Data Structures

```
TraceContext
├── actions: TraceAction[]      # Test steps with timing, snapshots, errors
├── events: TraceEvent[]        # Console logs
├── errors: TraceError[]        # Global errors
├── resources: TraceResource[]  # Network requests
├── pages: TracePage[]          # Screencast frames
├── snapshots: TraceFrameSnapshot[]  # DOM snapshots
└── networkResourceMap: Map<string, string>  # URL -> SHA1
```

### Trace Event Types

Events in `.trace` files (NDJSON format):

| Event Type | Description |
|------------|-------------|
| `context-options` | Browser/environment metadata |
| `before` | Action start (creates TraceAction) |
| `after` | Action end (updates with result/error) |
| `log` | Action log entry |
| `console` | Browser console message |
| `error` | Global error |
| `resource-snapshot` | Network request |
| `screencast-frame` | Screenshot |
| `frame-snapshot` | DOM snapshot |

### Snapshot Rendering

`ExportSnapshotRenderer` handles DOM snapshot → HTML conversion:

1. **Subtree references** - Snapshots use `[[snapshotsAgo, nodeIndex]]` to reference nodes from previous snapshots (deduplication)
2. **Resource resolution** - URLs rewritten to `../resources/{sha1}` using `resourceOverrides` and `networkResourceMap`
3. **CSS URL rewriting** - `url()` references in stylesheets are rewritten

Key methods:
- `_buildOverrideMap()` - Resolves ref chains in resourceOverrides
- `_rewriteUrl()` - Maps URLs to local SHA1 paths
- `_rewriteCssUrls()` - Handles `url()` in CSS

### Timeline Hierarchy

Actions form a tree via `parentId`. The exporter:
1. Filters to `class === 'Test'` actions (user-visible steps)
2. Builds tree with `buildActionTree()`
3. Links API-level snapshots to Test actions via `stepId`

## Viewing Exported Snapshots

Snapshots use relative paths and need HTTP serving:

```bash
cd ./trace-export && npx serve
# Open http://localhost:3000/assets/snapshots/after@call@123.html
```

## Testing

Tests are in `tests/library/trace-exporter.spec.ts`. Run with:

```bash
npx playwright test tests/library/trace-exporter.spec.ts
```

### Test Trace Files

Test traces are in `tests/assets/`:
- `test-trace1.zip` - Basic trace with actions
- `test-trace-scroll.zip` - Trace with scroll positions, input values, checkbox states
- `test-trace-shadow.zip` - Trace with shadow DOM and custom elements
- `test-trace-error.zip` - Trace with errors
- `test-trace-console.zip` - Trace with console messages
- `test-trace-action.zip` - Trace with click actions and input snapshots
- `test-trace-screenshots.zip` - Trace with screencast frames
- `test-trace-attachments.zip` - Trace with file attachments
- `test-trace-css-js.zip` - Trace with CSS styling and JS effects
- `test-trace-empty.zip` - Empty trace

### Generating New Test Traces

To generate a new test trace (e.g., for scroll positions):

```js
import { chromium } from 'playwright';
import http from 'http';

// Start HTTP server with test HTML
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<html>...</html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

// Record trace
const browser = await chromium.launch();
const context = await browser.newContext();
await context.tracing.start({ screenshots: true, snapshots: true });

const page = await context.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}`);
// ... perform actions ...

await context.tracing.stop({ path: 'tests/assets/test-trace-xxx.zip' });
await browser.close();
server.close();
```

### Runtime Verification

The scroll position test verifies that exported snapshots work correctly at runtime:
1. Exports the trace
2. Loads snapshot HTML in browser via `page.setContent()`
3. Verifies `scrollTop`, input values, checkbox states are restored by the injected script

## Key Files

- `traceExporter.ts` - Main implementation
- `../../utils/zipFile.ts` - ZIP reading
- `../../../utils/isomorphic/stringUtils.ts` - HTML escaping
- `../../../../../tests/library/trace-exporter.spec.ts` - Tests
