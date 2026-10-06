import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { makeWav } from './helpers';

/** Membuat file audio uji (tidak di-commit): nada terputus-putus & hening. */
export default function globalSetup() {
  const dir = fileURLToPath(new URL('./fixtures/.generated/', import.meta.url));
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    `${dir}/voice-note.wav`,
    makeWav(4, (t) => 0.3 * Math.sin(2 * Math.PI * 220 * t) * (Math.floor(t * 2) % 2 === 0 ? 1 : 0)),
  );
  writeFileSync(
    `${dir}/hening.wav`,
    makeWav(3, () => 0),
  );
}
