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
