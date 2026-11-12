'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const { spawn, execFile } = require('node:child_process');
const { compararVersoes } = require('./atualizacoes');

// Apps embutidos (TASK-024, experimental): o app roda como processo próprio e SEM janela, serve a interface em
// 127.0.0.1 (contrato em docs/DECISOES.md, seção 12) e o Hub a mostra num WebContentsView dentro da janela dele.
// Cada app continua independente: falha de um não derruba o Hub nem os outros.
// Por enquanto só o Termix, a partir da pasta de desenvolvimento (precisa do modo `--embed`, TASK-134 no repo dele).

const PASTA_DEV_PADRAO = 'C:/Termix/termix';

// Pasta do Termix com o modo --embed (variável HUB_TERMIX_DEV muda o caminho). null = indisponível.
function localizarDev(env = process.env, existe = fs.existsSync) {
  const pasta = path.resolve(env.HUB_TERMIX_DEV || PASTA_DEV_PADRAO);
  const exe = path.join(pasta, 'node_modules', 'electron', 'dist', 'electron.exe');
  if (!existe(path.join(pasta, 'src', 'embed.js')) || !existe(exe)) return null;
  return { pasta, exe };
}

// Termix INSTALADO com suporte a --embed (versão >= `embutirDesde` do catálogo): é o caminho de qualquer máquina sem a pasta de
// desenvolvimento. A pasta de desenvolvimento, quando existe, tem prioridade (é o que se usa para desenvolver o app).
function localizarInstalado(estado, minimo, existe = fs.existsSync) {
  if (!estado || !estado.instalado || !estado.executavel || !estado.versao || !minimo) return null;
  if (compararVersoes(estado.versao, minimo) < 0) return null;
  if (!existe(estado.executavel)) return null;
  return { exe: estado.executavel, pasta: path.dirname(estado.executavel), instalado: true };
}

const argumentos = (pasta, dadosApp) => [pasta, '--embed', `--user-data-dir=${dadosApp}`];
// App empacotado: o executável já é o app, então não há pasta de código na linha de comando.
const argumentosInstalado = (dadosApp) => ['--embed', `--user-data-dir=${dadosApp}`];

// Ambiente do app: sem variáveis do Electron/Node do Hub, mais o token desta sessão.
function ambiente(env, token) {
  const limpo = Object.fromEntries(Object.entries(env).filter(([k]) => !/^(ELECTRON_|NODE_OPTIONS$)/i.test(k)));
  return { ...limpo, HUB_TOKEN: token, HUB_PARENT_PID: String(process.pid) };
}

const lerPronto = (texto) => { const m = /HUB_READY (\d+)/.exec(String(texto)); return m ? Number(m[1]) : 0; };

// Retângulo vindo da janela: só números finitos e não negativos.
function retanguloValido(r) {
  if (!r || typeof r !== 'object') return null;
  const v = ['x', 'y', 'width', 'height'].map((k) => Math.round(Number(r[k])));
  if (v.some((n) => !Number.isFinite(n) || n < 0 || n > 20000)) return null;
  return { x: v[0], y: v[1], width: v[2], height: v[3] };
}

function consultar(porta, token, caminho) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port: porta, path: caminho, headers: { Cookie: `hubt=${token}` } }, (res) => { res.resume(); resolve(res.statusCode); });
    req.on('error', () => resolve(0));
    req.setTimeout(2000, () => { req.destroy(); resolve(0); });
  });
}

// Encerra o app e tudo o que ele abriu (os terminais são filhos dele).
function encerrarArvore(pid) {
  return new Promise((resolve) => execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => resolve()));
}

function criarEmbutidos({ janela, dadosDir, abrirExterno, aoMudar, aoEvento = () => {}, aoCriarView = () => {} }) {
  const { WebContentsView } = require('electron');
  const apps = new Map(); // id -> { filho, token, porta, view, estado }
  let tema = 'dark'; // quem manda no tema é o Hub
  const PASTA_TEMAS = path.join(__dirname, '..', 'temas-apps');

  // Injeta o CSS de tema do app (src/temas-apps/<id>.css, se existir) e marca o tema atual na página dele.
  function aplicarTema(id, app) {
    const wc = app.view?.webContents;
    if (!wc || wc.isDestroyed()) return;
    const arquivo = path.join(PASTA_TEMAS, `${id}.css`);
    if (!app.cssTema && fs.existsSync(arquivo)) wc.insertCSS(fs.readFileSync(arquivo, 'utf8')).then((k) => { app.cssTema = k; }).catch(() => {});
    wc.executeJavaScript(`document.documentElement.dataset.hubTheme = ${JSON.stringify(tema)}`).catch(() => {});
  }
  function definirTema(novo) { tema = novo; for (const [id, a] of apps) aplicarTema(id, a); }

  const estado = (id) => apps.get(id)?.estado || null;
  let versaoOcultar = 0; // muda a cada vez que as telas dos apps são escondidas (cancela um "mostrar" que ainda carregava)

  function iniciar(id, dev) {
    return new Promise((resolve, reject) => {
      const token = crypto.randomBytes(16).toString('hex');
      const dados = path.join(dadosDir, 'apps', id);
      fs.mkdirSync(dados, { recursive: true });
      // Dados isolados do Termix instalado: copia o estado dele uma vez (só leitura do original).
      const original = path.join(process.env.APPDATA || '', 'Termix', 'state.json');
      const destino = path.join(dados, 'state.json');
      if (!fs.existsSync(destino) && fs.existsSync(original)) { try { fs.copyFileSync(original, destino); } catch { /* sem cópia, abre vazio */ } }
      const filho = spawn(dev.exe, dev.instalado ? argumentosInstalado(dados) : argumentos(dev.pasta, dados), { cwd: dev.pasta, env: ambiente(process.env, token), stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true });
      const app = { filho, token, porta: 0, view: null, estado: 'subindo' };
      apps.set(id, app);
      const limite = setTimeout(() => { app.estado = 'caiu'; encerrarArvore(filho.pid); reject(new Error('tempo esgotado')); }, 20000);
      let resto = '';
      filho.stdout.on('data', (b) => { // linhas `HUB_EVENT {json}`: eventos do app para o Hub (ex.: notificações)
        resto += b.toString();
        const linhas = resto.split(/\r?\n/); resto = linhas.pop();
        for (const l of linhas) { const m = /^HUB_EVENT (.+)$/.exec(l); if (m) { try { aoEvento(id, JSON.parse(m[1])); } catch { /* linha inválida */ } } }
      });
      filho.stdout.on('data', async (b) => {
        const porta = lerPronto(b);
        if (!porta || app.porta) return;
        app.porta = porta;
        if (await consultar(porta, token, '/health') === 200) { clearTimeout(limite); app.estado = 'rodando'; resolve(app); aoMudar(); }
        else { clearTimeout(limite); reject(new Error('health falhou')); }
      });
      filho.once('error', (e) => { clearTimeout(limite); app.estado = 'caiu'; reject(e); });
      filho.once('exit', () => { clearTimeout(limite); const tinha = app.estado; app.estado = 'caiu'; if (app.view && !janela().isDestroyed()) { app.view.setVisible(false); } aoMudar(); if (tinha === 'subindo') reject(new Error('saiu ao subir')); });
    });
  }

  // A tela nasce escondida e já no tamanho certo; só aparece depois de carregar (antes disso aparecia um retângulo claro no canto).
  function criarView(id, app, retangulo) {
    const view = new WebContentsView({ webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, partition: `persist:app-${id}` } });
    view.setBackgroundColor('#00000000'); // transparente: o vidro e o fundo do Hub aparecem por trás do app
    view.setVisible(false);
    if (retangulo) view.setBounds(retangulo);
    const wc = view.webContents;
    aoCriarView(wc);
    const origem = `http://127.0.0.1:${app.porta}`;
    wc.on('will-navigate', (e, url) => { if (!url.startsWith(origem)) { e.preventDefault(); if (/^https?:\/\//i.test(url)) abrirExterno(url); } });
    wc.setWindowOpenHandler(({ url }) => { if (/^https?:\/\//i.test(url)) abrirExterno(url); return { action: 'deny' }; });
    wc.on('did-finish-load', () => { app.cssTema = null; aplicarTema(id, app); }); // cada carga da página recomeça sem o CSS
    app.carregou = new Promise((resolve) => { wc.once('did-finish-load', resolve); wc.once('did-fail-load', resolve); setTimeout(resolve, 8000); });
    janela().contentView.addChildView(view);
    wc.loadURL(`${origem}/?t=${app.token}`);
    return view;
  }

  async function mostrar(id, dev, retangulo) {
    let app = apps.get(id);
    if (app && app.estado === 'caiu') { await parar(id); app = null; }
    if (!app) app = await iniciar(id, dev);
    const r = retanguloValido(retangulo);
    const antes = versaoOcultar;
    if (!app.view) { app.view = criarView(id, app, r); await app.carregou; } // só mostra depois de carregar
    if (antes !== versaoOcultar) return { ok: true }; // a pessoa saiu da tela do app enquanto ela carregava
    for (const [k, a] of apps) if (a.view) a.view.setVisible(k === id);
    if (r) app.view.setBounds(r);
    app.view.webContents.focus();
    return { ok: true };
  }

  function ajustar(id, retangulo) {
    const a = apps.get(id), r = retanguloValido(retangulo);
    if (a?.view && r) a.view.setBounds(r);
  }
  function visivel(id, sim) {
    const a = apps.get(id);
    if (a?.view && a.estado === 'rodando') { a.view.setVisible(Boolean(sim)); if (sim) a.view.webContents.focus(); }
  }
  // Foto da tela atual do app (JPEG em data URL): o Hub a mostra no lugar do app enquanto um menu está aberto,
  // porque a tela do app é uma camada nativa por cima da página e esconderia o menu.
  async function capturar(id) {
    const a = apps.get(id);
    if (!a?.view || a.estado !== 'rodando') return null;
    try {
      const img = await a.view.webContents.capturePage();
      if (!img || img.isEmpty()) return null; // janela escondida ou coberta: sem foto, o app só sai da frente
      return `data:image/jpeg;base64,${img.toJPEG(88).toString('base64')}`;
    } catch { return null; }
  }
  function ocultarTodos() { versaoOcultar++; for (const a of apps.values()) if (a.view) a.view.setVisible(false); }

  async function parar(id) {
    const a = apps.get(id); if (!a) return;
    apps.delete(id);
    if (a.view) { try { janela().contentView.removeChildView(a.view); a.view.webContents.close(); } catch { /* janela já fechada */ } }
    if (a.filho && a.filho.exitCode === null) await encerrarArvore(a.filho.pid);
  }
  const pararTodos = () => Promise.all([...apps.keys()].map(parar));

  // Hub -> app: comando autenticado (só o canal permitido pelo app). Devolve true se o app aceitou.
  function comando(id, corpo) {
    const a = apps.get(id);
    if (!a || a.estado !== 'rodando') return Promise.resolve(false);
    return new Promise((resolve) => {
      const dados = JSON.stringify(corpo);
      const req = http.request({ host: '127.0.0.1', port: a.porta, path: '/__cmd', method: 'POST', headers: { Cookie: `hubt=${a.token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(dados) } }, (res) => { res.resume(); resolve(res.statusCode === 200); });
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => { req.destroy(); resolve(false); });
      req.end(dados);
    });
  }
  // App cuja tela está aparecendo agora (null se nenhuma).
  const visivelAgora = () => { for (const [id, a] of apps) if (a.view && a.estado === 'rodando' && a.view.getVisible()) return id; return null; };

  return { estado, mostrar, ajustar, visivel, capturar, ocultarTodos, parar, pararTodos, definirTema, comando, visivelAgora };
}

module.exports = { localizarDev, localizarInstalado, argumentos, argumentosInstalado, ambiente, lerPronto, retanguloValido, criarEmbutidos };
