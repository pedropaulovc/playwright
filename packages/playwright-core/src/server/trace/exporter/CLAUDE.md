# Trace Exporter

Converts Playwright trace ZIP files into LLM-friendly Markdown for AI-assisted debugging and analysis.

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

## Key Files

- `traceExporter.ts` - Main implementation
- `../../utils/zipFile.ts` - ZIP reading
- `../../../utils/isomorphic/stringUtils.ts` - HTML escaping
