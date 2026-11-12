const { app, BrowserWindow, WebContentsView, ipcMain } = require('electron');
const { spawn } = require('child_process');
const crypto = require('crypto'), fs = require('fs'), path = require('path'), http = require('http');
const RAIZ = path.join(__dirname, '..');
const REL = path.join(RAIZ, 'releases'), DADOS = path.join(RAIZ, 'data', 'apps');
const NOMES = { 'ping-a': 'Ping A', 'ping-b': 'Ping B' };
const procs = {};   // id -> {child, port, token, view, estado}
let win, selecionado = null;
const SIDE = 240;

const versoes = (id) => fs.existsSync(path.join(REL, id)) ? fs.readdirSync(path.join(REL, id)).sort() : [];
const instalada = (id) => { const d = path.join(DADOS, id); if (!fs.existsSync(d)) return null; const v = fs.readdirSync(d).sort(); return v.length ? v[v.length - 1] : null; };
function instalar(id) { // release mais nova -> data/apps/<id>/<versao>; mantém a anterior para rollback
  const v = versoes(id).pop(); const dst = path.join(DADOS, id, v);
  fs.cpSync(path.join(REL, id, v), dst, { recursive: true });
  return v;
}
async function parar(id) {
  const p = procs[id]; if (!p) return;
  if (p.view) { win.contentView.removeChildView(p.view); p.view.webContents.close(); }
  if (p.child && p.child.exitCode === null) { p.child.kill(); await new Promise(r => p.child.once('exit', r)); }
  delete procs[id];
}
async function desinstalar(id) { await parar(id); fs.rmSync(path.join(DADOS, id), { recursive: true, force: true }); avisa(); }
const avisa = () => { if (win && !win.isDestroyed()) win.webContents.send('mudou'); };

function get(port, token, p, comToken = true) {
  return new Promise((res) => {
    const r = http.get({ host: '127.0.0.1', port, path: p, headers: comToken ? { Cookie: 'hubt=' + token } : {} }, (x) => { x.resume(); res(x.statusCode); });
    r.on('error', () => res(0)); r.setTimeout(2000, () => { r.destroy(); res(0); });
  });
}
function iniciar(id) {
  return new Promise((resolve, reject) => {
    const v = instalada(id); const dir = path.join(DADOS, id, v);
    const manifesto = JSON.parse(fs.readFileSync(path.join(dir, 'app.json')));
    const token = crypto.randomBytes(16).toString('hex');
    const child = spawn(process.execPath, [path.join(dir, manifesto.start)], { cwd: dir, env: { ELECTRON_RUN_AS_NODE: '1', HUB_TOKEN: token }, stdio: ['ignore', 'pipe', 'inherit'] });
    const p = { child, token, estado: 'subindo', versao: v }; procs[id] = p;
    child.stdout.on('data', async (b) => {
      const m = /HUB_READY (\d+)/.exec(b.toString()); if (!m || p.port) return; p.port = +m[1];
      if (await get(p.port, token, '/health') === 200) { p.estado = 'rodando'; resolve(p); avisa(); } else reject(new Error('health falhou'));
    });
    child.on('exit', (code) => { p.estado = 'caiu'; p.code = code; avisa(); if (selecionado === id) mostra(id); });
  });
}
async function abrir(id) {
  selecionado = id;
  let p = procs[id];
  if (!p || p.estado === 'caiu') { if (p) await parar(id); p = await iniciar(id); }
  mostra(id);
}
function mostra(id) {
  for (const [k, q] of Object.entries(procs)) if (q.view) q.view.setVisible(k === id && q.estado === 'rodando');
  const p = procs[id]; if (!p || p.estado !== 'rodando') return;
  if (!p.view) {
    p.view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: 'persist:app-' + id } });
    win.contentView.addChildView(p.view); ajusta();
    p.view.webContents.loadURL(`http://127.0.0.1:${p.port}/?t=${p.token}`);
  }
  p.view.setVisible(true); ajusta();
}
function ajusta() { const [w, h] = win.getContentSize(); for (const q of Object.values(procs)) if (q.view) q.view.setBounds({ x: SIDE, y: 0, width: w - SIDE, height: h }); }
const lista = () => Object.keys(NOMES).map(id => ({ id, nome: NOMES[id], instalado: !!instalada(id), versao: instalada(id), estado: procs[id] && procs[id].estado }));

ipcMain.handle('lista', lista);
ipcMain.handle('abrir', (_, id) => abrir(id));
ipcMain.handle('instalar', async (_, id) => { const rodava = !!procs[id]; await parar(id); instalar(id); avisa(); if (rodava || selecionado === id) await abrir(id); });
ipcMain.handle('desinstalar', (_, id) => desinstalar(id));
ipcMain.handle('reiniciar', (_, id) => abrir(id));

app.whenReady().then(async () => {
  win = new BrowserWindow({ width: 1100, height: 700, title: 'Lab Hub', backgroundColor: '#0d1117', webPreferences: { preload: path.join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true } });
  win.setMenuBarVisibility(false);
  await win.loadFile(path.join(__dirname, 'shell.html'));
  win.on('resize', ajusta);
  if (process.argv.includes('--selftest')) return selftest();
});
app.on('window-all-closed', async () => { for (const id of Object.keys(procs)) await parar(id); app.quit(); });

async function selftest() {
  const R = []; const ok = (n, c) => { R.push((c ? 'OK    ' : 'FALHA ') + n); };
  const pid = (id) => procs[id] && procs[id].child.pid, alive = (id) => !!procs[id] && procs[id].child.exitCode === null;
  const esp = (ms) => new Promise(r => setTimeout(r, ms));
  fs.rmSync(path.join(RAIZ, 'data'), { recursive: true, force: true });
  // simula v1.0.0 instalada do A (a release mais nova é a 1.1.0)
  fs.cpSync(path.join(REL, 'ping-a', '1.0.0'), path.join(DADOS, 'ping-a', '1.0.0'), { recursive: true });
  ok('instala B da release (v' + instalar('ping-b') + ')', instalada('ping-b') === '1.0.0');
  await abrir('ping-a'); await abrir('ping-b');
  ok('A e B rodando como processos separados do Hub', alive('ping-a') && alive('ping-b') && pid('ping-a') !== pid('ping-b') && pid('ping-a') !== process.pid);
  const A = procs['ping-a'], B = procs['ping-b'];
  ok('porta exige token (sem token = 401)', await get(A.port, A.token, '/', false) === 401);
  ok('token do B não vale no A', await get(A.port, B.token, '/health') === 401);
  ok('com token = 200', await get(A.port, A.token, '/health') === 200);
  await esp(1000);
  const txtA = await A.view.webContents.executeJavaScript('document.body.innerText');
  ok('interface do A renderizada dentro do Hub', /Ping A/.test(txtA) && /v1\.0\.0/.test(txtA));
  ok('view do app sem Node nem API do Hub', await A.view.webContents.executeJavaScript('typeof require+typeof hub+typeof process') === 'undefinedundefinedundefined');
  ok('sessões (cookies) separadas por app', A.view.webContents.session !== B.view.webContents.session);
  await A.view.webContents.executeJavaScript("fetch('/crash',{method:'POST'})"); await esp(1000);
  ok('A caiu (estado "caiu")', A.estado === 'caiu');
  ok('B segue vivo e respondendo', alive('ping-b') && await get(B.port, B.token, '/health') === 200);
  ok('Hub segue vivo', !win.isDestroyed());
  const antes = pid('ping-a'); await abrir('ping-a');
  ok('reinício do A (novo pid, rodando)', procs['ping-a'].estado === 'rodando' && pid('ping-a') !== antes);
  await parar('ping-a'); const v = instalar('ping-a'); await abrir('ping-a'); await esp(1000);
  const t2 = await procs['ping-a'].view.webContents.executeJavaScript('document.body.innerText');
  const vs = fs.readdirSync(path.join(DADOS, 'ping-a'));
  ok('atualização 1.0.0 -> ' + v + ' (pastas mantidas p/ rollback: ' + vs.join(', ') + ')', /v1\.1\.0/.test(t2) && vs.length === 2);
  await desinstalar('ping-a');
  ok('desinstala A (pasta apagada, processo morto, B intacto)', !fs.existsSync(path.join(DADOS, 'ping-a')) && !procs['ping-a'] && alive('ping-b'));
  await desinstalar('ping-b');
  const out = R.join('\n'); console.log('\n=== RESULTADO ===\n' + out); fs.writeFileSync(path.join(RAIZ, 'resultado.txt'), out);
  app.exit(R.some(x => x.startsWith('FALHA')) ? 1 : 0);
}
