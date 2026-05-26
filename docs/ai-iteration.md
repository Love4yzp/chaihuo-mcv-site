# AI Iteration Harness

This project is structured so an AI agent can take a human goal, make scoped changes, and verify the result with repeatable commands before reporting back.

## Default Loop

1. Read `AGENTS.md` and the relevant page/component/data files.
2. Make the smallest change that satisfies the human goal.
3. Run `pnpm check`.
4. If the change affects routing, navigation, page rendering, or content: run `pnpm smoke`.
5. If the change affects UI, layout, animation, map, or carousel: run `pnpm visual`.
6. If the change affects interactive controls, links, headings, images, or page structure: run `pnpm audit:ui`.
7. Run `pnpm build` before claiming the project is ready.

## Harness Commands

- `pnpm check` validates content cross-references and Astro/TypeScript diagnostics.
- `pnpm smoke` starts a production preview and checks core zh/en routes plus published journal detail routes.
- `pnpm audit:ui` checks document language, landmarks, one visible `h1`, image alt attributes, interactive accessible names, and repeated link-name consistency.
- `pnpm visual` checks desktop and mobile visual substance, horizontal overflow, runtime errors, and captures screenshots in the Playwright report.
- `pnpm harness` runs `pnpm check` and the full Playwright harness.

All Playwright commands use `playwright.config.ts`. By default they build the Astro site and serve it with `astro preview` on `127.0.0.1:4322`.

To run against an already running server:

```bash
TEST_BASE_URL=http://127.0.0.1:4321 pnpm smoke
```

## Failure Triage

- Content/reference failures usually point directly to the bad file and ID.
- Astro check failures are type or `.astro` integration issues; fix these before browser tests.
- Smoke failures usually mean a route, redirect, runtime error, or page shell is broken.
- UI audit failures are semantic/accessibility issues. Prefer native HTML and visible labels before adding ARIA.
- Visual failures indicate blank or collapsed pages, overflow, or runtime errors. Open `playwright-report/` or inspect the attached screenshots.

## Known Limits

The visual harness is a smoke harness, not pixel-perfect screenshot regression. It is designed to help AI agents catch blank renders, broken layout, missing content, mobile overflow, and runtime errors without making intentional design changes painful.
