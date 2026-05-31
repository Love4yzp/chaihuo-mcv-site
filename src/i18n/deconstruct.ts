import type { Locale } from './index';

const deconstruct: Record<Locale, Record<string, string>> = {
  zh: {
    title: '解构基地车',
    description:
      '深入了解普罗米修斯号——基于吉利远程超级VAN打造的移动 AI 实验室、改装手记与装备清单。',
    'hero.subtitle': 'Chaihuo Base Vehicle',
    'hero.title': '普罗米修斯号',
    'hero.body': '一台为荒野而生的移动AI实验室，从底盘到算力，每一处都为极限场景而设计。',

    'specs.range': '纯电续航',
    'specs.height': '车内净高',
    'specs.v2l': '外放电',
    'specs.safety': '安全认证',

    'notes.title': '改装手记',
    'notes.subtitle': '从图纸到荒野的每一步',
    'notes.viewAll': '前往语雀查看全部',
    'notes.viewAllMobile': '前往语雀查看全部手记',

    'equipment.title': '装备清单',
    'equipment.subtitle': '荒野生存的全部家当',

    'companion.eyebrow': 'AI 伙伴',
    'companion.title': '车上的具身智能',

    'cta.title': '想亲身体验普罗米修斯号？',
    'cta.body': '从跟车同行到在地合作，多种方式等你参与',
    'cta.button': '查看上车指南',
  },
  en: {
    title: 'Deconstruct',
    description:
      'Discover Prometheus — a mobile AI lab built on the Geely Van, with modification logs and equipment list.',
    'hero.subtitle': 'Chaihuo Base Vehicle',
    'hero.title': 'Prometheus',
    'hero.body':
      'A mobile AI lab born for the wilderness — every component, from chassis to computing power, is designed for extreme environments.',

    'specs.range': 'EV Range',
    'specs.height': 'Interior Height',
    'specs.v2l': 'V2L Output',
    'specs.safety': 'Safety Rating',

    'notes.title': 'Modification Log',
    'notes.subtitle': 'Every step from blueprint to wilderness',
    'notes.viewAll': 'View all on Yuque',
    'notes.viewAllMobile': 'View all logs on Yuque',

    'equipment.title': 'Equipment List',
    'equipment.subtitle': 'Everything for off-grid survival',

    'companion.eyebrow': 'AI Companion',
    'companion.title': 'Embodied Intelligence Onboard',

    'cta.title': 'Want to experience Prometheus in person?',
    'cta.body': 'From riding along to local partnerships — many ways to participate',
    'cta.button': 'See How to Join',
  },
};

export default deconstruct;
