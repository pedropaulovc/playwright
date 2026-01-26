# Playwright Fork

This is a fork of the official Playwright npm package with two branches:

- **feat/export-trace** - Based off upstream main, contains pristine code changes to send as a pull request to the maintainers
- **fork/main** (default) - Based off feat/export-trace, allows freedom to change package versions and references as needed to build and publish packages

## Published Packages

- `@pedropaulovc/playwright`
- `@pedropaulovc/playwright-core`
- `@pedropaulovc/playwright-test` (replaces `@playwright/test`)

## Development

```bash
npm install
npm run build  # ~2 min
```

## Testing

Run tests for the trace exporter feature:

```bash
# Run trace-exporter tests (~1 min)
npx playwright test tests/library/trace-exporter.spec.ts
```

## Publishing

Trigger the `sync-upstream.yml` workflow in GitHub to publish new versions of `@pedropaulovc/playwright-*`.

## E2E Validation

After publishing, validate in the codjiflo project:

```bash
cd /c/src/codjiflo/F/
git fetch && git checkout main && git reset --hard origin/main
# Update package.json to use new fork packages
npm install
npm run test:e2e  # ~90s
```

## Goal

Eventually realign package versions of `@pedropaulovc/playwright-*` with the official Playwright npm packages.
