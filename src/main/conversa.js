'use strict';

// Chat da tela Início: uma conversa do Hub com o Claude Code (modelo Haiku, o mais barato), SEM ferramentas e SEM histórico.
// É independente do Termix: usa o login do próprio Claude Code, um processo filho em modo stream-json e uma pasta vazia.
// Cada conversa vive só enquanto o processo vive; "Nova conversa" ou fechar o Hub encerra tudo.
const { spawn, execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MODELO = 'haiku'; // alias do Claude Code: sempre o modelo mais barato da família
const INSTRUCAO = 'Você é o assistente do Rocruzta Hub, o centro de apps da Rocruzta (empresa de 5 pessoas). Responda em português do Brasil, de forma direta e curta. Você não tem ferramentas nem acesso a arquivos: só conversa.';

// Onde procurar o Claude Code no Windows (PATH primeiro, depois os lugares comuns de instalação).
function candidatos(env = process.env, home = os.homedir()) {
  const lista = [];
  for (const dir of String(env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const nome of ['claude.exe', 'claude.cmd']) lista.push(path.join(dir, nome));
  }
  lista.push(
    path.join(home, '.local', 'bin', 'claude.exe'),
    path.join(env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'npm', 'claude.cmd'),
    path.join(env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'Programs', 'claude', 'claude.exe'),
  );
  return lista;
}
function localizarClaude(existe = fs.existsSync, env, home) {
  return candidatos(env, home).find((p) => { try { return existe(p); } catch { return false; } }) || null;
}

function argumentos() {
  return ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--include-partial-messages', '--verbose',
    '--model', MODELO, '--tools', '', '--no-session-persistence', '--disable-slash-commands', '--strict-mcp-config',
    '--setting-sources', '', '--append-system-prompt', INSTRUCAO];
}

// Converte uma linha do stream-json no evento simples que a tela entende (ou null, para o que não interessa).
function interpretar(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.type === 'stream_event') {
    const d = obj.event && obj.event.delta;
    if (obj.event && obj.event.type === 'content_block_delta' && d && d.type === 'text_delta' && d.text) return { tipo: 'delta', texto: d.text };
    return null;
  }
  if (obj.type === 'result') return obj.is_error ? { tipo: 'fim', erro: String(obj.result || 'Falha ao responder.').slice(0, 500) } : { tipo: 'fim' };
  return null;
}

function criarConversa({ pasta, emit, localizar = localizarClaude }) {
  let atual = null; // { child, morto, err }

  const claude = () => localizar();
  const estado = () => { const c = claude(); return { disponivel: Boolean(c), caminho: c, modelo: MODELO }; };

  function iniciar() {
    const exe = claude();
    if (!exe) return { ok: false, erro: 'O Claude Code não foi encontrado neste computador. Instale-o e faça o login para usar o chat.' };
    fs.mkdirSync(pasta, { recursive: true });
    const cmd = exe.toLowerCase().endsWith('.cmd');
    const args = argumentos();
    let child;
    try {
      child = spawn(cmd ? 'cmd.exe' : exe, cmd ? ['/c', exe, ...args] : args, { cwd: pasta, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    } catch (e) { return { ok: false, erro: String((e && e.message) || e) }; }
    const rec = { child, morto: false, err: '' };
    atual = rec;
    child.stdin.on('error', () => { /* o processo encerrou no meio da escrita */ });
    let buf = '';
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (d) => {
      buf += d;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const linha = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!linha.startsWith('{')) continue;
        let ev = null;
        try { ev = interpretar(JSON.parse(linha)); } catch { /* linha incompleta */ }
        if (ev) emit(ev);
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (d) => { rec.err = (rec.err + d).slice(-1500); });
    child.on('error', (e) => { rec.err += String((e && e.message) || e); });
    child.on('close', () => {
      if (atual === rec) atual = null;
      if (!rec.morto) emit({ tipo: 'fim', erro: rec.err.trim() || 'A conversa foi encerrada. Envie outra mensagem para recomeçar.' });
    });
    return { ok: true };
  }

  function enviar(texto) {
    if (typeof texto !== 'string' || !texto.trim() || texto.length > 8000) return { ok: false, erro: 'Mensagem inválida.' };
    if (!atual || !atual.child.stdin.writable) { const r = iniciar(); if (!r.ok) return r; }
    atual.child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: texto } }) + '\n');
    return { ok: true };
  }

  function nova() {
    const rec = atual; atual = null;
    if (!rec) return;
    rec.morto = true;
    const pid = rec.child.pid;
    if (process.platform === 'win32' && pid) execFile('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true }, () => {});
    else { try { rec.child.kill(); } catch { /* já encerrado */ } }
  }

  return { estado, enviar, nova };
}

module.exports = { criarConversa, localizarClaude, candidatos, argumentos, interpretar, MODELO };
