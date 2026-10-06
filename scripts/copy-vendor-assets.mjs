/**
 * Menyalin runtime OCR & pengenal suara dari node_modules ke public/vendor,
 * supaya disajikan dari server aplikasi sendiri (bukan CDN pihak ketiga).
 * Dijalankan otomatis sebelum `dev` dan `build`. Folder hasilnya tidak di-commit.
 *
 *   public/vendor/tesseract/worker.min.js
 *   public/vendor/tesseract/core/tesseract-core-*-lstm.wasm.js
 *   public/vendor/tesseract/lang/{ind,eng}.traineddata.gz
 *   public/vendor/ort/ort-wasm-simd-threaded.asyncify.{mjs,wasm}
 */
import { copyFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'public/vendor');

/** Folder paket, juga untuk paket yang tidak mengekspor package.json atau tersarang di paket lain. */
function pkgDir(name, from = require) {
  let dir = dirname(from.resolve(name));
  while (!existsSync(join(dir, 'package.json')) || !dir.endsWith(name.split('/').pop())) {
    const parent = dirname(dir);
    if (parent === dir) throw new Error(`Paket ${name} tidak ditemukan`);
    dir = parent;
  }
  return dir;
}

const files = {
  'tesseract/worker.min.js': join(pkgDir('tesseract.js'), 'dist/worker.min.js'),
};
// Hanya varian LSTM (OEM 1); browser memilih simd/relaxedsimd sesuai dukungan.
for (const variant of ['lstm', 'simd-lstm', 'relaxedsimd-lstm']) {
  files[`tesseract/core/tesseract-core-${variant}.wasm.js`] = join(
    pkgDir('tesseract.js-core'),
    `tesseract-core-${variant}.wasm.js`,
  );
}
for (const lang of ['ind', 'eng']) {
  files[`tesseract/lang/${lang}.traineddata.gz`] = join(
    pkgDir(`@tesseract.js-data/${lang}`),
    `4.0.0_best_int/${lang}.traineddata.gz`,
  );
}
// Transformers.js memakai build WebGPU onnxruntime-web, yang memuat runtime "asyncify".
// onnxruntime-web di-resolve dari sudut pandang transformers.js agar versinya sama persis.
const transformersRequire = createRequire(join(pkgDir('@huggingface/transformers'), 'package.json'));
const ortDist = join(pkgDir('onnxruntime-web', transformersRequire), 'dist');
for (const ext of ['mjs', 'wasm']) {
  files[`ort/ort-wasm-simd-threaded.asyncify.${ext}`] = join(ortDist, `ort-wasm-simd-threaded.asyncify.${ext}`);
}

let copied = 0;
for (const [target, source] of Object.entries(files)) {
  const dest = join(out, target);
  if (existsSync(dest) && statSync(dest).size === statSync(source).size) continue;
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(source, dest);
  copied += 1;
}
console.log(`[nyalin] vendor assets siap (${copied} file disalin, ${Object.keys(files).length - copied} sudah ada).`);
