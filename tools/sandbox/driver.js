'use strict';
// Dirige o Hub instalado via DevTools Protocol (roda com o próprio executável do Hub: ELECTRON_RUN_AS_NODE=1).
// Uso: "Rocruzta Hub.exe" driver.js <passo>   (passos: instalar | abrir | desinstalar | instalar-de-novo)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const passo = process.argv[2];
const log = (ok, nome, extra = '') => console.log(`${ok ? 'OK    ' : 'FALHOU'} ${nome}${extra ? ' -> ' + extra : ''}`);

(async () => {
  let alvo;
  for (let i = 0; i < 80 && !alvo; i++) {
    try { alvo = (await (await fetch('http://127.0.0.1:9333/json')).json()).find((t) => t.type === 'page'); } catch { /* subindo */ }
    if (!alvo) await sleep(500);
  }
  if (!alvo) { log(false, 'Hub respondeu no DevTools'); process.exit(1); }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let n = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++n; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result.result.value; };
  const ate = async (expr, ms = 60000) => { for (let t = 0; t < ms; t += 500) { if (await ev(expr).catch(() => false)) return true; await sleep(500); } return false; };

  for (let i = 0; i < 80 && !(await ev('!!document.querySelector(".sub.act")').catch(() => false)); i++) await sleep(500);
  // guarda os avisos da barra de status (somem em 4 s) para o relatório
  await ev('window.__avisos = []; new MutationObserver(() => { const t = document.querySelector("#st-aviso").textContent; if (t) window.__avisos.push(t); }).observe(document.querySelector("#st-aviso"), { childList: true, characterData: true, subtree: true }); 1');
  const avisos = async () => JSON.stringify(await ev('window.__avisos'));
  await ev('document.querySelector(\'[data-sec="apps"]\').click()');
  await sleep(1500);
  const card = (acao) => `!!document.querySelector('.loja-card[data-detalhe="termix"] [${acao}]')`;

  if (passo === 'instalar' || passo === 'instalar-de-novo') {
    log(await ate(card('data-instalar'), 20000), 'Termix aparece como "Instalar" (não instalado)');
    await ev('document.querySelector(\'.loja-card[data-detalhe="termix"] [data-instalar]\').click()');
    log(await ate(card('data-instalando'), 10000), 'botão vira progresso ("Preparando/Baixando/Instalando")');
    log(await ate('ESTADOS.termix && ESTADOS.termix.instalado === true', 240000), 'Hub baixou, instalou e detectou o Termix', (await avisos()) + ' ' + await ev('JSON.stringify({ versao: ESTADOS.termix && ESTADOS.termix.versao, embutivel: ESTADOS.termix && ESTADOS.termix.embutivel })'));
    log(await ate(card('data-app'), 20000), 'cartão passa a mostrar "Abrir"');
  }
  if (passo === 'abrir') {
    log(await ate(card('data-app'), 20000), 'Termix aparece como instalado ("Abrir")');
    log(await ev('ESTADOS.termix.embutivel === true'), 'Hub reconhece o Termix instalado como embutível (>= 0.7.0)');
    await ev('document.querySelector(\'.loja-card[data-detalhe="termix"] [data-app]\').click()');
    log(await ate('ESTADOS.termix.embutido === "rodando"', 60000), 'Termix abriu DENTRO do Hub (embutido rodando)');
    await sleep(3000);
  }
  if (passo === 'desinstalar') {
    log(await ate(card('data-app'), 20000), 'Termix instalado e fechado');
    await ev('document.querySelector(\'.loja-card[data-detalhe="termix"]\').click()');
    log(await ate('!!document.querySelector("[data-des]")', 10000), 'página do app mostra o botão Desinstalar');
    await ev('document.querySelector("[data-des]").click()');
    await ev('document.querySelector("[data-des-ok]").click()');
    log(await ate('window.__avisos.some((t) => /Desinstalador do Termix aberto/.test(t))', 15000), 'Hub avisou que abriu o desinstalador', await avisos());
  }
  ws.close();
  process.exit(0);
})().catch((e) => { console.log('FALHOU erro ->', e.message); process.exit(1); });
