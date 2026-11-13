'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Readable } = require('node:stream');
const { escolherInstalador, lerSha512, argumentosInstalacao, removerAtalhos, pedir, instalarApp } = require('../src/main/instalacao');

const assets = [{ nome: 'latest.yml' }, { nome: 'Termix-Setup-0.7.0.exe.blockmap' }, { nome: 'Termix-Setup-0.7.0.exe' }];

test('instalação: escolhe o instalador .exe e nunca o blockmap', () => {
  assert.strictEqual(escolherInstalador(assets).nome, 'Termix-Setup-0.7.0.exe');
  assert.strictEqual(escolherInstalador([{ nome: 'latest.yml' }]), null);
});

test('instalação: lê o sha512 do arquivo no latest.yml', () => {
  const yml = 'version: 0.7.0\nfiles:\n  - url: Termix-Setup-0.7.0.exe\n    sha512: AbC+/==\n    size: 10\npath: Termix-Setup-0.7.0.exe\nsha512: AbC+/==\n';
  assert.strictEqual(lerSha512(yml, 'Termix-Setup-0.7.0.exe'), 'AbC+/==');
  assert.strictEqual(lerSha512(yml, 'outro.exe'), null);
  assert.strictEqual(lerSha512('', 'x.exe'), null);
});

test('instalação: nova é só do usuário; atualização segue o modo já instalado', () => {
  assert.deepStrictEqual(argumentosInstalacao(null), { args: ['/S', '/currentuser'], elevar: false });
  assert.deepStrictEqual(argumentosInstalacao({ desinstalador: { exe: 'u.exe', args: ['/currentuser'] } }), { args: ['/S', '/currentuser'], elevar: false });
  assert.deepStrictEqual(argumentosInstalacao({ desinstalador: { exe: 'u.exe', args: ['/allusers'] } }), { args: ['/S', '/allusers'], elevar: true });
});

test('instalação: só apaga o atalho criado agora, com o nome do app', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-atalho-'));
  const novo = path.join(pasta, 'Termix.lnk'); const outro = path.join(pasta, 'Outro.lnk');
  fs.writeFileSync(novo, 'x'); fs.writeFileSync(outro, 'x');
  assert.deepStrictEqual(removerAtalhos('Termix', Date.now() + 60000, [pasta]), [], 'atalho antigo (de antes da instalação) fica');
  assert.deepStrictEqual(removerAtalhos('Termix', Date.now() - 1000, [pasta, path.join(pasta, 'nao-existe')]), [novo]);
  assert.ok(!fs.existsSync(novo) && fs.existsSync(outro), 'só o do app some');
  fs.rmSync(pasta, { recursive: true, force: true });
});

test('instalação: recusa endereços fora do GitHub e sem https', async () => {
  await assert.rejects(pedir('http://github.com/x'), /não permitido/);
  await assert.rejects(pedir('https://exemplo.com/x'), /não permitido/);
  await assert.rejects(pedir('lixo'), /inválido/);
});

// get falso: responde por caminho.
function servidor(rotas) {
  return (opcoes, cb) => {
    const r = rotas[opcoes.path];
    const res = Readable.from(r ? [Buffer.from(r.corpo)] : []);
    res.statusCode = r ? (r.status || 200) : 404;
    res.headers = { ...(r && r.headers), 'content-length': r ? String(Buffer.byteLength(r.corpo)) : '0' };
    res.setEncoding = (c) => Readable.prototype.setEncoding.call(res, c);
    process.nextTick(() => cb(res));
    return { on() { return this; }, setTimeout() { return this; }, destroy() {} };
  };
}
const crypto = require('node:crypto');
const sha = (t) => crypto.createHash('sha512').update(t).digest('base64');
function cenario({ corpo = 'EXE-FALSO', hashYml = sha('EXE-FALSO'), tamanho = Buffer.byteLength('EXE-FALSO') } = {}) {
  const release = { tag_name: 'v0.7.0', assets: [
    { name: 'Termix-Setup-0.7.0.exe', browser_download_url: 'https://github.com/o/r/releases/download/v0.7.0/Termix-Setup-0.7.0.exe', size: tamanho },
    { name: 'latest.yml', browser_download_url: 'https://github.com/o/r/releases/download/v0.7.0/latest.yml', size: 1 }] };
  const opcoes = { get: servidor({
    '/repos/o/r/releases/latest': { corpo: JSON.stringify(release) },
    '/o/r/releases/download/v0.7.0/Termix-Setup-0.7.0.exe': { corpo },
    '/o/r/releases/download/v0.7.0/latest.yml': { corpo: `files:\n  - url: Termix-Setup-0.7.0.exe\n    sha512: ${hashYml}\n` },
  }) };
  return opcoes;
}
const app = { id: 'termix', nome: 'Termix', repositorio: 'o/r', atalhoNaAreaDeTrabalho: false };

test('instalação: baixa, confere o hash, executa o instalador e apaga o arquivo', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-inst-'));
  const chamadas = []; const fases = [];
  const r = await instalarApp(app, null, { pastaTemp: temp, opcoes: cenario(), aoMudar: (d) => fases.push(d.fase), executarInstalador: async (c) => { chamadas.push(c); assert.ok(fs.existsSync(c.exe)); return { ok: true }; } });
  assert.deepStrictEqual(r, { ok: true, versao: '0.7.0' });
  assert.deepStrictEqual(chamadas[0].args, ['/S', '/currentuser']);
  assert.ok(fases.includes('baixando') && fases.includes('instalando'));
  assert.deepStrictEqual(fs.readdirSync(temp), [], 'instalador baixado é apagado');
  fs.rmSync(temp, { recursive: true, force: true });
});

test('instalação: hash errado ou tamanho errado não executa nada', async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-inst-'));
  let rodou = false;
  const exec = async () => { rodou = true; return { ok: true }; };
  assert.strictEqual((await instalarApp(app, null, { pastaTemp: temp, opcoes: cenario({ hashYml: 'errado' }), executarInstalador: exec })).motivo, 'arquivo-corrompido');
  assert.strictEqual((await instalarApp(app, null, { pastaTemp: temp, opcoes: cenario({ tamanho: 999 }), executarInstalador: exec })).motivo, 'arquivo-corrompido');
  assert.strictEqual(rodou, false);
  fs.rmSync(temp, { recursive: true, force: true });
});

test('instalação: app aberto, sem repositório e sem rede viram motivo, sem executar', async () => {
  assert.strictEqual((await instalarApp(app, { rodando: true })).motivo, 'em-execucao');
  assert.strictEqual((await instalarApp({ id: 'x', nome: 'X' }, null)).motivo, 'sem-repositorio');
  assert.strictEqual((await instalarApp(app, null, { opcoes: { get: servidor({}) } })).motivo, 'sem-rede');
});
