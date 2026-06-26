## 任务目标

在路线图中新增克拉玛依停靠点，统一首页 SVG 路线预览的省份颜色。

## 数据来源（如果有）

无外部数据源。

## 文件变更

- `src/content/stops/25-karamay.md` — 新增克拉玛依中文内容文件
- `src/content/stops/25-karamay.en.md` — 新增克拉玛依英文内容文件
- `src/features/route-map/RoutePreview.tsx` — 省份列表更新为完整行政名称（同步自 map-style.ts），填充色从 #fdf6d2 改为 #fdf1b8
- `AGENTS.md` — 变更日志追加一行

## 关键决策

- 克拉玛依 order=25，位于石河子西北的准噶尔盆地
- relationType: community, themes: [maker, industry]
- 路线自动通过 `buildRouteSource` 连接石河子(order24)→克拉玛依(order25) 为实线

## 遗留问题

无
