// Mini-app de mentira. Roda com ELECTRON_RUN_AS_NODE. Sobe em 127.0.0.1:porta aleatória, exige token.
const http = require('http');
const A = require('./app.json'); const { NOME, COR, VERSAO } = A; const TOKEN = process.env.HUB_TOKEN;
let cliques = 0;
const pagina = () => `<!doctype html><meta charset=utf-8><body style="margin:0;font:15px Segoe UI;background:#10151c;color:#e8edf3">
<div style="padding:28px;border-left:6px solid ${COR};height:100vh;box-sizing:border-box">
<h1 style="margin:0 0 6px">${NOME} <small style="color:#8a97a6">v${VERSAO}</small></h1>
<p>Este é um app independente (pid ${process.pid}) mostrado <b>dentro</b> do Hub.</p>
<p>Cliques: <b id=n>${cliques}</b> <button onclick="fetch('/clique',{method:'POST'}).then(r=>r.json()).then(j=>n.textContent=j.n)">+1</button>
<button onclick="fetch('/crash',{method:'POST'})" style="margin-left:12px;color:#f66">Simular falha grave</button></p>
<textarea style="width:90%;height:160px;background:#0b0f14;color:#9fe;border:1px solid #2a3340" placeholder="campo de texto (teste de foco/teclado)"></textarea>
</div>`;
const srv = http.createServer((req, res) => {
  const cookie = /hubt=([a-f0-9]+)/.exec(req.headers.cookie || '');
  const url = new URL(req.url, 'http://x');
  const ok = (cookie && cookie[1] === TOKEN) || url.searchParams.get('t') === TOKEN;
  if (!ok || (req.headers.host || '').split(':')[0] !== '127.0.0.1') { res.writeHead(401); return res.end('sem token'); }
  const h = { 'Set-Cookie': `hubt=${TOKEN}; HttpOnly; SameSite=Strict; Path=/` };
  if (url.pathname === '/health') { res.writeHead(200, h); return res.end('ok'); }
  if (url.pathname === '/clique') { cliques++; res.writeHead(200, { ...h, 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ n: cliques })); }
  if (url.pathname === '/crash') { res.writeHead(200); res.end('x'); return setTimeout(() => process.exit(13), 50); }
  res.writeHead(200, { ...h, 'Content-Type': 'text/html; charset=utf-8' }); res.end(pagina());
});
srv.listen(0, '127.0.0.1', () => console.log('HUB_READY ' + srv.address().port));
