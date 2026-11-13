'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { criarAutoAtualizacao, criarAutoAtualizacaoFalsa, REPOSITORIO } = require('../src/main/autoatualizacao');

// get falso: responde por caminho.
function servidor(rotas) {
  return (opcoes, cb) => {
    const r = rotas[opcoes.path];
    const res = Readable.from(r ? [Buffer.from(r.corpo)] : []);
    res.statusCode = r ? 200 : 404;
    res.headers = { 'content-length': r ? String(Buffer.byteLength(r.corpo)) : '0' };
    res.setEncoding = (c) => Readable.prototype.setEncoding.call(res, c);
    process.nextTick(() => cb(res));
    return { on() { return this; }, setTimeout() { return this; }, destroy() {} };
  };
}
const sha = (t) => crypto.createHash('sha512').update(t).digest('base64');
const nome = (v) => `Rocruzta-Hub-Setup-${v}.exe`;
function cenario({ versao = '0.2.0', corpo = 'EXE-FALSO', hashYml = sha('EXE-FALSO'), tamanho = Buffer.byteLength('EXE-FALSO') } = {}) {
  const base = `/${REPOSITORIO}/releases/download/v${versao}`;
  const release = { tag_name: `v${versao}`, assets: [
    { name: nome(versao), browser_download_url: `https://github.com${base}/${nome(versao)}`, size: tamanho },
    { name: 'latest.yml', browser_download_url: `https://github.com${base}/latest.yml`, size: 1 }] };
  return { get: servidor({
    [`/repos/${REPOSITORIO}/releases/latest`]: { corpo: JSON.stringify(release) },
    [`${base}/${nome(versao)}`]: { corpo },
    [`${base}/latest.yml`]: { corpo: `files:\n  - url: ${nome(versao)}\n    sha512: ${hashYml}\n` },
  }) };
}
const pasta = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hub-auto-'));

test('auto-atualização: versão mais nova só é avisada; baixar e instalar só quando a pessoa atualiza', async () => {
  const temp = pasta(); const fases = []; const lancados = [];
  const a = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario(), aoMudar: (e) => fases.push(e.fase), iniciar: (exe, args) => lancados.push({ exe, args }) });
  const e = await a.checar();
  assert.strictEqual(e.fase, 'disponivel');
  assert.strictEqual(e.versao, '0.2.0');
  assert.deepStrictEqual(fs.readdirSync(temp), [], 'checar não baixa nada');
  const pronta = await a.atualizar();
  assert.strictEqual(pronta.fase, 'pronta');
  assert.strictEqual(pronta.modo, 'instalador', 'sem preparação, vale o instalador');
  assert.strictEqual(pronta.progresso, 1);
  assert.deepStrictEqual([...new Set(fases)], ['disponivel', 'baixando', 'pronta']);
  assert.strictEqual(lancados.length, 0, 'baixar não instala');
  assert.deepStrictEqual(a.aplicar(), { ok: true, versao: '0.2.0', modo: 'instalador' });
  assert.strictEqual(path.basename(lancados[0].exe), nome('0.2.0'));
  assert.deepStrictEqual(lancados[0].args, ['/S', '--updated', '--force-run', '/currentuser']);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('auto-atualização: com preparação, passa por "preparando", a barra só anda para a frente e a troca rápida substitui o instalador', async () => {
  const temp = pasta(); const eventos = []; const lancados = []; const trocas = [];
  const preparar = async (arquivo, versao, pct) => { assert.ok(fs.existsSync(arquivo)); [0, 50, 100].forEach(pct); return { dir: 'PREPARO-' + versao, manterExe: true }; };
  const a = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario(), aoMudar: (e) => eventos.push(e), preparar, iniciarTroca: (p) => { trocas.push(p); return true; }, iniciar: (exe) => lancados.push(exe) });
  await a.checar();
  const pronta = await a.atualizar();
  assert.strictEqual(pronta.modo, 'troca');
  assert.deepStrictEqual([...new Set(eventos.map((e) => e.fase))], ['disponivel', 'baixando', 'preparando', 'pronta']);
  const progresso = eventos.map((e) => e.progresso);
  assert.deepStrictEqual([...progresso].sort((x, y) => x - y), progresso, 'a barra nunca volta');
  assert.ok(eventos.some((e) => e.fase === 'preparando' && e.progresso > 0.7 && e.progresso < 1), 'a preparação ocupa o fim da barra');
  assert.deepStrictEqual(a.aplicar(), { ok: true, versao: '0.2.0', modo: 'troca' });
  assert.deepStrictEqual(trocas, [{ dir: 'PREPARO-0.2.0', manterExe: true }]);
  assert.strictEqual(lancados.length, 0, 'a troca rápida não roda o instalador');
  fs.rmSync(temp, { recursive: true, force: true });
});

test('auto-atualização: preparação que falha ou troca que não lança caem no instalador baixado', async () => {
  for (const variante of ['preparar-falha', 'troca-falha']) {
    const temp = pasta(); const lancados = [];
    const a = criarAutoAtualizacao({
      versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario(),
      preparar: async () => (variante === 'preparar-falha' ? null : { dir: 'X', manterExe: false }),
      iniciarTroca: () => false, iniciar: (exe) => lancados.push(exe),
    });
    await a.checar();
    const pronta = await a.atualizar();
    assert.strictEqual(pronta.modo, variante === 'preparar-falha' ? 'instalador' : 'troca');
    const r = a.aplicar();
    assert.strictEqual(r.ok, true);
    assert.strictEqual(r.modo, 'instalador');
    assert.strictEqual(lancados.length, 1);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('auto-atualização: mesma versão, versão antiga e sem rede não avisam nada', async () => {
  const temp = pasta();
  assert.strictEqual((await criarAutoAtualizacao({ versaoAtual: '0.2.0', pastaTemp: temp, opcoes: cenario() }).checar()).fase, 'nenhuma');
  assert.strictEqual((await criarAutoAtualizacao({ versaoAtual: '0.3.0', pastaTemp: temp, opcoes: cenario() }).checar()).fase, 'nenhuma');
  const sem = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: { get: servidor({}) } });
  assert.strictEqual((await sem.checar()).fase, 'nenhuma');
  assert.strictEqual(sem.aplicar().ok, false, 'sem instalador pronto não aplica');
  assert.deepStrictEqual(fs.readdirSync(temp), []);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('auto-atualização: já na versão da release, apaga o instalador que sobrou da atualização anterior', async () => {
  const temp = pasta();
  fs.writeFileSync(path.join(temp, nome('0.2.0')), 'sobra');
  await criarAutoAtualizacao({ versaoAtual: '0.2.0', pastaTemp: temp, opcoes: cenario() }).checar();
  assert.deepStrictEqual(fs.readdirSync(temp), []);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('auto-atualização: hash ou tamanho errado vira erro, apaga o arquivo e não deixa aplicar', async () => {
  for (const opts of [{ hashYml: 'errado' }, { tamanho: 999 }]) {
    const temp = pasta(); let lancou = false;
    const a = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario(opts), iniciar: () => { lancou = true; } });
    await a.checar();
    assert.strictEqual((await a.atualizar()).fase, 'erro');
    assert.deepStrictEqual(fs.readdirSync(temp), [], 'arquivo suspeito é apagado');
    assert.strictEqual(a.aplicar().ok, false);
    assert.strictEqual(lancou, false);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('auto-atualização: depois de pronta não baixa de novo; erro deixa tentar de novo; cliques repetidos esperam a mesma atualização', async () => {
  const temp = pasta(); let baixadas = 0;
  const opcoes = cenario(); const get = opcoes.get;
  opcoes.get = (o, cb) => { if (o.path.endsWith('.exe')) baixadas++; return get(o, cb); };
  const a = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes });
  await a.checar();
  await Promise.all([a.atualizar(), a.atualizar()]);
  await a.atualizar(); await a.checar();
  assert.strictEqual(baixadas, 1);
  assert.strictEqual(a.estado().fase, 'pronta');
  const b = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario({ hashYml: 'errado' }) });
  await b.checar();
  assert.strictEqual((await b.atualizar()).fase, 'erro');
  assert.strictEqual((await b.atualizar()).fase, 'erro', 'tenta de novo ao clicar outra vez (sem travar)');
  fs.rmSync(temp, { recursive: true, force: true });
});

test('auto-atualização falsa (HUB_ATUALIZACAO_FALSA): simula disponível, baixando, preparando e pronta', async () => {
  const fases = [];
  const f = criarAutoAtualizacaoFalsa({ aoMudar: (e) => fases.push(e.fase), passoMs: 0 });
  assert.strictEqual((await f.checar()).fase, 'disponivel');
  const final = await f.atualizar();
  assert.strictEqual(final.fase, 'pronta');
  assert.deepStrictEqual([...new Set(fases)], ['disponivel', 'baixando', 'preparando', 'pronta']);
  assert.strictEqual(f.aplicar().falso, true, 'não fecha o Hub de verdade');
});
