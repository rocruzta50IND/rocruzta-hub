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
function htmlInicio(estado) {
  const ordem = ['icons.js', 'catalogo.js', 'conversa.js', 'inicio.js'];
  return vm.runInNewContext(`${ordem.map(read).join('\n')}\ndefinirCatalogo(${JSON.stringify(carregarCatalogo())});CHAT.estado = ${JSON.stringify(estado)};htmlInicio();`);
}

test('Início: chat no centro, sem selos nem dados fingidos; sem Claude Code o campo fica desativado', () => {
  const html = htmlInicio({ disponivel: false });
  assert.match(html, /id="composer"/);
  assert.match(html, /placeholder="Descreva uma tarefa ou faça uma pergunta"/);
  assert.match(html, /id="c-texto"[^>]* disabled/, 'sem Claude Code, o campo não aceita texto');
  assert.match(html, /Claude Code precisa estar instalado/);
  assert.ok(!/selo|Em breve|Dados de exemplo/.test(html));
  assert.ok(!/class="(ann|mini|person|ev)"/.test(html), 'sem comunicados, notícias, equipe ou agenda');
  assert.ok(!/style=/.test(html), 'a CSP bloqueia estilo inline');
});

test('Início: com o Claude Code o campo está ativo, o modelo é Haiku e nada fala do Termix', () => {
  const html = htmlInicio({ disponivel: true, caminho: 'C:\\x\\claude.exe', modelo: 'haiku' });
  assert.ok(!/id="c-texto"[^>]* disabled/.test(html));
  assert.match(html, /Claude Haiku/);
  assert.match(html, /Nada fica guardado/);
  assert.ok(!/Termix/.test(html), 'o chat do Início é independente do Termix');
});

test('conversa: markdown enxuto escapa HTML e formata código, negrito e listas', () => {
  const { mdLite, htmlMensagens } = require('../src/renderer/conversa');
  assert.equal(mdLite('<b>oi</b>'), '<p>&lt;b&gt;oi&lt;/b&gt;</p>');
  assert.equal(mdLite('um **dois** `tres`'), '<p>um <b>dois</b> <code>tres</code></p>');
  assert.equal(mdLite('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
  assert.match(mdLite('```js\nlet x = 1 < 2;\n```'), /<pre><code>let x = 1 &lt; 2;<\/code><\/pre>/);
  const html = htmlMensagens([{ papel: 'eu', texto: '<img src=x>' }], true);
  assert.ok(!html.includes('<img src=x>'), 'texto do usuário é escapado');
  assert.match(html, /c-pontos/, 'aguardando a resposta mostra os pontinhos');
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
    assert.ok(!/Dados de exemplo|selo-exemplo/.test(read(f)), f);
    // "Em breve" existe só na loja (tela Apps), por decisão do usuário (DECISOES §14): nunca no seletor, na barra lateral nem no Início.
    if (!['inicio.js', 'catalogo.js'].includes(f)) assert.ok(!/Em breve|em-breve|selo-breve|emBreve|EM_BREVE/.test(read(f)), f);
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

test('loja: apps "em breve" aparecem só na tela Apps, sem botão de abrir, e o filtro e a busca funcionam', () => {
  const rodar = (extra) => vm.runInNewContext(`${['icons.js', 'catalogo.js', 'inicio.js'].map(read).join('\n')}
    definirCatalogo(${JSON.stringify(carregarCatalogo())}); definirEstados({ termix: { instalado: true, versao: '0.6.3' } }); ${extra}`);
  const todos = rodar('htmlApps();');
  for (const id of ['desk', 'midia', 'studio']) assert.match(todos, new RegExp(`data-detalhe="${id}"`));
  assert.ok(!/data-app="(desk|midia|studio)"|data-releases="(desk|midia|studio)"/.test(todos), 'em breve não abre nem instala');
  assert.match(todos, /Instalado · v0\.6\.3/);
  const soBreve = rodar(`LOJA.filtro = 'em-breve'; htmlApps();`);
  assert.ok(!/data-detalhe="termix"/.test(soBreve));
  assert.match(rodar(`LOJA.busca = 'stud'; htmlApps();`), /data-detalhe="studio"/);
  assert.match(rodar(`LOJA.busca = 'zzz'; htmlApps();`), /Nenhum app com esse filtro/);
  const det = rodar(`LOJA.detalhe = 'studio'; htmlApps();`);
  assert.match(det, /data-loja-voltar/);
  assert.match(det, /Este app ainda não foi lançado/);
  // seletor, barra lateral e Início só enxergam apps reais
  assert.deepEqual(JSON.parse(rodar('JSON.stringify(APPS.map((a) => a.id))')), ['termix']);
});

test('loja: destaque e carrossel só aparecem com imagens reais; sem imagens a seção some', () => {
  const rodar = (extra) => vm.runInNewContext(`${['icons.js', 'catalogo.js', 'inicio.js'].map(read).join('\n')}
    definirCatalogo(${JSON.stringify(carregarCatalogo())}); definirEstados({ termix: { instalado: true } }); ${extra}`);
  const lista = rodar('htmlApps();');
  assert.match(lista, /class="loja-hero" data-detalhe="termix"/);
  assert.match(lista, /src="\.\.\/previas\/termix\/1-conversa-claro\.png"/);
  assert.doesNotMatch(rodar(`LOJA.busca = 'x'; htmlApps();`), /loja-hero/, 'busca ativa esconde o destaque');
  const det = rodar(`LOJA.detalhe = 'termix'; htmlApps();`);
  assert.equal((det.match(/class="car-item"/g) || []).length, 3);
  assert.match(det, /data-car="1"/);
  assert.match(det, /<h2>Sobre<\/h2>/);
  const sem = rodar(`LOJA.detalhe = 'desk'; htmlApps();`);
  assert.doesNotMatch(sem, /class="car"|<h2>Sobre<\/h2>/);
});
