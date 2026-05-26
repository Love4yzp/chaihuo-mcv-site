import type { Locale } from './index';

const journals: Record<Locale, Record<string, string>> = {
  zh: {
    'title': '旅途日记',
    'description': '柴火基地车的旅途日记 — 城市、人物、设备，从每一站的真实记录长出来。',
    'hero.subtitle': 'Journals',
    'hero.title': '旅途日记',
    'hero.body': '一站一篇，记录路上真实发生的事',

    'filter.all': '全部',
    'filter.published': '已发布',
    'filter.placeholder': '整理中',

    'card.placeholder.label': '整理中',
    'card.read': '阅读全文',
    'card.yuque': '查看语雀原稿',

    'empty.title': '该筛选下暂无日记',
    'empty.subtitle': '更多日记随旅程持续更新',

    'meta.city': '城市',
    'meta.date': '日期',
    'meta.activities': '现场活动',

    'back': '返回旅途日记',
  },
  en: {
    'title': 'Travel Journals',
    'description': 'Travel journals from the Chaihuo MCV — cities, people, equipment, grown from the real record of each stop.',
    'hero.subtitle': 'Journals',
    'hero.title': 'Travel Journals',
    'hero.body': 'One entry per stop, documenting what actually happened on the road',

    'filter.all': 'All',
    'filter.published': 'Published',
    'filter.placeholder': 'In progress',

    'card.placeholder.label': 'In progress',
    'card.read': 'Read more',
    'card.yuque': 'View original on Yuque',

    'empty.title': 'No journals match this filter',
    'empty.subtitle': 'More journals as the expedition continues',

    'meta.city': 'City',
    'meta.date': 'Date',
    'meta.activities': 'On-site activities',

    'back': 'Back to Journals',
  },
};

export default journals;
