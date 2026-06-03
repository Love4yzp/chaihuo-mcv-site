# Yuque Journal Sync and Deployment Runbook

This document records the production update path for the travel journal page and the debugging notes from the 2026-06-03 incident.

## Expected Flow

1. Yuque book updates at `https://www.yuque.com/mouseart/mcv`.
2. GitHub Actions workflow `Sync Yuque Journals` runs every 10 minutes and on `main` pushes.
3. The workflow runs `node scripts/sync-yuque-journals.mjs`.
4. If `src/data/yuque-journals.json` or `public/yuque-journals/*` changes, the workflow commits `chore: sync yuque journals` to `main`.
5. GitHub push webhook notifies Jenkins.
6. Jenkins job `chaihuo-chaihuo-mcv-site` builds and deploys the Docker service.
7. `https://mcv.chaihuo.org/journals` serves the new prerendered journal list.

## Current Automation

- GitHub workflow: `.github/workflows/sync-yuque-journals.yml`
- Sync script: `scripts/sync-yuque-journals.mjs`
- Sync helpers/tests: `scripts/lib/yuque-journal-sync.mjs`, `scripts/yuque-journal-sync.test.mjs`
- Jenkins webhook job: `chaihuo-chaihuo-mcv-site`
- GitHub webhook endpoint: Jenkins generic webhook trigger
- Docker deploy entrypoint in repo: `deploy.sh`

## Important Deployment Notes

- `Dockerfile` must pin pnpm instead of using `pnpm@latest`.
- Current Docker pnpm version is `11.5.0`.
- If `pnpm-workspace.yaml` changes `overrides`, regenerate `pnpm-lock.yaml` with the same pnpm version used by Docker:

```bash
corepack pnpm@11.5.0 install --lockfile-only --no-frozen-lockfile
corepack pnpm@11.5.0 install --frozen-lockfile --lockfile-only
```

- The production response currently comes from Tengine/CDN, not Cloudflare Workers.
- Cloudflare Workers checks in GitHub are not the source of truth for production deploys.

## Debug Checklist

When a Yuque article does not appear on the site:

1. Confirm Yuque sync data includes the article:

```bash
rg "article-title-or-slug" src/data/yuque-journals.json
```

2. Confirm local build includes the article:

```bash
pnpm run build
rg "article-title-or-slug" dist/client/journals/index.html
```

3. Confirm GitHub Actions ran:

```bash
gh workflow list --all
gh run list --limit 10
gh run view <run-id> --json status,conclusion,jobs,url
```

4. Confirm GitHub webhook reached Jenkins:

```bash
gh api repos/Chaihuo-Makerspace/chaihuo-mcv-site/hooks
gh api repos/Chaihuo-Makerspace/chaihuo-mcv-site/hooks/<hook-id>/deliveries --paginate
```

The webhook response payload includes the Jenkins queue item, for example `queue/item/619/`.

5. Confirm production has updated:

```bash
curl -I https://mcv.chaihuo.org/journals
curl -L https://mcv.chaihuo.org/journals -o /tmp/mcv-journals.html
rg "article-title-or-slug" /tmp/mcv-journals.html
```

If GitHub Actions and webhook delivery are successful but production is stale, inspect the Jenkins console log for `chaihuo-chaihuo-mcv-site`.

## 2026-06-03 Incident Summary

Symptoms:

- Latest Yuque article `基地车日记｜2026.05.17｜四川科技馆` did not appear on `/journals`.
- Production HTML still had old `Last-Modified` and did not contain slug `tyfswi0moe2b5r5i`.
- Jenkins Docker build failed at `pnpm install --frozen-lockfile`.

Root causes:

- GitHub Actions had been disabled at the repository level, so the Yuque sync workflow stayed queued and did not run.
- Docker used `pnpm@latest`; Jenkins picked up pnpm 11.5.0, which detected that `pnpm-lock.yaml` did not include the workspace `overrides` config.
- The frozen install failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH`.

Fixes:

- Enabled GitHub Actions for the repository.
- Triggered `Sync Yuque Journals`; it successfully committed the latest Yuque data.
- Sorted Yuque journal cards by recency in `normalizeYuqueToc`.
- Regenerated `pnpm-lock.yaml` with pnpm 11.5.0 so `overrides: vite: ^7` is recorded.
- Pinned Docker to `pnpm@11.5.0`.

Verification:

- `corepack pnpm@11.5.0 install --frozen-lockfile --lockfile-only` passed.
- `pnpm run build` passed.
- Jenkins webhook triggered queue item `619`.
- Production `/journals` changed `Content-Length` from `82306` to `83692` and `Last-Modified` to `2026-06-03 09:50:22 UTC`.
- Production HTML contained the latest Yuque article.
