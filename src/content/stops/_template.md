---
# Copy this file → rename to <next-order>-<id>.md → fill in.
# Schema: src/features/route-map/stops-schema.ts
# Author convention: keep _en suffix on label/event/expedition/people/photos.caption
#                    keep camelCase En suffix on terrain/terrainStep/climate/challenge/relationStats
# REQUIRED fields are marked with [required]. All others are optional but documented.

# [required] stable kebab-case id; matches filename slug after the order prefix
id: ""

# [required] integer >= 0; must be unique and contiguous 0..N-1 across all stops
order: 0

# [required] true once the vehicle has been there; false for planned stops
visited: false

# [optional] true only for shenzhen (the origin); exactly one stop has this
# isOrigin: false

# [optional] true to force-show the label as a forward-looking pinned anchor
# anchor: false

# [required] zh display label; [optional] _en sibling for English UI
label: ""
label_en: ""

# [required] WGS84 coordinates in degrees
lng: 0
lat: 0

# [required] all telemetry strings (current shape: altitude as string)
altitude: "0"
terrain: ""
terrainEn: ""
terrainStep: ""
terrainStepEn: ""
climate: ""
climateEn: ""
challenge: ""
challengeEn: ""

# [required] activity classification — drives /route filtering and panel chrome
relationType: education
themes: [science]
relationStats: []
relationStatsEn: []

# [optional] single on-site event
# event:
#   date: "YYYY.MM.DD"
#   summary: ""
#   summary_en: ""
#   link: "https://..."
#   linkLabel: ""
#   linkLabel_en: ""

# [optional] expedition log (Phase 2)
# expedition:
#   world: ""; world_en: ""
#   fire: "";  fire_en: ""
#   frontier: ""; frontier_en: ""

# [optional] inline people met on the road (id REQUIRED if entry exists)
# people:
#   - id: ""
#     name: ""
#     name_en: ""
#     role: ""
#     role_en: ""
#     image: "/people/...jpg"
#     bio: ""
#     bio_en: ""

# [optional] inline on-site photos (alt is locale-neutral a11y label)
# photos:
#   - src: "/heroes/...webp"
#     alt: ""
#     caption: ""
#     caption_en: ""
---

(Body intentionally empty — not consumed in Phase 4. Reserved for a future per-stop landing page.)
