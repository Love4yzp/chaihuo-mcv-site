# 设计系统 + AI 可理解规范 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给站点建立一套「三层设计系统」文档 + 可视化参考页,并接入轻量工程化,让 AI 每次开发(含全新功能)都能稳定守住硬约束、延续气质、自由发挥。

**Architecture:** 设计系统不写成穷举组件目录,而是分三档(🔒 硬约束 / 🧭 精神 / 🎨 自由区)。硬约束直接锚定既有 `src/styles/theme.css` 令牌;新增 `docs/DESIGN.md` 文档、`/elements` 中英可视化页(React island,复用现有 `ui/` 组件,零新依赖)、`CLAUDE.md` 设计系统节、Biome 格式工具。

**Tech Stack:** Astro 6 (SSR/prerender) + React 19 islands + Tailwind v4 (`@theme inline`) + i18n(`Astro.currentLocale` + 每页 dict)+ Playwright harness + Biome。

**约定遵守:** 不手改 `src/app/components/ui/`(Biome 配置中显式 ignore);中英两路对等;用 `text-brand`/`bg-surface` 等令牌,不硬编码 hex / 不用 gray-xxx。

**注意:** 按用户偏好,spec/plan 文档本身保持不提交;但**实现产物(代码、DESIGN.md、CLAUDE.md、biome 配置)按下方步骤正常提交**。

---

## 文件结构

| 文件 | 职责 | 动作 |
|---|---|---|
| `docs/DESIGN.md` | 三层设计系统「自由度说明书」 | 新建 |
| `src/i18n/elements.ts` | `/elements` 页的 zh/en 文案字典 | 新建 |
| `src/app/components/ElementsContent.tsx` | `/elements` 可视化 island(色板/字号/组件/动效) | 新建 |
| `src/pages/elements.astro` | 中文 `/elements` 路由 | 新建 |
| `src/pages/en/elements.astro` | 英文 `/en/elements` 路由 | 新建 |
| `tests/harness/helpers.ts` | 把 `/elements`、`/en/elements` 加入 `coreRoutes` | 修改 |
| `CLAUDE.md` | 新增「设计系统」一节 | 修改 |
| `biome.json` | Biome 配置(ignore `ui/`、dist 等) | 新建 |
| `package.json` | 加 `@biomejs/biome` 依赖 + `lint`/`format` 脚本 + 接入 `check` | 修改 |

---

## Task 1: 写 `docs/DESIGN.md`(三层设计系统)

**Files:**
- Create: `docs/DESIGN.md`

- [ ] **Step 1: 创建 `docs/DESIGN.md`,写入完整内容**

```markdown
# 设计系统 · 柴火基地车官网(普罗米修斯号)

> 这不是一本「组件目录」,而是一份**给 AI 与协作者的「自由度说明书」**。
> 它把规则分成三档:🔒 必须守 / 🧭 要领会延续 / 🎨 可自由发挥。
> 开发任何功能(尤其是全新的、像地图这类的功能)前,先对照这三档。

---

## 🔒 第一层 · 不可破的硬约束(Invariants)

任何功能都必须遵守。**永远使用令牌,不要硬编码 hex,不要用 Tailwind 的 gray-xxx。**
单一事实来源:`src/styles/theme.css`。

### 颜色(60-30-10 法则:60% 中性 / 30% 暖黄 / 10% 深灰强调)

| 用途 | 令牌 / Tailwind 类 | 值 |
|---|---|---|
| 主品牌色 探险黄 | `text-brand` / `bg-brand` | `#f3d230` |
| 深黄(hover/强调文字) | `text-brand-dark` | `#b8960a` |
| 按钮 hover 黄 | `bg-brand-hover` | `#e6c22c` |
| 微弱高亮背景 | `bg-brand-light` | `#fef9e7` |
| 品牌色上的文字 | `text-brand-foreground` | `#333333` |
| 主文字 | `text-neutral-900` | `#333333` |
| 次要文字 | `text-neutral-700` | `#555555` |
| 辅助/说明文字 | `text-neutral-500` | `#717182` |
| 边框/分隔线 | `border-neutral-300` | `#d1d5db` |
| 页面底色 | `bg-surface` | `#f5f5f5` |
| 卡片/弹窗 | `bg-surface-card` | `#ffffff` |
| 深色区块 | `bg-surface-dark` | `#1a1a1a` |

### 排版(字号阶梯用 Tailwind 默认;标题样式在 `theme.css` 的 `@layer base`)

| 元素 | 字号 | 字重 | 行高 | 字距 |
|---|---|---|---|---|
| h1 | `text-3xl` | 700 | 1.2 | -0.01em |
| h2 | `text-2xl` | 700 | 1.3 | -0.005em |
| h3 | `text-xl` | 600 | 1.4 | — |
| h4 / label / button | `text-base` | 500 | 1.5 | — |

> 字体来源:`src/styles/fonts.css` / `src/styles/index.css`(若 `fonts.css` 为空,字体由 `index.css` 或系统栈提供——改字体时在此登记)。

### 圆角

`--radius: 0.625rem`,派生 `rounded-sm`(−4px)/ `rounded-md`(−2px)/ `rounded-lg` / `rounded-xl`(+4px)。

### 动效签名(Premium Restrained · 高级克制)

- 页面切换:`250ms` 淡出 / `350ms` 淡入 + 12px 上滑。
- 统一缓动:`cubic-bezier(0.4, 0, 0.2, 1)`。
- island 内动效统一走 `src/app/components/motion.tsx`(`fadeUp`/`stagger`/`springTransition`/`defaultViewport`)。

### 无障碍底线

- **必须**尊重 `prefers-reduced-motion`(无限循环/视差动画要有 reduced-motion 降级,且 SSR 水合安全——见 `ChinaRouteMap` 的 mounted gate)。
- 正文与背景对比度达标(中性文字色阶已按此设计)。

### 国际化底线

- 中英两路对等:`src/pages/` 与 `src/pages/en/` 同步;新文案进 `src/i18n/*.ts` 的 zh+en;JSON 数据用 `_en` 后缀 + `localize()`。

---

## 🧭 第二层 · 要领会延续的精神(Principles)

给**全新功能**用——结构可以完全不同,但「感觉」要是一家人。

1. **探险黄是主角,但克制使用。** 黄色用于关键行动/强调(10% 那一档),不铺满。大面积用中性灰与白。
2. **远征探索的叙事感。** 站点核心是「200 天移动 AI 实验室的远征」。视觉与文案带在路上、记录、阶段推进的气质(时间线、轨迹、打卡点)。
3. **手绘 / 在地感,不要冰冷的 SaaS 模板感。** 地图等模块保留手绘风格;宁可朴素真实,不要塑料光泽。
4. **高级克制的动效。** 动效服务于「揭示内容」与「空间连续性」,不喧宾夺主;时长短、缓动统一、尊重 reduced-motion。
5. **中文优先,英文对等。** 简体中文是第一语言,英文是平等的二等公民而非附属。
6. **内容即主体。** 排版以可读性为先,留白充足,信息密度服从阅读节奏。

> 用法:开新功能时问自己——它**看起来/用起来**像不像在延续这 6 条?像,就对了,具体怎么实现自由发挥。

---

## 🎨 第三层 · 自由发挥区(Open · 仅作参考,非强制)

以下是站内**已有的常见做法**,作为参考。**新功能需要时可大胆偏离**,只要落在前两层之内。

- **卡片**:`bg-surface-card` + `border-neutral-300` + `rounded-xl`(见 `ui/card`)。
- **手风琴 / FAQ**:`ui/accordion`(见 `GuideContent`)。
- **时间线**:阶段推进的纵向时间线(见 `about` / `journals`)。
- **轮播**:首页 hero 用 react-slick。
- **地图类**:独立 feature(`src/features/route-map/`),自带投影、缩放、标签排布、轨迹——这些是该功能**独有的发明**,本文档不规定,只要求它守住 🔒 令牌 + 🧭 精神。

> 这一层会随站点演进。新增了值得复用的模式,补一条到这里即可——但永远标注「参考,非强制」。

---

## 如何使用本文档(给 AI)

开发任意功能前:
1. **读 🔒** —— 列出这次会碰到的硬约束令牌,确保全部使用、零硬编码。
2. **读 🧭** —— 想清楚如何延续这 6 条精神。
3. **看 🎨** —— 有现成模式就复用;是全新形态就自由设计,只需回到 🔒/🧭 自检。
4. 可视化对照页:`/elements`(中)/ `/en/elements`(英)。
```

- [ ] **Step 2: 提交**

```bash
git add docs/DESIGN.md
git commit -m "docs(design): add three-tier design system (invariants/principles/open)"
```

---

## Task 2: `/elements` 可视化参考页(zh + en)

**Files:**
- Create: `src/i18n/elements.ts`
- Create: `src/app/components/ElementsContent.tsx`
- Create: `src/pages/elements.astro`
- Create: `src/pages/en/elements.astro`
- Modify: `tests/harness/helpers.ts`(`coreRoutes`)

- [ ] **Step 1: 确认 `ui/` 组件的导出名(避免 import 出错)**

Run:
```bash
grep -nE "^export" src/app/components/ui/button.tsx src/app/components/ui/badge.tsx
```
Expected: 看到形如 `export { Button, buttonVariants }` / `export { Badge, badgeVariants }`。
若导出名不同,以实际为准调整 Step 3 的 import。

- [ ] **Step 2: 创建 `src/i18n/elements.ts`**

```typescript
import type { Locale } from './index';

const elements: Record<Locale, Record<string, string>> = {
  zh: {
    title: '设计系统参考',
    description: '柴火基地车官网的颜色、排版、组件与动效参考页。',
    heading: '设计系统参考',
    intro: '这一页把站点的设计令牌摆出来,方便对照检查整套视觉系统。',
    colors: '颜色',
    typography: '排版',
    radius: '圆角',
    components: '组件示例',
    motion: '动效',
    motionNote: '页面切换:250ms 淡出 / 350ms 淡入 + 上滑;缓动 cubic-bezier(0.4, 0, 0.2, 1);尊重 reduced-motion。',
  },
  en: {
    title: 'Design System Reference',
    description: 'Color, typography, component and motion reference for the Chaihuo MCV site.',
    heading: 'Design System Reference',
    intro: 'This page lays out the site design tokens so the whole visual system can be checked at a glance.',
    colors: 'Colors',
    typography: 'Typography',
    radius: 'Radius',
    components: 'Components',
    motion: 'Motion',
    motionNote: 'Page transitions: 250ms fade-out / 350ms fade-in + slide-up; easing cubic-bezier(0.4, 0, 0.2, 1); respects reduced-motion.',
  },
};

export default elements;
```

- [ ] **Step 3: 创建 `src/app/components/ElementsContent.tsx`**

```tsx
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import type { Locale } from '@/i18n/index';

interface ElementsContentProps {
  locale?: Locale;
  t: Record<string, string>;
}

const SWATCHES: { name: string; className: string; text: string }[] = [
  { name: 'brand', className: 'bg-brand', text: 'text-brand-foreground' },
  { name: 'brand-dark', className: 'bg-brand-dark', text: 'text-white' },
  { name: 'brand-hover', className: 'bg-brand-hover', text: 'text-brand-foreground' },
  { name: 'brand-light', className: 'bg-brand-light', text: 'text-neutral-900' },
  { name: 'surface', className: 'bg-surface', text: 'text-neutral-900' },
  { name: 'surface-card', className: 'bg-surface-card', text: 'text-neutral-900' },
  { name: 'surface-dark', className: 'bg-surface-dark', text: 'text-white' },
  { name: 'neutral-900', className: 'bg-neutral-900', text: 'text-white' },
  { name: 'neutral-700', className: 'bg-neutral-700', text: 'text-white' },
  { name: 'neutral-500', className: 'bg-neutral-500', text: 'text-white' },
  { name: 'neutral-300', className: 'bg-neutral-300', text: 'text-neutral-900' },
  { name: 'neutral-100', className: 'bg-neutral-100', text: 'text-neutral-900' },
];

const TYPE_SCALE: { tag: string; sample: string; cls: string }[] = [
  { tag: 'h1 / text-3xl 700', sample: '普罗米修斯号 · Prometheus', cls: 'text-3xl font-bold' },
  { tag: 'h2 / text-2xl 700', sample: '普罗米修斯号 · Prometheus', cls: 'text-2xl font-bold' },
  { tag: 'h3 / text-xl 600', sample: '普罗米修斯号 · Prometheus', cls: 'text-xl font-semibold' },
  { tag: 'body / text-base', sample: '正文示例 Body sample 0123456789', cls: 'text-base' },
  { tag: 'small / text-sm', sample: '辅助文字 Caption sample', cls: 'text-sm text-neutral-500' },
];

const RADII: { name: string; cls: string }[] = [
  { name: 'rounded-sm', cls: 'rounded-sm' },
  { name: 'rounded-md', cls: 'rounded-md' },
  { name: 'rounded-lg', cls: 'rounded-lg' },
  { name: 'rounded-xl', cls: 'rounded-xl' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold mb-6 text-neutral-900">{title}</h2>
      {children}
    </section>
  );
}

export default function ElementsContent({ t }: ElementsContentProps) {
  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-neutral-900">{t['heading']}</h1>
        <p className="mt-3 mb-12 text-neutral-700">{t['intro']}</p>

        <Section title={t['colors']}>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SWATCHES.map((s) => (
              <div key={s.name} className={`${s.className} ${s.text} rounded-lg border border-neutral-300 p-4 h-24 flex flex-col justify-end`}>
                <span className="text-sm font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t['typography']}>
          <div className="space-y-4">
            {TYPE_SCALE.map((row) => (
              <div key={row.tag} className="flex flex-col gap-1 border-b border-neutral-300 pb-4">
                <span className="text-sm text-neutral-500">{row.tag}</span>
                <span className={`${row.cls} text-neutral-900`}>{row.sample}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t['radius']}>
          <div className="flex flex-wrap gap-6">
            {RADII.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-2">
                <div className={`${r.cls} bg-surface-card border border-neutral-300 w-20 h-20`} />
                <span className="text-sm text-neutral-500">{r.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title={t['components']}>
          <div className="flex flex-wrap items-center gap-4">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="secondary">Secondary</Button>
            <Badge>Badge</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </Section>

        <Section title={t['motion']}>
          <p className="text-neutral-700 max-w-2xl">{t['motionNote']}</p>
        </Section>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建 `src/pages/elements.astro`(中文)**

```astro
---
export const prerender = true;

import BaseLayout from '@/layouts/BaseLayout.astro';
import ElementsContent from '@/app/components/ElementsContent';
import type { Locale } from '@/i18n/index';
import elementsDict from '@/i18n/elements';

const locale = (Astro.currentLocale ?? 'zh') as Locale;
const t = elementsDict[locale];
---

<BaseLayout title={t['title']} description={t['description']}>
  <ElementsContent client:load locale={locale} t={t} />
</BaseLayout>
```

- [ ] **Step 5: 创建 `src/pages/en/elements.astro`(英文)**

```astro
---
export const prerender = true;

import BaseLayout from '@/layouts/BaseLayout.astro';
import ElementsContent from '@/app/components/ElementsContent';
import type { Locale } from '@/i18n/index';
import elementsDict from '@/i18n/elements';

const locale = (Astro.currentLocale ?? 'en') as Locale;
const t = elementsDict[locale];
---

<BaseLayout title={t['title']} description={t['description']}>
  <ElementsContent client:load locale={locale} t={t} />
</BaseLayout>
```

- [ ] **Step 6: 把两条路由加入 `tests/harness/helpers.ts` 的 `coreRoutes`**

在 `coreRoutes` 数组末尾(`about-en` 那条之后)新增两行:

```typescript
  { path: '/about', name: 'about-zh', locale: 'zh' },
  { path: '/en/about', name: 'about-en', locale: 'en' },
  { path: '/elements', name: 'elements-zh', locale: 'zh' },
  { path: '/en/elements', name: 'elements-en', locale: 'en' },
];
```

- [ ] **Step 7: 类型检查**

Run: `pnpm run check:astro`
Expected: PASS(无类型错误)。若报 `ui/button` / `ui/badge` 导出名不符,按 Step 1 的实际导出修正 import。

- [ ] **Step 8: 跑 harness(smoke 会校验 `/elements` 与 `/en/elements`:有 h1、main、title 格式、无横向溢出、无 runtime 错误、正文>80 字)**

Run: `pnpm run smoke`
Expected: PASS,包含 `elements-zh renders` 与 `elements-en renders` 两条。

- [ ] **Step 9: 提交**

```bash
git add src/i18n/elements.ts src/app/components/ElementsContent.tsx src/pages/elements.astro src/pages/en/elements.astro tests/harness/helpers.ts
git commit -m "feat(elements): add bilingual design-system reference page"
```

---

## Task 3: 更新 `CLAUDE.md`(新增「设计系统」节)

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 在 `CLAUDE.md` 的 `## Styling` 一节之后、`## Gotchas` 之前,插入新节**

```markdown
## Design System

设计规则分三档,详见 `docs/DESIGN.md`,可视化对照页 `/elements`(中)/ `/en/elements`(英)。**开发任何功能(尤其全新功能)前先对照这三档:**

- **🔒 不可破(Invariants):** 颜色/字号/圆角/间距令牌(源:`src/styles/theme.css`)、60-30-10 配色、`prefers-reduced-motion` 与对比度无障碍底线、中英对等。永远用 `text-brand`/`bg-surface` 等令牌,不硬编码 hex、不用 gray-xxx。
- **🧭 要领会延续(Principles):** 探险黄克制使用、远征探索叙事、手绘在地感(非塑料 SaaS 感)、高级克制动效、中文优先英文对等、内容即主体。给全新功能(如地图类)用——结构可不同,气质要一致。
- **🎨 自由发挥(Open):** 已有模式(卡片/手风琴/时间线/轮播/地图 feature)仅作参考,新功能可大胆偏离,只要守住前两档。

新功能开发流程:先列本次涉及的 🔒 令牌确保零硬编码 → 想清楚如何延续 🧭 → 复用或自由设计 🎨。
```

- [ ] **Step 2: 提交**

```bash
git add CLAUDE.md
git commit -m "docs(claude): add design-system section pointing to DESIGN.md and /elements"
```

---

## Task 4: 接入 Biome(轻量 format/lint)

**Files:**
- Create: `biome.json`
- Modify: `package.json`

- [ ] **Step 1: 安装 Biome(dev 依赖)**

Run: `pnpm add -D @biomejs/biome`
Expected: 写入 `package.json` devDependencies,`pnpm-lock.yaml` 更新。

- [ ] **Step 2: 创建 `biome.json`(显式 ignore shadcn `ui/`、构建产物、内容数据)**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.0.0/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": [
      "**",
      "!dist/**",
      "!node_modules/**",
      "!playwright-report/**",
      "!src/app/components/ui/**",
      "!.astro/**",
      "!pnpm-lock.yaml"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "javascript": {
    "formatter": { "quoteStyle": "single", "semicolons": "always" }
  }
}
```

> 说明:`ui/` 被 ignore,遵守「不手改 shadcn 组件」约定;`recommended` 规则集保持轻量,不引入激进规则。

- [ ] **Step 3: 在 `package.json` 的 `scripts` 中加入 lint/format,并接入 `check`**

把 `scripts` 中的 `check` 改为同时跑 Biome,并新增两个脚本:

```json
    "check": "pnpm run lint && pnpm run check:content && pnpm run check:astro",
    "lint": "biome check .",
    "format": "biome format --write .",
```

- [ ] **Step 4: 先格式化全仓(一次性机械改动)**

Run: `pnpm run format`
Expected: Biome 重写若干文件格式(不含被 ignore 的 `ui/`)。

- [ ] **Step 5: 跑 Biome 检查,修掉报错**

Run: `pnpm run lint`
Expected: 最终 PASS(无 error)。若 `recommended` 规则报出少量 error,逐条修正;确实需要豁免的,在 `biome.json` 的 `linter.rules` 中将对应规则降为 `"off"` 或 `"warn"` 并在本步骤注明原因。目标是 `pnpm run lint` 干净通过,且不改变运行时行为。

- [ ] **Step 6: 跑完整 check + harness,确认未破坏构建与页面**

Run: `pnpm run check && pnpm run harness`
Expected: `check`(lint + content + astro)PASS;harness(smoke/visual/ui-audit)全绿。

- [ ] **Step 7: 提交(格式化改动与配置分开提交,便于回看)**

```bash
git add biome.json package.json pnpm-lock.yaml
git commit -m "build(lint): add Biome format/lint, wire into pnpm check (ignore shadcn ui/)"
git add -A
git commit -m "style: apply Biome formatting across repo"
```

---

## 自检(写完计划后的复核)

- **Spec 覆盖:** spec §4 四项交付物 → Task 1(DESIGN.md)/ Task 2(/elements)/ Task 3(CLAUDE.md)/ Task 4(Biome);spec §5 期 1–4 一一对应;期 5(目录重组)按 spec 明确不做,计划中不含。✅
- **成功标准:** §7.1 DESIGN.md 三档 → Task1;§7.2 /elements 双语 + harness → Task2;§7.3 CLAUDE.md → Task3;§7.4 Biome + check → Task4;§7.5 验收(AI 能引用三层)→ DESIGN.md「如何使用」节 + CLAUDE.md 流程。✅
- **占位符扫描:** 无 TBD/TODO;所有代码步骤含完整代码。✅
- **类型/命名一致:** dict key(`heading`/`intro`/`colors`/`typography`/`radius`/`components`/`motion`/`motionNote`)在 `elements.ts` 与 `ElementsContent.tsx` 中一致;页面 props(`locale`/`t`)与 island 接口一致;路由命名 `elements-zh`/`elements-en` 与 smoke 断言一致。✅
- **已知风险点:** Task2 Step1 先验证 `ui/` 导出名;Task4 Step5 预留 lint 报错的处理方式。✅
```

