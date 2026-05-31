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
    motionNote:
      '页面切换:250ms 淡出 / 350ms 淡入 + 上滑;缓动 cubic-bezier(0.4, 0, 0.2, 1);尊重 reduced-motion。',
  },
  en: {
    title: 'Design System Reference',
    description: 'Color, typography, component and motion reference for the Chaihuo MCV site.',
    heading: 'Design System Reference',
    intro:
      'This page lays out the site design tokens so the whole visual system can be checked at a glance.',
    colors: 'Colors',
    typography: 'Typography',
    radius: 'Radius',
    components: 'Components',
    motion: 'Motion',
    motionNote:
      'Page transitions: 250ms fade-out / 350ms fade-in + slide-up; easing cubic-bezier(0.4, 0, 0.2, 1); respects reduced-motion.',
  },
};

export default elements;
