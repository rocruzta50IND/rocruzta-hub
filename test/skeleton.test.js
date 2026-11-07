'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const config = require('../src/main/config');

test('estrutura de pastas e arquivos', () => {
  for (const f of ['src/main/main.js', 'src/preload/preload.js', 'src/renderer/index.html',
    'src/renderer/renderer.js', 'src/renderer/shell.css']) {
    assert.ok(fs.existsSync(path.join(root, f)), `falta ${f}`);
  }
});

test('package.json: main, scripts e electron', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.main, 'src/main/main.js');
  assert.ok(pkg.scripts.start && pkg.scripts.test);
  assert.ok(pkg.devDependencies.electron);
});

test('segurança da janela: contextIsolation ligado, sem nodeIntegration, sandbox', () => {
  const main = read('src/main/main.js');
  assert.match(main, /contextIsolation:\s*true/);
  assert.match(main, /nodeIntegration:\s*false/);
  assert.match(main, /sandbox:\s*true/);
  assert.match(main, /frame:\s*false/);
  assert.doesNotMatch(main, /nodeIntegration:\s*true|contextIsolation:\s*false/);
});

test('instância única, identificador e pasta de dados', () => {
  const main = read('src/main/main.js');
  assert.match(main, /requestSingleInstanceLock\(\)/);
  assert.match(main, /second-instance/);
  assert.equal(config.APP_ID, 'com.rocruzta.hub');
  const appData = path.join('C:', 'Users', 'x', 'AppData', 'Roaming');
  assert.equal(config.userDataDir(appData), path.join(appData, 'Rocruzta Hub'));
});

test('preload expõe só a API mínima e os canais batem com o config', () => {
  const preload = read('src/preload/preload.js');
  assert.equal((preload.match(/exposeInMainWorld/g) || []).length, 1);
  assert.match(preload, /exposeInMainWorld\('hub'/);
  for (const ch of Object.values(config.CHANNELS)) {
    assert.ok(preload.includes(`'${ch}'`), `canal ${ch} ausente no preload`);
  }
  assert.doesNotMatch(preload, /require\((?!'electron')/);
});

test('renderer: CSP restritiva e sem script inline', () => {
  const html = read('src/renderer/index.html');
  assert.match(html, /Content-Security-Policy/);
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/);
});

test('ícone do app: PNG 1024x1024 em assets/ e usado pela janela', () => {
  const png = fs.readFileSync(path.join(root, 'assets', 'icone.png'));
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(require('../src/main/config').ICON, path.join(root, 'assets', 'icone.png'));
  assert.match(read('src/main/main.js'), /icon: ICON/);
});
