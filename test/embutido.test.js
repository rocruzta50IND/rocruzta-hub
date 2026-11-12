'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { localizarDev, localizarInstalado, argumentos, argumentosInstalado, ambiente, lerPronto, retanguloValido } = require('../src/main/embutido');
const { validarCatalogo } = require('../src/main/apps');

test('localizarDev: precisa de src/embed.js e do electron.exe; HUB_TERMIX_DEV muda a pasta', () => {
  const tudo = () => true;
  const r = localizarDev({ HUB_TERMIX_DEV: 'D:/x/termix' }, tudo);
  assert.equal(r.pasta, path.resolve('D:/x/termix'));
  assert.equal(r.exe, path.join(r.pasta, 'node_modules', 'electron', 'dist', 'electron.exe'));
  assert.equal(localizarDev({}, () => false), null);
  assert.equal(localizarDev({}, (p) => !p.endsWith('embed.js')), null, 'sem o modo --embed no Termix, indisponível');
});

test('argumentos: abre sem janela (--embed) e com dados isolados', () => {
  assert.deepEqual(argumentos('C:/t', 'C:/d'), ['C:/t', '--embed', '--user-data-dir=C:/d']);
});

test('ambiente: tira variáveis do Electron/Node do Hub, põe token e o pid do Hub', () => {
  const env = ambiente({ PATH: 'x', ELECTRON_RUN_AS_NODE: '1', electron_foo: '1', NODE_OPTIONS: '--x', OUTRA: 'y' }, 'tok');
  assert.equal(env.HUB_TOKEN, 'tok');
  assert.equal(env.HUB_PARENT_PID, String(process.pid));
  assert.equal(env.PATH, 'x');
  assert.equal(env.OUTRA, 'y');
  assert.ok(!('ELECTRON_RUN_AS_NODE' in env) && !('electron_foo' in env) && !('NODE_OPTIONS' in env));
});

test('lerPronto: extrai a porta de HUB_READY', () => {
  assert.equal(lerPronto('HUB_READY 50659\n'), 50659);
  assert.equal(lerPronto('outra coisa'), 0);
});

test('retanguloValido: arredonda e recusa lixo vindo da janela', () => {
  assert.deepEqual(retanguloValido({ x: 10.4, y: 44, width: 1160.6, height: 650 }), { x: 10, y: 44, width: 1161, height: 650 });
  for (const ruim of [null, 'x', {}, { x: -1, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: NaN, height: 1 }, { x: 0, y: 0, width: 99999, height: 1 }]) {
    assert.equal(retanguloValido(ruim), null);
  }
});

test('catálogo: "embutir" só aceita "electron"', () => {
  const base = { grupos: ['G'], apps: [{ id: 'a', nome: 'A', grupo: 'G', icone: 'i', desc: 'd', cor: '#112233', repositorio: 'x/y', deteccao: { registro: 'A', executavel: 'A.exe' } }] };
  assert.deepEqual(validarCatalogo(base), []);
  assert.deepEqual(validarCatalogo({ ...base, apps: [{ ...base.apps[0], embutir: 'electron' }] }), []);
  assert.equal(validarCatalogo({ ...base, apps: [{ ...base.apps[0], embutir: 'web' }] }).length, 1);
});

test('localizarInstalado: só o Termix instalado com versão suficiente e executável presente', () => {
  const ok = { instalado: true, executavel: 'D:\Termix\Termix.exe', versao: '0.7.0' };
  const r = localizarInstalado(ok, '0.7.0', () => true);
  assert.equal(r.exe, 'D:\Termix\Termix.exe');
  assert.equal(r.instalado, true);
  assert.equal(localizarInstalado({ ...ok, versao: '0.6.4' }, '0.7.0', () => true), null, 'versão antiga não tem --embed');
  assert.equal(localizarInstalado({ ...ok, versao: '0.10.0' }, '0.7.0', () => true).instalado, true, 'comparação numérica, não de texto');
  assert.equal(localizarInstalado(ok, '0.7.0', () => false), null, 'executável sumiu');
  assert.equal(localizarInstalado({ instalado: false }, '0.7.0', () => true), null);
  assert.equal(localizarInstalado(ok, undefined, () => true), null, 'sem "embutirDesde" no catálogo não embute o instalado');
  assert.equal(localizarInstalado(undefined, '0.7.0', () => true), null);
});

test('app instalado abre sem pasta de código na linha de comando; o da pasta de desenvolvimento segue igual', () => {
  assert.deepEqual(argumentosInstalado('C:/d'), ['--embed', '--user-data-dir=C:/d']);
  assert.deepEqual(argumentos('C:/t', 'C:/d'), ['C:/t', '--embed', '--user-data-dir=C:/d']);
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'embutido.js'), 'utf8');
  assert.match(js, /dev\.instalado \? argumentosInstalado\(dados\) : argumentos\(dev\.pasta, dados\)/);
});

test('main.js: a pasta de desenvolvimento tem prioridade; sem ela, vale o instalado com versão suficiente', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'main.js'), 'utf8');
  const i = js.indexOf('async function embutivelDe');
  const corpo = js.slice(i, js.indexOf('const appEmbutivel', i));
  assert.ok(corpo.indexOf('localizarDev()') < corpo.indexOf('localizarInstalado('), 'dev primeiro, instalado depois');
  assert.match(js, /embutidoDev: true/);
});
