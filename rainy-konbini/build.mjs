import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const result = await build({
  entryPoints: [resolve(here, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: !process.env.DEBUG_BUILD,
  target: ['chrome100'],
  write: false,
  legalComments: 'none',
});

const js = result.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');
const template = readFileSync(resolve(here, 'src/template.html'), 'utf8');
const html = template.replace('<!--APP-->', () => `<script>${js}</script>`);
mkdirSync(resolve(here, 'dist'), { recursive: true });
writeFileSync(resolve(here, 'index.html'), html);
writeFileSync(resolve(here, 'dist/app.js'), result.outputFiles[0].text);
console.log(`Built index.html (${(html.length / 1024).toFixed(1)} kB)`);
