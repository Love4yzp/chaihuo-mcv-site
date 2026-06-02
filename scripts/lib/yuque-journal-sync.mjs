const YUQUE_ORIGIN = 'https://www.yuque.com';

const CITY_KEYWORDS = [
  ['chengdu', ['成都', 'C-SCHOOL', 'BOSA', '麓湖']],
  ['mianyang', ['绵阳']],
  ['yibin', ['宜宾']],
  ['hezhang', ['赫章']],
  ['guiyang', ['贵阳']],
  ['getuhe', ['格凸河']],
  ['haokunhu', ['浩坤湖']],
  ['qibainong', ['七百弄']],
  ['liuzhou-sandu', ['柳州', '三都']],
  ['guangxi-science-museum', ['广西科技馆']],
  ['yulin-science-museum', ['玉林科技馆']],
  ['yangjiang', ['阳江']],
  ['guangdong-science-center', ['广东科学中心']],
  ['lhasa', ['拉萨']],
  ['batang', ['巴塘']],
  ['yaan', ['雅安']],
  ['tagong', ['塔公']],
];

export function extractAppData(html) {
  const match = html.match(
    /window\.appData\s*=\s*JSON\.parse\(decodeURIComponent\("([\s\S]*?)"\)\)/,
  );
  if (!match) {
    throw new Error('Unable to find Yuque appData in page html.');
  }
  return JSON.parse(decodeURIComponent(match[1]));
}

export function parseJournalDate(title) {
  const match = title.match(/(20\d{2})[.-](\d{2})[.-](\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function inferCityId(title) {
  for (const [cityId, keywords] of CITY_KEYWORDS) {
    if (keywords.some((keyword) => title.includes(keyword))) return cityId;
  }
  return 'yuque';
}

export function normalizeYuqueToc(toc, { namespace }) {
  return toc
    .filter((entry) => entry.type === 'DOC' && entry.visible !== 0 && entry.url)
    .map((entry) => ({
      id: String(entry.doc_id ?? entry.id ?? entry.url),
      slug: entry.url,
      title: entry.title,
      date: parseJournalDate(entry.title),
      city: inferCityId(entry.title),
      href: `${YUQUE_ORIGIN}/${namespace}/${entry.url}`,
      updatedAt: entry.updated_at ?? entry.content_updated_at ?? null,
      coverImage: entry.cover ?? null,
    }));
}

export function extractCoverFromDocHtml(html) {
  const metaMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (metaMatch) return decodeHtmlEntities(metaMatch[1]);

  const appData = extractAppData(html);
  return appData.doc?.cover ?? null;
}

export function imageExtensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-z0-9]+)$/i);
  const ext = match?.[1]?.toLowerCase();
  if (ext === 'png' || ext === 'jpeg' || ext === 'jpg' || ext === 'webp') return ext;
  return 'jpg';
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}
