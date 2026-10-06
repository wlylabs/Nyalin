import { createReadStream, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Menyajikan engine & data bahasa Tesseract dari server aplikasi sendiri (bukan CDN pihak ketiga):
 * lebih andal, versinya terkunci, dan tidak ada permintaan ke domain lain saat OCR.
 *
 *   /tesseract/worker.min.js
 *   /tesseract/core/tesseract-core-*-lstm.wasm.js
 *   /tesseract/lang/{ind,eng}.traineddata.gz
 */
const require = createRequire(import.meta.url);
const pkgDir = (name: string) => dirname(require.resolve(`${name}/package.json`));

export const TESSERACT_LANGS = ['ind', 'eng'];

function assetMap(): Record<string, string> {
  const tesseract = pkgDir('tesseract.js');
  const core = pkgDir('tesseract.js-core');
  const files: Record<string, string> = {
    'tesseract/worker.min.js': join(tesseract, 'dist/worker.min.js'),
  };
  // Hanya varian LSTM (yang dipakai OEM 1); browser memilih simd/relaxedsimd sesuai dukungan.
  for (const variant of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
    files[`tesseract/core/tesseract-core-${variant}.wasm.js`] = join(core, `tesseract-core-${variant}.wasm.js`);
  }
  for (const lang of TESSERACT_LANGS) {
    files[`tesseract/lang/${lang}.traineddata.gz`] = join(
      pkgDir(`@tesseract.js-data/${lang}`),
      `4.0.0_best_int/${lang}.traineddata.gz`,
    );
  }
  return files;
}

const CONTENT_TYPES: Record<string, string> = {
  js: 'text/javascript; charset=utf-8',
  gz: 'application/octet-stream',
};

export function tesseractAssets(): Plugin {
  const files = assetMap();
  return {
    name: 'nyalin:tesseract-assets',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split('?')[0].replace(/^\//, '') ?? '';
        const source = files[path];
        if (!source) return next();
        res.setHeader('Content-Type', CONTENT_TYPES[path.split('.').pop() ?? ''] ?? 'application/octet-stream');
        res.setHeader('Content-Length', statSync(source).size);
        createReadStream(source).pipe(res);
      });
    },

    generateBundle() {
      for (const [fileName, source] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName, source: readFileSync(source) });
      }
    },
  };
}
