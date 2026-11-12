'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const renderer = path.join(root, 'src', 'renderer');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const squash = (s) => s.replace(/\s+/g, '');

// Custom properties de um bloco de seletor: { '--brand': '#3b82f6', ... } (valores sem espaços).
function blockVars(css, selector) {
  const start = css.indexOf(selector + ' {') >= 0 ? css.indexOf(selector + ' {') : css.indexOf(selector + '{');
  assert.ok(start >= 0, `bloco ${selector} não encontrado`);
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('\n}', start));
  const vars = {};
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[m[1]] = squash(m[2]);
  return vars;
}

const tokens = read('src/renderer/styles/tokens.css');
const reference = squash(read('base/index.html'));

// Tokens que continuam vindo da referência (base/index.html), por tema. Superfícies, linhas e vidro foram trocados
// pela paleta opaca no estilo do Claude Desktop (TASK-026, pedido do usuário) e saíram desta lista.
const FROM_REFERENCE_DARK = ['--text-2', '--text-3', '--ok', '--warn', '--bad', '--r-s', '--r-m', '--r-l'];
const FROM_REFERENCE_LIGHT = ['--text']; // texto secundário e cores de estado do claro foram escurecidos para dar contraste sobre o fundo fosco

test('tokens escuros e claros batem com os valores da referência', () => {
  const dark = blockVars(tokens, ':root');
  const light = blockVars(tokens, ':root[data-theme="light"]');
  for (const k of FROM_REFERENCE_DARK) {
    assert.ok(dark[k], `${k} ausente no tema escuro`);
    assert.ok(reference.includes(`${k}:${dark[k]}`), `${k}:${dark[k]} não existe na referência`);
  }
  for (const k of FROM_REFERENCE_LIGHT) {
    assert.ok(light[k], `${k} ausente no tema claro`);
    assert.ok(reference.includes(`${k}:${light[k]}`), `${k}:${light[k]} não existe na referência (claro)`);
  }
});

test('o tema claro sobrescreve só tokens que existem no escuro', () => {
  const dark = blockVars(tokens, ':root');
  const light = blockVars(tokens, ':root[data-theme="light"]');
  for (const k of Object.keys(light)) assert.ok(k in dark, `${k} só existe no claro`);
});

test('identidade: azul da logo e raios 6, 8, 12 e 18 px', () => {
  const dark = blockVars(tokens, ':root');
  assert.equal(dark['--brand'], '#3570dc'); // azul da logo, chapado
  assert.deepEqual([dark['--r-s'], dark['--r-m'], dark['--r-l'], dark['--r-xl']], ['6px', '8px', '12px', '18px']);
});

test('Inter embutida: @font-face aponta para um arquivo que existe', () => {
  const css = read('src/renderer/styles/fonts.css');
  const m = css.match(/url\("([^"]+)"\)/);
  assert.ok(m, 'sem url() no @font-face');
  const file = path.resolve(renderer, 'styles', m[1]);
  assert.ok(fs.existsSync(file), `fonte ausente: ${file}`);
  assert.ok(fs.statSync(file).size > 10000, 'arquivo de fonte pequeno demais');
  assert.ok(fs.existsSync(path.join(renderer, 'fonts', 'Inter-LICENSE.txt')), 'falta a licença da Inter');
});

test('nada de rede: sem http(s) nem @import remoto em CSS e HTML do renderer', () => {
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(css|html)$/.test(e.name)) files.push(p);
    }
  })(renderer);
  assert.ok(files.length >= 7);
  for (const f of files) {
    const txt = fs.readFileSync(f, 'utf8').replace(/http-equiv="[^"]*"/g, '');
    assert.doesNotMatch(txt, /https?:\/\//, `${path.relative(root, f)} referencia a rede`);
  }
});

test('CSP: sem style="" nem script inline e com font-src próprio', () => {
  for (const f of ['index.html', 'componentes.html']) {
    const html = fs.readFileSync(path.join(renderer, f), 'utf8');
    assert.match(html, /font-src 'self'/, `${f} sem font-src`);
    assert.doesNotMatch(html, /\sstyle="/, `${f} usa style inline (a CSP bloqueia)`);
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, `${f} tem script inline`);
  }
});

test('index.html carrega os CSS de design que existem', () => {
  const html = fs.readFileSync(path.join(renderer, 'index.html'), 'utf8');
  for (const css of ['fonts', 'tokens', 'base', 'glass', 'components']) {
    assert.ok(html.includes(`styles/${css}.css`), `index.html não carrega ${css}.css`);
    assert.ok(fs.existsSync(path.join(renderer, 'styles', `${css}.css`)));
  }
});

test('componentes: botões, chips, listas, vidro e o selo Em breve / Dados de exemplo', () => {
  const css = read('src/renderer/styles/components.css') + read('src/renderer/styles/glass.css');
  for (const sel of ['.btn', '.btn.pri', '.chip', '.seg', '.box', '.list', '.glass-panel', '.menu',
    '.selo', '.selo-breve', '.selo-exemplo']) {
    assert.ok(css.includes(sel), `seletor ${sel} ausente`);
  }
  assert.doesNotMatch(css, /backdrop-filter:\s*blur\(/, 'visual flat e opaco: sem vidro desfocado');
});

test('o selo é um componente único e aparece na amostra com os dois textos', () => {
  const sample = read('src/renderer/componentes.html');
  assert.match(sample, /class="selo selo-breve">Em breve</);
  assert.match(sample, /class="selo selo-exemplo">Dados de exemplo</);
});
