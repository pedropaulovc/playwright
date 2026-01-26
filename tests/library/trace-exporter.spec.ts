/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs';
import path from 'path';
import { expect, playwrightTest } from '../config/browserTest';
import { exportTraceToMarkdown, kPreservedPlaywrightAttributes } from '../../packages/playwright-core/lib/server/trace/exporter/traceExporter';

const test = playwrightTest;

// Attributes that are intentionally excluded from export (trace viewer internals)
const kExcludedAttributes = new Set([
  '__playwright_target__',              // click target highlighting (UI feature)
  '__playwright_bounding_rect__',       // canvas rendering calculations
  '__playwright_current_src__',         // video/audio src tracking
  '__playwright_frame_bounding_rects__', // window property for frame calculations (not an HTML attribute)
  '__playwright_canvas_render_info__',  // canvas rendering info (not an HTML attribute)
]);

test.describe('trace exporter attribute sync', () => {
  test('kPreservedPlaywrightAttributes should match attributes restored in snapshotRenderer.ts', async () => {
    // Parse snapshotRenderer.ts to find all __playwright_*_ attributes that are restored
    const rendererPath = path.join(__dirname, '../../packages/playwright-core/src/utils/isomorphic/trace/snapshotRenderer.ts');
    const rendererSource = fs.readFileSync(rendererPath, 'utf-8');

    // Find all attribute names used in querySelectorAll or getAttribute calls
    const attrPattern = /__playwright_[a-z_]+_/g;
    const rendererAttrs = new Set<string>();
    for (const match of rendererSource.matchAll(attrPattern))
      rendererAttrs.add(match[0]);

    // Parse snapshotterInjected.ts to find all __playwright_*_ attribute constants
    const injectedPath = path.join(__dirname, '../../packages/playwright-core/src/server/trace/recorder/snapshotterInjected.ts');
    const injectedSource = fs.readFileSync(injectedPath, 'utf-8');

    const injectedAttrs = new Set<string>();
    for (const match of injectedSource.matchAll(attrPattern))
      injectedAttrs.add(match[0]);

    // All attributes in renderer should either be in preserved set or excluded set
    for (const attr of rendererAttrs) {
      if (!kPreservedPlaywrightAttributes.has(attr) && !kExcludedAttributes.has(attr)) {
        throw new Error(
          `Attribute "${attr}" is used in snapshotRenderer.ts but missing from kPreservedPlaywrightAttributes in traceExporter.ts. ` +
          `Either add it to kPreservedPlaywrightAttributes or to kExcludedAttributes in the test if it's intentionally excluded.`
        );
      }
    }

    // All preserved attributes should be in injected (where they're captured)
    for (const attr of kPreservedPlaywrightAttributes) {
      // __playwright_src__ is a special case - it's set in the renderer, not injected
      if (attr === '__playwright_src__')
        continue;
      if (!injectedAttrs.has(attr)) {
        throw new Error(
          `Attribute "${attr}" is in kPreservedPlaywrightAttributes but not found in snapshotterInjected.ts. ` +
          `The attribute may have been renamed or removed.`
        );
      }
    }

    // All preserved attributes should be restored in renderer
    for (const attr of kPreservedPlaywrightAttributes) {
      if (!rendererAttrs.has(attr)) {
        throw new Error(
          `Attribute "${attr}" is in kPreservedPlaywrightAttributes but not found in snapshotRenderer.ts. ` +
          `The attribute may have been renamed or removed.`
        );
      }
    }
  });
});

test.describe('trace exporter', () => {
  test('should export trace to markdown files', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    // Verify all expected files exist
    const expectedFiles = ['README.md', 'index.md', 'metadata.md', 'timeline.md', 'errors.md', 'console.md', 'network.md', 'filmstrip.md', 'attachments.md'];
    for (const file of expectedFiles)
      expect(fs.existsSync(path.join(outputDir, file))).toBe(true);

    // Verify assets directory exists
    expect(fs.existsSync(path.join(outputDir, 'assets'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'assets', 'snapshots'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'assets', 'resources'))).toBe(true);
  });

  test('should generate valid README.md', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    const readme = fs.readFileSync(path.join(outputDir, 'README.md'), 'utf-8');
    expect(readme).toContain('# Playwright Trace Export');
    expect(readme).toContain('index.md');
    expect(readme).toContain('timeline.md');
    expect(readme).toContain('npx serve');
  });

  test('should generate index.md with trace info', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    const index = fs.readFileSync(path.join(outputDir, 'index.md'), 'utf-8');
    expect(index).toContain('# Trace Export');
    expect(index).toContain('simple.spec.ts');
    expect(index).toContain('**Status:**');
    expect(index).toContain('PASSED');
    expect(index).toContain('**Duration:**');
    expect(index).toContain('ms');
    expect(index).toContain('**Actions:**');
    expect(index).toContain('## Sections');
    expect(index).toContain('[Timeline](./timeline.md)');
    expect(index).toContain('[Metadata](./metadata.md)');
    expect(index).toContain('[Errors](./errors.md)');
    expect(index).toContain('[Console](./console.md)');
    expect(index).toContain('[Network](./network.md)');
  });

  test('should include viewport size in index.md and snapshot comments', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    // Verify viewport is in index.md overview
    const index = fs.readFileSync(path.join(outputDir, 'index.md'), 'utf-8');
    expect(index).toContain('**Viewport:** 1280x720');

    // Verify viewport is in snapshot HTML comments
    const snapshotsDir = path.join(outputDir, 'assets', 'snapshots');
    const snapshots = fs.readdirSync(snapshotsDir);
    expect(snapshots.length).toBeGreaterThan(0);

    const snapshotContent = fs.readFileSync(path.join(snapshotsDir, snapshots[0]), 'utf-8');
    expect(snapshotContent).toContain('Viewport: 1280x720');
  });

  test('should generate metadata.md with browser info', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    const metadata = fs.readFileSync(path.join(outputDir, 'metadata.md'), 'utf-8');
    expect(metadata).toContain('# Trace Metadata');
    expect(metadata).toContain('## Environment');
    expect(metadata).toContain('| Browser | chromium |');
    expect(metadata).toContain('| Platform |');
    expect(metadata).toContain('| SDK Language | javascript |');
    expect(metadata).toContain('## Context Options');
    expect(metadata).toContain('| Viewport | 1280x720 |');
    expect(metadata).toContain('## Timing');
    expect(metadata).toContain('| Wall Time |');
    expect(metadata).toContain('| Duration |');
  });

  test('should generate timeline.md with actions', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    const timeline = fs.readFileSync(path.join(outputDir, 'timeline.md'), 'utf-8');
    expect(timeline).toContain('# Actions Timeline');
    expect(timeline).toContain('- [1. Test.step](#1-teststep)');
    expect(timeline).toContain('Total actions: 12');
    expect(timeline).toContain('Duration:');
    expect(timeline).toContain('playwright.dev');
    expect(timeline).toContain('Test.step');
  });

  test('should generate timeline.md with table of contents', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    const timeline = fs.readFileSync(path.join(outputDir, 'timeline.md'), 'utf-8');

    // Verify table of contents section exists
    expect(timeline).toContain('## Contents');

    // Verify TOC entries are markdown links to anchors
    const tocMatch = timeline.match(/## Contents\n\n([\s\S]*?)\n\n##/);
    expect(tocMatch).toBeTruthy();
    const tocSection = tocMatch![1];

    // Each TOC entry should be a markdown link
    const tocLines = tocSection.split('\n').filter(line => line.startsWith('- ['));
    expect(tocLines.length).toBeGreaterThan(0);

    // Verify TOC links have correct format: - [N. Title](#n-title)
    for (const line of tocLines) {
      expect(line).toMatch(/^- \[\d+\. .+\]\(#[\w-]+\)$/);
    }

    // Verify TOC entries correspond to actual headings in the document
    for (const line of tocLines) {
      const titleMatch = line.match(/\[([^\]]+)\]/);
      expect(titleMatch).toBeTruthy();
      const title = titleMatch![1];
      // The heading should exist in the document (as h2)
      expect(timeline).toContain(`## ${title}`);
    }
  });

  test('should generate TOC anchors following GitHub slugification rules', async () => {
    // Test the anchor generation logic directly with known inputs/outputs
    // GitHub slugification: lowercase, remove punctuation, spaces become hyphens (not collapsed)
    const testCases: Array<{ heading: string; expectedAnchor: string }> = [
      {
        heading: '1. Before Hooks',
        expectedAnchor: '1-before-hooks',
      },
      {
        // Quotes and slashes are removed
        heading: '2. Navigate to "/test/repo/460"',
        expectedAnchor: '2-navigate-to-testrepo460',
      },
      {
        // Parentheses, quotes, braces removed; ", { " becomes "--" (two spaces preserved)
        heading: `27. Press "Enter" getByRole('dialog', { name: 'Find in diff' }).getByRole('textbox', { name: 'Search term' })`,
        expectedAnchor: '27-press-enter-getbyroledialog--name-find-in-diff-getbyroletextbox--name-search-term-',
      },
      {
        // Dots and parentheses in method chains
        heading: `28. Evaluate getByRole('region', { name: 'Original version' }).locator('.cm-editor').first()`,
        expectedAnchor: '28-evaluate-getbyroleregion--name-original-version-locatorcm-editorfirst',
      },
    ];

    // Replicate the anchor generation logic from traceExporter.ts
    const generateAnchor = (text: string) =>
      text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/ /g, '-');

    for (const { heading, expectedAnchor } of testCases)
      expect(generateAnchor(heading)).toBe(expectedAnchor);
  });

  test('should generate network.md with requests', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    const network = fs.readFileSync(path.join(outputDir, 'network.md'), 'utf-8');
    expect(network).toContain('# Network Log');
    expect(network).toContain('Total requests: 18');
    expect(network).toContain('| # | Method | URL | Status | Size |');
    // Check specific requests
    expect(network).toContain('https://playwright.dev/');
    expect(network).toContain('playwright-logo.svg');
    expect(network).toContain('styles.');
    expect(network).toContain('.css');
    expect(network).toContain('| GET |');
    expect(network).toContain('| 200 |');
  });

  test('should export snapshots as HTML files', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace1.zip');
    const outputDir = testInfo.outputPath('trace-export');

    await exportTraceToMarkdown(traceFile, { outputDir });

    const snapshotsDir = path.join(outputDir, 'assets', 'snapshots');
    const snapshots = fs.readdirSync(snapshotsDir);

    // Should have at least some snapshots
    expect(snapshots.length).toBeGreaterThan(0);

    // Snapshots should be HTML files with proper naming
    for (const snapshot of snapshots)
      expect(snapshot).toMatch(/^(before|after|input)@call@\d+\.html$/);

    // Check snapshot content is valid HTML with metadata comment
    const firstSnapshot = fs.readFileSync(path.join(snapshotsDir, snapshots[0]), 'utf-8');
    expect(firstSnapshot).toContain('<!DOCTYPE html>');
    expect(firstSnapshot).toContain('<!-- Playwright Snapshot:');
    expect(firstSnapshot).toContain('URL: https://playwright.dev/');
    expect(firstSnapshot).toContain('Timestamp:');
    expect(firstSnapshot).toContain('<title>Playwright</title>');
  });

  test('should handle trace with errors', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-error.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    const errors = fs.readFileSync(path.join(outputDir, 'errors.md'), 'utf-8');
    expect(errors).toContain('# Errors');
    expect(errors).toContain('Total errors: 1');
    expect(errors).toContain('## Error 1');
    expect(errors).toContain('**Message:**');
    expect(errors).toContain('Protocol error (Page.navigate)');
    expect(errors).toContain('Cannot navigate to invalid URL');
  });

  test('should export trace with console messages', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-console.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    const consoleLog = fs.readFileSync(path.join(outputDir, 'console.md'), 'utf-8');
    expect(consoleLog).toContain('# Console Log');
    expect(consoleLog).toContain('Total messages: 3');
    expect(consoleLog).toContain('| Time | Type | Message | Location |');
    expect(consoleLog).toContain('| log |');
    expect(consoleLog).toContain('| warning |');
    expect(consoleLog).toContain('| error |');
    expect(consoleLog).toContain('test message');
    expect(consoleLog).toContain('warning msg');
    expect(consoleLog).toContain('error msg');
  });

  test('should handle legacy trace formats', async ({}, testInfo) => {
    // Test with older trace format (v1.31)
    const traceFile = path.join(__dirname, '..', 'assets', 'trace-1.31.zip');
    if (!fs.existsSync(traceFile))
      test.skip();

    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    const index = fs.readFileSync(path.join(outputDir, 'index.md'), 'utf-8');
    expect(index).toContain('example.spec.ts');
    expect(index).toContain('PASSED');
    expect(index).toContain('**Actions:** 3');

    const metadata = fs.readFileSync(path.join(outputDir, 'metadata.md'), 'utf-8');
    expect(metadata).toContain('| Browser | chromium |');
    expect(metadata).toContain('| Platform | linux |');
  });

  test('should include snapshot links in timeline', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-action.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    const index = fs.readFileSync(path.join(outputDir, 'index.md'), 'utf-8');
    expect(index).toContain('**Actions:** 3');

    // Verify snapshots were created including input snapshot for click
    const snapshotsDir = path.join(outputDir, 'assets', 'snapshots');
    const snapshots = fs.readdirSync(snapshotsDir);
    expect(snapshots.some(s => s.startsWith('before@'))).toBe(true);
    expect(snapshots.some(s => s.startsWith('after@'))).toBe(true);
    expect(snapshots.some(s => s.startsWith('input@'))).toBe(true);
  });

  test('should extract resources for snapshots', async ({}, testInfo) => {
    // test-trace-action.zip has screenshots as resources
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-action.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    const resourcesDir = path.join(outputDir, 'assets', 'resources');
    expect(fs.existsSync(resourcesDir)).toBe(true);

    // Resources directory should contain extracted screenshot files
    const resources = fs.readdirSync(resourcesDir);
    expect(resources.length).toBeGreaterThan(0);
    expect(resources.some(r => r.endsWith('.jpeg'))).toBe(true);
  });

  test('should export screenshots', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-screenshots.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    // Verify index shows actions
    const index = fs.readFileSync(path.join(outputDir, 'index.md'), 'utf-8');
    expect(index).toContain('**Actions:** 9');

    // Should have 5 screenshot files with content
    const resourcesDir = path.join(outputDir, 'assets', 'resources');
    const resources = fs.readdirSync(resourcesDir);
    const screenshots = resources.filter(r => r.endsWith('.jpeg'));
    expect(screenshots.length).toBe(5);
    for (const screenshot of screenshots) {
      const stat = fs.statSync(path.join(resourcesDir, screenshot));
      expect(stat.size).toBeGreaterThan(0);
    }

    // Verify filmstrip.md has links to screenshots
    const filmstrip = fs.readFileSync(path.join(outputDir, 'filmstrip.md'), 'utf-8');
    expect(filmstrip).toContain('# Filmstrip');
    expect(filmstrip).toContain('Total screenshots: 5');
    expect(filmstrip).toContain('| # | Time | Screenshot |');
    expect(filmstrip).toContain('[view](./assets/resources/');

    // Verify all links in filmstrip.md point to existing files
    const linkMatches = filmstrip.matchAll(/\[view\]\(\.\/(assets\/resources\/[^)]+)\)/g);
    for (const match of linkMatches) {
      const relativePath = match[1];
      expect(fs.existsSync(path.join(outputDir, relativePath))).toBe(true);
    }
  });

  test('should export attachments', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-attachments.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    // Verify attachments.md exists and has correct content
    const attachments = fs.readFileSync(path.join(outputDir, 'attachments.md'), 'utf-8');
    expect(attachments).toContain('# Attachments');
    expect(attachments).toContain('Total attachments: 3');
    expect(attachments).toContain('| # | Name | Type | Action | Link |');
    expect(attachments).toContain('test-log.txt');
    expect(attachments).toContain('text/plain');
    expect(attachments).toContain('test-data.json');
    expect(attachments).toContain('application/json');
    expect(attachments).toContain('page-screenshot.png');
    expect(attachments).toContain('image/png');

    // Verify attachments are saved with friendly names
    const attachmentsDir = path.join(outputDir, 'assets', 'attachments');
    expect(fs.existsSync(path.join(attachmentsDir, 'test-log.txt'))).toBe(true);
    expect(fs.existsSync(path.join(attachmentsDir, 'test-data.json'))).toBe(true);
    expect(fs.existsSync(path.join(attachmentsDir, 'page-screenshot.png'))).toBe(true);

    // Verify links use friendly filenames
    expect(attachments).toContain('[view](./assets/attachments/test-log.txt)');
    expect(attachments).toContain('[view](./assets/attachments/test-data.json)');
    expect(attachments).toContain('[view](./assets/attachments/page-screenshot.png)');

    // Verify timeline.md has links to attachments with friendly paths
    const timeline = fs.readFileSync(path.join(outputDir, 'timeline.md'), 'utf-8');
    expect(timeline).toContain('**Attachments:**');
    expect(timeline).toContain('[test-log.txt](./assets/attachments/test-log.txt)');
    expect(timeline).toContain('[test-data.json](./assets/attachments/test-data.json)');
    expect(timeline).toContain('[page-screenshot.png](./assets/attachments/page-screenshot.png)');
  });

  test('should export snapshots with CSS styling preserved', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-css-js.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    // Verify snapshots exist
    const snapshotsDir = path.join(outputDir, 'assets', 'snapshots');
    const snapshots = fs.readdirSync(snapshotsDir);
    expect(snapshots.length).toBeGreaterThan(0);

    // Verify snapshot contains CSS styling
    const snapshotFile = snapshots.find(s => s.startsWith('after@'));
    expect(snapshotFile).toBeTruthy();
    const snapshotContent = fs.readFileSync(path.join(snapshotsDir, snapshotFile!), 'utf-8');
    expect(snapshotContent).toContain('<!DOCTYPE html>');
    expect(snapshotContent).toContain('<style>');
    expect(snapshotContent).toContain('font-family');
    expect(snapshotContent).toContain('background: #f0f0f0');
    expect(snapshotContent).toContain('.btn');
    expect(snapshotContent).toContain('.container');

    // Verify DOM state is captured (JS effect visible - result has 'visible' class)
    expect(snapshotContent).toContain('class="result visible"');
  });

  test('should handle empty trace gracefully', async ({}, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-empty.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    // Should still create all files even with minimal content
    expect(fs.existsSync(path.join(outputDir, 'index.md'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'timeline.md'))).toBe(true);

    const index = fs.readFileSync(path.join(outputDir, 'index.md'), 'utf-8');
    expect(index).toContain('**Actions:** 0');
    expect(index).toContain('**Errors:** 0');

    const timeline = fs.readFileSync(path.join(outputDir, 'timeline.md'), 'utf-8');
    expect(timeline).toContain('# Actions Timeline');
    expect(timeline).toContain('No actions recorded.');
  });

  test('should preserve scroll positions and element state in exported snapshots', async ({ browser }, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-scroll.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    // Verify snapshots exist
    const snapshotsDir = path.join(outputDir, 'assets', 'snapshots');
    const snapshots = fs.readdirSync(snapshotsDir);
    expect(snapshots.length).toBeGreaterThan(0);

    // Find a snapshot that contains the scroll position
    let snapshotContent: string | null = null;
    for (const snapshot of snapshots) {
      const content = fs.readFileSync(path.join(snapshotsDir, snapshot), 'utf-8');
      if (content.includes('__playwright_scroll_top_="500"')) {
        snapshotContent = content;
        break;
      }
    }
    expect(snapshotContent).toBeTruthy();

    // Load the snapshot in a browser and verify state is restored at runtime
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(snapshotContent!);

    // Verify scroll position is restored at runtime
    const scrollTop = await page.evaluate(() => {
      const container = document.getElementById('scrollContainer');
      return container?.scrollTop ?? 0;
    });
    expect(scrollTop).toBe(500);

    // Verify input value is restored at runtime
    const inputValue = await page.evaluate(() => {
      const input = document.getElementById('textInput') as HTMLInputElement;
      return input?.value ?? '';
    });
    expect(inputValue).toBe('Hello World');

    // Verify checkbox state is restored at runtime
    const isChecked = await page.evaluate(() => {
      const checkbox = document.getElementById('checkbox') as HTMLInputElement;
      return checkbox?.checked ?? false;
    });
    expect(isChecked).toBe(true);

    // Verify the playwright attributes are removed after restoration
    const hasScrollAttr = await page.evaluate(() => {
      return document.querySelector('[__playwright_scroll_top_]') !== null;
    });
    expect(hasScrollAttr).toBe(false);

    await context.close();
  });

  test('should preserve shadow DOM and custom elements in exported snapshots', async ({ browser }, testInfo) => {
    const traceFile = path.join(__dirname, '..', 'assets', 'test-trace-shadow.zip');
    const outputDir = testInfo.outputPath('trace-export');
    await exportTraceToMarkdown(traceFile, { outputDir });

    // Verify snapshots exist
    const snapshotsDir = path.join(outputDir, 'assets', 'snapshots');
    const snapshots = fs.readdirSync(snapshotsDir);
    expect(snapshots.length).toBeGreaterThan(0);

    // Find a snapshot with shadow DOM
    let snapshotContent: string | null = null;
    for (const snapshot of snapshots) {
      const content = fs.readFileSync(path.join(snapshotsDir, snapshot), 'utf-8');
      if (content.includes('__playwright_shadow_root_')) {
        snapshotContent = content;
        break;
      }
    }
    expect(snapshotContent).toBeTruthy();

    // Verify shadow DOM template is preserved
    expect(snapshotContent).toContain('__playwright_shadow_root_');

    // Verify custom elements attribute is preserved
    expect(snapshotContent).toContain('__playwright_custom_elements__');

    // Load the snapshot in a browser and verify shadow DOM is restored
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent(snapshotContent!);

    // Verify shadow DOM is attached
    const hasShadowRoot = await page.evaluate(() => {
      const host = document.getElementById('shadowHost');
      return host?.shadowRoot !== null;
    });
    expect(hasShadowRoot).toBe(true);

    // Verify shadow DOM content is accessible
    const shadowContent = await page.evaluate(() => {
      const host = document.getElementById('shadowHost');
      const shadowEl = host?.shadowRoot?.querySelector('.shadow-content');
      return shadowEl?.textContent ?? '';
    });
    expect(shadowContent).toContain('Content inside shadow DOM');

    // Verify custom element is registered
    const customElementDefined = await page.evaluate(() => {
      return window.customElements.get('my-custom-element') !== undefined;
    });
    expect(customElementDefined).toBe(true);

    await context.close();
  });
});
