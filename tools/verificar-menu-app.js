'use strict';
// Verifica o menu "⋯" dos apps na barra lateral (TASK-033) no app real. Uso: node tools/verificar-menu-app.js [captura.png]
// Fecha o app no final. Usa dados temporários (HUB_DADOS), então roda ao lado do Hub instalado.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const exe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALHOU'} ${name}${extra ? ' -> ' + extra : ''}`); };

(async () => {
  const child = spawn(exe, ['.', '--remote-debugging-port=9334'], { cwd: root, stdio: 'ignore', env: { ...process.env, HUB_DADOS: fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'hub-menu-')) } });
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    try { target = (await (await fetch('http://127.0.0.1:9334/json')).json()).find((t) => t.type === 'page'); } catch { /* subindo */ }
  }
  if (!target) { console.log('sem alvo CDP'); child.kill(); process.exit(1); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  try {
    for (let i = 0; i < 60 && !(await ev('!!document.querySelector("#side [data-mais]")')); i++) await sleep(250);
    check('cada app da barra lateral tem o botão ⋯', await ev('document.querySelectorAll("#side [data-mais]").length === document.querySelectorAll("#side .sub[data-app]").length && document.querySelectorAll("#side [data-mais]").length > 0'));
    check('menu fechado no início', !(await ev('!!document.querySelector("#menu-app")')));
    await ev('document.querySelector("#side [data-mais]").click()');
    check('clicar ⋯ abre o menu', await ev('!!document.querySelector("#menu-app")'));
    const itens = await ev('[...document.querySelectorAll("#menu-app .menu-item")].map((b) => b.textContent.trim() + (b.disabled ? "(desativado)" : ""))');
    check('itens: Abrir, Ver novidades, Desinstalar', itens.length === 3 && itens[0] === 'Abrir' && itens[1] === 'Ver novidades' && /^Desinstalar/.test(itens[2]), itens.join(' | '));
    check('o menu cabe dentro da barra lateral (não fica sob a tela do app)', await ev('(() => { const r = document.querySelector("#menu-app").getBoundingClientRect(); return r.left >= 0 && r.right <= 236 && r.bottom <= innerHeight; })()'));
    if (process.argv[2]) { const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(process.argv[2], Buffer.from(s.result.data, 'base64')); }
    await ev('document.querySelector("#side [data-mais]").click()');
    check('clicar ⋯ de novo fecha o menu', !(await ev('!!document.querySelector("#menu-app")')));
    await ev('document.querySelector("#side [data-mais]").click()');
    await ev('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))');
    check('Esc fecha o menu', !(await ev('!!document.querySelector("#menu-app")')));
    await ev('document.querySelector("#side [data-mais]").click()');
    await ev('document.querySelector("#hmain").click()');
    check('clicar fora fecha o menu', !(await ev('!!document.querySelector("#menu-app")')));
    await ev('document.querySelector("#side [data-mais]").click()');
    await ev('document.querySelector("#menu-app [data-mais-acao=novidades]").click()');
    await sleep(300);
    check('Ver novidades abre a página do app na loja', await ev('!!document.querySelector(".loja-det") && document.querySelector(".det-nome h1").textContent.length > 0'), await ev('document.querySelector(".det-nome h1")?.textContent'));
    check('o menu fecha depois da escolha', !(await ev('!!document.querySelector("#menu-app")')));
  } catch (e) { check('execução', false, e.message); }
  ws.close(); child.kill();
  spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  console.log(`${results.filter(Boolean).length}/${results.length}`);
  process.exit(results.every(Boolean) ? 0 : 1);
})();
