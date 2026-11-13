'use strict';
// Abertura animada e mascote (TASK-044): marcação do chat, arquivos e ordem de carga do renderer.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { htmlMensagens } = require('../src/renderer/conversa');

const renderer = path.join(__dirname, '..', 'src', 'renderer');
const lerArq = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');

test('chat: só o avatar da última resposta fica livre para o mascote; as anteriores ganham o pontinho', () => {
  const html = htmlMensagens([
    { papel: 'eu', texto: 'a' }, { papel: 'ia', texto: 'b' }, { papel: 'eu', texto: 'c' }, { papel: 'ia', texto: 'd' },
  ], false);
  const avatares = html.match(/class="c-avatar[^"]*"/g);
  assert.deepEqual(avatares, ['class="c-avatar ponto"', 'class="c-avatar"']);
});

test('chat: esperando a resposta, o avatar livre é o da linha "pensando" e todas as respostas antes dela têm pontinho', () => {
  const html = htmlMensagens([{ papel: 'eu', texto: 'a' }, { papel: 'ia', texto: 'b' }, { papel: 'eu', texto: 'c' }], true);
  const avatares = html.match(/class="c-avatar[^"]*"/g);
  assert.deepEqual(avatares, ['class="c-avatar ponto"', 'class="c-avatar"']);
  assert.match(html, /c-pontos/);
});

test('o ícone do app (H com chapéu) existe nas duas versões e o PNG do app tem 1024 px', () => {
  for (const f of ['icone-hub.svg', 'icone-hub-escuro.svg']) {
    const svg = lerArq(f);
    assert.match(svg, /^<svg [^>]*viewBox="0 0 100 100"/, f);
    assert.doesNotMatch(svg, /<script|href=|https?:\/\/(?!www\.w3\.org)/, `${f} não pode puxar nada de fora`);
  }
  const png = fs.readFileSync(path.join(__dirname, '..', 'assets', 'icone.png'));
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
});

test('index.html: véu da abertura no topo e scripts na ordem certa (mago, mascote, abertura, renderer)', () => {
  const html = lerArq('index.html');
  assert.ok(html.indexOf('id="splash"') < html.indexOf('id="app"'), 'o véu vem antes do app');
  const ordem = ['conversa.js', 'shell.js', 'mago.js', 'mascote.js', 'abertura.js', 'renderer.js'].map((s) => html.indexOf(`src="${s}"`));
  assert.ok(ordem.every((p) => p > 0), 'todos os scripts estão no index.html');
  assert.deepEqual([...ordem].sort((a, b) => a - b), ordem);
  for (const css of ['mago.css', 'abertura.css']) assert.ok(html.includes(`href="${css}"`), css);
  for (const f of ['mago.js', 'mascote.js', 'abertura.js', 'mago.css', 'abertura.css']) assert.ok(fs.existsSync(path.join(renderer, f)), f);
});

test('reduzir movimento: a abertura e o mascote continuam animados (exceção em base.css)', () => {
  const css = fs.readFileSync(path.join(renderer, 'styles', 'base.css'), 'utf8');
  for (const sel of ['#splash', '#mago', '.mago-px', '.mago-plat', '.mago-cometa']) assert.ok(css.includes(`:not(${sel}`) || css.includes(`:not(${sel})`), sel);
});

test('renderer.js avisa a abertura quando a tela inicial está pronta (e não trava se a abertura não carregou)', () => {
  const js = lerArq('renderer.js');
  assert.match(js, /window\.splashPronto/);
  assert.match(js, /getElementById\('splash'\)\?\.remove\(\)/);
  assert.match(js, /iniciarShell\(\);\s*avisarPronto\(\)/);
});
