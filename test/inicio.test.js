'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const renderer = path.join(__dirname, '..', 'src', 'renderer');
const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
const { ICONES } = require('../src/renderer/icons');
const { EQUIPE, ANUNCIOS, AGENDA, CATEGORIAS, NOTICIAS } = require('../src/renderer/exemplos');
const { arte } = require('../src/renderer/capas');

// Carrega os scripts do renderer na ordem do index.html e devolve o HTML da tela Início.
function htmlInicio() {
  const ordem = ['icons.js', 'catalogo.js', 'exemplos.js', 'capas.js', 'inicio.js'];
  return vm.runInNewContext(`${ordem.map(read).join('\n')}\nhtmlInicio(new Date(2026, 10, 7, 12));`);
}

test('exemplos: autores, categorias, ícones e cores são válidos', () => {
  for (const a of ANUNCIOS) {
    assert.ok(EQUIPE[a.por], `anúncio "${a.titulo}": autor ${a.por}`);
    assert.match(a.cor, /^#[0-9a-f]{6}$/i);
  }
  for (const c of Object.values(CATEGORIAS)) {
    assert.ok(ICONES[c.icone], `ícone ${c.icone}`);
    assert.match(c.cor, /^#[0-9a-f]{6}$/i);
  }
  for (const p of EQUIPE) assert.ok(['on', 'aw', 'off'].includes(p.presenca), p.nome);
  for (const e of AGENDA) assert.match(e.hora, /^\d\d:\d\d$/);
  const ids = NOTICIAS.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const n of NOTICIAS) assert.ok(CATEGORIAS[n.cat], `notícia ${n.id}: categoria ${n.cat}`);
});

test('capas: cada categoria gera um desenho, sempre o mesmo para o mesmo id', () => {
  for (const cat of Object.keys(CATEGORIAS)) {
    assert.ok(arte(cat, 1).length > 50, cat);
    assert.equal(arte(cat, 7), arte(cat, 7), cat);
  }
});

test('Início: todos os blocos de exemplo levam o selo "Dados de exemplo"', () => {
  const html = htmlInicio();
  const secoes = html.split('<section>').slice(1);
  assert.equal(secoes.length, 5, 'comunicados, notícias, apps, equipe e agenda');
  const titulo = (s) => s.match(/<h2>([^<]*)<\/h2>/)[1];
  assert.deepEqual(secoes.map(titulo), ['Comunicados', 'Em alta nas notícias', 'Apps', 'Equipe', 'Hoje']);
  for (const s of secoes) {
    const t = titulo(s);
    assert.equal(s.includes('selo-exemplo'), t !== 'Apps', `selo em "${t}"`);
  }
});

test('Início: apps vêm do catálogo, só o Termix é ativo e os demais levam "Em breve"', () => {
  const html = htmlInicio();
  assert.equal((html.match(/class="tile"/g) || []).length, 1);
  assert.equal((html.match(/class="tile off"/g) || []).length, 5);
  assert.equal((html.match(/selo-breve/g) || []).length, 5);
  assert.ok(html.includes('data-app="termix"'));
});

test('Início: notícias em alta são as 3 de maior pontuação; comunicados são os 3 primeiros', () => {
  const html = htmlInicio();
  const top = [...NOTICIAS].sort((a, b) => b.alta - a.alta).slice(0, 3);
  for (const n of top) assert.ok(html.includes(n.titulo), n.titulo);
  assert.equal((html.match(/class="mini"/g) || []).length, 3);
  assert.equal((html.match(/class="ann"/g) || []).length, 3);
  for (const a of ANUNCIOS.slice(0, 3)) assert.ok(html.includes(a.titulo), a.titulo);
});

test('Início: sem estilo inline (a CSP bloqueia), sem versões fingidas, data real', () => {
  const html = htmlInicio();
  assert.ok(!/style=/.test(html));
  assert.ok(!/\bv\d+\.\d+\.\d+/.test(html), 'versão de app não é real ainda');
  assert.ok(html.includes('Sábado, 7 de novembro'));
});

test('index.html: carrega os scripts da tela Início antes do shell, e o CSS', () => {
  const html = read('index.html');
  const pos = (s) => html.indexOf(`<script src="${s}"></script>`);
  for (const s of ['icons.js', 'catalogo.js', 'exemplos.js', 'capas.js', 'inicio.js', 'shell.js']) assert.ok(pos(s) > 0, s);
  assert.ok(pos('icons.js') < pos('capas.js') && pos('exemplos.js') < pos('capas.js'));
  assert.ok(pos('inicio.js') < pos('shell.js'));
  assert.ok(html.includes('<link rel="stylesheet" href="inicio.css">'));
});
