import type { Locale } from './index';

const ui: Record<Locale, Record<string, string>> = {
  zh: {
    // Site
    'site.name': '柴火基地车',
    'site.description':
      '柴火基地车 — 一台即将穿越中国的移动 AI 实验室，深入山野与乡土，用技术连接每一个角落。',

    // Navigation
    'nav.home': '首页',
    'nav.journals': '旅途日记',
    'nav.route': '行程路线',
    'nav.deconstruct': '解构基地车',
    'nav.guide': '上车指南',
    'nav.about': '关于柴火',
    'nav.openMenu': '打开菜单',
    'nav.closeMenu': '关闭菜单',
    'nav.switchLang': '切换语言',

    // Footer
    'footer.description':
      '柴火基地车是一项连接数字与现实的开源创新项目，旨在通过移动平台将科技的人文关怀带向深处。',
    'footer.followUs': '关注我们的社交媒体，获取最新动态',
    'footer.projectLinks': '项目入口',
    'footer.contact': '联系我们',
    'footer.social': '社交渠道',
    'footer.addressSZ': '深圳市南山区打石二路万科云设计公社B622',
    'footer.addressCD': '成都市青羊区狮马路92号',
    'footer.xiaohongshu': '小红书 @MobileAILab',
    'footer.wechat': '微信公众号',
    'footer.github': 'GitHub',
    'footer.copyright': '© 2026 柴火创客空间 Chaihuo Maker Space. 保留所有权利.',
    'footer.license': '本项目遵循开源协议 MIT License',
  },
  en: {
    'site.name': 'Chaihuo MCV',
    'site.description':
      'Chaihuo MCV — A mobile AI laboratory traversing China, bringing technology to every corner of the land.',

    'nav.home': 'Home',
    'nav.journals': 'Journals',
    'nav.route': 'Route',
    'nav.deconstruct': 'Deconstruct',
    'nav.guide': 'Get Involved',
    'nav.about': 'About',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',
    'nav.switchLang': 'Switch language',

    'footer.description':
      'Chaihuo MCV is an open-source innovation project bridging digital and physical worlds, bringing the humanistic power of technology to those who need it most.',
    'footer.followUs': 'Follow us on social media for the latest updates',
    'footer.projectLinks': 'Explore',
    'footer.contact': 'Contact',
    'footer.social': 'Social',
    'footer.addressSZ': 'B622, Vanke Design Commune, Nanshan, Shenzhen',
    'footer.addressCD': '92 Shima Road, Qingyang, Chengdu',
    'footer.xiaohongshu': 'Xiaohongshu @MobileAILab',
    'footer.wechat': 'WeChat',
    'footer.github': 'GitHub',
    'footer.copyright': '© 2026 Chaihuo Maker Space. All rights reserved.',
    'footer.license': 'This project is licensed under the MIT License',
  },
};

export default ui;
