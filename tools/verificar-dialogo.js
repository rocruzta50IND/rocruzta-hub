'use strict';
// Prova que o diálogo de arquivo de um app embutido abre PRESO à janela do Hub (TASK-039) e que fechar/cancelar devolve a
// resposta ao app. Abre o Hub de desenvolvimento (com o Termix da pasta HUB_TERMIX_DEV, padrão C:/Termix/termix), entra no
// Termix, pede "Escolher pasta" e confere o dono da janela do Windows. Uso: node tools/verificar-dialogo.js (fecha o app no fim).
const { spawn, execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.join(__dirname, '..');
const exe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALHOU'} ${name}${extra ? ' -> ' + extra : ''}`); };
const janelas = (pid) => execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'janelas-do-processo.ps1'), '-ProcessId', String(pid)], { encoding: 'utf8' })
  .split(/\r?\n/).filter(Boolean).map((l) => { const [h, dono, classe, ...t] = l.split('|'); return { h, dono, classe, titulo: t.join('|') }; });

async function conectar(alvo) {
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr, aguardar = false) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: aguardar, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  return { ev, fechar: () => ws.close() };
}
const alvos = async () => (await (await fetch('http://127.0.0.1:9336/json')).json());

(async () => {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'hub-dialogo-'));
  const child = spawn(exe, ['.', '--remote-debugging-port=9336'], { cwd: root, stdio: 'ignore', env: { ...process.env, HUB_DADOS: dados } });
  try {
    let hub;
    for (let i = 0; i < 60 && !hub; i++) { await sleep(500); try { const t = (await alvos()).find((x) => x.type === 'page' && !x.url.startsWith('http://127.0.0.1:')); if (t) hub = await conectar(t); } catch { /* subindo */ } }
    if (!hub) throw new Error('Hub não respondeu no DevTools');
    for (let i = 0; i < 60 && !(await hub.ev('!!document.querySelector("#side [data-app=termix]")')); i++) await sleep(250);
    await hub.ev('document.querySelector("#side [data-app=termix]").click()');
    let termix;
    for (let i = 0; i < 120 && !termix; i++) { await sleep(500); try { const t = (await alvos()).find((x) => x.type === 'page' && x.url.startsWith('http://127.0.0.1:')); if (t) { const c = await conectar(t); if (await c.ev('typeof window.termix === "object" && !!window.termix.pickFolder')) termix = c; else c.fechar(); } } catch { /* carregando */ } }
    check('Termix abriu dentro do Hub', Boolean(termix));
    if (!termix) throw new Error('sem a tela do Termix');
    await sleep(1500);
    const antes = janelas(child.pid).length;
    await termix.ev('window.__r = "pendente"; window.termix.pickFolder().then((r) => { window.__r = r; }); 1');
    let dialogo;
    for (let i = 0; i < 40 && !dialogo; i++) {
      await sleep(250);
      const todas = janelas(child.pid);
      const hubJanela = todas.find((j) => j.dono === '0' && j.titulo === 'Rocruzta Hub') || todas.find((j) => j.dono === '0');
      dialogo = todas.find((j) => j.dono !== '0' && hubJanela && j.dono === hubJanela.h);
      if (dialogo) check('o diálogo é do processo do Hub e tem a janela do Hub como DONO (preso, modal)', true, `${dialogo.classe} "${dialogo.titulo}" dono=${dialogo.dono}`);
    }
    if (!dialogo) check('o diálogo abriu preso à janela do Hub', false, `janelas do Hub: ${JSON.stringify(janelas(child.pid))}`);
    check('nenhuma janela solta nova (sem dono) apareceu na barra de tarefas', janelas(child.pid).filter((j) => j.dono === '0').length <= antes, `${janelas(child.pid).filter((j) => j.dono === '0').length} janelas de topo sem dono`);
    check('enquanto o diálogo está aberto o app espera a resposta', (await termix.ev('window.__r')) === 'pendente');
    if (dialogo) execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'janelas-do-processo.ps1'), '-ProcessId', String(child.pid), '-Fechar', dialogo.h]);
    for (let i = 0; i < 40 && (await termix.ev('window.__r')) === 'pendente'; i++) await sleep(250);
    check('fechar o diálogo devolve "nenhuma pasta" (null) ao Termix', (await termix.ev('window.__r')) === null, JSON.stringify(await termix.ev('window.__r')));
    check('o diálogo sumiu', !janelas(child.pid).some((j) => dialogo && j.h === dialogo.h));
    // segunda vez: digita uma pasta no diálogo e confirma (caminho de sucesso: a pasta escolhida chega ao Termix)
    const pastaAlvo = path.join(os.tmpdir());
    await termix.ev('window.__r = "pendente"; window.termix.pickFolder().then((r) => { window.__r = r; }); 1');
    let d2;
    for (let i = 0; i < 40 && !d2; i++) { await sleep(250); d2 = janelas(child.pid).find((j) => j.dono !== '0' && j.classe === '#32770'); }
    check('o diálogo abre de novo', Boolean(d2));
    if (d2) {
      await sleep(800);
      execFileSync('powershell', ['-NoProfile', '-Command', "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('" + pastaAlvo.replace(/[+^%~(){}\[\]]/g, '{$&}') + "{ENTER}'); Start-Sleep -Milliseconds 600; [System.Windows.Forms.SendKeys]::SendWait('{ENTER}')"]);
      for (let i = 0; i < 40 && (await termix.ev('window.__r')) === 'pendente'; i++) await sleep(250);
      const r = await termix.ev('window.__r');
      check('a pasta escolhida no diálogo chega ao Termix', typeof r === 'string' && path.resolve(r).toLowerCase() === path.resolve(pastaAlvo).toLowerCase(), JSON.stringify(r));
    }
    termix.fechar(); hub.fechar();
  } catch (e) { check('execução', false, e.message); }
  child.kill();
  spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  process.exit(results.every(Boolean) ? 0 : 1);
})();
