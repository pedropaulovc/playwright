# Playwright Fork

This is a fork of the official Playwright npm package with two branches:

- **feat/export-trace** - Based off upstream main, contains pristine code changes to send as a pull request to the maintainers for a new feature called export-trace. It is described in details in @packages/playwright-core/src/server/trace/exporter/CLAUDE.md
- **fork/main** (default) - Based off feat/export-trace, allows freedom to change package versions and references as needed to build and publish packages

## Keeping Branches in Sync

Both branches must be rebased cleanly from their upstream whenever there are changes:

```bash
# Update feat/export-trace from upstream
git fetch upstream
git checkout feat/export-trace
git rebase upstream/main
git push origin feat/export-trace --force-with-lease

# Update fork/main from feat/export-trace
git checkout fork/main
git rebase feat/export-trace
git push origin fork/main --force-with-lease
```

**Important:** Always rebase, never merge. This keeps the commit history clean for the eventual PR to upstream.

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

**Important:** Before publishing, always bump the version in all `package.json` files. The version string `1.59.0-next.N` appears in 15 `package.json` files (27 occurrences). Use a global find-and-replace to increment `N`. The published version must not already exist on npm.

```bash
# Example: bump from next.9 to next.10
find packages -name package.json -exec sed -i 's/1\.59\.0-next\.9/1.59.0-next.10/g' {} \;
sed -i 's/1\.59\.0-next\.9/1.59.0-next.10/g' package.json
git add -A && git commit -m "chore: bump version to 1.59.0-next.10"
git push origin fork/main --force-with-lease
```

Then trigger the `sync-upstream.yml` workflow in GitHub to publish new versions of `@pedropaulovc/playwright-*`.

```bash
gh workflow run sync-upstream.yml --ref fork/main -f force_publish=true -R pedropaulovc/playwright
```

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
