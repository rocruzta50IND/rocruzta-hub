'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { compararVersoes } = require('./atualizacoes');

// Detecção de apps instalados pelo registro do Windows (TASK-009). Só lê; nunca instala nem altera nada.
// O Termix aparece em HKLM\...\Uninstall como "Termix 0.3.7" e com InstallLocation vazio:
// a pasta se deduz do UninstallString (ver docs/DECISOES.md, seção 3).
const CHAVES = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
];

// Transforma a saída de `reg query <chave> /s` em [{ chave, valores: { Nome: 'texto' } }].
function lerSaidaReg(texto) {
  const entradas = [];
  let atual = null;
  for (const linha of String(texto).split(/\r?\n/)) {
    if (/^HK/i.test(linha)) {
      atual = { chave: linha.trim(), valores: {} };
      entradas.push(atual);
      continue;
    }
    const m = atual && /^\s{4}(\S.*?)\s{4}REG_\w+(?:\s{4}(.*))?$/.exec(linha);
    if (m) atual.valores[m[1]] = (m[2] || '').trim();
  }
  return entradas;
}

// Pasta do programa a partir do UninstallString: `"D:\Termix\Uninstall Termix.exe" /allusers` ou sem aspas.
function pastaDoComando(comando) {
  if (!comando) return null;
  const c = comando.trim();
  const caminho = c.startsWith('"') ? /^"([^"]+)"/.exec(c)?.[1] : /^(.+?\.exe)\b/i.exec(c)?.[1];
  return caminho && path.win32.isAbsolute(caminho) ? path.win32.dirname(caminho) : null;
}

// Comando de desinstalação do registro (`"D:\\Termix\\Uninstall Termix.exe" /allusers`) em { exe, args }.
// Só vale um .exe dentro da pasta do app e só as opções /allusers e /currentuser (nada de modo silencioso).
function comandoDesinstalar(texto, pasta) {
  if (!texto || !pasta) return null;
  const c = String(texto).trim();
  const m = c.startsWith('"') ? /^"([^"]+)"\s*(.*)$/.exec(c) : /^(.+?\.exe)\b\s*(.*)$/i.exec(c);
  if (!m) return null;
  const exe = m[1];
  const args = m[2].trim() ? m[2].trim().split(/\s+/) : [];
  const dentro = path.win32.isAbsolute(exe) && /\.exe$/i.test(exe) && path.win32.normalize(exe).toLowerCase().startsWith(path.win32.normalize(pasta).toLowerCase() + '\\');
  if (!dentro || args.some((x) => !/^\/(allusers|currentuser)$/i.test(x))) return null;
  return { exe, args };
}

const nomeBate = (displayName, registro) => {
  const nome = String(displayName || '').trim().toLowerCase();
  const base = registro.toLowerCase();
  return nome === base || nome.startsWith(`${base} `);
};

// Versão do código que está em disco (resources/app/package.json de um app Electron empacotado), ou null.
// O app se atualiza por cima dos arquivos e não corrige o DisplayVersion do registro (TASK-029); quem manda é o código.
function lerVersaoPacote(pasta) {
  try {
    const v = JSON.parse(fs.readFileSync(path.win32.join(pasta, 'resources', 'app', 'package.json'), 'utf8')).version;
    return /^\d+\.\d+\.\d+/.test(String(v)) ? String(v) : null;
  } catch { return null; }
}

// A versão em disco só vale quando é maior que a do registro (ou o registro não tem versão): nunca rebaixa.
function versaoReal(versaoRegistro, versaoDisco) {
  if (!versaoDisco) return versaoRegistro || null;
  if (!versaoRegistro) return versaoDisco;
  return compararVersoes(versaoDisco, versaoRegistro) > 0 ? versaoDisco : versaoRegistro;
}

// Procura o app entre as entradas do registro. `existe` confere o executável na pasta deduzida.
function acharApp(entradas, deteccao, existe = fs.existsSync, lerPacote = lerVersaoPacote) {
  for (const { valores: v } of entradas) {
    if (!nomeBate(v.DisplayName, deteccao.registro)) continue;
    const pasta = (v.InstallLocation && v.InstallLocation.trim()) || pastaDoComando(v.UninstallString);
    if (!pasta) continue;
    const executavel = path.win32.join(pasta, deteccao.executavel);
    if (!existe(executavel)) continue;
    const desinstalador = comandoDesinstalar(v.UninstallString, pasta);
    return { instalado: true, pasta, executavel, versao: versaoReal(v.DisplayVersion || null, lerPacote(pasta)), ...(desinstalador ? { desinstalador } : {}) };
  }
  return { instalado: false };
}

function consultarChave(chave) {
  return new Promise((resolve) => {
    // Chave inexistente (ex.: HKCU sem WOW6432Node) sai com erro e vale como "sem entradas".
    execFile('reg.exe', ['query', chave, '/s'], { windowsHide: true, maxBuffer: 64 * 1024 * 1024 }, (erro, saida) => {
      resolve(erro ? [] : lerSaidaReg(saida));
    });
  });
}

async function lerRegistro() {
  const partes = await Promise.all(CHAVES.map(consultarChave));
  return partes.flat();
}

// Estado de cada app do catálogo: { [id]: { instalado, pasta?, executavel?, versao? } }.
async function detectarApps(apps, ler = lerRegistro, existe = fs.existsSync, lerPacote = lerVersaoPacote) {
  const entradas = await ler();
  return Object.fromEntries(apps.map((a) => [a.id, acharApp(entradas, a.deteccao, existe, lerPacote)]));
}

module.exports = { CHAVES, lerSaidaReg, pastaDoComando, comandoDesinstalar, versaoReal, lerVersaoPacote, acharApp, detectarApps };
