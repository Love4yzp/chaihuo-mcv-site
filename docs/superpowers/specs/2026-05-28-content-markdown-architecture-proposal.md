# Content-as-Markdown — Architecture Proposal (Pre-Design, for Review)

> **Status:** DRAFT proposal for Codex review. Not a spec yet — once architecture is validated, we'll do real brainstorming → spec → plan.
> **Never commit this file** (project rule for `docs/superpowers/`).

## The user's problem

Adding a new route stop (or person met, hero slide, equipment item, partner, FAQ) currently means **editing TypeScript / JSON in `src/data/`** and pasting images into `src/assets/` or `/public/`. The expedition still has ~17 stops to go (200-day project). The TS-const authoring loop is the bottleneck. The user wants to author content in **Obsidian (Markdown)**, possibly with AI to organize raw notes into the right shape, and have the site pick it up automatically.

## The user's instinct

"All content as Markdown, except page chrome (footer, nav, etc.)."

## My counter-proposal: a 3-tier carve, not "everything Markdown"

```
[Tier 1 — Markdown / Obsidian]   entities + long-form prose
   ↓ src/content/
      stops/         route cities       (replaces src/data/route-cities.ts)
      journals/      per-stop articles  (already markdown in src/content/notes ish)
      heroes/        hero carousel      (replaces src/data/heroes.json)
      people/team/   team members       (replaces src/data/team.json)
      people/met/    people met on road (extracted from route-cities people[])
      partners/      partners           (replaces src/data/partners.json)
      faq/           Q&A                (replaces src/data/faq.json)
      equipment/     equipment list     (replaces src/data/equipment.json)
      notes/         改装手记            (ALREADY markdown)
      docs/          时间线              (ALREADY markdown)
      blocks/        long-form prose blocks (home/about sections, optional)

[Tier 2 — Dictionary i18n]       micro-strings, labels, interpolated text
   ↓ src/i18n/*.ts (unchanged shape)
      'nav.home': '首页'
      'status.days': '已出发 {days} 天'   ← interpolation; markdown can't
      'theme.all': '全部'
      'route.action.backHome': '返回首页'

[Tier 3 — Code]                  layout, components, Zod schemas, Tailwind tokens
```

Rationale:
- Putting button labels and aria-labels in `.md` files would produce hundreds of one-line MD files for "返回首页", "全部", "已抵达" etc. **Markdown is overkill for micro-strings.**
- Page narrative blocks that get interpolated into specific JSX layouts (eyebrow + 2-line title + body + CTA) are a mixed case — labels go Tier 2, longer prose can go Tier 1 `blocks/`.
- Long-form content + structured entities = Tier 1.

## The single authoring rule

> **One entity = one `.md` file + same-name attachments folder.**

```
src/content/stops/
  yulin.md              ← frontmatter (structured) + body (prose)
  yulin/
    wei.jpg
    sandu.jpg
```

Example frontmatter for `yulin.md`:

```yaml
id: yulin
label: 玉林
label_en: Yulin
lng: 110.181
lat: 22.654
order: 3
visited: true
themes: [science]
event:
  date: 2026.04.28
  summary: 在玉林科技馆开展路展、AI 硬件工作坊
  summary_en: ...
expedition:
  world: ...
  fire: ...
  frontier: ...
people:
  - "[[met/wei-master]]"   # Obsidian wiki-link → Astro Zod reference()
photos:
  - src: ./yulin/sandu.jpg
    caption: 三都镇农业基地
altitude: '80'
terrain: 桂东南大容山-六万大山丘陵盆地
# ...etc
```

Body holds prose for site display + AI-indexable narrative.

## Why this is sound from architecture + IA

1. **Codebase is already half there.** `src/content/notes/` and `src/content/docs/` are already markdown Content Collections (see `src/content.config.ts`). We're aligning the remaining `src/data/*.json` and `src/data/route-cities.ts` to the same model — not inventing a new one.
2. **Zod stays the safety net.** `src/content.config.ts` Zod schemas validate frontmatter at build time. AI hallucinates a field → `astro check` / build fails before deploy.
3. **Linking → knowledge graph for free.** Obsidian's `[[wiki-links]]` + Astro Zod `reference()` types = both authoring graph view AND compile-time link validity. End-state: an "person × place × event × equipment" graph of the expedition.
4. **One mental model for two authors.** The user uses Obsidian for everything. AI agents read/write the same `.md` schema. Zero translation between authoring tool and storage.
5. **i18n stays sane.** `_en` suffixes in frontmatter (`label_en`, `summary_en`) — same convention as today.

## Known gotchas (to design around)

| gotcha | proposed handling |
|---|---|
| Obsidian default `![[image.png]]` ≠ standard markdown | Configure Obsidian to use standard `![alt](path)` for images; reserve `[[link]]` for cross-entity refs only |
| AI needs to know each collection's schema to author correctly | Maintain `docs/content-authoring.md` — one-page schema contract; usable as prompt context |
| `_en` translation duplication | Keep `_en` suffix in frontmatter (vs separate `.en.md`); simpler |
| Migration: 9 stops + N json arrays → .md per entity | One-shot scripted migration + manual touch-up; ~half-day |
| Per-entity collections like `partners` (maybe 3 entries) — overhead? | Yes, marginal overhead, but **consistency > micro-optimization** |
| Deploy still requires git push (current model) | Unchanged — content edits become git commits in MD instead of TS/JSON |
| `coordinates` (lng/lat) input — AI hallucinations? | Author/AI provides; Zod validates type but not geographic correctness; visual map review catches |

## Migration cost estimate

~2 PRs of Phase-3 size:
- **P4-A**: framework migration — add collections to `src/content.config.ts`, migrate `stops` + `heroes` + `team` + `partners` + `faq` + `equipment` to `.md`, update all read sites (`RoutePreview`, `RouteContent`, home, about, deconstruct, guide) to use `getCollection()`. Includes any `reference()` link-resolution wiring.
- **P4-B**: authoring tooling — `docs/content-authoring.md` (schema contract for AI/humans), optional `pnpm content:new <kind> <id>` scaffolder.

## Open questions for the user

A. **Scope**: only `stops` first (smallest verifiable migration), or one-shot all of `stops + heroes + team + partners + faq + equipment`?
B. **Obsidian vault location**: open vault directly at `src/content/` (zero sync), or separate vault outside the repo + sync script?
C. **AI integration point**: Obsidian plugin (Claude/Smart Connections in-app), external paste (zero plugin dependency), or a repo CLI script (`pnpm content:new`) that takes raw notes + photo paths?

My defaults (for YAGNI):
- A: just `stops` first
- B: open vault at `src/content/`
- C: external paste

## What I want from Codex

Given the current codebase state (read `src/content.config.ts`, `src/data/*.json`, `src/data/route-cities.ts`, the components that consume them in `src/app/components/` and `src/features/`, and `src/i18n/`):

1. **Is the 3-tier carve sound?** Edge cases where it cracks?
2. **Risks/gotchas I missed?** Especially around: image build pipeline (`src/assets/` vs `/public/` vs Astro image optim), Astro Content Collections + Zod `reference()` quirks in Astro 6, Obsidian/Markdown interop pitfalls, Tailwind v4 build-time CSS resolution against MD-driven content.
3. **Alternative architectures worth considering** I haven't named (e.g., a headless CMS, a Cloudflare-hosted Notion-API edge fetch, etc.)?
4. **Migration cost realism** — is ~2 PRs / "half-day scripted + manual touch-up" optimistic?
5. **One concrete recommendation:** start with **all-at-once** or **stops-only** for the first PR?

Be skeptical and concrete. Cite `file:line` for any technical point.
