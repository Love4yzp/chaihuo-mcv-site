# 基地车人员流动系统重构

## TL;DR

> 将 `/crew-preview` 的 CrewManifest 组件重构为面向未来的「岗位分组 + 可折叠历史」设计，嵌入 `/guide` 页面替换现有静态团队介绍。统一数据源到 `team.json`，支持一人多次上下车记录。
>
> **Deliverables**:
> - 新数据模型 (`team.json` 扩展 + `boardings.json` 重构)
> - `CrewFlow.tsx` 组件（替换 `CrewManifest.tsx`）
> - `/guide` 页面集成
> - i18n 翻译字典 (`guide.ts` 扩展)
> - 废弃文件清理
>
> **Estimated Effort**: Medium (6-8 tasks)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: 数据重构 → 组件开发 → 页面集成 → 清理

---

## Context

### Original Request
用户要求推翻 `/crew-preview` 现有设计，重新设计基地车成员的人员流动展示方式。核心诉求：
- **当前在途**要一眼看清（按岗位分组）
- **历史参与者**默认折叠，但可被记住
- 支持一人多次上下车
- 嵌入 `/guide` 页面
- 面向未来扩展到 10 人流动

### Interview Summary
**Key Discussions**:
- 数据冗余问题：crew.json 与 team.json 重复，决定统一用 team.json
- 状态管理：不用常驻/流动区分，按岗位分组
- 历史展示：底部「曾同行」折叠面板，情感化命名
- 扩展性：当前 4 人，未来 10+ 人，设计需可扩展

### Research Findings
- `team.json` 已有完整人员信息（含 bio、avatar、role_en）
- `boardings.json` 当前结构过于简单，无唯一 ID
- `crew.json` 与 `team.json` 数据不一致（spencer vs zhipeng ID）
- Guide 页面现有团队展示是静态卡片，需要替换

---

## Work Objectives

### Core Objective
重构人员流动展示系统，将当前简单的「上下车时间轴」改为「岗位分组卡片 + 可折叠历史档案」，嵌入 Guide 页面。

### Concrete Deliverables
- `src/data/team.json` — 扩展字段支持人员流动
- `src/data/boardings.json` — 新结构，支持唯一 ID 和多次参与
- `src/app/components/CrewFlow.tsx` — 新组件（替换 CrewManifest）
- `src/app/components/CrewMemberCard.tsx` — 人员卡片子组件
- `src/app/components/CrewAlumni.tsx` — 历史人员折叠面板
- `src/pages/guide.astro` / `src/pages/en/guide.astro` — 集成新组件
- `src/i18n/guide.ts` — 扩展翻译字段
- 废弃文件清理（crew.json, CrewManifest.tsx, crew-preview.astro）

### Definition of Done
- [ ] Guide 页面展示岗位分组的当前在途人员
- [ ] 点击「曾同行」展开历史参与者列表
- [ ] 响应式布局（mobile/desktop）
- [ ] 中英文双语支持
- [ ] `pnpm build` 无错误

### Must Have
- 岗位分组（领队/技术担当/媒体担当）
- 当前在途人员卡片展示
- 可折叠的「曾同行」历史区域
- 支持一人多次上下车记录
- 与现有 i18n 系统集成
- 响应式设计

### Must NOT Have (Guardrails)
- 不接入外部数据源（保持 JSON 本地管理）
- 不做实时地图/GPS 追踪
- 不做甘特图（数据量尚不支持）
- 不做管理后台（继续手动编辑 JSON）
- 不改动其他页面的团队数据展示逻辑

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO（项目无测试框架）
- **Automated tests**: None
- **Agent-Executed QA**: Playwright 验证 UI 渲染和交互

### QA Policy
每个任务包含 Agent-Executed QA Scenarios：
- **Frontend/UI**: Playwright — 验证组件渲染、折叠展开、响应式
- **Build**: Bash (`pnpm build`) — 验证无构建错误
- **i18n**: Bash (`curl`) — 验证中英文路由正常

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation - 可立即并行):
├── Task 1: 数据模型重构 [quick]
│   └── 扩展 team.json + 重写 boardings.json
├── Task 2: i18n 翻译准备 [quick]
│   └── 扩展 src/i18n/guide.ts
└── Task 3: 废弃文件清理 [quick]
    └── 删除 crew.json, crew-preview.astro (保留 CrewManifest.tsx 暂不移除)

Wave 2 (Core - 依赖 Wave 1):
├── Task 4: CrewMemberCard 子组件 [quick]
│   └── 单个人员卡片（头像、姓名、状态、参与时段）
├── Task 5: CrewAlumni 历史面板 [quick]
│   └── 可折叠的「曾同行」区域
└── Task 6: CrewFlow 主组件 [deep]
    └── 岗位分组 + 当前在途 + 集成 Alumni

Wave 3 (Integration):
├── Task 7: Guide 页面集成 [unspecified-high]
│   └── 替换现有团队展示，传入数据
├── Task 8: 英文页面同步 [quick]
│   └── src/pages/en/guide.astro 同步更新
└── Task 9: 构建验证 [quick]
    └── pnpm build + 视觉检查

Wave FINAL (Review):
├── Task F1: 构建通过验证
├── Task F2: Playwright QA
└── Task F3: 代码清理（移除 CrewManifest.tsx）
```

---

## TODOs

- [x] 1. 重构数据模型

  **What to do**:
  - 扩展 `src/data/team.json`：确保所有参与人员都有完整字段（id, name, name_en, role, role_en, bio, bio_en, image）
  - 重写 `src/data/boardings.json`：新结构，每条记录有唯一 ID，支持同一人多次参与
  - 废弃 `src/data/crew.json`：将其中独有数据合并到 team.json

  **Data Model**:
  ```typescript
  // team.json 已有结构，无需大改
  interface TeamMember {
    id: string;
    name: string;
    name_en: string;
    role: string;
    role_en: string;
    bio: string;
    bio_en: string;
    image?: string;
    isRobot?: boolean;
  }

  // boardings.json 新结构
  interface Participation {
    id: string;           // 唯一标识，如 "boarding-001"
    crewId: string;       // 关联 team.json 的 id
    role: string;         // 本次参与的岗位（可能与 team.role 不同）
    boardedAt: {
      date: string;       // ISO 日期，如 "2026-04-22"
      location: string;   // 中文地点
      location_en: string;// 英文地点
    };
    disembarkedAt?: {     // undefined = 仍在途
      date: string;
      location: string;
      location_en: string;
    };
  }
  ```

  **Migration**:
  - crew.json 中的 `spencer` → team.json 中已有 `zhipeng`（同一人，ID 不一致需统一）
  - 决定：boardings.crewId 使用 team.json 的 ID（zhipeng 而非 spencer）
  - boardings.json 数据迁移示例：
    ```json
    [
      { "id": "b1", "crewId": "feng", "role": "领队", "boardedAt": { "date": "2026-04-22", "location": "深圳科技馆", "location_en": "Shenzhen Science Museum" }, "disembarkedAt": null },
      { "id": "b2", "crewId": "zhipeng", "role": "技术担当", "boardedAt": { "date": "2026-04-22", "location": "深圳科技馆", "location_en": "Shenzhen Science Museum" }, "disembarkedAt": null },
      { "id": "b3", "crewId": "ray", "role": "媒体担当", "boardedAt": { "date": "2026-04-22", "location": "深圳科技馆", "location_en": "Shenzhen Science Museum" }, "disembarkedAt": { "date": "2026-04-26", "location": "阳江科技馆", "location_en": "Yangjiang Science Museum" } },
      { "id": "b4", "crewId": "xiaomei", "role": "媒体担当", "boardedAt": { "date": "2026-04-26", "location": "阳江科技馆", "location_en": "Yangjiang Science Museum" }, "disembarkedAt": null }
    ]
    ```

  **Must NOT do**:
  - 不要修改 team.json 中现有人员的 bio/role（保持现有 Guide 页面兼容）
  - 不要删除 crew.json 中的字段，而是迁移后整体废弃文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 4, 5, 6, 7
  - **Blocked By**: None

  **References**:
  - `src/data/team.json` — 现有人员数据
  - `src/data/crew.json` — 待迁移数据
  - `src/data/boardings.json` — 待重构数据

  **Acceptance Criteria**:
  - [ ] team.json 包含所有 boardings 中引用的人员
  - [ ] boardings.json 使用新结构，每条记录有唯一 id
  - [ ] crewId 统一使用 team.json 中的 ID（zhipeng 而非 spencer）
  - [ ] `pnpm build` 无 TypeScript 错误

  **QA Scenarios**:
  ```
  Scenario: 数据完整性验证
    Tool: Bash (node REPL)
    Preconditions: 数据文件已更新
    Steps:
      1. node -e "const t=require('./src/data/team.json'); const b=require('./src/data/boardings.json'); const ids=new Set(t.map(x=>x.id)); console.log(b.every(x=>ids.has(x.crewId)))"
    Expected Result: 输出 true（所有 boardings.crewId 都存在于 team.json）
    Evidence: .sisyphus/evidence/task-1-data-integrity.txt
  ```

  **Commit**: YES
  - Message: `refactor(data): unify crew data into team.json, restructure boardings`
  - Files: `src/data/team.json`, `src/data/boardings.json`

- [x] 2. 扩展 i18n 翻译字典

  **What to do**:
  - 在 `src/i18n/guide.ts` 中添加人员流动相关的翻译字段
  - 字段设计：
    ```typescript
    'crew.title': '车上的人',
    'crew.title_en': 'On Board',
    'crew.current': '当前在途',
    'crew.current_en': 'Current Crew',
    'crew.alumni': '曾同行',
    'crew.alumni_en': 'Travelled With Us',
    'crew.alumni_count': '曾同行（{count}人）',
    'crew.alumni_count_en': 'Travelled With Us ({count})',
    'crew.onboard_since': '{location} 上车 · {date}',
    'crew.onboard_since_en': 'Boarded at {location} · {date}',
    'crew.duration': '同行 {days} 天',
    'crew.duration_en': '{days} days together',
    'crew.role.lead': '领队',
    'crew.role.lead_en': 'Team Lead',
    'crew.role.tech': '技术担当',
    'crew.role.tech_en': 'Tech Lead',
    'crew.role.media': '媒体担当',
    'crew.role.media_en': 'Media Lead',
    ```

  **Must NOT do**:
  - 不要创建新的翻译文件，复用现有的 guide.ts
  - 不要硬编码中文在组件中

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Task 6, 7, 8
  - **Blocked By**: None

  **References**:
  - `src/i18n/guide.ts` — 现有翻译字典结构
  - `src/i18n/index.ts` — localize() 工具函数

  **Acceptance Criteria**:
  - [ ] 所有新增字段都有 zh/en 版本
  - [ ] 字段命名遵循现有项目约定（点号分隔）
  - [ ] TypeScript 类型正确（Record<Locale, Record<string, string>>）

  **QA Scenarios**:
  ```
  Scenario: 翻译字典完整性
    Tool: Bash
    Preconditions: guide.ts 已更新
    Steps:
      1. grep -c "crew\." src/i18n/guide.ts
    Expected Result: 输出新增字段数量（>0）
    Evidence: .sisyphus/evidence/task-2-i18n.txt
  ```

  **Commit**: YES (groups with Task 1)

- [x] 3. 清理废弃文件

  **What to do**:
  - 删除 `src/data/crew.json`（数据已迁移到 team.json）
  - 删除 `src/pages/crew-preview.astro`（功能将集成到 Guide）
  - 暂不删除 `src/app/components/CrewManifest.tsx`（等 Task 6 完成后再删）

  **Must NOT do**:
  - 不要删除 `CrewManifest.tsx`（等替换完成后再删，防止需要回退）
  - 不要删除其他引用 crew.json 的文件（先搜索确认无其他引用）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `grep -r "crew\.json" src/` — 确认所有引用位置

  **Acceptance Criteria**:
  - [ ] `crew.json` 文件已删除
  - [ ] `crew-preview.astro` 文件已删除
  - [ ] `pnpm build` 无 "file not found" 错误

  **QA Scenarios**:
  ```
  Scenario: 废弃文件清理验证
    Tool: Bash
    Preconditions: 文件已删除
    Steps:
      1. test ! -f src/data/crew.json && echo "crew.json deleted"
      2. test ! -f src/pages/crew-preview.astro && echo "crew-preview deleted"
      3. pnpm build
    Expected Result: 前两步输出 deleted，第三步构建成功
    Evidence: .sisyphus/evidence/task-3-cleanup.txt
  ```

  **Commit**: YES (groups with Task 1)

- [x] 4. CrewMemberCard 子组件

  **What to do**:
  - 创建 `src/app/components/CrewMemberCard.tsx`
  - 功能：展示单个人员的头像、姓名、岗位、参与时段
  - Props 设计：
    ```typescript
    interface CrewMemberCardProps {
      member: TeamMember;
      participation: Participation;
      locale: 'zh' | 'en';
      t: Record<string, string>;
      variant: 'active' | 'alumni';  // 决定视觉风格
    }
    ```
  - 视觉：
    - active：亮色边框/阴影，● 状态指示器
    - alumni：灰色边框，弱化显示
  - 悬停效果：轻微上浮 + 阴影加深
  - 点击展开：显示完整履历（如果有多段参与）

  **Must NOT do**:
  - 不要在卡片内做复杂动画（保持轻量）
  - 不要硬编码样式值，使用 Tailwind token

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`framer-motion-animator`]
  - Reason: 需要精细的悬停动画和展开动画

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 5)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 1, 2

  **References**:
  - `src/app/components/TeamMemberCard.tsx` (if exists in Guide) — 现有卡片样式参考
  - `src/app/components/ui/` — shadcn/ui 组件库
  - `src/styles/theme.css` — 设计 token（brand, surface, neutral）

  **Acceptance Criteria**:
  - [ ] 组件接收正确的 Props 并渲染
  - [ ] active/alumni 两种变体视觉区分明显
  - [ ] 悬停有动画反馈
  - [ ] 点击展开显示完整履历
  - [ ] 响应式：移动端全宽，桌面端自适应

  **QA Scenarios**:
  ```
  Scenario: 卡片渲染验证
    Tool: Playwright
    Preconditions: 组件在测试页面中渲染
    Steps:
      1. 访问包含 CrewMemberCard 的测试页面
      2. 截图验证 active 卡片有品牌色边框
      3. 截图验证 alumni 卡片为灰色
      4. 悬停卡片，验证阴影变化
    Expected Result: 截图显示正确的视觉状态
    Evidence: .sisyphus/evidence/task-4-card-render.png
  ```

  **Commit**: YES
  - Message: `feat(components): add CrewMemberCard with active/alumni variants`

- [x] 5. CrewAlumni 历史面板

  **What to do**:
  - 创建 `src/app/components/CrewAlumni.tsx`
  - 功能：可折叠的「曾同行」区域
  - 默认折叠，点击展开显示所有历史参与者
  - 展开动画使用 Framer Motion（高度动画）
  - 内容：使用 CrewMemberCard（variant="alumni"）
  - 头部显示「曾同行（{count}人）」

  **Must NOT do**:
  - 不要使用 CSS max-height 做动画（用 Framer Motion 的 AnimatePresence）
  - 不要一次性渲染大量数据（当前数据量小，未来可能需要虚拟滚动，但暂不实现）

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`framer-motion-animator`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 4)
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 6
  - **Blocked By**: Task 1, 2

  **References**:
  - `src/app/components/FAQ.tsx` (if exists) — 折叠面板交互参考
  - Framer Motion AnimatePresence 文档 — 展开/收起动画

  **Acceptance Criteria**:
  - [ ] 默认折叠状态
  - [ ] 点击头部平滑展开
  - [ ] 再次点击收起
  - [ ] 显示正确的人数统计

  **QA Scenarios**:
  ```
  Scenario: 折叠展开交互
    Tool: Playwright
    Preconditions: 组件已渲染
    Steps:
      1. 截图验证初始状态为折叠
      2. 点击「曾同行」头部
      3. 截图验证展开后显示历史人员
      4. 再次点击，验证收起
    Expected Result: 动画流畅，内容正确显示/隐藏
    Evidence: .sisyphus/evidence/task-5-alumni-toggle.png
  ```

  **Commit**: YES (groups with Task 4)

- [x] 6. CrewFlow 主组件

  **What to do**:
  - 创建 `src/app/components/CrewFlow.tsx`（替换 CrewManifest）
  - 功能：
    1. 接收 team + boardings 数据
    2. 按岗位分组当前在途人员
    3. 渲染 CrewMemberCard（active 变体）
    4. 渲染 CrewAlumni（历史人员）
    5. 岗位排序：领队 → 技术担当 → 媒体担当（可配置）
  - 数据处理逻辑：
    ```typescript
    // 派生状态
    const activeMembers = boardings.filter(b => !b.disembarkedAt);
    const alumni = boardings.filter(b => b.disembarkedAt);
    // 按岗位分组
    const groupedByRole = groupBy(activeMembers, 'role');
    ```

  **Must NOT do**:
  - 不要引入状态管理库（useState/useMemo 足够）
  - 不要做复杂的数据缓存（数据量小，每次渲染重新计算即可）

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: [`framer-motion-animator`]
  - Reason: 需要处理数据派生、分组逻辑、子组件协调

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Blocked By**: Task 4, 5

  **References**:
  - `src/app/components/CrewManifest.tsx` — 现有数据处理逻辑参考
  - `src/app/components/motion.ts` — 动画预设

  **Acceptance Criteria**:
  - [ ] 正确按岗位分组显示当前在途人员
  - [ ] 历史区域显示正确的人员和数量
  - [ ] 岗位顺序正确
  - [ ] 空状态处理（某岗位暂无人）

  **QA Scenarios**:
  ```
  Scenario: 主组件完整渲染
    Tool: Playwright
    Preconditions: 组件挂载在测试页面
    Steps:
      1. 访问测试页面
      2. 验证显示「领队」「技术担当」「媒体担当」三个分组
      3. 验证每个分组下正确的人员卡片
      4. 验证底部有「曾同行」折叠面板
      5. 截图保存
    Expected Result: 布局正确，数据匹配
    Evidence: .sisyphus/evidence/task-6-crewflow.png
  ```

  **Commit**: YES
  - Message: `feat(components): add CrewFlow main component with role grouping`

- [ ] 7. Guide 页面集成

  **What to do**:
  - 修改 `src/pages/guide.astro`
  - 在合适位置（FAQ 下方或替换现有团队展示）集成 CrewFlow
  - 数据获取：
    ```astro
    ---
    import team from '@/data/team.json';
    import boardings from '@/data/boardings.json';
    // 过滤掉机器人（isRobot）
    const humanTeam = team.filter(m => !m.isRobot);
    ---
    ```
  - 传递 locale 和 t 字典到 CrewFlow

  **Must NOT do**:
  - 不要破坏 Guide 页面现有其他部分（参与指南、FAQ）
  - 不要改变页面整体布局结构（只替换团队展示部分）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: Task 6

  **References**:
  - `src/pages/guide.astro` — 现有页面结构
  - `src/pages/en/guide.astro` — 英文页面（Task 8 处理）

  **Acceptance Criteria**:
  - [ ] Guide 页面显示 CrewFlow 组件
  - [ ] 数据正确传递
  - [ ] 不影响页面其他部分
  - [ ] `pnpm build` 成功

  **QA Scenarios**:
  ```
  Scenario: Guide 页面集成验证
    Tool: Playwright
    Preconditions: 页面已更新
    Steps:
      1. 访问 /guide
      2. 截图验证 CrewFlow 组件出现
      3. 验证岗位分组正确
      4. 验证折叠面板可交互
    Expected Result: 组件正确集成，功能正常
    Evidence: .sisyphus/evidence/task-7-guide-integration.png
  ```

  **Commit**: YES
  - Message: `feat(pages): integrate CrewFlow into Guide page`

- [ ] 8. 英文页面同步

  **What to do**:
  - 修改 `src/pages/en/guide.astro`
  - 同步 Task 7 的集成逻辑
  - 确保英文翻译字典正确加载

  **Must NOT do**:
  - 不要复制粘贴中文页面的代码（保持两个页面独立但结构一致）

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Task 7)
  - **Parallel Group**: Wave 3

  **References**:
  - `src/pages/en/guide.astro` — 现有英文页面
  - `src/i18n/guide.ts` — 翻译字段

  **Acceptance Criteria**:
  - [ ] /en/guide 显示英文版 CrewFlow
  - [ ] 所有文本为英文

  **QA Scenarios**:
  ```
  Scenario: 英文页面验证
    Tool: Bash (curl)
    Preconditions: 构建成功
    Steps:
      1. curl -s http://localhost:4321/en/guide | grep -i "on board"
    Expected Result: 匹配到英文标题
    Evidence: .sisyphus/evidence/task-8-en-guide.txt
  ```

  **Commit**: YES (groups with Task 7)

- [ ] 9. 构建验证与清理

  **What to do**:
  - 运行 `pnpm build` 验证无错误
  - 删除 `src/app/components/CrewManifest.tsx`（替换已完成）
  - 最终代码审查：检查是否有遗留的 crew.json 引用

  **Must NOT do**:
  - 不要删除其他未确认废弃的文件

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Blocked By**: Task 7, 8

  **Acceptance Criteria**:
  - [ ] `pnpm build` 成功
  - [ ] CrewManifest.tsx 已删除
  - [ ] 无遗留的 crew.json 引用

  **QA Scenarios**:
  ```
  Scenario: 构建与清理验证
    Tool: Bash
    Steps:
      1. pnpm build
      2. test ! -f src/app/components/CrewManifest.tsx
      3. grep -r "crew\.json" src/ || echo "No references"
    Expected Result: 构建成功，文件已删除，无引用
    Evidence: .sisyphus/evidence/task-9-final.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): remove CrewManifest and verify build`

---

## Final Verification Wave

- [ ] F1. **构建验证** — `quick`
  - `pnpm build` 完全通过
  - 输出: `Build [PASS]`

- [ ] F2. **Playwright QA** — `unspecified-high` + `playwright`
  - 访问 /guide 和 /en/guide
  - 验证岗位分组、卡片渲染、折叠交互
  - 截图保存到 `.sisyphus/evidence/final-qa/`
  - 输出: `Scenarios [N/N pass]`

- [ ] F3. **代码审查** — `quick`
  - 检查无遗留引用、无 console.log、无 AI slop 注释
  - 输出: `Files [N clean/N issues]`

---

## Commit Strategy

- **Wave 1**: `refactor(data): unify crew data and prepare translations`
- **Wave 2**: `feat(components): add CrewFlow, CrewMemberCard, CrewAlumni`
- **Wave 3**: `feat(pages): integrate CrewFlow into Guide (zh + en)`
- **Final**: `chore(cleanup): remove legacy CrewManifest`

---

## Success Criteria

### Verification Commands
```bash
pnpm build  # Expected: 构建成功
```

### Final Checklist
- [ ] Guide 页面显示岗位分组的当前在途人员
- [ ] 「曾同行」折叠面板默认收起，可点击展开
- [ ] 中英文双语支持
- [ ] 响应式布局正常
- [ ] 无遗留废弃文件引用
- [ ] `pnpm build` 无错误
