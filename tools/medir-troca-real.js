'use strict';
// Verificação da troca rápida com TECLADO REAL do Windows (keybd_event), no app real com o Termix embutido.
// Traz o Hub para o primeiro plano, injeta Ctrl+Espaço de verdade e cronometra. Passa por Windows -> Chromium ->
// before-input-event -> foco real. Se o Hub perder o primeiro plano, aborta sem enviar tecla nenhuma.
// Limite: com o Hub em primeiro plano as teclas reais chegaram sempre à página do Hub (o foco programático da tela do app não
// mudou o destino do teclado nos testes), então o caminho "foco dentro do app" só é coberto por tools/verificar-troca.js.
// ATENÇÃO: usa o teclado da máquina por alguns segundos; não mexa em outras janelas durante a execução.
// Uso: node tools/medir-troca-real.js
const { spawn, execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.join(__dirname, '..');
const exe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const med = (v) => (v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null);
const resultados = [];
const check = (nome, ok, extra = '') => { resultados.push(ok); console.log(`${ok ? 'OK    ' : 'FALHOU'} ${nome}${extra ? ' -> ' + extra : ''}`); };

async function conectar(url) {
  const ws = new WebSocket(url); await new Promise((r) => { ws.onopen = r; });
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 400)); return r.result.result.value; };
  return { send, ev };
}

(async () => {
  const child = spawn(exe, ['.', '--remote-debugging-port=9341', '--inspect=9342'], { cwd: root, stdio: 'ignore' });
  const encerrar = () => { try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { /* já saiu */ } };
  try {
    let alvo;
    for (let i = 0; i < 40 && !alvo; i++) { await sleep(500); try { alvo = (await (await fetch('http://127.0.0.1:9341/json')).json()).find((t) => t.type === 'page' && /index\.html/.test(t.url)); } catch { /* subindo */ } }
    if (!alvo) throw new Error('sem alvo do Hub');
    const hub = await conectar(alvo.webSocketDebuggerUrl);
    const main = await conectar((await (await fetch('http://127.0.0.1:9342/json')).json())[0].webSocketDebuggerUrl);
    for (let i = 0; i < 60 && !(await hub.ev('!!document.querySelector(".sub.act")')); i++) await sleep(250);
    const hwnd = await main.ev(`(()=>{const el=process.mainModule.require('electron'); return String(el.BrowserWindow.getAllWindows()[0].getNativeWindowHandle().readBigUInt64LE(0))})()`);
    const viewVisivel = () => main.ev(`(()=>{const el=process.mainModule.require('electron'); return el.BrowserWindow.getAllWindows()[0].contentView.children.some(c=>c.getVisible && c.getVisible())})()`);

    console.log('Abrindo o Termix embutido...');
    await hub.ev('document.querySelector("#menu [data-app=termix]").click()');
    for (let i = 0; i < 90 && !(await hub.ev('!document.querySelector("#v-app").hidden && !document.querySelector("#v-app .app-msg")')); i++) await sleep(500);
    await sleep(3000);

    await hub.ev(`window.__t = []; const reg = (k) => window.__t.push([k, Date.now()]);
      new MutationObserver(() => reg(document.querySelector('#troca').hidden ? 'painel-fechou' : 'painel-abriu')).observe(document.querySelector('#troca'), { attributes: true, attributeFilter: ['hidden'] });
      new MutationObserver(() => reg('titulo:' + document.querySelector('#cur-name').textContent)).observe(document.querySelector('#cur-name'), { childList: true, characterData: true, subtree: true });`);
    // Fluidez visual: intervalo entre quadros (requestAnimationFrame) durante a sequência; acima de ~33 ms o olho percebe.
    await hub.ev(`window.__q = { g: [], on: false, ult: 0 }; (function loop(t) { if (window.__q.on) { if (window.__q.ult) window.__q.g.push(t - window.__q.ult); window.__q.ult = t; } else window.__q.ult = 0; requestAnimationFrame(loop); })(0);`);
    const quadros = async (fn) => { await hub.ev('window.__q.g = []; window.__q.on = true'); const r = await fn(); await sleep(300); const g = JSON.parse(await hub.ev('window.__q.on = false, JSON.stringify(window.__q.g)')); return { r, n: g.length, max: Math.round(Math.max(0, ...g)), lentos: g.filter((x) => x > 33).length }; };
    const titulo = () => hub.ev('document.querySelector("#cur-name").textContent');
    const estado = async () => ({ titulo: await titulo(), painel: await hub.ev('!document.querySelector("#troca").hidden'), area: await hub.ev('!document.querySelector("#v-app").hidden'), nativa: await viewVisivel(), abrindo: await hub.ev('!!document.querySelector("#v-app .app-msg")') });
    const coerente = (e, esperado) => e.titulo === esperado && !e.painel && !e.abrindo && (esperado === 'Termix' ? e.area && e.nativa : !e.area && !e.nativa);
    const outro = (t) => (t === 'Termix' ? 'Hub' : 'Termix');

    // Roda uma sequência de teclas reais. Devolve { ok, tempos: { 'D32': [epoch...], ... } }.
    function real(passos, trazer = false) {
      try {
        const saida = execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'teclas-reais.ps1'), '-Hwnd', hwnd, '-Passos', passos, ...(trazer ? ['-Trazer'] : [])], { encoding: 'utf8' });
        const tempos = {}; for (const l of saida.split(/\r?\n/)) { const m = /^([DU]\d+) (\d+)$/.exec(l.trim()); if (m) (tempos[m[1]] ||= []).push(Number(m[2])); }
        return { ok: true, tempos };
      } catch (e) { return { ok: false, motivo: String(e.stdout || e.message).trim() }; }
    }
    const trazer = real('W50', true);
    if (!trazer.ok) { console.log('Nao consegui trazer o Hub para o primeiro plano:', trazer.motivo, '\nTeste de teclado real nao executado.'); process.exitCode = 2; return; }
    const marcas = (k) => hub.ev(`window.__t.filter(x => x[0] === ${JSON.stringify(k)}).map(x => x[1])`);

    // A) Isoladas: Ctrl+Espaço, segura 400 ms, solta. Cronometra do toque até o painel e do soltar até o destino.
    const abrir = [], chegar = []; let falhas = 0;
    for (let i = 0; i < 6; i++) {
      await hub.ev('window.__t.length = 0');
      const antes = await titulo(), esperado = outro(antes);
      const r = real('D17,D32,U32,W400,U17,W900');
      if (!r.ok) { console.log('ABORTADO:', r.motivo); process.exitCode = 2; return; }
      const a = (await marcas('painel-abriu'))[0], ti = (await marcas('titulo:' + esperado)).slice(-1)[0];
      if (a) abrir.push(a - r.tempos.D32[0]); else falhas++;
      if (ti) chegar.push(ti - r.tempos.U17[0]); else falhas++;
    }
    console.log(`\nIsoladas (teclado real, 6 trocas): ate o painel ${med(abrir)} ms [${abrir.join(', ')}]; soltar o Ctrl ate o destino ${med(chegar)} ms [${chegar.join(', ')}]`);
    check('isoladas: toda troca abriu o painel e chegou ao destino', falhas === 0 && abrir.length === 6 && chegar.length === 6);
    check('isoladas: estado final coerente', coerente(await estado(), await titulo()));

    // B) Rápidas, variando como a pessoa solta as teclas.
    const variantes = [
      ['Ctrl+Espaço, soltando o Espaço antes do Ctrl', (hold, gap) => `D17,D32,U32,W${hold},U17,W${gap}`],
      ['Ctrl solto ANTES do Espaço (toque rápido)', (hold, gap) => `D17,D32,W${hold},U17,U32,W${gap}`],
    ];
    for (const [nome, monta] of variantes) {
      for (const [hold, gap, n] of [[80, 150, 12], [30, 40, 20]]) {
        await hub.ev('window.__t.length = 0');
        const antes = await titulo();
        const passos = Array.from({ length: n }, () => monta(hold, gap)).join(',');
        const q = await quadros(async () => real(passos));
        const r = q.r;
        if (!r.ok) { console.log('ABORTADO:', r.motivo); process.exitCode = 2; return; }
        await sleep(1500);
        const esperado = n % 2 === 0 ? antes : outro(antes);
        const feitas = (await marcas('painel-abriu')).length, trocas = (await hub.ev("window.__t.filter(x => x[0].startsWith('titulo:')).length"));
        const e = await estado();
        check(`rápidas, ${nome}, ${n} toques (Ctrl ${hold} ms, intervalo ${gap} ms)`, coerente(e, esperado), `final ${e.titulo} (esperado ${esperado}); painéis ${feitas}, trocas de tela ${trocas}/${n}; painel preso ${e.painel}; quadros: ${q.n}, pior ${q.max} ms, ${q.lentos} acima de 33 ms`);
      }
    }

    // C) Ciclar: Ctrl segurado, três Espaços, soltar. Com 2 destinos termina no outro (1 -> 0 -> 1).
    {
      const antes = await titulo();
      const r = real('D17,D32,U32,W150,D32,U32,W150,D32,U32,W150,U17,W1200');
      if (!r.ok) { console.log('ABORTADO:', r.motivo); process.exitCode = 2; return; }
      const e = await estado();
      check('ciclar: Ctrl segurado, três Espaços, soltar -> o outro app', coerente(e, outro(antes)), `final ${e.titulo}`);
    }
  } catch (e) {
    console.log('ERRO', e.message); resultados.push(false);
  } finally {
    encerrar();
    await sleep(1500);
    console.log(`\n${resultados.filter(Boolean).length}/${resultados.length} verificações OK`);
    if (process.exitCode !== 2) process.exitCode = resultados.every(Boolean) ? 0 : 1;
    process.exit(process.exitCode);
  }
})();
