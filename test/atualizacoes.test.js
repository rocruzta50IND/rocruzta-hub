'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { compararVersoes, normalizarReleases, criarAtualizacoes } = require('../src/main/atualizacoes');
const { carregarCatalogo } = require('../src/main/apps');

const rel = (tag, extra = {}) => ({ tag_name: tag, name: tag, published_at: '2026-11-10T10:00:00Z', body: `notas ${tag}`, html_url: `https://github.com/x/y/releases/tag/${tag}`, ...extra });
const tmp = () => path.join(os.tmpdir(), `atu-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
const apps = [{ id: 'termix', repositorio: 'rocruzta50IND/termix' }, { id: 'desk', emBreve: true }];

test('compararVersoes: ordem numérica, com ou sem "v", e versão ilegível não conta como mais nova', () => {
  assert.equal(compararVersoes('0.6.4', '0.6.3'), 1);
  assert.equal(compararVersoes('v0.10.0', '0.9.9'), 1);
  assert.equal(compararVersoes('0.3.5', 'v0.6.4'), -1);
  assert.equal(compararVersoes('1.0.0', '1.0.0'), 0);
  assert.equal(compararVersoes('abc', '1.0.0'), 0);
});

test('normalizarReleases: tira rascunho, pré-lançamento e tag estranha; ordena da mais nova', () => {
  const lista = normalizarReleases([rel('v0.4.0'), rel('v0.6.0'), rel('v0.7.0', { draft: true }), rel('v0.8.0', { prerelease: true }), rel('nightly'), rel('v0.5.0', { body: null })]);
  assert.deepEqual(lista.map((r) => r.versao), ['0.6.0', '0.5.0', '0.4.0']);
  assert.equal(lista[1].notas, '', 'sem notas fica vazio, nada inventado');
  assert.deepEqual(normalizarReleases(null), []);
});

test('checar: versão nova vira aviso novo; igual ou menor não avisa; app "em breve" nem é consultado', async () => {
  const consultados = [];
  const a = criarAtualizacoes({ arquivo: tmp(), agora: () => 1000, buscar: async (repo) => { consultados.push(repo); return [rel('v0.6.4'), rel('v0.6.3')]; } });
  assert.equal(await a.checar(apps, { termix: '0.3.5' }), true);
  assert.deepEqual(consultados, ['rocruzta50IND/termix']);
  const l = a.listar({ termix: '0.3.5' }).termix;
  assert.equal(l.disponivel, true);
  assert.equal(l.versaoNova, '0.6.4');
  assert.equal(l.visto, false);
  assert.equal(l.detectadoEm, 1000);
  assert.equal(l.historico.length, 2);
  assert.equal(a.listar({ termix: '0.6.4' }).termix.disponivel, false, 'atualizou: o aviso some sozinho');
  assert.equal(a.listar({}).termix.disponivel, false, 'sem versão instalada conhecida não afirma nada');
});

test('o aviso não volta a cada checagem; versão ainda mais nova reabre o aviso', async () => {
  let releases = [rel('v0.6.4')];
  let t = 1000;
  const a = criarAtualizacoes({ arquivo: tmp(), agora: () => t, buscar: async () => releases });
  await a.checar(apps, { termix: '0.3.5' });
  assert.equal(a.marcarVisto('termix'), true);
  assert.equal(a.fecharAviso('termix'), true);
  t = 5000;
  await a.checar(apps, { termix: '0.3.5' });
  const l = a.listar({ termix: '0.3.5' }).termix;
  assert.equal(l.visto, true);
  assert.equal(l.avisoFechado, true);
  assert.equal(l.detectadoEm, 1000, 'a contagem dos 15 minutos não reinicia');
  releases = [rel('v0.7.0'), rel('v0.6.4')];
  t = 9000;
  await a.checar(apps, { termix: '0.3.5' });
  const n = a.listar({ termix: '0.3.5' }).termix;
  assert.equal(n.versaoNova, '0.7.0');
  assert.equal(n.visto, false);
  assert.equal(n.detectadoEm, 9000);
});

test('sem rede ou repositório fechado: mantém o último estado e não quebra', async () => {
  const arquivo = tmp();
  const a = criarAtualizacoes({ arquivo, buscar: async () => [rel('v0.6.4')] });
  await a.checar(apps, { termix: '0.3.5' });
  const b = criarAtualizacoes({ arquivo, buscar: async () => { throw new Error('sem rede'); } }); // reabre do arquivo
  assert.equal(await b.checar(apps, { termix: '0.3.5' }), false);
  assert.equal(b.listar({ termix: '0.3.5' }).termix.disponivel, true, 'o estado gravado sobrevive ao reinício');
  assert.equal(b.marcarVisto('desconhecido'), false);
});

test('Hub não baixa nem instala: o módulo só lê releases', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'atualizacoes.js'), 'utf8');
  assert.doesNotMatch(js, /spawn|execFile|child_process|createWriteStream|browser_download_url|assets/);
  assert.match(js, /api\.github\.com/);
});

test('renderer: indicativo em Apps só até ver o app; selo e histórico seguem; sem notas não inventa texto', () => {
  const renderer = path.join(__dirname, '..', 'src', 'renderer');
  const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
  const atu = { termix: { disponivel: true, versaoNova: '0.6.4', instalada: '0.3.5', visto: false, detectadoEm: 1, checadoEm: 2, historico: [{ versao: '0.6.4', data: '2026-11-12T11:49:07Z', notas: 'Corrige o terminal', url: 'u' }, { versao: '0.6.3', data: '2026-11-11T22:59:33Z', notas: '', url: 'u' }] } };
  const rodar = (extra) => vm.runInNewContext(`${['icons.js', 'catalogo.js', 'inicio.js'].map(read).join('\n')}
    definirCatalogo(${JSON.stringify(carregarCatalogo())}); definirEstados({ termix: { instalado: true, versao: '0.3.5' } }); definirAtualizacoes(${JSON.stringify(atu)}); ${extra}`);
  const lista = rodar('htmlApps();');
  assert.match(lista, /v0\.3\.5 → v0\.6\.4/);
  assert.match(lista, /class="selo-att">Atualização/);
  assert.equal(rodar(`avisoNaoVisto("termix")`), true);
  assert.equal(rodar(`ATU.termix.visto = true; avisoNaoVisto('termix')`), false);
  assert.equal(rodar(`ATU.termix.visto = true; comAtualizacao('termix')`), true, 'o selo continua depois de visto');
  const det = rodar(`LOJA.detalhe = 'termix'; htmlApps();`);
  assert.match(det, /<h2>Novidades<\/h2>/);
  assert.match(det, /class="btn att" data-releases="termix">Baixar v0\.6\.4/, 'botão de atualizar ao lado do Abrir');
  assert.match(det, /class="att-dest"><div class="att-dest-topo"><b>v0\.6\.4/, 'a versão mais nova fica em destaque');
  assert.match(det, /<details class="att-item"><summary><b>v0\.6\.3/, 'as anteriores ficam fechadas, para abrir ao clicar');
  assert.match(det, /Corrige o terminal/);
  assert.match(det, /Sem notas nesta versão/);
  assert.doesNotMatch(rodar(`definirAtualizacoes({}); LOJA.detalhe = 'termix'; htmlApps();`), /<h2>Novidades<\/h2>|Baixar v/);
  const shell = read('shell.js');
  assert.match(shell, /JANELA_AVISO = 15 \* 60 \* 1000/);
});

test('renderer: Desinstalar pede confirmação, some sem desinstalador e fica desligado com o app aberto', () => {
  const renderer = path.join(__dirname, '..', 'src', 'renderer');
  const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
  const rodar = (estado, extra = '') => vm.runInNewContext(`${['icons.js', 'catalogo.js', 'inicio.js'].map(read).join(String.fromCharCode(10))}
    definirCatalogo(${JSON.stringify(carregarCatalogo())}); definirEstados(${JSON.stringify({ termix: estado })}); LOJA.detalhe = 'termix'; ${extra} htmlApps();`);
  const des = { exe: 'x', args: [] };
  assert.match(rodar({ instalado: true, desinstalador: des }), /data-des="termix">Desinstalar/);
  assert.doesNotMatch(rodar({ instalado: true }), /Desinstalar/, 'sem desinstalador conhecido não oferece');
  assert.doesNotMatch(rodar({ instalado: false }), /Desinstalar/);
  const conf = rodar({ instalado: true, desinstalador: des }, `LOJA.desinstalar = 'termix';`);
  assert.match(conf, /Desinstalar o Termix\?/);
  assert.match(conf, /data-des-ok="termix"/);
  assert.match(conf, /data-des-cancelar/);
  assert.match(rodar({ instalado: true, desinstalador: des, rodando: true }), /<button class="btn ghost" disabled title="Feche o Termix/);
});

test('renderer: com o app rodando da pasta de desenvolvimento não oferece Desinstalar (seria o desinstalador de outra cópia)', () => {
  const renderer = path.join(__dirname, '..', 'src', 'renderer');
  const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
  const html = vm.runInNewContext(`${['icons.js', 'catalogo.js', 'inicio.js'].map(read).join(String.fromCharCode(10))}
    definirCatalogo(${JSON.stringify(carregarCatalogo())}); definirEstados(${JSON.stringify({ termix: { instalado: true, desinstalador: { exe: 'x', args: [] }, embutidoDev: true } })}); LOJA.detalhe = 'termix'; htmlApps();`);
  assert.doesNotMatch(html, /Desinstalar/);
});
