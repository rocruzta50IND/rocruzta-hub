'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { variaveisDoTema, lerCssDoApp, verificarTema } = require('../src/main/tema-contrato');

const cssHub = fs.readFileSync(path.join(__dirname, '..', 'src', 'temas-apps', 'termix.css'), 'utf8');

test('tema: lê as variáveis que o CSS do Hub redefine e ignora o resto', () => {
  const css = 'html[data-hub-theme="light"] { --text: #111; --b-c: 1px; }\nhtml[data-hub-theme="light"] body { color-scheme: light; }\n.x { --fora: 1; }';
  assert.deepStrictEqual(variaveisDoTema(css), ['--b-c', '--text']);
  assert.deepStrictEqual(variaveisDoTema(''), []);
});

test('tema: o termix.css do Hub só redefine variáveis (nenhum seletor de estrutura do app)', () => {
  const variaveis = variaveisDoTema(cssHub);
  assert.ok(variaveis.length >= 20, `contrato com ${variaveis.length} variáveis`);
  for (const v of ['--text', '--border', '--glass', '--field', '--pane', '--sheet', '--hover']) assert.ok(variaveis.includes(v), `${v} no contrato`);
  const seletores = [...cssHub.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((m) => m[1].trim());
  for (const s of seletores) assert.match(s, /^html\[data-hub-theme="[a-z]+"\]( body)?$/, `seletor fora do contrato: ${s}`);
});

test('tema: acusa a variável que o app deixou de ter e as cores fixas fora de variáveis', () => {
  const hub = 'html[data-hub-theme="light"] { --text: #111; --border: #ccc; --sumiu: #fff; }';
  const app = [{ arquivo: 'a.css', texto: ':root { --text: #eee; --border: #333; }\n.btn { color: var(--text); border: 1px solid var(--border); }\n.novo { background: #1a1a1a; }\n.ok { border-color: rgba(255,255,255,.1); /* x */ }\n/* color: #fff; */' }];
  const r = verificarTema(hub, app);
  assert.deepStrictEqual(r.faltando, ['--sumiu']);
  assert.deepStrictEqual(r.coresFixas.map((c) => c.linha), [3, 4]);
  assert.deepStrictEqual(verificarTema(hub, [{ arquivo: 'a.css', texto: '--text:1;--border:1;--sumiu-2:1;' }]).faltando, ['--sumiu'], '--sumiu-2 não vale como --sumiu');
});

test('tema: varre os .css do app e pula node_modules', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-tema-'));
  fs.mkdirSync(path.join(pasta, 'src')); fs.mkdirSync(path.join(pasta, 'node_modules'));
  fs.writeFileSync(path.join(pasta, 'src', 'a.css'), ':root{--text:1}');
  fs.writeFileSync(path.join(pasta, 'node_modules', 'b.css'), 'x');
  assert.deepStrictEqual(lerCssDoApp(pasta).map((c) => c.arquivo), [path.join('src', 'a.css')]);
  fs.rmSync(pasta, { recursive: true, force: true });
});

// Contra o Termix de verdade (pasta de desenvolvimento): só roda onde ela existe.
const pastaTermix = process.env.HUB_TERMIX_DEV || 'C:/Termix/termix';
test('tema: o Termix de desenvolvimento ainda tem todas as variáveis que o Hub controla', { skip: !fs.existsSync(path.join(pastaTermix, 'package.json')) && 'sem a pasta do Termix nesta máquina' }, () => {
  const r = verificarTema(cssHub, lerCssDoApp(pastaTermix));
  assert.deepStrictEqual(r.faltando, [], `o Termix deixou de ter: ${r.faltando.join(', ')}. Ajuste src/temas-apps/termix.css (docs/DECISOES.md §19).`);
});
