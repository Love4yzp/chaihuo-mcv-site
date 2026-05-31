export interface RouteCityEvent {
  date: string;
  summary: string;
  summary_en?: string;
  link?: string;
  linkLabel?: string;
  linkLabel_en?: string;
  localSlug?: string;
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
// 行程随科技馆/在地社区动态调整；当前已抵达拉萨（川藏段 2026.05 完成），
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
      localSlug: 'village-teacher-interview',
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
    },
  },
  {
    label: '阳江', label_en: 'Yangjiang',
    lng: 111.983, lat: 21.858, visited: true, order: 2,
    event: {
      date: '2026.04.26',
      summary: '在阳江科技馆举办展览。',
      summary_en: 'Exhibition at the Yangjiang Science Museum.',
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
  // ── 黔中段（贵阳·毕节） ──
  {
    label: '贵阳', label_en: 'Guiyang',
    lng: 106.713, lat: 26.578, visited: true, order: 6, anchor: true,
    event: {
      date: '2026.05.05–07',
      summary: '5日与当地创客面对面，聊科创教育的一线观察；6日下午走进贵阳市第八中学，开展展示与工作坊；7日赴贵州师范学院与贵州大学展示与工作坊。',
      summary_en: 'May 5: candid exchange with local makers on STEM education. May 6: exhibition and workshop at Guiyang No.8 Middle School. May 7: exhibition and workshop at Guizhou Normal University, then drove through the mountains to Bijie.',
    },
  },
  {
    label: '毕节', label_en: 'Bijie',
    lng: 105.285, lat: 27.302, visited: true, order: 7, anchor: true,
    event: {
      date: '2026.05.08',
      summary: '走近创客默，与他近距离交流学习，深入访谈，记录一位在地创客的实践路径与生长故事。',
      summary_en: 'Up-close exchange and in-depth interviews with maker Mo — learning from his practice, documenting his story as a local creator, with on-location filming.',
    },
  },
  // ── 川藏段（成都→拉萨，2026.05） ──
  {
    label: '成都', label_en: 'Chengdu',
    lng: 104.066, lat: 30.572, visited: true, order: 8, anchor: true,
    event: {
      date: '2026.05.17–05.22',
      summary: '以成都为大本营：四川科技馆展览，往返江油·老河沟驿站、清溪镇唐家河、绵阳等地开展自然与科创探访；22 日基地车回成都柴火完成首保。',
      summary_en: 'Using Chengdu as base camp: exhibition at the Sichuan Science & Technology Museum, with round trips to Jiangyou & Laohegou Station, Qingxi Town\'s Tangjiahe, and Mianyang for nature and STEM visits; on the 22nd the vehicle returned to Chaihuo Chengdu for its first maintenance service.',
    },
  },
  {
    label: '雅安', label_en: "Ya'an",
    lng: 103.001, lat: 29.987, visited: true, order: 9, anchor: true,
    event: {
      date: '2026.05.23–05.24',
      summary: '成都驶往雅安，途中偶遇王老师；探访熊猫基地，走进上里古镇，记录川西门户的在地风物。',
      summary_en: "Drove from Chengdu to Ya'an, an unexpected reunion with Teacher Wang along the way; visited the panda base and the ancient town of Shangli, documenting the gateway to western Sichuan.",
    },
  },
  {
    label: '塔公镇', label_en: 'Tagong',
    lng: 101.520, lat: 30.321, visited: true, order: 10, anchor: true,
    event: {
      date: '2026.05.25–05.26',
      summary: '从雅安中学一路向西上高原，在塔公镇邂逅日照金山；走进多吉家，在草原上完成牦牛场景的设备测试。',
      summary_en: "Headed west onto the plateau from Ya'an Middle School, catching the golden sunrise on the snow peaks at Tagong; visited Dorje's home and ran equipment field tests with yaks on the grassland.",
    },
  },
  {
    label: '理塘', label_en: 'Litang',
    lng: 100.270, lat: 29.997, visited: true, order: 11,
    event: {
      date: '2026.05.27',
      summary: '翻越雅江抵达「天空之城」理塘，再沿 318 国道前往巴塘。',
      summary_en: 'Crossed Yajiang to reach Litang, the "city in the sky," then continued along National Highway 318 toward Batang.',
    },
  },
  {
    label: '巴塘', label_en: 'Batang',
    lng: 99.104, lat: 30.005, visited: true, order: 12, anchor: true,
    event: {
      date: '2026.05.28',
      summary: '从巴塘正式入藏，途经芒康、如美与东达山，翻山进入西藏地界。',
      summary_en: 'Officially entered Tibet from Batang, passing through Markam, Rumei and the Dongda Mountain pass.',
    },
  },
  {
    label: '左贡', label_en: 'Zuogong',
    lng: 97.842, lat: 29.670, visited: true, order: 13,
    event: {
      date: '2026.05.29',
      summary: '左贡经邦达镇，挑战怒江 72 道拐天险，穿越横断山深处。',
      summary_en: 'From Zuogong via Bangda, tackled the dramatic 72 switchbacks above the Nu River, threading deep through the Hengduan Mountains.',
    },
  },
  {
    label: '波密', label_en: 'Bomi',
    lng: 95.768, lat: 29.859, visited: true, order: 14,
    event: {
      date: '2026.05.30',
      summary: '抵达「藏地小江南」波密县，途中穿过鲁朗林海，向林芝、拉萨方向进发。',
      summary_en: 'Reached Bomi County, the green heart of Tibet, crossing the Lulang forests en route toward Nyingchi and Lhasa.',
    },
  },
  {
    label: '林芝', label_en: 'Nyingchi',
    lng: 94.362, lat: 29.649, visited: true, order: 15,
    event: {
      date: '2026.05.30',
      summary: '途经林芝，沿尼洋河谷向拉萨方向行进。',
      summary_en: 'Passed through Nyingchi, following the Niyang River valley onward to Lhasa.',
    },
  },
  {
    label: '拉萨', label_en: 'Lhasa',
    lng: 91.140, lat: 29.645, visited: true, order: 16, anchor: true,
    event: {
      date: '2026.05.30–05.31',
      summary: '抵达拉萨；以布达拉宫为背景完成一场高原上的人物采访，为川藏段旅程留下注脚。',
      summary_en: 'Arrived in Lhasa; filmed an interview against the backdrop of the Potala Palace, a fitting coda to the Sichuan–Tibet leg of the journey.',
      link: 'https://www.yuque.com/chaihuo-mcv/home',
      linkLabel: '查看拉萨日记',
      linkLabel_en: 'Read Lhasa log',
    },
  },
];
