# 路线地图 Phase 2：航行日志（每站 = 一次远征日志）

- **日期**：2026-05-27
- **状态**：待评审
- **范围**：`src/features/route-map/CityPanel.tsx` + `src/data/route-cities.ts` 数据
- **决策人**：用户（一人拍板）
- **⚠️ 本文档永不提交**（`docs/superpowers/` 仅作参考，绝不 `git add`）

## 0. 魂

**「一场把科技之火，带到未抵达之地与人的远征。」**(Star Trek 的探索边疆 + 普罗米修斯的传火)

不要流水账。每站不回答"第几天到了哪"，而回答四件事——**新世界 / 新文明 / 火种 / 越界**：

| Star Trek | 日志一格 | 含义 |
|---|---|---|
| strange new world | 🌐 新世界 | 闯进了什么场景/边疆 |
| new life & civilizations | 👤 新文明 | 平等地遇见了谁（人） |
| Prometheus' fire | 🔥 火种 | 带去/点燃了什么能力·工具 |
| boldly go | ⚡ 越界 | 跨过了哪条"没人去过的线"（技术×传统的碰撞） |

## 1. 目标 / 非目标

**目标**
- `CityPanel` 以"**日志主轴**"重排：左栏故事（四格），右栏数据（现有 HUD）。
- 数据模型加 `expedition` / `people` / `photos`（全可选）。
- 照片缩略图 → lightbox 看大图（复用 shadcn `dialog`）。
- 人物卡复用现有 `team` 卡样式。
- 缺数据**降级**：没有日志数据的站维持现状，永不空壳/报错。

**非目标（本期不做）**
- `equipment` 集合关联（把装备链到站点）——好点子，留以后。
- 视频 / 小红书 / 公众号传播策略——地图之外，不在范围。
- **HERO 标语**——一个字不动。
- 首页 `RoutePreview`（静态预告图）——不加内容、不动。
- Phase 3 的地图分类筛选 chips。

## 2. 数据模型

在 `RouteCity`（`src/data/route-cities.ts`）上：

```ts
expedition?: {
  world: string;    world_en?: string;    // 新世界：闯进的场景/边疆（一句话）
  fire: string;     fire_en?: string;      // 火种：带去/点燃的能力·工具（一句话）
  frontier: string; frontier_en?: string;  // 越界：跨过的那条线 / 碰撞（一句话，做钩子）
};
people?: { name: string; name_en?: string; role?: string; role_en?: string; image?: string; bio?: string; bio_en?: string }[];
photos?: { src: string; alt?: string; caption?: string; caption_en?: string }[];
```

- **三句主张（world/fire/frontier）是人写的**，不是从 `terrain` 自动拼——这才有观点。
- **全部可选**：纯增量；没填的站构建照常、面板回退现状。
- 图片走 `/public` 路径字符串（如 `/people/xxx.jpg`），绕开 Astro 图片导入对象坑。
- 双语沿用 `_en` 后缀约定。
- **改名**：Phase 1 已加 `people`/`photos`，其中 `people` 用了 `avatar`；本期改为 `image` 对齐 `team` 约定（无现有数据使用该字段，安全）。

## 3. 面板布局（日志主轴，已选定）

```
柳州                              [3/8]  2026.04.30
━━ ⚡ 越界（钩子·加粗；缺 frontier 则整条隐藏）━━━━━━━━━
「把六轴机械臂，开进养鱼塘」
─ 左：故事 / 航行日志 ───────────┬─ 右：数据 / 测控 ──────────
🌐 新世界  三都养殖基地·喀斯特盆地 │ ▂▃▅ 海拔剖面图（compact）
🔥 火种    边缘 AI 摄像头·防抖纠偏 │ ⚙ 测控 HUD（海拔/阶梯/气候/地貌）
👤 新文明  [img]新农人·三都镇「…」 │ ▣ 车载挑战…
           （1–N 张人物卡，横排）  │ ─ 关联日记 ─
📷 剧照    [▢][▢][▢] 点击看大图    │ • 领队日记（04.30） [阅读 ↗]
行程正文（event.summary 作详述）…  │
[阅读现场连线 ↗]                   │
```

- **顶部**：城市名 + 行程序号 badge + 日期；下方一条**越界钩子**（`frontier` 加粗大字；缺则隐藏，回退为仅名字/日期）。
- **左栏（故事）**：🌐 world → 🔥 fire → 👤 people 卡 → 📷 photos 缩略图 → `event.summary` 正文 + 外链 CTA。
- **右栏（数据）**：海拔剖面图 + 测控 HUD + 车载挑战 + 关联日记（基本沿用现有右栏）。
- **hero / 非 hero / mobile**：两栏在窄屏堆叠，**故事在上、数据在下**。

## 4. 组件拆分

`CityPanel.tsx` 现 472 行，加内容会更大 → 抽出聚焦子组件（同目录）：

| 单元 | 职责 | 依赖 |
|---|---|---|
| `ExpeditionLog.tsx` | 左栏故事容器：越界钩子 + 🌐world + 🔥fire | `expedition` 数据、`locale` |
| `PeopleStrip.tsx` | 👤新文明：横排人物卡（复用 team 卡样式） | `people[]`、`locale` |
| `PhotoStrip.tsx` | 📷剧照：缩略图 + 点击 lightbox（shadcn `dialog`） | `photos[]`、`locale` |

右栏 telemetry/海拔/日记保持在 `CityPanel` 内（本期不动）。三个子组件**仅在对应数据存在时渲染**。

## 5. 交互 / 降级

- **照片 lightbox**：缩略图点击 → shadcn `Dialog` 弹出大图 + `caption`。先做"单张放大"，左右翻页为可选增强（YAGNI，先不做）。
- **降级**：
  - 无 `expedition` → 不渲染故事四格与钩子，回退现有 `event.summary` + HUD。
  - 无 `people` / `photos` → 对应块不渲染。
  - 整面板对任意缺失字段**永不报错、不留空壳**。
- **i18n**：`world/fire/frontier/people/photos` 均按 `locale` 取 `_en`；`localize()`/就地三元选择，沿用项目约定。

## 6. 测试（沿用 Playwright harness）

先给 **1–2 个样本站**（建议柳州、毕节）填真实/示例 `expedition`+`people`+`photos`，据此测：
- **渲染**：有数据的站显示越界钩子、🌐/🔥 文案、人物卡、照片缩略图。
- **降级**：无 `expedition` 的站仍渲染 `event.summary`、无报错、无空壳块（断言故事四格的 `data-*` 标记不存在但面板主体在）。
- **lightbox**：点缩略图 → `dialog` 打开、显示大图。
- 页面测试沿用 `beforeEach` 的 `emulateMedia({ reducedMotion: 'reduce' })`（与 Phase 1 一致，避免拆卸超时）。

给子组件加 `data-*` 钩子（如 `data-expedition-log`、`data-people-card`、`data-photo-thumb`）便于断言。

## 7. 素材依赖（落地前提）

实现可以先做组件 + 降级，但**真正"有内容"需要你提供素材**：
- `world/fire/frontier` 三句主张（编辑/文案，每站一组）；
- `people`：名字/身份/头像图(`/public/people/...`)/一句 bio；
- `photos`：现场剧照（`/public/...`）+ 图注。

建议路径：先实现组件 + 降级 + 用 1–2 站样本验证；其余站的素材你陆续补，补到哪渲染到哪。

## 8. 风险与注意

- **面板变长**（尤其 mobile）：可接受（详情面板可滚动）；若实测过长，Phase 3 再考虑收进 tab。
- **`avatar`→`image` 改名**：Phase 1 stub 用 `avatar`，本期改名，需同步类型（无数据使用，安全）。
- **不碰**：HERO 标语、首页 `RoutePreview`。
- **不提交本规格 / 计划文档**（`docs/superpowers/`）。
