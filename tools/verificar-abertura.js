'use strict';
// Verifica a abertura e o mascote no app real (TASK-044). Uso: node tools/verificar-abertura.js [pasta-de-capturas]
// Sobe o Hub com dados temporários (HUB_DADOS), confere cada etapa e fecha o app no final.
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
  const child = spawn(exe, ['.', '--remote-debugging-port=9335', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'], { cwd: root, stdio: 'ignore', env: { ...process.env, HUB_DADOS: fs.mkdtempSync(path.join(os.tmpdir(), 'hub-abertura-')) } });
  let alvo;
  for (let i = 0; i < 40 && !alvo; i++) {
    await sleep(500);
    try { alvo = (await (await fetch('http://127.0.0.1:9335/json')).json()).find((t) => t.type === 'page'); } catch { /* subindo */ }
  }
  if (!alvo) { console.log('sem alvo CDP'); child.kill(); process.exit(1); }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map(); const erros = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return; }
    if (d.method === 'Runtime.exceptionThrown') erros.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text);
    if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') erros.push(d.params.args.map((a) => a.value || a.description).join(' '));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'erro em ' + expr); return r.result.result.value; };
  const foto = async (nome) => { if (!pasta) return; const s = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(pasta, nome + '.png'), Buffer.from(s.result.data, 'base64')); };
  const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
  const esperar = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await ev(expr)) return true; await sleep(100); } return false; };
  const posMago = () => ev('(() => ({ x: Mascote.mago.x, y: Mascote.mago.y, op: Mascote.mago.o.opacity }))()');
  try {
    await send('Runtime.enable'); await send('Page.bringToFront');

    // ---- abertura ----
    check('o véu da abertura existe logo no início', await ev('!!document.querySelector("#splash")'));
    await esperar('Mascote.estado().aberto', 20000);
    await sleep(2500); // o mago termina de se materializar
    check('a abertura termina (véu removido ou desfeito)', await esperar('!document.querySelector("#splash") || document.querySelector("#splash").classList.contains("out")'));
    const e0 = await ev('Mascote.estado()');
    check('o mago está visível e sentado', e0.aberto && e0.visivel && e0.sit === true, JSON.stringify(e0));
    const fim = await ev('Mascote.preverFinal()');
    const p0 = await posMago();
    check('ele está na quina superior direita do campo de mensagem', Math.hypot(p0.x - fim.x, p0.y - fim.y) < 6 && p0.op > 0.9, `mago (${Math.round(p0.x)},${Math.round(p0.y)}) alvo (${Math.round(fim.x)},${Math.round(fim.y)})`);
    const quina = await ev('(() => { const r = document.querySelector("#composer").getBoundingClientRect(); return { dir: r.right, topo: r.top }; })()');
    check('a quina é a direita (perto da borda do campo)', p0.x > quina.dir - 140 && p0.x <= quina.dir, `x=${Math.round(p0.x)} borda=${Math.round(quina.dir)}`);
    await foto('1-sentado');

    // ---- digitação ----
    await ev('(() => { const c = document.querySelector("#c-texto"); c.disabled = false; c.value = "ola"; c.dispatchEvent(new Event("input", { bubbles: true })); })()');
    check('digitar deixa o mago escutando', (await ev('Mascote.estado().estado')) === 'listen');
    await ev('(() => { const c = document.querySelector("#c-texto"); c.value = ""; c.dispatchEvent(new Event("input", { bubbles: true })); })()');
    check('apagar o texto volta ao repouso', (await ev('Mascote.estado().estado')) === 'idle');

    // ---- chat: vira o avatar das respostas ----
    await ev('(() => { CHAT.msgs = [{ papel: "eu", texto: "oi" }, { papel: "ia", texto: "Olá! Primeira resposta." }, { papel: "eu", texto: "e agora?" }, { papel: "ia", texto: "Segunda resposta." }]; document.querySelector("#hmain").innerHTML = htmlInicio(); })()');
    await sleep(1800);
    const av = await ev('(() => { const a = [...document.querySelectorAll(".c-linha.ia .c-avatar")]; const u = a[a.length - 1].getBoundingClientRect(); return { n: a.length, pontos: a.filter((x) => x.classList.contains("ponto")).length, cx: u.left + u.width / 2, cy: u.top + u.height / 2 }; })()');
    const p1 = await posMago();
    check('no chat, só a última resposta fica sem pontinho', av.n === 2 && av.pontos === 1);
    check('o mago vira o avatar da última resposta', Math.hypot(p1.x - av.cx, p1.y - av.cy) < 8, `mago (${Math.round(p1.x)},${Math.round(p1.y)}) avatar (${Math.round(av.cx)},${Math.round(av.cy)})`);
    const e1 = await ev('Mascote.estado()');
    check('como avatar ele não está "sentado"', e1.sit === false && e1.visivel);
    await foto('2-avatar');
    await ev('(() => { CHAT.msgs.push({ papel: "eu", texto: "pensa" }); CHAT.gerando = true; document.querySelector("#hmain").innerHTML = htmlInicio(); })()');
    await sleep(1200);
    check('gerando a resposta, o mago fica pensando', (await ev('Mascote.estado().estado')) === 'think');
    const classes = await ev('document.querySelector("#mago").className');
    check('o mago ganha a pose de pensando', /think/.test(classes), classes);
    await foto('3-pensando');
    await ev('(() => { CHAT.gerando = false; CHAT.msgs.push({ papel: "ia", texto: "pronto" }); document.querySelector("#hmain").innerHTML = htmlInicio(); })()');
    await sleep(500);
    check('ao terminar a resposta, ele comemora', (await ev('Mascote.estado().estado')) === 'success');
    await sleep(1800);
    check('depois volta ao repouso', (await ev('Mascote.estado().estado')) === 'idle');

    // ---- navegação: some ao sair do Início e volta voando ----
    await ev('document.querySelector(".sub[data-sec=apps]").click()');
    check('ao ir para Apps o mago some', await esperar('Mascote.estado().visivel === false && Mascote.mago.o.opacity < 0.1', 4000));
    await ev('document.querySelector(".sub[data-sec=inicio]").click()');
    check('ao voltar para o Início ele reaparece', await esperar('Mascote.estado().visivel === true && Mascote.mago.o.opacity > 0.9', 6000));

    // ---- novo chat limpo: de volta ao campo, sentado ----
    await ev('(() => { CHAT.msgs = []; CHAT.gerando = false; document.querySelector("#hmain").innerHTML = htmlInicio(); })()');
    await sleep(1800);
    const fim2 = await ev('Mascote.preverFinal()');
    const p2 = await posMago();
    check('sem mensagens, ele volta a sentar na quina do campo', Math.hypot(p2.x - fim2.x, p2.y - fim2.y) < 8 && (await ev('Mascote.estado().sit')) === true);

    // ---- arrastar: no ar cria a plataforma; sobre uma superfície sólida pousa ----
    await mouse('mouseMoved', p2.x, p2.y);
    await mouse('mousePressed', p2.x, p2.y);
    for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', p2.x - i * 40, p2.y + i * 22); await sleep(25); }
    check('arrastando, ele solta o "Aaah" e deixa de seguir o campo', await ev('Mascote.mago.o.dragging === true'));
    await foto('4-arrastando');
    await mouse('mouseReleased', p2.x - 320, p2.y + 176);
    await sleep(900);
    const e3 = await ev('Mascote.estado()');
    check('solto no ar, ele cria a plataforma mágica e pousa nela', e3.plataforma && e3.sit === true && (await ev('!!document.querySelector(".mago-plat")')), JSON.stringify(e3));
    await foto('5-plataforma');
    const sub = await ev('(() => { const r = document.querySelector(".sub[data-sec=noticias], .sub[data-sec=comunicados]").getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top }; })()');
    const p3 = await posMago();
    await mouse('mouseMoved', p3.x, p3.y);
    await mouse('mousePressed', p3.x, p3.y);
    for (let i = 1; i <= 8; i++) { await mouse('mouseMoved', p3.x + (sub.x - p3.x) * i / 8, p3.y + (sub.y - 12 - p3.y) * i / 8); await sleep(25); }
    await mouse('mouseReleased', sub.x, sub.y - 12);
    await sleep(900);
    const e4 = await ev('Mascote.estado()');
    check('solto sobre um item da barra lateral, ele pousa ali (sem plataforma)', e4.sit === true && !e4.plataforma && /sub/.test(e4.alvo || ''), JSON.stringify(e4));
    await foto('6-pousou');

    check('nenhum erro no console durante o teste', erros.length === 0, erros.slice(0, 3).join(' | '));
  } catch (e) { console.log('ERRO', e.message); results.push(false); }
  ws.close(); child.kill();
  console.log(results.every(Boolean) ? 'TUDO OK' : 'HÁ FALHAS');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
