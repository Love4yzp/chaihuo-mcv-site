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
  labelOffset?: [number, number]; // [dx, dy] for label positioning
  /** Show label by default. Set true on a few key planned cities so the
   *  map narrative still has anchors (e.g. 喀什/敦煌/林芝). All visited
   *  cities are labeled regardless. */
  anchor?: boolean;
  event?: RouteCityEvent;
}

// 实际路线：21省 26城，深圳出发→深圳返回
// 行程随科技馆/在地社区动态调整，沿途城市与原计划大致一致
// order 字段表示行程顺序，visited 控制进度
export const routeCities: RouteCity[] = [
  // ── 出发点：深圳（2026.04.22 启程） ──
  {
    label: '深圳', label_en: 'Shenzhen',
    lng: 114.057, lat: 22.543, visited: true, isOrigin: true, order: 0, labelOffset: [12, 16],
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
    lng: 113.264, lat: 23.130, visited: true, order: 1, labelOffset: [10, -10],
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
    lng: 111.983, lat: 21.858, visited: true, order: 2, labelOffset: [-32, 16],
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
    lng: 110.181, lat: 22.654, visited: true, order: 3, labelOffset: [10, 14],
    event: {
      date: '2026.04.27',
      summary: '在玉林科技馆开展路展，并联合举办 AI 硬件工作坊。',
      summary_en: 'Road show at the Yulin Science & Technology Museum with a companion AI hardware workshop.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '阅读现场记录',
      linkLabel_en: 'Read field notes',
    },
  },
  {
    label: '南宁', label_en: 'Nanning',
    lng: 108.366, lat: 22.817, visited: true, order: 4, anchor: true, labelOffset: [-32, 14],
    event: {
      date: '2026.04.28',
      summary: '在广西科技馆向教师展示车内 AI 交互硬件与机械臂，下午举办 AI 硬件工作坊。',
      summary_en: 'At the Guangxi Science & Technology Museum, demonstrated the on-board AI interactive hardware and robotic arm to teachers, followed by an AI hardware workshop in the afternoon.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '阅读现场记录',
      linkLabel_en: 'Read field notes',
    },
  },
  {
    label: '柳州', label_en: 'Liuzhou',
    lng: 109.412, lat: 24.327, visited: true, order: 5, anchor: true, labelOffset: [-30, -6],
    event: {
      date: '2026.04.30',
      summary: '走进柳州·三都镇的农业养殖种植基地，与新农人面对面，开展技术行业交流。',
      summary_en: 'Visit to the agricultural & aquaculture base in Sandu Town, Liuzhou — exchanging notes with new-generation farmers and the local tech community.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '阅读现场记录',
      linkLabel_en: 'Read field notes',
    },
  },
  // ── 计划路线 ──
  // anchor: 标注少数地理/叙事地标，给地图留参照点；其余 dot only + hover tooltip
  { label: '肇兴', label_en: 'Zhaoxing', lng: 109.116, lat: 25.863, visited: false, order: 6, labelOffset: [-32, -6] },
  { label: '酉阳', label_en: 'Youyang', lng: 108.770, lat: 28.840, visited: false, order: 7, labelOffset: [-30, -6] },
  { label: '雅安', label_en: 'Ya’an', lng: 103.001, lat: 29.988, visited: false, order: 8, labelOffset: [-30, -6] },
  { label: '康定', label_en: 'Kangding', lng: 101.957, lat: 30.050, visited: false, order: 9, anchor: true, labelOffset: [-34, 14] },
  { label: '林芝', label_en: 'Nyingchi', lng: 94.362, lat: 29.649, visited: false, order: 10, anchor: true, labelOffset: [-26, -8] },
  { label: '喀什', label_en: 'Kashgar', lng: 75.990, lat: 39.468, visited: false, order: 11, anchor: true, labelOffset: [-25, -8] },
  { label: '敦煌', label_en: 'Dunhuang', lng: 94.662, lat: 40.142, visited: false, order: 12, anchor: true, labelOffset: [10, -6] },
  { label: '中卫', label_en: 'Zhongwei', lng: 105.190, lat: 37.500, visited: false, order: 13, labelOffset: [-30, -6] },
  { label: '榆林', label_en: 'Yulin (NS)', lng: 109.734, lat: 38.285, visited: false, order: 14, labelOffset: [10, -6] },
  { label: '鄂尔多斯', label_en: 'Ordos', lng: 109.781, lat: 39.608, visited: false, order: 15, labelOffset: [-50, -8] },
  { label: '大庆', label_en: 'Daqing', lng: 125.104, lat: 46.589, visited: false, order: 16, anchor: true, labelOffset: [10, -6] },
  { label: '济宁', label_en: 'Jining', lng: 116.587, lat: 35.415, visited: false, order: 17, labelOffset: [10, -6] },
  { label: '沧州', label_en: 'Cangzhou', lng: 116.838, lat: 38.304, visited: false, order: 18, labelOffset: [10, -6] },
  { label: '太原', label_en: 'Taiyuan', lng: 112.549, lat: 37.870, visited: false, order: 19, labelOffset: [-30, -6] },
  { label: '淮南', label_en: 'Huainan', lng: 116.999, lat: 32.626, visited: false, order: 20, labelOffset: [10, -6] },
  { label: '扬州', label_en: 'Yangzhou', lng: 119.413, lat: 32.394, visited: false, order: 21, labelOffset: [10, -6] },
  { label: '崇明', label_en: 'Chongming', lng: 121.397, lat: 31.623, visited: false, order: 22, labelOffset: [10, 14] },
  { label: '杭州', label_en: 'Hangzhou', lng: 120.154, lat: 30.288, visited: false, order: 23, anchor: true, labelOffset: [10, 14] },
  { label: '襄阳', label_en: 'Xiangyang', lng: 112.144, lat: 32.042, visited: false, order: 24, labelOffset: [-30, -6] },
  { label: '凤凰', label_en: 'Fenghuang', lng: 109.600, lat: 27.948, visited: false, order: 25, labelOffset: [-30, 14] },
];
