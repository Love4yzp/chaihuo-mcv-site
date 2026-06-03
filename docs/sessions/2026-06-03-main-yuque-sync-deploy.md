## Task Goal

Make the latest Yuque travel journal appear on the Chaihuo MCV website and ensure future Yuque updates are synced and deployed within about 10 minutes.

## Data Sources

- Yuque book: `https://www.yuque.com/mouseart/mcv`
- Site page: `https://mcv.chaihuo.org/journals`
- GitHub repository: `Chaihuo-Makerspace/chaihuo-mcv-site`
- Jenkins webhook job: `chaihuo-chaihuo-mcv-site`

## File Changes

- `.github/workflows/sync-yuque-journals.yml`
  - Runs on `main` push, every 10 minutes, and manual dispatch.
- `scripts/lib/yuque-journal-sync.mjs`
  - Keeps all visible Yuque `DOC` entries.
  - Sorts entries by date or update time descending.
- `scripts/yuque-journal-sync.test.mjs`
  - Covers visible docs with unknown city keywords.
- `src/data/yuque-journals.json`
  - Synced latest Yuque entries including `基地车日记｜2026.05.17｜四川科技馆`.
- `public/yuque-journals/tyfswi0moe2b5r5i.jpg`
  - Added latest article cover image.
- `Dockerfile`
  - Pins `pnpm@11.5.0`.
- `pnpm-lock.yaml`
  - Updated with pnpm 11.5.0 so workspace overrides are recorded.
- `docs/deployment-yuque-sync.md`
  - Added deployment and debugging runbook.

## Key Decisions

- Do not depend on city trigger words for Yuque journal inclusion. All visible Yuque `DOC` entries should sync.
- Keep city inference as metadata only. Unknown cities use `city: "yuque"`.
- Treat Cloudflare Workers checks as unrelated unless the production hosting path changes; production currently serves through Tengine/CDN and Jenkins deployment.
- Pin pnpm in Docker to avoid build instability from `pnpm@latest`.
- Use Jenkins webhook deliveries to trace whether GitHub push reached deployment automation.

## Verification

- `node --test scripts/yuque-journal-sync.test.mjs` passed.
- `node scripts/validate-site.mjs` passed.
- `corepack pnpm@11.5.0 install --frozen-lockfile --lockfile-only` passed.
- `pnpm run build` passed.
- GitHub Actions `Sync Yuque Journals` completed successfully and committed `chore: sync yuque journals`.
- GitHub webhook delivered to Jenkins and triggered queue item `619`.
- Production `/journals` HTML contained the latest Yuque article after deployment.

## Remaining Notes

- If future sync runs are queued unexpectedly, check repository and organization GitHub Actions settings first.
- If future production deploys stay stale after successful GitHub webhook delivery, inspect Jenkins console logs for `chaihuo-chaihuo-mcv-site`.
