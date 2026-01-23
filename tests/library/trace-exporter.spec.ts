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
import { exportTraceToMarkdown } from '../../packages/playwright-core/lib/server/trace/exporter/traceExporter';

const test = playwrightTest;

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
    expect(timeline).toContain('Total actions: 12');
    expect(timeline).toContain('Duration:');
    expect(timeline).toContain('playwright.dev');
    expect(timeline).toContain('Test.step');
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
});
