## 2026-04-28
- `src/pages/crew-preview.astro` was the only live reference to `CrewManifest` in this cleanup scope.
- `pnpm build` succeeded after removing the deprecated page.
- Astro content collections require every `team.json` entry to satisfy the schema, so the new `xiaomei` record needed a valid `image` field.
