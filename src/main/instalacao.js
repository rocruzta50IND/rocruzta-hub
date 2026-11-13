'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const https = require('node:https');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');

// Instalar e atualizar apps pelas releases públicas do GitHub (TASK-016). O Hub baixa o instalador que o PRÓPRIO app
// publica, confere o tamanho e o hash (latest.yml), e o executa em modo silencioso. Nada do app é alterado; o único
// arquivo que o Hub apaga é o atalho que o instalador cria na área de trabalho, quando o catálogo diz `atalhoNaAreaDeTrabalho: false`
// (a ideia é que só o Hub fique lá). Sem Electron: testável com Node puro.

const HOSTS = /^(api\.github\.com|github\.com|([a-z0-9-]+\.)*githubusercontent\.com)$/i;
const CABECALHOS = { 'User-Agent': 'Rocruzta-Hub', Accept: 'application/octet-stream, application/vnd.github+json' };

function pedir(url, { get = https.get, tempo = 20000, redirecoes = 5 } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(url); } catch { return reject(new Error('endereço inválido')); }
    if (u.protocol !== 'https:' || !HOSTS.test(u.hostname)) return reject(new Error('endereço não permitido'));
    const req = get({ host: u.hostname, path: u.pathname + u.search, headers: CABECALHOS }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirecoes <= 0) return reject(new Error('redirecionamentos demais'));
        return resolve(pedir(new URL(res.headers.location, url).toString(), { get, tempo, redirecoes: redirecoes - 1 }));
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`servidor respondeu ${res.statusCode}`)); }
      resolve(res);
    });
    req.on('error', reject);
    req.setTimeout(tempo, () => req.destroy(new Error('tempo esgotado')));
  });
}

async function lerTexto(url, opcoes) {
  const res = await pedir(url, opcoes);
  return new Promise((resolve, reject) => {
    let corpo = '';
    res.setEncoding('utf8');
    res.on('data', (c) => { corpo += c; if (corpo.length > 2e6) res.destroy(new Error('resposta grande demais')); });
    res.on('end', () => resolve(corpo));
    res.on('error', reject);
  });
}

// Última release publicada do repositório (dono/repo): { versao, assets: [{ nome, url, tamanho }] }.
async function ultimaRelease(repo, opcoes) {
  const r = JSON.parse(await lerTexto(`https://api.github.com/repos/${repo}/releases/latest`, opcoes));
  return {
    versao: String(r.tag_name || '').replace(/^v/i, ''),
    assets: (r.assets || []).map((a) => ({ nome: String(a.name), url: String(a.browser_download_url), tamanho: Number(a.size) || 0 })),
  };
}

// Instalador do Windows entre os arquivos da release: "...Setup...exe" (nunca o .blockmap).
const escolherInstalador = (assets) => (assets || []).find((a) => /setup.*\.exe$/i.test(a.nome)) || null;

// sha512 (base64) que o latest.yml do electron-builder registra para o arquivo. null se não houver.
function lerSha512(yml, nomeArquivo) {
  const linhas = String(yml || '').split(/\r?\n/);
  for (let i = 0; i < linhas.length; i++) {
    const m = /^\s*-?\s*url:\s*(.+?)\s*$/.exec(linhas[i]);
    if (m && m[1].replace(/^['"]|['"]$/g, '') === nomeArquivo) {
      for (let j = i + 1; j < Math.min(i + 4, linhas.length); j++) { const s = /^\s*sha512:\s*(\S+)\s*$/.exec(linhas[j]); if (s) return s[1]; }
    }
  }
  return null;
}

// Baixa para `destino`, devolvendo { tamanho, sha512 }. `aoProgredir(0..1)` é chamado enquanto baixa.
async function baixar(url, destino, aoProgredir = () => {}, opcoes) {
  const res = await pedir(url, opcoes);
  const total = Number(res.headers['content-length']) || 0;
  const hash = crypto.createHash('sha512');
  let lidos = 0;
  await new Promise((resolve, reject) => {
    const saida = fs.createWriteStream(destino);
    res.on('data', (c) => { lidos += c.length; hash.update(c); if (total) aoProgredir(Math.min(1, lidos / total)); });
    res.on('error', (e) => { saida.destroy(); reject(e); });
    saida.on('error', reject);
    saida.on('finish', resolve);
    res.pipe(saida);
  });
  return { tamanho: lidos, sha512: hash.digest('base64') };
}

// Argumentos do instalador NSIS do electron-builder. Instalação nova: só para o usuário (sem administrador). Atualização:
// o mesmo modo da instalação que já existe (o desinstalador registrado diz se foi para todos os usuários).
function argumentosInstalacao(estado) {
  const todos = Boolean(estado && estado.desinstalador && (estado.desinstalador.args || []).includes('/allusers'));
  return { args: ['/S', todos ? '/allusers' : '/currentuser'], elevar: todos };
}

function executar({ exe, args, elevar }, tempo = 10 * 60 * 1000) {
  return new Promise((resolve) => {
    if (elevar) {
      const cmd = '$p = Start-Process -FilePath $env:HUB_EXE -ArgumentList $env:HUB_ARGS -Verb RunAs -Wait -PassThru; exit $p.ExitCode';
      return execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: tempo, env: { ...process.env, HUB_EXE: exe, HUB_ARGS: args.join(' ') } }, (erro) => resolve(erro ? { ok: false, codigo: erro.code } : { ok: true }));
    }
    execFile(exe, args, { windowsHide: true, timeout: tempo }, (erro) => resolve(erro ? { ok: false, codigo: erro.code } : { ok: true }));
  });
}

// Apaga o atalho "<Nome>.lnk" que o instalador acabou de criar na área de trabalho (só se foi criado ou alterado depois de `desde`).
function removerAtalhos(nome, desde, pastas, fsm = fs) {
  const removidos = [];
  for (const pasta of pastas) {
    const arq = path.join(pasta, `${nome}.lnk`);
    try {
      if (fsm.statSync(arq).mtimeMs >= desde - 2000) { fsm.unlinkSync(arq); removidos.push(arq); }
    } catch { /* não existe ou sem permissão: segue */ }
  }
  return removidos;
}

const pastasAreaDeTrabalho = (env = process.env) => [path.join(env.USERPROFILE || os.homedir(), 'Desktop'), path.join(env.PUBLIC || 'C:\\Users\\Public', 'Desktop'), env.OneDrive && path.join(env.OneDrive, 'Desktop')].filter(Boolean);

// Instala ou atualiza `app` (entrada do catálogo). `estado` = detecção atual. Devolve { ok, versao } ou { ok:false, motivo }.
async function instalarApp(app, estado, { pastaTemp = path.join(os.tmpdir(), 'rocruzta-hub'), aoMudar = () => {}, opcoes, executarInstalador = executar, agora = Date.now } = {}) {
  if (!app || !app.repositorio) return { ok: false, motivo: 'sem-repositorio' };
  if (estado && estado.rodando) return { ok: false, motivo: 'em-execucao' };
  let arquivo = null;
  try {
    aoMudar({ fase: 'buscando', progresso: 0 });
    let rel;
    try { rel = await ultimaRelease(app.repositorio, opcoes); } catch { return { ok: false, motivo: 'sem-rede' }; }
    const asset = escolherInstalador(rel.assets);
    if (!asset) return { ok: false, motivo: 'sem-instalador' };
    fs.mkdirSync(pastaTemp, { recursive: true });
    arquivo = path.join(pastaTemp, asset.nome);
    aoMudar({ fase: 'baixando', progresso: 0 });
    let baixado;
    try { baixado = await baixar(asset.url, arquivo, (p) => aoMudar({ fase: 'baixando', progresso: p }), opcoes); } catch { return { ok: false, motivo: 'sem-rede' }; }
    if (asset.tamanho && baixado.tamanho !== asset.tamanho) return { ok: false, motivo: 'arquivo-corrompido' };
    const yml = rel.assets.find((a) => /^latest\.yml$/i.test(a.nome));
    if (yml) {
      let esperado = null;
      try { esperado = lerSha512(await lerTexto(yml.url, opcoes), asset.nome); } catch { /* sem latest.yml legível: vale o tamanho */ }
      if (esperado && esperado !== baixado.sha512) return { ok: false, motivo: 'arquivo-corrompido' };
    }
    aoMudar({ fase: 'instalando', progresso: 1 });
    const inicio = agora();
    const { args, elevar } = argumentosInstalacao(estado);
    const r = await executarInstalador({ exe: arquivo, args, elevar });
    if (!r.ok) return { ok: false, motivo: elevar ? 'cancelado' : 'falha-instalador' };
    if (app.atalhoNaAreaDeTrabalho === false) removerAtalhos(app.nome, inicio, pastasAreaDeTrabalho());
    return { ok: true, versao: rel.versao };
  } catch { return { ok: false, motivo: 'falha' }; } finally {
    if (arquivo) { try { fs.unlinkSync(arquivo); } catch { /* já removido */ } }
  }
}

module.exports = { pedir, lerTexto, ultimaRelease, escolherInstalador, lerSha512, baixar, argumentosInstalacao, removerAtalhos, pastasAreaDeTrabalho, instalarApp };
