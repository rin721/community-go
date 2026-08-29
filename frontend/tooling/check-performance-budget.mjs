import { readFile, readdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const frontendRoot = resolve(import.meta.dirname, '..');
const distRoot = join(frontendRoot, 'apps', 'web', 'dist');
const assetRoot = join(distRoot, 'assets');
const manifest = JSON.parse(await readFile(join(distRoot, '.vite', 'manifest.json'), 'utf8'));
const assets = await readdir(assetRoot);
const jsAssets = assets.filter((asset) => asset.endsWith('.js'));
const cssAssets = assets.filter((asset) => asset.endsWith('.css'));

async function gzipBytes(path) {
  return gzipSync(await readFile(path), { level: 9 }).byteLength;
}

const jsGzipSizes = await Promise.all(
  jsAssets.map(async (asset) => ({ asset, bytes: await gzipBytes(join(assetRoot, asset)) })),
);
const cssGzipBytes = (
  await Promise.all(cssAssets.map((asset) => gzipBytes(join(assetRoot, asset))))
).reduce((sum, bytes) => sum + bytes, 0);
const totalJsGzipBytes = jsGzipSizes.reduce((sum, item) => sum + item.bytes, 0);
const largestJsChunk = jsGzipSizes.reduce(
  (largest, item) => (item.bytes > largest.bytes ? item : largest),
  { asset: '', bytes: 0 },
);

const entry = Object.values(manifest).find((item) => item.isEntry);
if (!entry) throw new Error('Vite manifest 缺少入口记录');
const initialFiles = new Set();
function collectInitial(chunk) {
  if (initialFiles.has(chunk.file)) return;
  initialFiles.add(chunk.file);
  for (const importKey of chunk.imports ?? []) {
    const imported = manifest[importKey];
    if (imported) collectInitial(imported);
  }
}
collectInitial(entry);
const initialJsGzipBytes = (
  await Promise.all(
    [...initialFiles]
      .filter((file) => file.endsWith('.js'))
      .map((file) => gzipBytes(join(distRoot, file))),
  )
).reduce((sum, bytes) => sum + bytes, 0);

const budgets = {
  initialJsGzipBytes: 400 * 1024,
  totalJsGzipBytes: 430 * 1024,
  cssGzipBytes: 48 * 1024,
  largestJsChunkGzipBytes: 200 * 1024,
};
const measurements = {
  initialJsGzipBytes,
  totalJsGzipBytes,
  cssGzipBytes,
  largestJsChunkGzipBytes: largestJsChunk.bytes,
};
const violations = Object.entries(measurements)
  .filter(([name, bytes]) => bytes > budgets[name])
  .map(([name, bytes]) => `${name}: ${bytes} > ${budgets[name]}`);

if (violations.length > 0) {
  console.error(`Performance budget failed:\n${violations.map((item) => `- ${item}`).join('\n')}`);
  process.exitCode = 1;
} else {
  const rawBytes = (
    await Promise.all(jsAssets.map((asset) => stat(join(assetRoot, asset))))
  ).reduce((sum, item) => sum + item.size, 0);
  console.log(
    `Performance budget passed: initial=${initialJsGzipBytes}, total=${totalJsGzipBytes}, css=${cssGzipBytes}, largest=${largestJsChunk.asset}:${largestJsChunk.bytes}, rawJs=${rawBytes}.`,
  );
}
