'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

// Atualização do Hub sem esperar o instalador (TASK-045), no mesmo modelo do Termix (TASK-069/079):
// 1) o instalador baixado é extraído com o 7za (sem executá-lo) para uma pasta de preparo, com o Hub em uso;
// 2) quando a pessoa confirma, o Hub fecha e o script trocar-arquivos.ps1 troca os arquivos por renomeação e abre o Hub de novo.
// Sem Electron: testável com Node puro. Decisões em docs/DECISOES.md §20.

const NOME_EXE = 'Rocruzta Hub.exe';
// Arquivos centrais do motor Electron (grandes e estáveis). Se forem iguais, o .exe instalado não é trocado:
// o Windows já o conhece e o Smart App Control não barra um .exe novo e sem assinatura.
const ARQUIVOS_MOTOR = ['v8_context_snapshot.bin', 'snapshot_blob.bin', 'icudtl.dat', 'ffmpeg.dll', 'chrome_100_percent.pak'];

// A pasta de preparo fica DENTRO da pasta instalada (mesmo disco): a troca vira renomeação. Sem escrita ali, usa o LOCALAPPDATA.
function pastaPreparo(execPath, env = process.env) {
  const preferida = path.join(path.dirname(execPath), '.update');
  try {
    fs.mkdirSync(preferida, { recursive: true });
    const t = path.join(preferida, '.w');
    fs.writeFileSync(t, '1');
    fs.unlinkSync(t);
    return preferida;
  } catch { /* pasta instalada sem escrita */ }
  return path.join(env.LOCALAPPDATA || os.tmpdir(), 'rocruzta-hub-atualizacao', 'preparo');
}

function mesmoMotor(instalada, preparada) {
  try {
    for (const f of ARQUIVOS_MOTOR) if (!fs.readFileSync(path.join(instalada, f)).equals(fs.readFileSync(path.join(preparada, f)))) return false;
    return true;
  } catch { return false; }
}

const preparoValido = (dir, nomeExe = NOME_EXE) => fs.existsSync(path.join(dir, nomeExe)) && fs.existsSync(path.join(dir, 'resources', 'app.asar'));

// Extrai o instalador (um arquivo NSIS com o app dentro) para `destino`. aoPercentual recebe 0..100. Resolve true/false.
function extrairInstalador({ sevenZ, arquivo, destino, aoPercentual = () => {} }) {
  return new Promise((resolve) => {
    try {
      if (!sevenZ || !fs.existsSync(sevenZ) || !fs.existsSync(arquivo)) return resolve(false);
      fs.rmSync(destino, { recursive: true, force: true });
      fs.mkdirSync(destino, { recursive: true });
      const p = spawn(sevenZ, ['x', '-y', '-bsp1', '-bso0', '-bse0', '-o' + destino, arquivo], { windowsHide: true });
      let buf = '';
      p.stdout.on('data', (d) => {
        buf = (buf + d.toString()).slice(-200);
        const todos = buf.match(/\d{1,3}(?=%)/g);
        if (todos) aoPercentual(Math.min(100, Number(todos[todos.length - 1])));
      });
      p.on('error', () => resolve(false));
      p.on('close', (codigo) => resolve(codigo === 0 || codigo === 1)); // 1 = avisos (o cabeçalho do instalador não é 7z puro)
    } catch { resolve(false); }
  });
}

// Lança um script PowerShell solto da árvore do Hub (sobrevive ao fechamento dele). O cmd intermediário sai logo e o
// spawnSync espera por ele, o que garante que o PowerShell já existe antes de o Hub terminar.
function lancarScript(origem, nomeTemp, params, pastaTemp = os.tmpdir()) {
  if (process.platform !== 'win32') return false;
  try {
    const tmp = path.join(pastaTemp, nomeTemp);
    fs.writeFileSync(tmp, '﻿' + fs.readFileSync(origem, 'utf8').replace(/^﻿/, ''), 'utf8');
    const args = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', tmp];
    for (const [k, v] of Object.entries(params)) args.push('-' + k, String(v));
    const q = (x) => '"' + String(x).replace(/"/g, '') + '"';
    const r = spawnSync('cmd.exe', ['/d /s /c "start "" /B powershell.exe ' + args.map(q).join(' ') + '"'], { stdio: 'ignore', windowsHide: true, windowsVerbatimArguments: true, timeout: 15000 });
    return !r.error;
  } catch { return false; }
}

module.exports = { NOME_EXE, ARQUIVOS_MOTOR, pastaPreparo, mesmoMotor, preparoValido, extrairInstalador, lancarScript };
