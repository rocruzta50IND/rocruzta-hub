'use strict';

const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

// Abrir apps e saber se estão em execução (TASK-010). O Hub só lança o executável e consulta processos:
// cada app segue com processo, janela e atualização próprios, e o Hub nunca encerra nem controla um app.

const PROCESSO_VALIDO = /^[\w. -]+$/;
const norm = (p) => path.win32.normalize(String(p)).toLowerCase();

// Caminhos dos executáveis dos processos com esse nome (um app Electron tem vários, todos com o mesmo caminho).
function lerProcessos(nome) {
  return new Promise((resolve) => {
    if (!PROCESSO_VALIDO.test(nome)) return resolve([]);
    const cmd = `[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-Process -Name '${nome}' -ErrorAction SilentlyContinue | ForEach-Object { $_.Path }`;
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd],
      { windowsHide: true, timeout: 8000, encoding: 'utf8' },
      (erro, saida) => resolve(erro ? [] : [...new Set(String(saida).split(/\r?\n/).map((l) => l.trim()).filter(Boolean))]));
  });
}

// "Em execução" = há processo vivo cujo executável é exatamente o do app instalado (nunca só pelo nome).
const estaRodando = (caminhos, executavel) => caminhos.some((c) => norm(c) === norm(executavel));

// Acrescenta `rodando` aos estados dos apps instalados. Falha ao consultar = não afirma nada (sem `rodando`).
async function anexarExecucao(apps, estados, ler = lerProcessos) {
  const saida = {};
  await Promise.all(apps.map(async (a) => {
    const est = estados[a.id];
    if (!est || !est.instalado) { saida[a.id] = est; return; }
    const nome = path.win32.basename(a.deteccao.executavel, '.exe');
    const caminhos = await ler(nome);
    saida[a.id] = { ...est, rodando: estaRodando(caminhos, est.executavel) };
  }));
  return saida;
}

// O app herda o ambiente do Hub; sem variáveis do Electron/Node que poderiam alterar o comportamento dele.
function ambienteLimpo(env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !/^(ELECTRON_|NODE_OPTIONS$)/i.test(k)));
}

// Abre o executável desvinculado do Hub. Abrir de novo traz a janela existente para a frente: o Termix tem trava
// de instância única e o segundo processo sai logo (docs/DECISOES.md, seção 3).
function abrirApp(estado, lancar = spawn, env = process.env) {
  if (!estado || !estado.instalado) return Promise.resolve({ ok: false, motivo: 'nao-instalado' });
  return new Promise((resolve) => {
    let filho;
    try {
      filho = lancar(estado.executavel, [], { cwd: estado.pasta, detached: true, stdio: 'ignore', env: ambienteLimpo(env) });
    } catch (erro) {
      return resolve({ ok: false, motivo: 'falha', detalhe: erro.message });
    }
    filho.once('error', (erro) => resolve({ ok: false, motivo: 'falha', detalhe: erro.message }));
    filho.once('spawn', () => { filho.unref(); resolve({ ok: true }); });
  });
}

module.exports = { lerProcessos, estaRodando, anexarExecucao, ambienteLimpo, abrirApp };
