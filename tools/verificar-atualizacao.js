'use strict';
// Verifica no app real (TASK-045 e TASK-046): a faixa "Atualizar" com a barra de progresso (atualização simulada, sem rede
// e sem fechar o Hub) e a chave "Mascote" nas Configurações. Uso: node tools/verificar-atualizacao.js [pasta-de-capturas]
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const root = path.join(__dirname, '..');
const exe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FALHOU'} ${name}${extra ? ' -> ' + extra : ''}`); };
const pasta = process.argv[2];
if (pasta) fs.mkdirSync(pasta, { recursive: true });

(async () => {
  const child = spawn(exe, ['.', '--remote-debugging-port=9351', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'], {
    cwd: root, stdio: 'ignore', env: { ...process.env, HUB_ATUALIZACAO_FALSA: '1', HUB_DADOS: fs.mkdtempSync(path.join(os.tmpdir(), 'hub-atu-')) },
  });
  let alvo;
  for (let i = 0; i < 40 && !alvo; i++) {
    await sleep(500);
    try { alvo = (await (await fetch('http://127.0.0.1:9351/json')).json()).find((t) => t.type === 'page'); } catch { /* subindo */ }
  }
  if (!alvo) { console.log('sem alvo CDP'); child.kill(); process.exit(1); }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map(); const erros = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return; }
    if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erro em ' + expr); return r.result.result.value; };
  const foto = async (nome) => { if (!pasta) return; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(pasta, nome + '.png'), Buffer.from(s.result.data, 'base64')); };
  const esperar = async (expr, ms = 15000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
  const faixa = () => ev('(() => { const f = document.querySelector("#aviso-hub"); return { visivel: !f.hidden, texto: document.querySelector("#ah-texto").textContent, barra: !document.querySelector("#ah-barra").hidden, pct: document.querySelector("#ah-barra-i").style.width, botao: !document.querySelector("#ah-aplicar").hidden, botaoTexto: document.querySelector("#ah-aplicar").textContent, fechar: !document.querySelector("#ah-fechar").hidden }; })()');
  try {
    await send('Runtime.enable'); await send('Page.bringToFront');

    // ---- faixa de atualização ----
    check('o Hub abre', await esperar('!!document.querySelector("#composer")', 30000));
    check('a faixa avisa a versão nova com o botão Atualizar (sem baixar nada ainda)', await esperar('!document.querySelector("#aviso-hub").hidden && document.querySelector("#ah-aplicar").textContent === "Atualizar"', 20000));
    const f0 = await faixa();
    check('sem barra de progresso antes do clique, com botão e "dispensar"', !f0.barra && f0.botao && f0.fechar, JSON.stringify(f0));
    await sleep(2200); // espera a abertura terminar para a captura sair limpa
    await foto('1-disponivel');
    await ev('document.querySelector("#ah-aplicar").click()');
    check('ao clicar, a barra aparece e o botão some', await esperar('!document.querySelector("#ah-barra").hidden && document.querySelector("#ah-aplicar").hidden', 5000));
    await sleep(1500);
    const f1 = await faixa();
    check('baixando: mostra o percentual e a barra anda', /Baixando/.test(f1.texto) && parseInt(f1.pct, 10) > 0, f1.texto + ' / ' + f1.pct);
    await foto('2-baixando');
    check('a faixa não pode ser dispensada durante a atualização', !f1.fechar);
    check('depois vem a preparação', await esperar('/Preparando/.test(document.querySelector("#ah-texto").textContent)', 20000));
    await foto('3-preparando');
    check('no fim, avisa que vai reiniciar', await esperar('/reiniciando/.test(document.querySelector("#ah-texto").textContent)', 20000));
    const f2 = await faixa();
    check('a barra chega a 100% antes de reiniciar', f2.pct === '100%', f2.pct);
    await foto('4-reiniciando');

    // ---- chave do mascote nas Configurações ----
    await ev('document.querySelector("#usuario-btn").click()');
    await ev('document.querySelector("#usuario-menu [data-acao=config]").click()');
    check('as Configurações têm a chave do Mascote ligada', await esperar('document.querySelector("#cfg-mascote")?.getAttribute("aria-checked") === "true"'));
    await foto('5-config-ligado');
    await ev('document.querySelector("#cfg-mascote").click()');
    await sleep(400);
    check('desligar: a chave vai para "desligado" e o mago para de vez', (await ev('document.querySelector("#cfg-mascote").getAttribute("aria-checked")')) === 'false'
      && (await ev('Mascote.ligado() === false && document.body.classList.contains("sem-mascote") && Mascote.mago.el.style.display === "none"')));
    check('a preferência fica salva', (await ev('localStorage.getItem("rocruzta-hub:mascote")')) === 'off');
    await foto('6-config-desligado');
    await ev('document.querySelector(".sub[data-sec=inicio]").click()');
    await sleep(1200);
    check('no Início, sem mascote', (await ev('Mascote.estado().visivel')) === false && (await ev('getComputedStyle(document.querySelector("#mago")).display')) === 'none');
    await foto('7-inicio-sem-mascote');
    await send('Page.reload');
    await sleep(600);
    check('com o mascote desligado, a abertura é leve (só o ícone, sem o mago)', await ev('!!document.querySelector("#splash") && document.querySelector("#sp-escrita").children.length === 0'));
    await foto('8-abertura-leve');
    check('a abertura leve termina e o Hub abre sem mascote', await esperar('!document.querySelector("#splash") || document.querySelector("#splash").classList.contains("out")', 20000));
    await sleep(1200);
    check('depois de reabrir, o mascote segue desligado', (await ev('Mascote.ligado()')) === false && (await ev('Mascote.estado().aberto')) === false);
    await ev('document.querySelector("#usuario-btn").click()');
    await ev('document.querySelector("#usuario-menu [data-acao=config]").click()');
    await esperar('!!document.querySelector("#cfg-mascote")');
    await ev('document.querySelector("#cfg-mascote").click()');
    await sleep(300);
    await ev('document.querySelector(".sub[data-sec=inicio]").click()');
    check('ligando de novo, o mago reaparece no Início sentado', await esperar('Mascote.estado().visivel === true && Mascote.estado().sit === true && Mascote.mago.o.opacity > 0.9', 8000));
    await foto('9-religado');
    check('nenhum erro no console durante o teste', erros.length === 0, erros.slice(0, 3).join(' | '));
  } catch (e) { console.log('ERRO', e.message); results.push(false); }
  ws.close(); child.kill();
  console.log(results.every(Boolean) ? 'TUDO OK' : 'HÁ FALHAS');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
