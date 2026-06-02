import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  extractAppData,
  extractCoverFromDocHtml,
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
  const entries = normalizeYuqueToc(appData.book?.toc ?? [], { namespace });

  const withCovers = await mapWithConcurrency(entries, 4, async (entry) => {
    const remoteCover = entry.coverImage ?? (await fetchCover(entry.href));
    return {
      ...entry,
      updatedAt:
        entry.updatedAt ?? appData.book?.content_updated_at ?? appData.book?.updated_at ?? null,
      coverImage: remoteCover ? await downloadCoverImage(remoteCover, entry.slug) : null,
    };
  });

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
  await writeJsonIfChanged(outputPath, payload);
  console.log(
    `Synced ${withCovers.length} Yuque journal cards to ${path.relative(root, outputPath)}.`,
  );
}

async function fetchCover(url) {
  try {
    return extractCoverFromDocHtml(await fetchText(url));
  } catch (error) {
    console.warn(`Unable to fetch cover for ${url}: ${error.message}`);
    return null;
  }
}

async function downloadCoverImage(url, slug) {
  const fileName = `${slug}.jpg`;
  const filePath = path.join(imageDir, fileName);
  await mkdir(imageDir, { recursive: true });
  if (await fileExists(filePath)) return `/yuque-journals/${fileName}`;

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

    await writeFile(filePath, Buffer.from(await response.arrayBuffer()), 'binary');
    return `/yuque-journals/${fileName}`;
  } catch (error) {
    console.warn(`Unable to download cover ${url}: ${error.message}`);
    return url;
  } finally {
    clearTimeout(timeout);
  }
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
      throw new Error(`GET ${url} failed with ${response.status} ${response.statusText}`);
    }
    return response.text();
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

async function writeJsonIfChanged(filePath, payload) {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  try {
    const existing = await readFile(filePath, 'utf8');
    if (existing === text) return;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  await writeFile(filePath, text, 'utf8');
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function namespaceFromUrl(url) {
  const parsed = new URL(url);
  return parsed.pathname.replace(/^\/+|\/+$/g, '');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
