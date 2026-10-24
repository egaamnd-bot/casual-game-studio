// Copies the web app into dist/ for Capacitor, bundling Phaser locally so the app works offline.
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

rmSync('dist', { recursive: true, force: true });
cpSync('src', 'dist', { recursive: true });
mkdirSync('dist/vendor', { recursive: true });
cpSync('node_modules/phaser/dist/phaser.min.js', 'dist/vendor/phaser.min.js');

const buildInfo = {
  commit: (process.env.GITHUB_SHA || 'local').slice(0, 7),
  run: process.env.GITHUB_RUN_NUMBER || '-',
  builtAt: new Date().toISOString(),
};
writeFileSync('dist/build-info.js', `window.BUILD_INFO = ${JSON.stringify(buildInfo)};\n`);

console.log('Built dist/', buildInfo);
