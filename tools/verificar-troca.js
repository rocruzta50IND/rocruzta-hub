'use strict';
// Verificação ponta a ponta da troca rápida (Ctrl+Espaço, TASK-030) no app real: a página e os apps são dirigidos pelo
// DevTools Protocol e as teclas entram pelo processo principal (--inspect + webContents.sendInputEvent), o mesmo caminho do
// before-input-event do teclado real (o Input.dispatchKeyEvent do CDP não passa por ele).
// Abre o Hub, abre o Termix embutido e confere: painel abre, Esc cancela, soltar o Ctrl confirma, e o atalho
// também funciona com o foco DENTRO do app embutido. Uso: node tools/verificar-troca.js
// Precisa do Termix >= 0.7.0 instalado; sem ele, a parte do app embutido é pulada. Fecha o app no final.
const { spawn, execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const exe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const resultados = [];
const check = (nome, ok, extra = '') => { resultados.push(ok); console.log(`${ok ? 'OK    ' : 'FALHOU'} ${nome}${extra ? ' -> ' + extra : ''}`); };

async function conectar(alvo) {
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  return { ws, ev, send };
}
const alvos = async () => (await (await fetch('http://127.0.0.1:9334/json')).json()).filter((t) => t.type === 'page');
// Tecla enviada ao webContents cujo endereço bate com `quem` (a página do Hub ou a tela de um app embutido).
const teclaEm = (main, quem, input) => main.ev(`(()=>{const w=process.mainModule.require('electron').webContents.getAllWebContents().find(x=>${quem}.test(x.getURL())); if(!w) return 'sem alvo'; w.sendInputEvent(${JSON.stringify(input)}); return 'ok'})()`);

(async () => {
  const child = spawn(exe, ['.', '--remote-debugging-port=9334', '--inspect=9337'], { cwd: root, stdio: 'ignore' });
  const encerrar = () => { try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* já saiu */ } };
  try {
    let hubAlvo;
    for (let i = 0; i < 40 && !hubAlvo; i++) { await sleep(500); try { hubAlvo = (await alvos()).find((t) => /index\.html/.test(t.url)); } catch { /* subindo */ } }
    if (!hubAlvo) { console.log('sem alvo do Hub'); return; }
    const hub = await conectar(hubAlvo);
    const main = await conectar((await (await fetch('http://127.0.0.1:9337/json')).json())[0]);
    const HUBRE = String.raw`/index\.html/`, APPRE = String.raw`/^http:\/\/127\.0\.0\.1:/`;
    // Página do Hub: teclas pelo CDP (o renderer trata o atalho). Tela do app: pelo processo principal (before-input-event).
    const hubCtrl = () => hub.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17, modifiers: 2 });
    const hubEspaco = async () => { await hub.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, modifiers: 2, text: ' ' }); await hub.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, modifiers: 2 }); };
    const hubSoltar = () => hub.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Control', code: 'ControlLeft', windowsVirtualKeyCode: 17 });
    const hubEsc = async () => { await hub.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await hub.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); };
    const appCtrl = () => teclaEm(main, APPRE, { type: 'keyDown', keyCode: 'Control' });
    const appEspaco = async () => { await teclaEm(main, APPRE, { type: 'keyDown', keyCode: 'Space', modifiers: ['control'] }); await teclaEm(main, APPRE, { type: 'keyUp', keyCode: 'Space', modifiers: ['control'] }); };
    for (let i = 0; i < 60 && !(await hub.ev('!!document.querySelector(".sub.act")')); i++) await sleep(250);
    const aberto = () => hub.ev('!document.querySelector("#troca").hidden');
    const cartoes = () => hub.ev('document.querySelectorAll("#troca .troca-card").length');
    const sel = () => hub.ev('document.querySelector("#troca .troca-card.sel b")?.textContent || null');
    const atual = () => hub.ev('document.querySelector("#cur-name").textContent');

    // 1) No Hub, sem app aberto: o painel abre, mostra Hub + Termix e Esc cancela.
    await sleep(300);
    await hubCtrl(); await hubEspaco(); await sleep(500);
    const temTermix = (await cartoes()) >= 2;
    check('Ctrl+Espaço abre o painel (Hub + apps instalados)', (await aberto()) && (await cartoes()) >= 1, `${await cartoes()} cartões, selecionado: ${await sel()}`);
    await hubEsc(); await hubSoltar(); await sleep(200);
    check('Esc cancela e fecha o painel', !(await aberto()));
    if (!temTermix) { console.log('Termix não está instalado/detectado: pulando a parte do app embutido'); return; }

    // 2) Abre o Termix embutido.
    await hub.ev('document.querySelector("#menu [data-app=termix]").click()');
    let pronto = false;
    for (let i = 0; i < 90 && !pronto; i++) { await sleep(500); pronto = await hub.ev('!document.querySelector("#v-app").hidden && !document.querySelector("#v-app .app-msg")'); }
    check('Termix aberto dentro do Hub', pronto && (await atual()) === 'Termix');
    if (!pronto) return;
    await sleep(2500);

    // 3) Com o foco DENTRO do Termix: Ctrl+Espaço abre o painel; soltar o Ctrl volta ao Hub.
    const termixAlvo = (await alvos()).find((t) => /^http:\/\/127\.0\.0\.1:/.test(t.url));
    check('a tela do Termix é um alvo separado (foco dentro do app)', Boolean(termixAlvo));
    await appCtrl(); await appEspaco(); await sleep(900);
    check('Ctrl+Espaço dentro do Termix abre o painel do Hub', await aberto(), `selecionado: ${await sel()}`);
    check('abre no item anterior (Hub)', (await sel()) === 'Hub');
    await hubSoltar(); await sleep(900);
    check('soltar o Ctrl confirma: volta ao Hub', !(await aberto()) && (await atual()) === 'Hub' && (await hub.ev('document.querySelector("#v-app").hidden')), `painel aberto: ${await aberto()}, título: ${await atual()}`);

    // Daqui em diante o Termix já foi aberto uma vez: voltar a ele não pode mostrar "Abrindo..." de novo.
    await hub.ev('window.__abrindo = false; new MutationObserver(() => { if (document.querySelector("#v-app .app-msg")) window.__abrindo = true; }).observe(document.querySelector("#v-app"), { childList: true, subtree: true })');

    // 4) Do Hub: Ctrl+Espaço e soltar volta ao Termix (o app anterior), com miniatura no cartão.
    await hubCtrl(); await hubEspaco(); await sleep(700);
    check('painel aberto no Hub, anterior = Termix', (await aberto()) && (await sel()) === 'Termix');
    check('cartão do Termix tem miniatura (foto da tela)', await hub.ev('!!document.querySelector("#troca .troca-card.sel img")'));
    await hubSoltar(); await sleep(1200);
    check('soltar o Ctrl volta ao Termix', !(await aberto()) && (await atual()) === 'Termix' && !(await hub.ev('document.querySelector("#v-app").hidden')), `painel aberto: ${await aberto()}, título: ${await atual()}`);

    // 5) Ctrl+Espaço duas vezes (avança) e soltar: volta ao Termix (o primeiro cartão é o atual).
    await appCtrl(); await appEspaco(); await sleep(700);
    await hubEspaco(); await sleep(300);
    check('segundo Ctrl+Espaço avança a seleção', (await sel()) === 'Termix', `selecionado: ${await sel()}`);
    await hubSoltar(); await sleep(900);
    check('confirmar o item atual só fecha o painel (continua no Termix)', !(await aberto()) && (await atual()) === 'Termix');

    // 6) Pelo seletor do cabeçalho: Hub e de volta ao Termix, também sem "Abrindo...".
    await hub.ev('document.querySelector("#menu [data-hub]").click()'); await sleep(700);
    await hub.ev('document.querySelector("#menu [data-app=termix]").click()'); await sleep(1200);
    check('voltar ao Termix já aberto não mostra "Abrindo o Termix..." de novo', (await atual()) === 'Termix' && !(await hub.ev('window.__abrindo')) && !(await hub.ev('document.querySelector("#v-app").hidden')));
  } catch (e) {
    console.log('ERRO', e.message); resultados.push(false);
  } finally {
    encerrar();
    await sleep(1500);
    console.log(`\n${resultados.filter(Boolean).length}/${resultados.length} verificações OK`);
    process.exit(resultados.every(Boolean) ? 0 : 1);
  }
})();
