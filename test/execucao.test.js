'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { desinstalarApp, estaRodando, anexarExecucao, ambienteLimpo, abrirApp, lerProcessos } = require('../src/main/execucao');
const { carregarCatalogo } = require('../src/main/apps');

const EXE = ['D:', 'Termix', 'Termix.exe'].join(path.win32.sep);
const estado = { instalado: true, pasta: path.win32.dirname(EXE), executavel: EXE, versao: '0.3.7' };

test('estaRodando: compara o caminho do executável, sem diferenciar maiúsculas nem barras', () => {
  assert.equal(estaRodando([EXE], EXE), true);
  assert.equal(estaRodando(['d:/termix/TERMIX.EXE'], EXE), true);
  assert.equal(estaRodando(['E:/Outro/Termix.exe'], EXE), false, 'mesmo nome, outro caminho');
  assert.equal(estaRodando([], EXE), false);
});

test('anexarExecucao: só marca rodando nos instalados e usa o nome do executável', async () => {
  const apps = carregarCatalogo().apps.filter((a) => !a.emBreve);
  let pedido = null;
  const r = await anexarExecucao(apps, { termix: estado }, async (nome) => { pedido = nome; return [EXE]; });
  assert.equal(pedido, 'Termix');
  assert.equal(r.termix.rodando, true);
  assert.equal(r.termix.pasta, estado.pasta);
  const parado = await anexarExecucao(apps, { termix: estado }, async () => []);
  assert.equal(parado.termix.rodando, false);
  const nao = await anexarExecucao(apps, { termix: { instalado: false } }, async () => { throw new Error('não deve consultar'); });
  assert.deepEqual(nao, { termix: { instalado: false } });
});

test('lerProcessos recusa nome de processo suspeito', async () => {
  assert.deepEqual(await lerProcessos("x'; calc; '"), []);
});

test('ambienteLimpo: tira variáveis do Electron e do Node, mantém o resto', () => {
  const env = ambienteLimpo({ ELECTRON_RUN_AS_NODE: '1', electron_enable_logging: '1', NODE_OPTIONS: '--x', PATH: 'p', APPDATA: 'a' });
  assert.deepEqual(env, { PATH: 'p', APPDATA: 'a' });
});

function filhoFalso(evento, arg) {
  const f = new EventEmitter();
  f.unrefChamado = false;
  f.unref = () => { f.unrefChamado = true; };
  setImmediate(() => f.emit(evento, arg));
  return f;
}

test('abrirApp: lança desvinculado do Hub, com a pasta do app e ambiente limpo', async () => {
  let chamada;
  let filho;
  const r = await abrirApp(estado, (exe, args, opcoes) => { chamada = { exe, args, opcoes }; filho = filhoFalso('spawn'); return filho; }, { ELECTRON_RUN_AS_NODE: '1', PATH: 'p' });
  assert.deepEqual(r, { ok: true });
  assert.equal(chamada.exe, EXE);
  assert.deepEqual(chamada.args, []);
  assert.equal(chamada.opcoes.detached, true);
  assert.equal(chamada.opcoes.stdio, 'ignore');
  assert.equal(chamada.opcoes.cwd, estado.pasta);
  assert.deepEqual(chamada.opcoes.env, { PATH: 'p' });
  assert.equal(filho.unrefChamado, true, 'o Hub não fica preso ao processo do app');
});

test('abrirApp: não instalado não lança nada; erro ao lançar vira falha', async () => {
  const nunca = () => { throw new Error('não deve lançar'); };
  assert.deepEqual(await abrirApp({ instalado: false }, nunca), { ok: false, motivo: 'nao-instalado' });
  assert.deepEqual(await abrirApp(undefined, nunca), { ok: false, motivo: 'nao-instalado' });
  assert.equal((await abrirApp(estado, () => filhoFalso('error', new Error('ENOENT')))).motivo, 'falha');
  assert.equal((await abrirApp(estado, () => { throw new Error('boom'); })).motivo, 'falha');
});

test('Hub não encerra nem controla processos de apps', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'execucao.js'), 'utf8');
  assert.doesNotMatch(js, /taskkill|Stop-Process|\.kill\(|process\.kill/);
});

test('renderer: selo "Em execução" em Apps, no seletor e na sidebar só quando a detecção diz', () => {
  const renderer = path.join(__dirname, '..', 'src', 'renderer');
  const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
  const rodar = (estados) => vm.runInNewContext(`${['icons.js', 'catalogo.js', 'inicio.js'].map(read).join('\n')}
    definirCatalogo(${JSON.stringify(carregarCatalogo())}); definirEstados(${JSON.stringify(estados)}); htmlApps();`);
  const on = rodar({ termix: { instalado: true, rodando: true } });
  assert.match(on, /class="rodando"[^>]*><i class="dot"><\/i>Em execução/);
  for (const e of [{ termix: { instalado: true, rodando: false } }, { termix: { instalado: true } }, null]) {
    assert.doesNotMatch(rodar(e), /Em execução/);
  }
  const shell = read('shell.js');
  assert.match(shell, /emExecucao\(app\.id\)/);
  assert.match(shell, /emExecucao\(a\.id\)/);
  assert.match(shell, /INTERVALO_ESTADOS/);
});

test('desinstalarApp: só com o app instalado, fechado e com desinstalador; nada é executado nos outros casos', async () => {
  const nunca = () => { throw new Error('não podia lançar'); };
  const des = { exe: 'D:\Termix\Uninstall Termix.exe', args: ['/allusers'] };
  assert.deepEqual(await desinstalarApp({ instalado: false }, nunca), { ok: false, motivo: 'nao-instalado' });
  assert.deepEqual(await desinstalarApp({ instalado: true }, nunca), { ok: false, motivo: 'sem-desinstalador' });
  assert.deepEqual(await desinstalarApp({ instalado: true, desinstalador: des, rodando: true }, nunca), { ok: false, motivo: 'em-execucao' });
  let recebido = null;
  assert.deepEqual(await desinstalarApp({ instalado: true, desinstalador: des, rodando: false }, async (d) => { recebido = d; return true; }), { ok: true });
  assert.deepEqual(recebido, des);
  assert.deepEqual(await desinstalarApp({ instalado: true, desinstalador: des }, async () => false), { ok: false, motivo: 'cancelado' });
});
