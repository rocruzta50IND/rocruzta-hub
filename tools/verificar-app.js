'use strict';
// Verificação ponta a ponta: abre o app real (main + preload) e o dirige via DevTools Protocol:
// telas, seletor, atalhos, tema e botões da janela. Uso: node tools/verificar-app.js
// (fecha o app no final; confira que não sobrou electron.exe).
const { spawn } = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const exe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALHOU'} ${name}${extra ? ' -> ' + extra : ''}`); };

(async () => {
  const child = spawn(exe, ['.', '--remote-debugging-port=9333'], { cwd: root, stdio: 'ignore' });
  let exited = false; child.on('exit', () => { exited = true; });
  let target;
  for (let i = 0; i < 40 && !target; i++) {
    await sleep(500);
    try { target = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page'); } catch { /* ainda subindo */ }
  }
  if (!target) { console.log('sem alvo CDP'); child.kill(); process.exit(1); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  const { execFileSync } = require('node:child_process');
  const ps = (cmd) => execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', cmd], { encoding: 'utf8' }).trim();
  const WIN = "Add-Type -Namespace W -Name U -MemberDefinition '[DllImport(\"user32.dll\")] public static extern bool IsIconic(System.IntPtr h); [DllImport(\"user32.dll\")] public static extern bool ShowWindow(System.IntPtr h,int c);'; $p = Get-Process electron | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1; ";
  const iconic = () => ps(WIN + '[W.U]::IsIconic($p.MainWindowHandle)') === 'True';
  const restaurar = () => ps(WIN + '[void][W.U]::ShowWindow($p.MainWindowHandle, 9)');
  const winState = async () => (await ev('window.hub.isMaximized()')) ? 'maximized' : iconic() ? 'minimized' : 'normal';
  const key = async (k) => {
    if (k === 'Escape') { await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); return; }
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, text: k }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k });
  };
  const sec = () => ev("document.querySelector('.sub.act').dataset.sec");
  const titulo = () => ev("document.querySelector('#hmain h1').textContent");

  await sleep(1500);
  check('preload expõe window.hub', await ev('typeof window.hub === "object" && typeof window.hub.minimize === "function"'));
  check('sem Node no renderer', await ev('typeof require === "undefined" && typeof process === "undefined"'));
  check('Inter carregada', await ev('document.fonts.check("13px Inter")'));
  check('começa em Início', (await sec()) === 'inicio' && (await titulo()) === 'Início');

  for (const [s, nome] of [['noticias', 'Notícias'], ['comunicados', 'Comunicados'], ['equipe', 'Equipe'], ['inicio', 'Início']]) {
    await ev(`document.querySelector('[data-sec="${s}"]').click()`);
    check(`clicar em ${nome} troca a tela`, (await sec()) === s && (await titulo()) === nome);
  }

  // seletor de app
  check('menu começa fechado', !(await ev('document.querySelector("#switch").classList.contains("open")')));
  await ev('document.querySelector("#sw-btn").click()');
  check('clicar no seletor abre o menu', await ev('document.querySelector("#switch").classList.contains("open") && document.querySelector("#sw-btn").getAttribute("aria-expanded")==="true"'));
  check('menu lista Hub + Termix, sem apps que não existem', (await ev('document.querySelectorAll("#menu .menu-item").length')) === 2 && await ev('!!document.querySelector("#menu [data-app=termix]")'));
  await key('Escape');
  await sleep(150);
  check('Esc fecha o menu', !(await ev('document.querySelector("#switch").classList.contains("open")')));
  await ev('document.querySelector("#sw-btn").click()');
  await ev('document.body.click()');
  check('clicar fora fecha o menu', !(await ev('document.querySelector("#switch").classList.contains("open")')));

  // abrir app não finge
  await ev('document.querySelector("#side [data-app=termix]").click()');
  check('clicar no Termix só avisa que abrir vem depois', (await ev('document.querySelector("#st-aviso").textContent')).includes('próxima etapa'));
  await ev('document.querySelector("[data-sec=inicio]").click()');
  await ev('document.querySelector("#st-aviso").textContent = ""');
  await ev('document.querySelector("#hmain .tile[data-app=termix]").click()');
  check('Início: bloco do Termix só avisa que abrir vem depois', (await ev('document.querySelector("#st-aviso").textContent')).includes('próxima etapa'));

  // tela Início: só o que é real
  await ev('document.querySelector("[data-sec=inicio]").click()');
  check('Início: só o bloco do Termix, sem selos nem dados fingidos', await ev('document.querySelectorAll("#hmain .tile").length === 1 && !document.querySelector("#hmain .selo") && !/Em breve|Dados de exemplo/.test(document.body.innerText)'));
  check('Início: sem rolagem horizontal', await ev('document.querySelector("#hmain").scrollWidth <= document.querySelector("#hmain").clientWidth'));
  for (const s of ['noticias', 'comunicados', 'equipe']) {
    await ev(`document.querySelector('[data-sec="${s}"]').click()`);
    check(`${s}: estado vazio honesto, sem selos`, await ev('document.querySelector("#hmain .vazio").textContent.startsWith("Ainda não há") && !document.querySelector(".selo") && !/Em breve|Dados de exemplo/.test(document.body.innerText)'));
  }
  await ev('document.querySelector("[data-sec=inicio]").click()');

  // atalhos
  await ev('document.activeElement && document.activeElement.blur()');
  await key('2'); await sleep(100);
  check('tecla 2 vai para Notícias', (await sec()) === 'noticias');
  await key('4'); await sleep(100);
  check('tecla 4 vai para Equipe', (await sec()) === 'equipe');
  await ev('(() => { const i = document.createElement("input"); i.id = "teste-campo"; document.body.appendChild(i); i.focus(); })()');
  await key('1'); await sleep(100);
  check('tecla 1 dentro de campo de texto NÃO troca de tela', (await sec()) === 'equipe');
  await ev('document.getElementById("teste-campo").remove(); document.activeElement.blur()');
  await key('1'); await sleep(100);
  check('tecla 1 fora do campo volta ao Início', (await sec()) === 'inicio');

  // tema
  const t0 = await ev('document.documentElement.dataset.theme || "dark"');
  await ev('document.querySelector("#theme").click()');
  const t1 = await ev('document.documentElement.dataset.theme || "dark"');
  check('botão de tema alterna escuro/claro', t0 === 'dark' && t1 === 'light');
  await ev('document.querySelector("#theme").click()');
  check('e volta ao escuro', (await ev('document.documentElement.dataset.theme || "dark"')) === 'dark');

  // controles da janela (IPC real)
  check('janela começa normal', (await winState()) === 'normal');
  await ev('document.querySelector("#btn-max").click()'); await sleep(600);
  check('botão maximizar maximiza', (await winState()) === 'maximized' && (await ev('window.hub.isMaximized()')) === true);
  await ev('document.querySelector("#btn-max").click()'); await sleep(600);
  check('maximizar de novo restaura', (await winState()) === 'normal');
  await ev('document.querySelector("#btn-min").click()'); await sleep(800);
  check('botão minimizar minimiza', (await winState()) === 'minimized');
  restaurar();
  await sleep(500);
  await ev('document.querySelector("#btn-close").click()');
  for (let i = 0; i < 20 && !exited; i++) await sleep(250);
  check('botão fechar encerra o app', exited);
  if (!exited) child.kill();
  const falhas = results.filter((x) => !x).length;
  console.log(`\n${results.length - falhas}/${results.length} verificações OK`);
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error('ERRO', e); process.exit(1); });
