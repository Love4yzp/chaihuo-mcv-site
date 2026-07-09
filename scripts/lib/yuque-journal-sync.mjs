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
  const separatedMatch = title.match(/(20\d{2})[.-](\d{2})[.-](\d{2})/);
  if (separatedMatch) {
    return `${separatedMatch[1]}-${separatedMatch[2]}-${separatedMatch[3]}`;
  }

  const compactMatch = title.match(/(20\d{2})[.-](\d{2})(\d{2})/);
  if (!compactMatch) return null;
  return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
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
    }))
    .sort(compareJournalEntries);
}

export function extractCoverFromDocHtml(html) {
  const metaMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (metaMatch) return decodeHtmlEntities(metaMatch[1]);

  const appData = extractAppData(html);
  return appData.doc?.cover ?? null;
}

export function extractFirstImageFromDocContent(content) {
  if (!content) return null;

  const inlineImage = extractImageCard(content, 'image');
  if (inlineImage) return inlineImage;

  return extractImageCard(content, 'board');
}

function extractImageCard(content, cardName) {
  const cardPattern = new RegExp(
    `<card\\b(?=[^>]*\\bname=["']${cardName}["'])[^>]*\\bvalue=["']([^"']+)["'][^>]*>`,
    'gi',
  );

  for (const match of content.matchAll(cardPattern)) {
    try {
      const encodedValue = decodeHtmlEntities(match[1]).replace(/^data:/, '');
      const cardData = JSON.parse(decodeURIComponent(encodedValue));
      if (cardName === 'image' && cardData.src) return cardData.src;

      const boardImage = cardData.diagramData?.body?.find(
        (item) => item.type === 'image' && item.image?.src,
      );
      if (boardImage) return boardImage.image.src;
    } catch {
      // Continue to the next media card when one card has malformed data.
    }
  }

  return null;
}

export function imageExtensionFromUrl(url) {
  const pathname = new URL(url).pathname;
  const match = pathname.match(/\.([a-z0-9]+)$/i);
  const ext = match?.[1]?.toLowerCase();
  if (ext === 'png' || ext === 'jpeg' || ext === 'jpg' || ext === 'webp') return ext;
  return 'jpg';
}

function compareJournalEntries(left, right) {
  const leftTime = timestampForSort(left);
  const rightTime = timestampForSort(right);
  return rightTime - leftTime;
}

function timestampForSort(entry) {
  const value = entry.date ?? entry.updatedAt ?? '';
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function decodeHtmlEntities(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}
