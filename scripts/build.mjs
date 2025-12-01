import { build, context } from 'esbuild';
import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const publicDir = path.join(projectRoot, 'public');
const stylesDir = path.join(projectRoot, 'src', 'styles');

const entryPoints = {
  'content-scripts/main': path.join(projectRoot, 'src', 'content-scripts', 'main.ts'),
  'popup/popup': path.join(projectRoot, 'src', 'popup', 'popup.ts')
};

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

async function cleanDist() {
  await fsp.rm(distDir, { recursive: true, force: true });
}

async function copyDir(src, dest) {
  try {
    const entries = await fsp.readdir(src, { withFileTypes: true });
    await fsp.mkdir(dest, { recursive: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath);
      } else if (entry.isFile()) {
        await fsp.copyFile(srcPath, destPath);
      }
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
}

async function copyStatic() {
  await copyDir(publicDir, distDir);
  await copyDir(stylesDir, path.join(distDir, 'styles'));
}

function debounce(fn, delay = 150) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function watchStatic() {
  const copy = debounce(async () => {
    await copyStatic();
    console.log('[static] assets copied');
  });

  const watchPaths = [publicDir, stylesDir].filter((dir) => fs.existsSync(dir));
  for (const watchPath of watchPaths) {
    fs.watch(watchPath, { recursive: true }, (_event, filename) => {
      console.log(`[static] change detected in ${watchPath}${filename ? `/${filename}` : ''}`);
      copy();
    });
  }
}

async function run() {
  const buildOptions = {
    entryPoints,
    bundle: true,
    outdir: distDir,
    format: 'iife',
    target: 'es2020',
    sourcemap: isDev,
    minify: !isDev,
    logLevel: 'info'
  };

  await cleanDist();
  await copyStatic();

  if (isWatch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    watchStatic();
    console.log('Watching for changes...');
  } else {
    await build(buildOptions);
    console.log('Build complete.');
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
