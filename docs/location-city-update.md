# Location-Based City Update Workflow

This workflow updates the route map from the Tracker Allen SenseCAP location device.

## Entry Points

- Automatic: add `.github/workflows/check-arrival.yml` with a GitHub credential that has
  `workflow` scope, then schedule `pnpm update:city -- --apply` once per hour.
- Manual: run `pnpm update:city` locally for a dry run, then add `-- --apply` to write files.
- Agent command: when the user says "帮我更新现在位置", run the same script and review the diff.

## Required Secrets

Configure these in GitHub Actions repository secrets before enabling the scheduled workflow:

| Name | Purpose |
| --- | --- |
| `SENSECAP_KEY_ID` | SenseCAP API key ID |
| `SENSECAP_KEY_SECRET` | SenseCAP API key secret |

Do not commit local SenseCAP credentials. The `Deepseek/` folder is diagnostic input and may contain
temporary API responses or historical plaintext credentials.

## Commands

```bash
# Dry run using live SenseCAP data.
pnpm update:city

# Apply live SenseCAP data if a new city is detected.
pnpm update:city -- --apply

# Dry run with manual coordinates. Useful for testing without API credentials.
pnpm update:city -- --lng 87.617 --lat 43.826

# Force a write for a known city/province when reverse geocoding is not desired.
pnpm update:city -- --apply --force --lng 88.305 --lat 44.011 --city 昌吉 --province 新疆维吾尔自治区
```

## Update Rules

The script intentionally stays conservative:

- If the GPS timestamp is older than 12 hours, it exits unless `--force` is used.
- If the current coordinates are within 25 km of the latest visited stop, it exits.
- If the resolved city already exists in `src/content/stops`, it exits.
- If a new city is detected, it creates both Chinese and English stop files from the current
  content shape, marks the stop as `visited: true`, and adds a new province to
  `visited-provinces.ts` when needed.

Visited route segments are already generated from adjacent visited stops, so a new stop is
automatically connected with the yellow route line.

## City Aliases

Maintain `scripts/location-city-aliases.json` for cities where we want stable handcrafted IDs and
English labels. Unknown cities still work: the script tries the English reverse-geocoding result for
the slug and falls back to a stable `city-xxxxxxxx` ID if necessary.

## Reverse Geocoding

The workflow uses the public Nominatim reverse geocoding endpoint only after the GPS is far enough
from the latest stop to require a city check. Keep requests low, preserve the User-Agent header, and
prefer a local administrative-boundary resolver or a dedicated geocoding provider if this workflow
becomes high-frequency or mission-critical.
