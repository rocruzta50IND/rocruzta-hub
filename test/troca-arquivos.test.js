'use strict';
// Troca de arquivos da atualização do Hub (TASK-045): extração do instalador, comparação do motor e o script de troca.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { NOME_EXE, ARQUIVOS_MOTOR, pastaPreparo, mesmoMotor, preparoValido, extrairInstalador } = require('../src/main/troca-arquivos');

const raiz = path.join(__dirname, '..');
const sevenZ = path.join(raiz, 'vendor', '7za.exe');
const script = path.join(raiz, 'src', 'main', 'trocar-arquivos.ps1');
const windows = process.platform === 'win32';
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hub-troca-'));
const gravar = (dir, rel, conteudo) => { const f = path.join(dir, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, conteudo); };
const ler = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

// Uma "instalação" falsa: exe, motor, locales e o app.asar da versão pedida.
function instalacao(dir, versao, motor = 'motor-1') {
  gravar(dir, NOME_EXE, 'exe-' + versao);
  for (const f of ARQUIVOS_MOTOR) gravar(dir, f, motor);
  gravar(dir, 'locales/pt-BR.pak', 'locale-' + versao);
  gravar(dir, 'resources/app.asar', 'asar-' + versao);
  gravar(dir, 'Uninstall Rocruzta Hub.exe', 'desinstalador');
}
function trocar(src, dst, { keepExe = 0, restart = 0, parentPid = 0 } = {}) {
  const log = path.join(path.dirname(src), 'troca.log');
  const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script,
    '-ParentPid', String(parentPid), '-Src', src, '-Dst', dst, '-Exe', NOME_EXE, '-Restart', String(restart), '-KeepExe', String(keepExe), '-Log', log], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  return fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '';
}

test('troca-arquivos: preparoValido exige o exe e o app.asar; mesmoMotor compara os arquivos do motor', () => {
  const a = temp(); const b = temp();
  assert.strictEqual(preparoValido(a), false);
  instalacao(a, '1'); instalacao(b, '2');
  assert.strictEqual(preparoValido(a), true);
  assert.strictEqual(mesmoMotor(a, b), true);
  gravar(b, 'icudtl.dat', 'outro-motor');
  assert.strictEqual(mesmoMotor(a, b), false, 'motor diferente: o exe também precisa ser trocado');
  assert.strictEqual(mesmoMotor(a, path.join(a, 'nao-existe')), false);
  fs.rmSync(a, { recursive: true, force: true }); fs.rmSync(b, { recursive: true, force: true });
});

test('troca-arquivos: a pasta de preparo fica dentro da pasta instalada', () => {
  const inst = temp();
  const p = pastaPreparo(path.join(inst, NOME_EXE));
  assert.strictEqual(p, path.join(inst, '.update'));
  assert.ok(fs.existsSync(p));
  fs.rmSync(inst, { recursive: true, force: true });
});

test('troca-arquivos: extrairInstalador extrai com o 7za e avisa o percentual', { skip: !windows || !fs.existsSync(sevenZ) }, async () => {
  const base = temp(); const origem = path.join(base, 'origem'); const destino = path.join(base, 'destino');
  instalacao(origem, '3');
  const arquivo = path.join(base, 'pacote.7z');
  assert.strictEqual(spawnSync(sevenZ, ['a', '-bso0', '-bse0', arquivo, path.join(origem, '*')]).status, 0);
  const pcts = [];
  assert.strictEqual(await extrairInstalador({ sevenZ, arquivo, destino, aoPercentual: (p) => pcts.push(p) }), true);
  assert.strictEqual(preparoValido(destino), true);
  assert.strictEqual(ler(destino, 'resources/app.asar'), 'asar-3');
  assert.ok(pcts.every((p) => p >= 0 && p <= 100));
  assert.strictEqual(await extrairInstalador({ sevenZ, arquivo: path.join(base, 'nao-existe.exe'), destino }), false);
  assert.strictEqual(await extrairInstalador({ sevenZ: path.join(base, 'sem-7za.exe'), arquivo, destino }), false);
  fs.rmSync(base, { recursive: true, force: true });
});

test('troca-arquivos: o script troca por renomeação, mantém o exe do mesmo motor e limpa as sobras', { skip: !windows }, () => {
  const dst = temp(); instalacao(dst, '1');
  const src = path.join(dst, '.update', '2'); instalacao(src, '2');
  const log = trocar(src, dst, { keepExe: 1 });
  assert.match(log, /troca por renomeação concluída/);
  assert.strictEqual(ler(dst, 'resources/app.asar'), 'asar-2');
  assert.strictEqual(ler(dst, 'locales/pt-BR.pak'), 'locale-2');
  assert.strictEqual(ler(dst, NOME_EXE), 'exe-1', 'mesmo motor: o exe instalado fica');
  assert.strictEqual(ler(dst, 'Uninstall Rocruzta Hub.exe').length > 0, true);
  assert.ok(!fs.existsSync(src), 'a pasta de preparo some');
  assert.ok(!fs.existsSync(path.join(dst, '.old')), 'as sobras da versão antiga somem');
  fs.rmSync(dst, { recursive: true, force: true });
});

test('troca-arquivos: com o motor novo, o exe também é trocado', { skip: !windows }, () => {
  const dst = temp(); instalacao(dst, '1');
  const src = path.join(dst, '.update', '2'); instalacao(src, '2', 'motor-2');
  trocar(src, dst, { keepExe: 0 });
  assert.strictEqual(ler(dst, NOME_EXE), 'exe-2');
  assert.strictEqual(ler(dst, 'icudtl.dat'), 'motor-2');
  fs.rmSync(dst, { recursive: true, force: true });
});

test('troca-arquivos: pasta de preparo incompleta não troca nada', { skip: !windows }, () => {
  const dst = temp(); instalacao(dst, '1');
  const src = path.join(dst, '.update', '2'); gravar(src, 'resources/outro.txt', 'x'); // sem exe e sem app.asar
  const log = trocar(src, dst);
  assert.match(log, /incompleta/);
  assert.strictEqual(ler(dst, 'resources/app.asar'), 'asar-1');
  fs.rmSync(dst, { recursive: true, force: true });
});

test('troca-arquivos: sem a pasta de preparo dentro da instalada, copia por cima (reserva)', { skip: !windows }, () => {
  const dst = temp(); instalacao(dst, '1');
  const src = temp(); instalacao(src, '2');
  const log = trocar(src, dst, { keepExe: 1 });
  assert.match(log, /robocopy saiu com/);
  assert.strictEqual(ler(dst, 'resources/app.asar'), 'asar-2');
  assert.strictEqual(ler(dst, NOME_EXE), 'exe-1');
  fs.rmSync(dst, { recursive: true, force: true }); fs.rmSync(src, { recursive: true, force: true });
});

test('troca-arquivos: o script espera o app terminar antes de trocar', { skip: !windows }, () => {
  const dst = temp(); instalacao(dst, '1');
  const src = path.join(dst, '.update', '2'); instalacao(src, '2');
  const pai = require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 1500)'], { stdio: 'ignore' });
  const t0 = Date.now();
  trocar(src, dst, { parentPid: pai.pid });
  assert.ok(Date.now() - t0 >= 1000, 'esperou o processo pai sair');
  assert.strictEqual(ler(dst, 'resources/app.asar'), 'asar-2');
  fs.rmSync(dst, { recursive: true, force: true });
});
