'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const renderer = path.join(__dirname, '..', 'src', 'renderer');
const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
const { APPS, SECOES, definirCatalogo } = require('../src/renderer/catalogo');
const { carregarCatalogo } = require('../src/main/apps');

definirCatalogo(carregarCatalogo());

// Carrega os scripts do renderer na ordem do index.html e devolve o HTML da tela Início.
function htmlInicio() {
  const ordem = ['icons.js', 'catalogo.js', 'inicio.js'];
  return vm.runInNewContext(`${ordem.map(read).join('\n')}\ndefinirCatalogo(${JSON.stringify(carregarCatalogo())});\nhtmlInicio(new Date(2026, 10, 7, 12));`);
}

test('Início: mostra só os apps do catálogo, sem selos nem dados fingidos', () => {
  const html = htmlInicio();
  assert.equal((html.match(/class="tile"/g) || []).length, APPS.length);
  for (const a of APPS) assert.ok(html.includes(`data-app="${a.id}"`), a.id);
  assert.ok(!/selo|Em breve|Dados de exemplo/.test(html));
  assert.ok(!/class="(ann|mini|person|ev)"/.test(html), 'sem comunicados, notícias, equipe ou agenda');
  assert.ok(!/style=/.test(html), 'a CSP bloqueia estilo inline');
  assert.ok(html.includes('Sábado, 7 de novembro'));
});

test('catálogo: só apps que existem (hoje, o Termix) e sem estado "em breve"', () => {
  assert.deepEqual(APPS.map((a) => a.id), ['termix']);
  for (const a of APPS) assert.equal(a.estado, undefined, a.id);
});

test('Notícias, Comunicados e Equipe têm estado vazio honesto', () => {
  for (const id of ['noticias', 'comunicados', 'equipe']) {
    const s = SECOES.find((x) => x.id === id);
    assert.match(s.vazio, /^Ainda não há/, id);
  }
});

test('sem dados de exemplo no código do renderer', () => {
  for (const f of fs.readdirSync(renderer).filter((x) => x.endsWith('.js') && !x.startsWith('componentes'))) {
    assert.ok(!/Dados de exemplo|Em breve|em-breve|selo-breve|selo-exemplo/.test(read(f)), f);
  }
  assert.ok(!fs.existsSync(path.join(renderer, 'exemplos.js')));
  assert.ok(!fs.existsSync(path.join(renderer, 'capas.js')));
});

test('index.html: carrega inicio.js antes do shell.js e o CSS da tela', () => {
  const html = read('index.html');
  const pos = (s) => html.indexOf(`<script src="${s}"></script>`);
  assert.ok(pos('inicio.js') > 0 && pos('inicio.js') < pos('shell.js'));
  assert.ok(html.includes('<link rel="stylesheet" href="inicio.css">'));
});
