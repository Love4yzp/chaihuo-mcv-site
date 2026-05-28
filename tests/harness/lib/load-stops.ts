// Test-time MD loader. NODE-ONLY — do not import from src/ or runtime code.
// Site code uses getCollection('stops') in .astro pages; this helper exists so
// Playwright unit tests (which run outside Astro) can read the same source.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Stop } from '../../../src/features/route-map/stops-schema';

const STOPS_DIR = path.join(process.cwd(), 'src/content/stops');

export async function loadStops(): Promise<Stop[]> {
  const files = (await readdir(STOPS_DIR)).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_'),
  );
  const stops: Stop[] = [];
  for (const file of files) {
    const src = await readFile(path.join(STOPS_DIR, file), 'utf8');
    const match = src.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) throw new Error(`${file}: missing frontmatter`);
    stops.push(parseYaml(match[1]) as Stop);
  }
  return stops.sort((a, b) => a.order - b.order);
}
