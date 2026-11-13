'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const { criarAutoAtualizacao, REPOSITORIO } = require('../src/main/autoatualizacao');

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

test('auto-atualização: versão mais nova é baixada, conferida e fica pronta; só instala ao aplicar', async () => {
  const temp = pasta(); const fases = []; const lancados = [];
  const a = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario(), aoMudar: (e) => fases.push(e.fase), iniciar: (exe, args) => lancados.push({ exe, args }) });
  const e = await a.checar();
  assert.strictEqual(e.fase, 'pronta');
  assert.strictEqual(e.versao, '0.2.0');
  assert.deepStrictEqual(fases, ['baixando', 'pronta']);
  assert.strictEqual(lancados.length, 0, 'baixar não instala');
  const r = a.aplicar();
  assert.deepStrictEqual(r, { ok: true, versao: '0.2.0' });
  assert.strictEqual(path.basename(lancados[0].exe), nome('0.2.0'));
  assert.deepStrictEqual(lancados[0].args, ['/S', '--updated', '--force-run', '/currentuser']);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('auto-atualização: mesma versão, versão antiga e sem rede não baixam nada', async () => {
  const temp = pasta();
  assert.strictEqual((await criarAutoAtualizacao({ versaoAtual: '0.2.0', pastaTemp: temp, opcoes: cenario() }).checar()).fase, 'nenhuma');
  assert.strictEqual((await criarAutoAtualizacao({ versaoAtual: '0.3.0', pastaTemp: temp, opcoes: cenario() }).checar()).fase, 'nenhuma');
  const sem = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: { get: servidor({}) } });
  assert.strictEqual((await sem.checar()).fase, 'nenhuma');
  assert.strictEqual(sem.aplicar().ok, false, 'sem instalador pronto não aplica');
  assert.deepStrictEqual(fs.readdirSync(temp), []);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('auto-atualização: hash ou tamanho errado vira erro, apaga o arquivo e não deixa aplicar', async () => {
  for (const opts of [{ hashYml: 'errado' }, { tamanho: 999 }]) {
    const temp = pasta(); let lancou = false;
    const a = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario(opts), iniciar: () => { lancou = true; } });
    assert.strictEqual((await a.checar()).fase, 'erro');
    assert.deepStrictEqual(fs.readdirSync(temp), [], 'arquivo suspeito é apagado');
    assert.strictEqual(a.aplicar().ok, false);
    assert.strictEqual(lancou, false);
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test('auto-atualização: depois de pronta não baixa de novo; erro permite nova tentativa', async () => {
  const temp = pasta(); let baixadas = 0;
  const opcoes = cenario(); const get = opcoes.get;
  opcoes.get = (o, cb) => { if (o.path.endsWith('.exe')) baixadas++; return get(o, cb); };
  const a = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes });
  await a.checar(); await a.checar();
  assert.strictEqual(baixadas, 1);
  const b = criarAutoAtualizacao({ versaoAtual: '0.1.0', pastaTemp: temp, opcoes: cenario({ hashYml: 'errado' }) });
  assert.strictEqual((await b.checar()).fase, 'erro');
  assert.strictEqual((await b.checar()).fase, 'erro', 'tenta de novo na próxima checagem (sem travar)');
  fs.rmSync(temp, { recursive: true, force: true });
});
