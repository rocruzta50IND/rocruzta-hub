'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const renderer = path.join(__dirname, '..', 'src', 'renderer');
const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
const { GRUPOS, HUB, APPS, SECOES, definirCatalogo } = require('../src/renderer/catalogo');
const { carregarCatalogo } = require('../src/main/apps');

definirCatalogo(carregarCatalogo());
const { resolverAtalho, ehCampoDeTexto } = require('../src/renderer/atalhos');
const { ICONES } = require('../src/renderer/icons');

test('catálogo: ids únicos, grupos válidos, ícones e cores existentes', () => {
  const ids = APPS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of APPS) {
    assert.ok(GRUPOS.includes(a.grupo), `${a.id}: grupo ${a.grupo}`);
    assert.ok(ICONES[a.icone], `${a.id}: ícone ${a.icone} ausente`);
    assert.match(a.cor, /^#[0-9a-f]{6}$/i);
  }
  assert.ok(ICONES[HUB.icone]);
  for (const s of SECOES) assert.ok(ICONES[s.icone], `seção ${s.id}: ícone`);
});

test('seções: Início, Apps, Notícias, Comunicados e Equipe (teclas 1 a 5) + Configurações no rodapé, sem tecla', () => {
  assert.deepEqual(SECOES.map((s) => s.id), ['inicio', 'apps', 'noticias', 'comunicados', 'equipe', 'config']);
  assert.deepEqual(SECOES.map((s) => s.tecla), ['1', '2', '3', '4', '5', '']);
  assert.deepEqual(SECOES.filter((s) => s.rodape).map((s) => s.id), ['config']);
});

const tecla = (key, extra = {}) => ({ key, target: { tagName: 'BODY' }, ...extra });

test('atalhos: teclas 1 a 5 trocam de seção; 0, 6 e 7 não fazem nada', () => {
  for (const s of SECOES.filter((x) => x.tecla)) assert.deepEqual(resolverAtalho(tecla(s.tecla), {}, SECOES), { acao: 'secao', id: s.id });
  for (const k of ['0', '6', '7', 'a', 'Enter']) assert.equal(resolverAtalho(tecla(k), {}, SECOES), null, k);
});

test('atalhos: ignorados em campos de texto', () => {
  for (const target of [{ tagName: 'INPUT' }, { tagName: 'textarea' }, { tagName: 'SELECT' },
    { tagName: 'DIV', isContentEditable: true }]) {
    assert.ok(ehCampoDeTexto(target));
    assert.equal(resolverAtalho({ key: '2', target }, {}, SECOES), null);
    assert.equal(resolverAtalho({ key: 'Escape', target }, { seletorAberto: true }, SECOES), null);
  }
  assert.equal(ehCampoDeTexto({ tagName: 'BUTTON' }), false);
});

test('atalhos: ignorados com Ctrl, Alt (AltGr no ABNT2) ou Meta', () => {
  for (const mod of ['ctrlKey', 'altKey', 'metaKey']) {
    assert.equal(resolverAtalho(tecla('1', { [mod]: true }), {}, SECOES), null, mod);
  }
  assert.equal(resolverAtalho(tecla('1', { defaultPrevented: true }), {}, SECOES), null);
});

test('atalhos: Esc fecha o seletor só quando ele está aberto', () => {
  assert.deepEqual(resolverAtalho(tecla('Escape'), { seletorAberto: true }, SECOES), { acao: 'fechar-seletor' });
  assert.equal(resolverAtalho(tecla('Escape'), { seletorAberto: false }, SECOES), null);
});

test('não há atalho global na casca (globalShortcut é da TASK-011)', () => {
  for (const f of ['shell.js', 'atalhos.js']) assert.doesNotMatch(read(f), /globalShortcut/);
  assert.doesNotMatch(fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'main.js'), 'utf8'), /globalShortcut/);
});

test('casca: sidebar e seletor derivam do catálogo', () => {
  const js = read('shell.js');
  assert.match(js, /APPS\.filter/);
  assert.match(js, /gruposComApps\(\)\.map/);
});

test('casca: abrir app passa pela ponte e só diz "aberto" quando deu certo', () => {
  const js = read('shell.js');
  assert.match(js, /window\.hub\.abrirApp\(id\)/);
  assert.match(js, /if \(!r\.ok\)/);
  assert.doesNotMatch(js, /chega na próxima etapa/);
  assert.doesNotMatch(js, /child_process|spawn|shell\.openPath/);
});

test('index.html: scripts na ordem certa, existentes, sem inline', () => {
  const html = read('index.html');
  const ordem = ['icons.js', 'catalogo.js', 'atalhos.js', 'ui.js', 'shell.js', 'renderer.js'];
  let ultimo = -1;
  for (const f of ordem) {
    const i = html.indexOf(`<script src="${f}"></script>`);
    assert.ok(i > ultimo, `${f} fora de ordem ou ausente`);
    assert.ok(fs.existsSync(path.join(renderer, f)));
    ultimo = i;
  }
  assert.ok(html.includes('shell.css') && fs.existsSync(path.join(renderer, 'shell.css')));
  assert.doesNotMatch(html, /\sstyle="/);
});

test('JS do renderer: sem rede, sem style="" e sem eval', () => {
  for (const f of fs.readdirSync(renderer).filter((x) => x.endsWith('.js'))) {
    const js = read(f);
    assert.doesNotMatch(js, /https?:\/\//, `${f} referencia a rede`);
    assert.doesNotMatch(js, /style="/, `${f} usa style="" (a CSP bloqueia)`);
    assert.doesNotMatch(js, /\beval\(|new Function\(/, `${f} usa eval`);
  }
});

test('controles da janela e tema continuam ligados no renderer', () => {
  const js = read('renderer.js');
  for (const m of ['minimize', 'toggleMaximize', 'close']) assert.match(js, new RegExp(`window\\.hub\\.${m}\\(`));
  assert.match(read('shell.js'), /localStorage/);
});
