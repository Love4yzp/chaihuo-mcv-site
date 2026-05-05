export interface RouteCityEvent {
  date: string;
  summary: string;
  summary_en?: string;
  link?: string;
  linkLabel?: string;
  linkLabel_en?: string;
}

export interface RouteCity {
  label: string;
  label_en?: string;
  lng: number;
  lat: number;
  visited: boolean;
  isOrigin?: boolean;
  order: number;
  /** Show label by default. Set true on key planned cities so the map
   *  narrative still has forward-looking anchors (e.g. 下一站). All visited
   *  cities are labeled regardless. */
  anchor?: boolean;
  event?: RouteCityEvent;
}

// 实际路线：21省 26城，深圳出发→深圳返回
// 行程随科技馆/在地社区动态调整；当前仅展示已抵达城市 + 下一站，
// 后续路线在临近时再追加，避免地图上出现尚未确认的占位点。
// order 字段表示行程顺序，visited 控制进度
export const routeCities: RouteCity[] = [
  // ── 出发点：深圳（2026.04.22 启程） ──
  {
    label: '深圳', label_en: 'Shenzhen',
    lng: 114.057, lat: 22.543, visited: true, isOrigin: true, order: 0,
    event: {
      date: '2026.04.22',
      summary: '「普罗米修斯号」联合「深圳科技馆」首发，从柴火创客空间正式启程，开启 200 天 21 省穿越。',
      summary_en: 'Prometheus made its debut in partnership with the Shenzhen Science & Technology Museum and officially departed from Chaihuo Makerspace, beginning a 200-day journey across 21 provinces.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '查看出发记',
      linkLabel_en: 'Read departure log',
    },
  },
  // ── 已到达 ──
  {
    label: '广州', label_en: 'Guangzhou',
    lng: 113.264, lat: 23.130, visited: true, order: 1,
    event: {
      date: '2026.04.24 / 04.25',
      summary: '在广州科技中心举办展览；25 日延伸开展一场 AI 硬件编程工作坊。',
      summary_en: 'Exhibition at the Guangzhou Science Center; an AI hardware programming workshop followed on the 25th.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '阅读现场记录',
      linkLabel_en: 'Read field notes',
    },
  },
  {
    label: '阳江', label_en: 'Yangjiang',
    lng: 111.983, lat: 21.858, visited: true, order: 2,
    event: {
      date: '2026.04.26',
      summary: '在阳江科技馆举办展览。',
      summary_en: 'Exhibition at the Yangjiang Science Museum.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '阅读现场记录',
      linkLabel_en: 'Read field notes',
    },
  },
  {
    label: '玉林', label_en: 'Yulin',
    lng: 110.181, lat: 22.654, visited: true, order: 3,
    event: {
      date: '2026.04.28',
      summary: '在玉林科技馆开展路展、AI 硬件工作坊，并走进玉东新区第三小学开展科普活动。',
      summary_en: 'Road show and AI hardware workshop at the Yulin Science & Technology Museum, plus a science outreach session at Yudong District No.3 Primary School.',
      link: 'https://www.yuque.com/mouseart/gu0t4w/ktc4kr4o0w4auwiy?singleDoc',
      linkLabel: '阅读领队日记',
      linkLabel_en: "Read leader's diary",
    },
  },
  {
    label: '南宁', label_en: 'Nanning',
    lng: 108.366, lat: 22.817, visited: true, order: 4, anchor: true,
    event: {
      date: '2026.04.29',
      summary: '在广西科技馆向教师展示车内 AI 交互硬件与机械臂，下午举办 AI 硬件工作坊。',
      summary_en: 'At the Guangxi Science & Technology Museum, demonstrated the on-board AI interactive hardware and robotic arm to teachers, followed by an AI hardware workshop in the afternoon.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '阅读现场记录',
      linkLabel_en: 'Read field notes',
    },
  },
  {
    label: '柳州', label_en: 'Liuzhou',
    lng: 109.412, lat: 24.327, visited: true, order: 5, anchor: true,
    event: {
      date: '2026.04.30',
      summary: '走进柳州·三都镇的农业养殖种植基地，与新农人面对面，开展技术行业交流。',
      summary_en: 'Visit to the agricultural & aquaculture base in Sandu Town, Liuzhou — exchanging notes with new-generation farmers and the local tech community.',
      link: 'https://www.yuque.com/mouseart/gu0t4w/gzlp7usk115m7dns?singleDoc',
      linkLabel: '阅读领队日记',
      linkLabel_en: "Read leader's diary",
    },
  },
  // ── 计划中（临近确认） ──
  // 仅展示临近确认的下一段行程；anchor: true 让地图保留前向参照点。
  // event.date 让地图 hover tooltip 能显示计划日期。
  {
    label: '贵阳', label_en: 'Guiyang',
    lng: 106.713, lat: 26.578, visited: true, order: 6, anchor: true,
    event: {
      date: '2026.05.05',
      summary: '走进贵阳，与两位当地创客面对面，畅聊科创教育的一线观察与实践路径。',
      summary_en: 'In Guiyang, sat down with two local makers for a candid exchange on STEM education — from on-the-ground observations to the paths they are forging.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '阅读现场记录',
      linkLabel_en: 'Read field notes',
    },
  },
  {
    label: '成都', label_en: 'Chengdu',
    lng: 104.066, lat: 30.572, visited: false, order: 7, anchor: true,
    event: {
      date: '2026.05.10',
      summary: '计划停靠成都；现场行程随当地科技馆与社区合作伙伴最终确认后更新。',
      summary_en: 'Planned stop in Chengdu; on-site activities will be confirmed with local science museums and community partners.',
    },
  },
];
