import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractAppData,
  extractCoverFromDocHtml,
  imageExtensionFromUrl,
  normalizeYuqueToc,
  parseJournalDate,
} from './lib/yuque-journal-sync.mjs';

describe('yuque journal sync helpers', () => {
  it('extracts decoded appData from a Yuque page shell', () => {
    const payload = encodeURIComponent(JSON.stringify({ book: { namespace: 'mouseart/mcv' } }));
    const html = `<script>window.appData = JSON.parse(decodeURIComponent("${payload}"));</script>`;

    assert.deepEqual(extractAppData(html), { book: { namespace: 'mouseart/mcv' } });
  });

  it('normalizes visible doc toc entries into external journal cards', () => {
    const toc = [
      {
        type: 'DOC',
        visible: 1,
        title: '基地车日记｜2026.05.16｜成都社区走访：搭伙儿、C-SCHOOL 与麓湖社群之家',
        url: 'ggdgbhe1x7mdacpr',
        doc_id: 270805308,
      },
      {
        type: 'TITLE',
        visible: 1,
        title: '目录分组',
        url: 'skip-me',
      },
      {
        type: 'DOC',
        visible: 0,
        title: '隐藏文档',
        url: 'hidden',
      },
    ];

    assert.deepEqual(normalizeYuqueToc(toc, { namespace: 'mouseart/mcv' }), [
      {
        id: '270805308',
        slug: 'ggdgbhe1x7mdacpr',
        title: '基地车日记｜2026.05.16｜成都社区走访：搭伙儿、C-SCHOOL 与麓湖社群之家',
        date: '2026-05-16',
        city: 'chengdu',
        href: 'https://www.yuque.com/mouseart/mcv/ggdgbhe1x7mdacpr',
        updatedAt: null,
        coverImage: null,
      },
    ]);
  });

  it('parses the first date in a Yuque journal title', () => {
    assert.equal(parseJournalDate('基地车日记｜2026.05.11-12｜绵阳骆驼房车'), '2026-05-11');
    assert.equal(parseJournalDate('没有日期'), null);
  });

  it('extracts the Yuque document cover from doc detail html', () => {
    const html = '<meta property="og:image" content="https://cdn.nlark.com/cover.png">';

    assert.equal(extractCoverFromDocHtml(html), 'https://cdn.nlark.com/cover.png');
  });

  it('detects image file extensions from Yuque cover urls', () => {
    assert.equal(
      imageExtensionFromUrl('https://cdn.nlark.com/a/b/photo.jpeg?x-oss-process=image'),
      'jpeg',
    );
    assert.equal(imageExtensionFromUrl('https://cdn.nlark.com/a/b/cover.png'), 'png');
    assert.equal(imageExtensionFromUrl('https://cdn.nlark.com/a/b/no-extension'), 'jpg');
  });
});
