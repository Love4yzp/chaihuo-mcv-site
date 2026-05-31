# 路线地图：语义缩放重构方案

- **日期**：2026-05-26
- **状态**：待评审
- **范围**：`src/features/route-map/`（`/route` 详情页地图为主，首页预览图受益于标签修复）

---

## 1. 背景与问题

这张地图的灵魂是**马形路线**：2026 是马年，行程被设计成在中国版图上走出一匹马的形状（"21 省 26 城"），要让人一眼看懂"我们大概要这样跑遍全国"。因此**全国轮廓 + 马形必须保留**。

当前 `ChinaRouteMap`（`/route` 页）有一个明显缺陷。行程目前只到西南 9 城，其中 6 城（深圳/广州/阳江/玉林/南宁/柳州）被投影挤进约 **70×45px** 的一小团，圆点间距仅 **14–25px**：

| 城市 | cx | markerY | 与最近邻间距 |
|---|---|---|---|
| 深圳 | 561 | 532 | 深圳–广州 13.8px |
| 广州 | 551 | 522 | 广州–阳江 23.7px |
| 阳江 | 536 | 540 | — |
| 玉林 | 514 | 520 | 玉林–南宁 22.4px |
| 南宁 | 491 | 518 | 南宁–柳州 25.0px |
| 柳州 | 504 | 497 | 玉林–柳州 25.1px |

两字标签本身约 25px 宽、13px 高，放不下。现有 `placeLabels` 在放不下时**仍硬塞一个"飘很远"的位置**（沿竖直车道上移最多约 100px），导致标签与圆点**脱节**、无法对应——这就是用户看到的"名字和点对不上号"。

**根本矛盾**：同一个缩放级别下，"看清整匹马 / 全国走位"（需缩远）与"读清当前城市簇"（需放大）**无法同时满足**。

## 2. 目标与非目标

**目标（本轮 = Phase 1）**
- 在**不牺牲全国轮廓 + 马形**的前提下解决拥挤。
- 给 `/route` 地图加**平移 + 缩放**：缩远看整匹马，放大读清城市。
- 修复标签脱节（改为"碰撞即剔除"）。
- 为未来内容（照片 / 人 / 地点）**预留可选数据字段与面板插槽**（本轮只留接口，不渲染内容）。
- 去掉与平移冲突的 3D 倾斜；从地图组件移除 gsap 用法与车载滑行指针。

**非目标（本轮不做）**
- 真实瓦片底图（已明确否决）。
- 照片 / 人 / 地点的**内容渲染**（Phase 2，待素材）。
- GMaps 式操作按钮组、分类筛选 chips（Phase 3）。
- 给首页预览图（`RoutePreview`）加缩放——它保持静态预告图。

## 3. 设计原则（借鉴 Google Maps 的"思考"，非界面）

1. **语义缩放（治拥挤的根本）**：按缩放级别给信息密度。缩远只显放得下的关键点（出发点、最新站）；放大时城市点自然散开 → 更多名字淡入。
2. **渐进披露**：地图给"空间索引"（在哪、去过没），点击某点 → 侧栏 `CityPanel` 给"深度"（记录、照片、人）。
3. **焦点 + 上下文**：放大/选中时，马形与国家轮廓始终作背景，配"回到全马视图"复位键，永不迷路。
4. **标签是屏幕空间常量**：缩放时字号恒定，只重新摆位、按重要度与碰撞决定显隐。
5. **直接操控、结果可预测**：拖动平移、滚轮/双击/捏合缩放，"它停在你放的地方"。

## 4. 技术选型

| 项 | 决定 | 理由 |
|---|---|---|
| 投影 `d3-geo` geoMercator | 保留 | 坐标已正确；改投影会让马形错位 |
| 省界 GeoJSON + rewind 修正 | 保留 | 已正确处理九段线那个 China-GeoJSON 坑 |
| 动画 Framer Motion (`motion/react`) | 保留 | 全站统一动画库 |
| 标签碰撞 `placeLabels` | 保留 + 改 | 改"碰撞即剔除"，同时实现语义缩放并修脱节 |
| **`d3-zoom`** | **新增依赖** | d3 同门、体积小、投影感知精确、可复用 placeLabels；无瓦片/API key，SSR 友好。需 `pnpm add d3-zoom` + `-D @types/d3-zoom`（pnpm only，遵守 `.npmrc`） |
| CSS 3D 倾斜 | 移除 | 与拖动平移冲突 |
| 地图组件内 `gsap` 用法 + 车载滑行指针 | 移除 | 收敛动画库；最近已弱化"车"噱头；新"点击缩放居中"取代它 |

**重要**：`gsap` 依赖**保留**——`src/app/components/AboutContent.tsx` 仍在用。本轮只删 `ChinaRouteMap.tsx` 里的 gsap 用法与指针。

**已否决**
- **MapLibre / Leaflet**：WebGL + 真瓦片范式，杀掉马形与水彩风，且要与其样式规范死磕——杀鸡用牛刀。
- **react-simple-maps**：d3-geo 的封装，迁移要推倒现有自定义渲染。
- **react-zoom-pan-pinch**：把地图当图片做 CSS 缩放，文字会糊/巨大化，拿不到语义缩放所需的投影级控制。

## 5. 架构与组件

渲染分两层，是整套设计的关键：

- **缩放层（scaled `<g>`，套 d3-zoom transform）**：省界、马形 `horseRouteD`、城市连线、海拔投影竖线、城市圆点、命中热区、当前城呼吸圈。全部地理元素一起缩放 → 永远对齐。
- **标注层（不缩放的覆盖 `<g>`）**：**仅城市名标签**。每个标签的屏幕位置由 transform 手动算出：`screenX = tx + k·markerX`，`screenY = ty + k·markerY`。字号恒定，碰撞检测在屏幕空间按当前 `k` 进行。

> `horseRouteD` 是固定 SVG 路径（`translate(50,50)`），放进缩放层后随整体缩放 → 与城市点保持对齐，无需重新拟合。

| 单元 | 职责 | 如何使用 | 依赖 |
|---|---|---|---|
| `useMapZoom`（新 hook） | 封装 d3-zoom：transform `{x,y,k}` 状态、`fitToBounds()`（默认全马视图）、`reset()`、`zoomToCity(id)`，含 `scaleExtent` / `translateExtent` | `const {transform, bind, fitToBounds, reset, zoomToCity} = useMapZoom(...)`；`bind` 挂到 svg ref | `d3-zoom`、`d3-geo` 投影 |
| `label-layout.ts`（改） | `placeLabels` 增加"碰撞即剔除 + 缩放感知"参数：放不下的低优先级标签返回 `null` 而非飘走 | 传入当前 transform 下的屏幕坐标 | — |
| `ChinaRouteMap.tsx`（改） | 渲染缩放层 + 标注层；接 `useMapZoom`；移除 3D 倾斜与 gsap/指针；加"回到全马"按钮；选中城市 → `zoomToCity` + `onSelect` | `/route` 页 | 上述全部 |
| `CityPanel.tsx`（小改） | 预留 `PhotoStrip` / `PeopleList` / `PlaceList` 子块插槽，**有数据才渲染**（本轮接口占位） | 选中城市时展开 | 数据模型 |
| `RoutePreview.tsx`（首页） | 本轮**不加缩放**；因 `placeLabels` 修复自动不再飘字（静态下只显放得下的关键点，正合预告图） | 首页 | `placeLabels` |

`ChinaRouteMap` 现 623 行、`CityPanel` 现 472 行，均偏大；抽 `useMapZoom`、把面板内容拆子组件，是在动它们时顺手收敛边界。

## 6. 数据模型（为未来内容留扩展位）

给 `RouteCity`（`src/data/route-cities.ts`，纯 TS 模块，非 Content Collection，改接口即可）增加**全部可选**字段：

```ts
photos?: { src: string; alt?: string; caption?: string; caption_en?: string }[];
people?: { name: string; name_en?: string; role?: string; avatar?: string; bio?: string; bio_en?: string }[];
places?: { name: string; name_en?: string; image?: string; desc?: string; desc_en?: string }[];
```

- 全部可选 → 纯增量，不破坏现有数据与构建。
- 图片用 `/public` 下的**路径字符串**，绕开"Astro 图片导入在 React 里返回对象"那个坑。
- 双语沿用项目既定 `_en` 后缀约定。
- 本轮只加字段与面板插槽，**不填内容、不渲染**（Phase 2 待素材）。

## 7. 缩放与标签行为细节

- **默认视图**：`fitToBounds` = 所有路线点 + 马形包围盒，留 padding，即"全马视图"。
- **缩放限制**：`scaleExtent` 约 `[1, 8]`；`translateExtent` 约束防止把地图拖出画面。
- **标签 LOD**：当前 `k` 下对屏幕坐标跑 `placeLabels`；放不下时按优先级剔除（最新站 > 出发点 > 已访问 > anchor）。缩远 → 西南簇只剩少量关键点；放大 → 点散开、碰撞消失、更多名字淡入。字号恒定（标注层不缩放）。
- **交互**：拖动平移；滚轮/捏合/双击缩放；点击城市 → 平滑 ease 到该城居中放大 + 开面板；"回到全马"按钮 → ease 回默认。
- **圆点尺寸**：随缩放放大尚可接受（甚至更醒目）；若放大后过大，对半径做 clamp（调优细节，非核心）。

## 8. 测试（沿用 Playwright harness）

- **坐标类测试不变**：transform 加在父 `<g>` 上，圆点 `cx/cy` 属性值不变，故"圆点落在地理坐标"的测试仍通过。
- **更新**：原先假设"标签贴近端点上方堆叠"的断言——现在低优先级标签会被剔除（`null`）。改为断言：**可见**标签互不重叠、且贴近各自圆点。
- **新增**：默认视图只显关键标签（出发点/最新站）而非全部；程序化放大到西南后，更多标签可见且仍不重叠；"回到全马"复位 transform。

## 9. 分阶段落地

- **Phase 1（本轮）**：① `placeLabels` 改碰撞即剔除（立即修脱节，首页/详情页都受益）→ ② `useMapZoom` + 缩放/平移、标注层屏幕恒定、默认全马视图 + 复位键 → ③ 点击城市平滑缩放居中 → ④ 移除 3D 倾斜与地图内 gsap/指针 → ⑤ 更新/新增 Playwright 测试。
- **Phase 2（以后，待素材）**：填 `photos/people/places` 数据，面板渲染对应子块。
- **Phase 3（以后，可选）**：GMaps 式操作按钮组、分类筛选 chips、是否以 Framer Motion 重做滑行指针。

## 10. 风险与注意

- **滚轮劫持页面滚动**：地图滚轮缩放可能影响页面纵向滚动。用 d3-zoom 的 `filter`（如要求悬停在地图上 / 捏合）缓解——UX 细节，落地时调优。
- **马形对齐**：`horseRouteD` 在缩放层内，随整体缩放，天然对齐（已确认）。
- **gsap 误删**：只动 `ChinaRouteMap.tsx`，**勿碰** `AboutContent.tsx` 与 `package.json` 的 `gsap` 依赖。
- **触屏手势**：移动端需支持捏合缩放与单指拖动；d3-zoom 默认支持，需在真机/模拟器验证。
