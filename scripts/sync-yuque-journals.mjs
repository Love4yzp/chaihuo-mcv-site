import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractAppData,
  extractCoverFromDocHtml,
  extractFirstImageFromDocContent,
  normalizeYuqueToc,
} from './lib/yuque-journal-sync.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const bookUrl = process.env.YUQUE_BOOK_URL ?? 'https://www.yuque.com/mouseart/mcv';
const outputPath = path.join(root, 'src/data/yuque-journals.json');
const imageDir = path.join(root, 'public/yuque-journals');
const userAgent =
  process.env.YUQUE_USER_AGENT ??
  'Mozilla/5.0 (compatible; ChaihuoMCVSiteSync/1.0; +https://www.chaihuo.org)';
const requestTimeoutMs = Number(process.env.YUQUE_SYNC_TIMEOUT_MS ?? 30_000);

async function main() {
  const bookHtml = await fetchText(bookUrl);
  const appData = extractAppData(bookHtml);
  const namespace = appData.book?.namespace ?? namespaceFromUrl(bookUrl);
  const bookId = appData.book?.id;
  const entries = normalizeYuqueToc(appData.book?.toc ?? [], { namespace });

  const withCovers = (
    await mapWithConcurrency(entries, 4, async (entry) => {
      const coverResult = entry.coverImage
        ? { available: true, coverImage: entry.coverImage }
        : await fetchCover(entry.href, entry.slug, bookId);
      if (!coverResult.available) return null;

      const remoteCover = coverResult.coverImage;
      return {
        ...entry,
        updatedAt:
          entry.updatedAt ?? appData.book?.content_updated_at ?? appData.book?.updated_at ?? null,
        coverImage: remoteCover ? await downloadCoverImage(remoteCover, entry.slug) : null,
      };
    })
  ).filter(Boolean);

  const payload = {
    source: {
      name: appData.book?.name ?? '柴火基地车车长日记',
      namespace,
      url: bookUrl,
      syncedAt: new Date().toISOString(),
      intervalMinutes: 10,
    },
    journals: withCovers,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  const wrote = await writeJsonIfMateriallyChanged(outputPath, payload);
  if (wrote) {
    console.log(
      `Synced ${withCovers.length} Yuque journal cards to ${path.relative(root, outputPath)}.`,
    );
  } else {
    console.log(`Yuque journal cards are already up to date (${withCovers.length} cards).`);
  }
}

async function fetchCover(url, slug, bookId) {
  try {
    const docHtml = await fetchText(url);
    const fallbackCover = extractCoverFromDocHtml(docHtml);
    if (!bookId) return { available: true, coverImage: fallbackCover };

    const docResponse = await fetchJson(docApiUrl(slug, bookId));
    return {
      available: true,
      coverImage:
        extractFirstImageFromDocContent(docResponse.data?.content) ??
        docResponse.data?.cover ??
        fallbackCover,
    };
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      console.warn(`Skipping inaccessible Yuque doc ${url}: ${error.status}`);
      return { available: false, coverImage: null };
    }
    console.warn(`Unable to fetch cover for ${url}: ${error.message}`);
    return { available: true, coverImage: null };
  }
}

async function downloadCoverImage(url, slug) {
  const fileName = `${slug}.jpg`;
  const filePath = path.join(imageDir, fileName);
  await mkdir(imageDir, { recursive: true });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const downloadUrl = coverDownloadUrl(url);
    const response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': userAgent,
        Referer: bookUrl,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      console.warn(`Unable to download cover ${url}: ${response.status} ${response.statusText}`);
      return url;
    }

    const nextImage = Buffer.from(await response.arrayBuffer());
    const existingImage = await readFile(filePath).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!existingImage?.equals(nextImage)) {
      await writeFile(filePath, nextImage);
    }
    return `/yuque-journals/${fileName}`;
  } catch (error) {
    console.warn(`Unable to download cover ${url}: ${error.message}`);
    return url;
  } finally {
    clearTimeout(timeout);
  }
}

function docApiUrl(slug, bookId) {
  const url = new URL(`/api/docs/${slug}`, bookUrl);
  url.searchParams.set('book_id', String(bookId));
  url.searchParams.set('merge_dynamic_data', 'false');
  return url.toString();
}

function coverDownloadUrl(url) {
  const parsed = new URL(url);
  if (parsed.hostname.endsWith('nlark.com') || parsed.hostname.endsWith('yuque.com')) {
    parsed.searchParams.set('x-oss-process', 'image/resize,w_960/quality,q_82/format,jpg');
  }
  return parsed.toString();
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`GET ${url} failed with ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }
    return response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
        Referer: bookUrl,
      },
      signal: controller.signal,
    });
    if (!response.ok) {
      const error = new Error(`GET ${url} failed with ${response.status} ${response.statusText}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = [];
  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    results.push(...(await Promise.all(batch.map(worker))));
  }
  return results;
}

async function writeJsonIfMateriallyChanged(filePath, payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  try {
    const existing = await readFile(filePath, 'utf8');
    const existingPayload = JSON.parse(existing);
    if (!hasMaterialChange(existingPayload, payload)) return false;
  } catch (error) {
    if (error.code !== 'ENOENT' && !(error instanceof SyntaxError)) throw error;
  }
  await writeFile(filePath, text, 'utf8');
  return true;
}

function hasMaterialChange(existingPayload, nextPayload) {
  const existingComparable = comparablePayload(existingPayload);
  const nextComparable = comparablePayload(nextPayload);
  return JSON.stringify(existingComparable) !== JSON.stringify(nextComparable);
}

function comparablePayload(payload) {
  return {
    source: {
      name: payload.source?.name ?? null,
      namespace: payload.source?.namespace ?? null,
      url: payload.source?.url ?? null,
      intervalMinutes: payload.source?.intervalMinutes ?? null,
    },
    journals: payload.journals ?? [],
  };
}

function namespaceFromUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname.replace(/^\/+|\/+$/g, '');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
