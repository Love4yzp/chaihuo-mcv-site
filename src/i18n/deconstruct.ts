import type { Locale } from './index';

const deconstruct: Record<Locale, Record<string, string>> = {
  zh: {
    'title': '解构基地车',
    'description': '深入了解普罗米修斯号——基于吉利远程超级VAN打造的移动 AI 实验室，改装手记、装备清单与 3D 爆炸视图。',
    'hero.subtitle': 'Chaihuo Base Vehicle',
    'hero.title': '普罗米修斯号',
    'hero.body': '一台为荒野而生的移动AI实验室，从底盘到算力，每一处都为极限场景而设计。',

    'specs.range': '纯电续航',
    'specs.height': '车内净高',
    'specs.v2l': '外放电',
    'specs.safety': '安全认证',

    'loading3d': '加载 3D 模型中...',

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

    // ─── 3D Exploded View Translations ───
    '3d.assemble': '组装复原',
    '3d.explode': '爆炸拆解',
    '3d.tip': '拖拽旋转 · 滚轮缩放 · 点击查看',
    'part.chassis.name': '车身底盘',
    'part.chassis.desc': '加固型越野底盘 · 承载 2.5T',
    'part.body.name': '车厢主体',
    'part.body.desc': '铝合金框架 · 保温隔热层',
    'part.solar.name': '太阳能板组',
    'part.solar.desc': '2×800W 可折叠 · JA Solar',
    'part.server.name': 'AI 服务器',
    'part.server.desc': '4×L40 GPU · 80GB VRAM',
    'part.battery.name': '储能电池组',
    'part.battery.desc': 'LiFePO₄ 2000Ah · 磷酸铁锂',
    'part.printer.name': '3D 打印机',
    'part.printer.desc': 'Bambu Lab X1C · 多色打印',
    'part.antenna.name': '卫星天线',
    'part.antenna.desc': 'Starlink Gen 3 · 低轨卫星',
    'part.wheels.name': '越野轮组',
    'part.wheels.desc': 'BFGoodrich AT · 33 inch',
  },
  en: {
    'title': 'Deconstruct',
    'description': 'Discover Prometheus — a mobile AI lab built on the Geely Van, with modification logs, equipment list, and 3D exploded view.',
    'hero.subtitle': 'Chaihuo Base Vehicle',
    'hero.title': 'Prometheus',
    'hero.body': 'A mobile AI lab born for the wilderness — every component, from chassis to computing power, is designed for extreme environments.',

    'specs.range': 'EV Range',
    'specs.height': 'Interior Height',
    'specs.v2l': 'V2L Output',
    'specs.safety': 'Safety Rating',

    'loading3d': 'Loading 3D model...',

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

    // ─── 3D Exploded View Translations ───
    '3d.assemble': 'Assemble',
    '3d.explode': 'Explode',
    '3d.tip': 'Drag to Rotate · Scroll to Zoom · Click to Inspect',
    'part.chassis.name': 'Chassis',
    'part.chassis.desc': 'Reinforced off-road chassis · 2.5T payload',
    'part.body.name': 'Cabin Body',
    'part.body.desc': 'Aluminum framework · Insulated cabin walls',
    'part.solar.name': 'Solar Panel Array',
    'part.solar.desc': '2×800W folding panels · JA Solar',
    'part.server.name': 'AI Server',
    'part.server.desc': '4×L40 GPUs · 80GB VRAM',
    'part.battery.name': 'Battery Pack',
    'part.battery.desc': 'LiFePO₄ 2000Ah · Lithium Iron Phosphate',
    'part.printer.name': '3D Printer',
    'part.printer.desc': 'Bambu Lab X1C · Multi-color print',
    'part.antenna.name': 'Satellite Antenna',
    'part.antenna.desc': 'Starlink Gen 3 · LEO satellite',
    'part.wheels.name': 'Off-road Wheels',
    'part.wheels.desc': 'BFGoodrich AT · 33-inch tires',
  },
};

export default deconstruct;
