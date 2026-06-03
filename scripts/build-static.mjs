import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const DIST_DIR = 'dist';

await rm(DIST_DIR, { recursive: true, force: true });
await mkdir(DIST_DIR, { recursive: true });
await cp('public', DIST_DIR, { recursive: true });
await cp('index.html', join(DIST_DIR, 'index.html'));
await writeFile(join(DIST_DIR, '404.html'), await import('node:fs/promises').then((fs) => fs.readFile('index.html')));

console.log('Built static site into dist/');
