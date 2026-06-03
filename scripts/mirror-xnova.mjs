import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const ORIGIN = 'https://xnova.online';
const ENTRY_PATH = '/home';
const PUBLIC_DIR = 'public';
const ASSETS_DIR = join(PUBLIC_DIR, 'assets');

const NEMOTOKEN_CONFIG = {
  site_name: 'NemoToken',
  site_subtitle: '统一接入主流 AI 模型',
  api_base_url: 'https://api.nemotoken.online',
  contact_info: '',
  doc_url: 'https://docs.nemotoken.online/',
  balance_low_notify_recharge_url: 'https://pay.nemotoken.online/',
  site_logo: '/nemotoken-logo.png',
  turnstile_enabled: false,
  turnstile_site_key: '',
  github_oauth_enabled: false,
  google_oauth_enabled: false,
  payment_enabled: false,
  available_channels_enabled: false,
  affiliate_enabled: false,
  risk_control_enabled: false,
};

const REQUEST_TIMEOUT_MS = 30_000;

async function withTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url) {
  const response = await withTimeout(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchBytes(url) {
  const response = await withTimeout(url, {
    headers: {
      'user-agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      accept: '*/*',
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function extractLinkedPaths(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith('/'));
}

function extractAssetNames(content) {
  const assetPattern =
    /[A-Za-z0-9_.-]+-[A-Za-z0-9_-]+\.(?:js|css|png|jpg|jpeg|webp|svg|woff2?|ttf|map)/g;
  return [...new Set(content.match(assetPattern) ?? [])];
}

function extractInjectedConfig(html) {
  const match = html.match(/window\.__APP_CONFIG__=(\{.*?\});<\/script>/s);
  if (!match) {
    throw new Error('Could not find window.__APP_CONFIG__ in the source page.');
  }
  return JSON.parse(match[1]);
}

function rewriteHtml(html, config) {
  const patchedConfig = {
    ...config,
    ...NEMOTOKEN_CONFIG,
  };

  return html
    .replace(
      /\s*<script defer src="https:\/\/static\.cloudflareinsights\.com\/beacon[^>]*><\/script>/s,
      '',
    )
    .replace(/<title>.*?<\/title>/, '<title>NemoToken - AI API Gateway</title>')
    .replace(/href="\/logo\.png"/, 'href="/nemotoken-logo.png"')
    .replace(
      /window\.__APP_CONFIG__=\{.*?\};<\/script>/s,
      `window.__APP_CONFIG__=${JSON.stringify(patchedConfig)};</script>`,
    );
}

async function downloadAsset(path) {
  const normalizedPath = path.startsWith('/') ? path : `/assets/${path}`;
  const target =
    normalizedPath.startsWith('/assets/')
      ? join(PUBLIC_DIR, normalizedPath.slice(1))
      : join(PUBLIC_DIR, basename(normalizedPath));

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, await fetchBytes(new URL(normalizedPath, ORIGIN)));
  return normalizedPath;
}

async function main() {
  await mkdir(PUBLIC_DIR, { recursive: true });
  await rm(ASSETS_DIR, { recursive: true, force: true });
  await mkdir(ASSETS_DIR, { recursive: true });

  const html = await fetchText(new URL(ENTRY_PATH, ORIGIN));
  const config = extractInjectedConfig(html);
  const linkedPaths = extractLinkedPaths(html);

  const mainAssetPaths = linkedPaths.filter((path) => path.startsWith('/assets/'));
  const mainContents = await Promise.all(
    mainAssetPaths
      .filter((path) => path.endsWith('.js') || path.endsWith('.css'))
      .map((path) => fetchText(new URL(path, ORIGIN))),
  );

  const discoveredAssetNames = mainContents.flatMap(extractAssetNames);
  const assetPaths = new Set([
    ...linkedPaths.filter((path) => path === '/logo.png' || path.startsWith('/assets/')),
    ...discoveredAssetNames.map((name) => `/assets/${name}`),
  ]);

  const downloaded = [];
  for (const path of [...assetPaths].sort()) {
    try {
      downloaded.push(await downloadAsset(path));
    } catch (error) {
      console.warn(`Skipped ${path}: ${error.message}`);
    }
  }

  let nemotokenLogo = null;
  try {
    nemotokenLogo = await readFile(join(PUBLIC_DIR, 'nemotoken-logo.png'));
  } catch {
    nemotokenLogo = await fetchBytes(new URL('/logo.png', ORIGIN));
    await writeFile(join(PUBLIC_DIR, 'nemotoken-logo.png'), nemotokenLogo);
  }
  await writeFile(join(PUBLIC_DIR, 'logo.png'), nemotokenLogo);
  await writeFile('index.html', rewriteHtml(html, config));
  await writeFile(
    join(PUBLIC_DIR, 'mirror-manifest.json'),
    JSON.stringify(
      {
        source: `${ORIGIN}${ENTRY_PATH}`,
        mirroredAt: new Date().toISOString(),
        assetCount: downloaded.length,
        assets: downloaded,
      },
      null,
      2,
    ),
  );

  console.log(`Mirrored ${downloaded.length} assets from ${ORIGIN}${ENTRY_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
