'use strict';

const path = require('node:path');
const os = require('node:os');
const { app, BrowserWindow, ipcMain, shell, Notification, dialog } = require('electron');
const { tratarPedido } = require('./dialogos');
const { carregarCatalogo, urlReleases } = require('./apps');
const { detectarApps } = require('./deteccao');
const { criarAtualizacoes, compararVersoes } = require('./atualizacoes');
const { criarAutoAtualizacao, criarAutoAtualizacaoFalsa } = require('./autoatualizacao');
const { pastaPreparo, mesmoMotor, preparoValido, extrairInstalador, lancarScript } = require('./troca-arquivos');
const { anexarExecucao, abrirApp, desinstalarApp } = require('./execucao');
const { instalarApp } = require('./instalacao');
const { localizarDev, localizarInstalado, criarEmbutidos } = require('./embutido');
const { criarConversa } = require('./conversa');
const { classificarTecla } = require('./teclas');
const { criarCentral, deveAvisarWindows, TITULOS } = require('./notificacoes');
const { APP_ID, APP_NAME, ICON, WINDOW, CHANNELS, userDataDir } = require('./config');

// Dados do usuário em %APPDATA%\Rocruzta Hub (antes de qualquer outro uso do app).
app.setPath('userData', userDataDir(app.getPath('appData')));
app.setAppUserModelId(APP_ID);

let mainWindow = null;

// Apps embutidos (experimental, TASK-024): rodam sem janela e aparecem dentro da janela do Hub.
const central = criarCentral();
const avisarNotificacoes = () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(CHANNELS.notificacoesMudou); };
const appsReais = () => carregarCatalogo().apps.filter((a) => !a.emBreve); // "em breve" só existe na loja: não tem detecção nem abertura
const nomeDoApp = (id) => carregarCatalogo().apps.find((x) => x.id === id)?.nome || id;
// Evento vindo de um app embutido: entra na central do Hub e, se a pessoa não está olhando, vira aviso do Windows.
function aoEventoDoApp(appId, bruto) {
  // Diálogo de arquivo pedido pelo app (ele não tem janela): o Hub abre preso à própria janela e devolve a resposta (TASK-039).
  if (bruto?.evento === 'dialogo') { tratarPedido(bruto, { dialog, janela: mainWindow, responder: (corpo) => embutidos.comando(appId, corpo) }).catch(() => {}); return; }
  if (bruto?.evento !== 'notificacao') return;
  const item = central.adicionar(appId, bruto);
  if (!item) return;
  avisarNotificacoes();
  const emFoco = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused());
  if (item.tipo === 'cache' && emFoco) return;
  if (deveAvisarWindows({ janelaEmFoco: emFoco, appVisivel: embutidos.visivelAgora(), appId }) && Notification.isSupported()) {
    const quem = item.quem ? ` · ${item.quem}` : '';
    const n = new Notification({ title: `${nomeDoApp(appId)}${quem} · ${TITULOS[item.tipo]}`, body: item.msg, icon: ICON });
    n.on('click', () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show(); mainWindow.focus();
      mainWindow.webContents.send(CHANNELS.notificacaoAbrirPedido, item.id);
    });
    n.show();
  }
}
// Troca rápida (Ctrl+Espaço): com o foco DENTRO de um app embutido, a tecla é pega aqui, no processo principal, e não chega ao
// app (no terminal seria o caractere NUL). Quando o processo principal trata uma tecla, o Chromium descarta os keyUp seguintes
// daquela tela, inclusive o do Ctrl, então o foco passa para a página do Hub NA HORA: é ela que vê o Ctrl ser solto.
// Com o foco na própria página do Hub o atalho é tratado no renderer (shell.js), onde isso não acontece.
function escutarTeclasDeTroca(wc) {
  wc.on('before-input-event', (e, input) => {
    const t = classificarTecla(input);
    if (!t || !mainWindow || mainWindow.isDestroyed()) return;
    if (t.acao === 'soltou') return mainWindow.webContents.send(CHANNELS.trocaSoltou);
    e.preventDefault();
    mainWindow.webContents.focus();
    if (!t.repeticao) mainWindow.webContents.send(CHANNELS.trocaEspaco, t.voltar);
  });
}
const embutidos = criarEmbutidos({
  aoCriarView: escutarTeclasDeTroca,
  aoEvento: aoEventoDoApp,
  janela: () => mainWindow,
  dadosDir: app.getPath('userData'),
  abrirExterno: (url) => shell.openExternal(url),
  aoMudar: () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(CHANNELS.embutidoMudou); },
});
// Atualizações (só aviso): lê as releases públicas dos apps e compara com a versão instalada no Windows.
const atualizacoes = criarAtualizacoes({ arquivo: path.join(app.getPath('userData'), 'atualizacoes.json') });
// Versão do app que o Hub realmente roda: se ele abre o app embutido (pasta de desenvolvimento), vale a versão dessa pasta;
// senão, a instalada no Windows. É com essa versão que o aviso de atualização compara.
const versaoEmbutida = (a) => {
  const dev = localizarDev();
  if (!dev || a.embutir !== 'electron') return null;
  try { return String(JSON.parse(require('node:fs').readFileSync(path.join(dev.pasta, 'package.json'), 'utf8')).version || '') || null; } catch { return null; }
};
const instaladasAgora = async () => {
  const det = await detectarApps(appsReais()).catch(() => ({}));
  const saida = {};
  for (const a of appsReais()) {
    const v = versaoEmbutida(a) || (det[a.id]?.instalado && det[a.id].versao) || null;
    if (v) saida[a.id] = String(v);
  }
  return saida;
};
// Atualização do próprio Hub (TASK-034, TASK-045): só no app instalado (ou com HUB_AUTOATUALIZAR=1, para testes).
// HUB_ATUALIZACAO_FALSA=1 simula uma versão nova (faixa, barra de progresso e fim) sem rede nem arquivos.
const atualizacaoFalsa = process.env.HUB_ATUALIZACAO_FALSA === '1';
const autoAtualizar = atualizacaoFalsa || app.isPackaged || process.env.HUB_AUTOATUALIZAR === '1';
const avisarHubAtualizacao = (estado) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(CHANNELS.hubAtualizacaoMudou, estado); };
const fsMain = require('node:fs');
// Caminho rápido: o instalador baixado é extraído numa pasta de preparo (dentro da pasta instalada) com o Hub em uso;
// ao fechar, o script troca os arquivos por renomeação e reabre o Hub. Só no app instalado e com o 7za junto.
async function prepararTrocaHub(arquivo, versao, aoPercentual) {
  if (!app.isPackaged) return null;
  const raiz = pastaPreparo(process.execPath);
  const dir = path.join(raiz, versao);
  try { for (const d of fsMain.readdirSync(raiz)) if (d !== versao) fsMain.rmSync(path.join(raiz, d), { recursive: true, force: true }); } catch { /* pasta nova */ }
  const ok = await extrairInstalador({ sevenZ: path.join(process.resourcesPath, '7za.exe'), arquivo, destino: dir, aoPercentual });
  if (!ok || !preparoValido(dir, path.basename(process.execPath))) { try { fsMain.rmSync(dir, { recursive: true, force: true }); } catch { /* ignora */ } return null; }
  return { dir, manterExe: mesmoMotor(path.dirname(process.execPath), dir) };
}
function iniciarTrocaHub({ dir, manterExe }) {
  return lancarScript(path.join(__dirname, 'trocar-arquivos.ps1'), 'rocruzta-hub-trocar-arquivos.ps1', {
    ParentPid: process.pid, Src: dir, Dst: path.dirname(process.execPath), Exe: path.basename(process.execPath),
    Restart: 1, KeepExe: manterExe ? 1 : 0, Log: path.join(os.tmpdir(), 'rocruzta-hub-troca.log'),
  });
}
// Sobra de uma atualização já aplicada (ou abandonada): pasta de preparo de versão que não é mais nova que a atual.
function limparPreparoAntigo() {
  if (!app.isPackaged) return;
  try {
    const raiz = pastaPreparo(process.execPath);
    for (const d of fsMain.readdirSync(raiz)) if (compararVersoes(d, app.getVersion()) <= 0) fsMain.rmSync(path.join(raiz, d), { recursive: true, force: true });
  } catch { /* nada a limpar */ }
}
const hubAtualizacao = atualizacaoFalsa
  ? criarAutoAtualizacaoFalsa({ aoMudar: avisarHubAtualizacao })
  : criarAutoAtualizacao({ versaoAtual: app.getVersion(), aoMudar: avisarHubAtualizacao, preparar: prepararTrocaHub, iniciarTroca: iniciarTrocaHub });
const verificarHub = async () => { if (autoAtualizar) { try { await hubAtualizacao.checar(); } catch { /* sem checagem desta vez */ } } };
const avisarAtualizacoes = () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(CHANNELS.atualizacoesMudou); };
async function verificarAtualizacoes() {
  try { if (await atualizacoes.checar(appsReais(), await instaladasAgora())) avisarAtualizacoes(); } catch { /* sem checagem desta vez */ }
}
// Como o Hub embute o app nesta máquina: a pasta de desenvolvimento (se existir) ou o app instalado com suporte a --embed.
// `estado` é a detecção do app no Windows (se não vier, é lida agora). null = sem modo embutido (abre em janela).
async function embutivelDe(a, estado) {
  if (a.embutir !== 'electron') return null;
  const dev = localizarDev();
  if (dev) return { ...dev, origem: 'dev' };
  if (!a.embutirDesde) return null;
  const est = estado || (await detectarApps([a]).catch(() => ({})))[a.id];
  const inst = localizarInstalado(est, a.embutirDesde);
  return inst ? { ...inst, origem: 'instalado' } : null;
}
const appEmbutivel = (id) => appsReais().find((x) => x.id === id && x.embutir === 'electron');

function createWindow() {
  mainWindow = new BrowserWindow({
    ...WINDOW,
    title: APP_NAME,
    icon: ICON,
    frame: false,
    show: false,
    backgroundColor: '#191919',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('maximize', sendMaximized);
  mainWindow.on('unmaximize', sendMaximized);
  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
}

function sendMaximized() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(CHANNELS.maximizedChanged, mainWindow.isMaximized());
  }
}

// Só valem comandos vindos da janela do Hub.
function windowFrom(event) {
  const win = BrowserWindow.fromWebContents(event.sender);
  return win && win === mainWindow ? win : null;
}

ipcMain.on(CHANNELS.minimize, (e) => windowFrom(e)?.minimize());
ipcMain.on(CHANNELS.toggleMaximize, (e) => {
  const win = windowFrom(e);
  if (win) win.isMaximized() ? win.unmaximize() : win.maximize();
});
ipcMain.on(CHANNELS.close, (e) => windowFrom(e)?.close());
ipcMain.handle(CHANNELS.isMaximized, (e) => windowFrom(e)?.isMaximized() ?? false);
ipcMain.handle(CHANNELS.apps, (e) => (windowFrom(e) ? carregarCatalogo() : null));
ipcMain.handle(CHANNELS.detectar, async (e) => {
  if (!windowFrom(e)) return null;
  try {
    const apps = appsReais();
    const estados = await anexarExecucao(apps, await detectarApps(apps));
    // App com modo embutido disponível: aparece como utilizável e "em execução" também quando roda embutido.
    for (const a of apps.filter((x) => x.embutir === 'electron')) {
      const emb = await embutivelDe(a, estados[a.id]);
      if (!emb) continue;
      const rodandoEmb = embutidos.estado(a.id);
      estados[a.id] = { ...(estados[a.id] || {}), embutivel: true, embutido: rodandoEmb, rodando: estados[a.id]?.rodando === true || rodandoEmb === 'rodando', ...(emb.origem === 'dev' && versaoEmbutida(a) ? { versao: versaoEmbutida(a), embutidoDev: true } : {}) };
    }
    return estados;
  } catch { return null; }
});
// Abre pelo id do catálogo; o executável vem da detecção no registro, nunca da janela.
ipcMain.handle(CHANNELS.abrir, async (e, id) => {
  if (!windowFrom(e)) return { ok: false, motivo: 'janela' };
  try {
    const a = appsReais().find((x) => x.id === id);
    if (!a) return { ok: false, motivo: 'desconhecido' };
    return await abrirApp((await detectarApps([a]))[a.id]);
  } catch { return { ok: false, motivo: 'falha' }; }
});
// Mostra o app embutido dentro da janela do Hub (sobe o processo se preciso). O retângulo vem da janela e é validado.
ipcMain.handle(CHANNELS.embutir, async (e, id, retangulo) => {
  if (!windowFrom(e)) return { ok: false, motivo: 'janela' };
  try {
    if (!appEmbutivel(id)) return { ok: false, motivo: 'desconhecido' };
    if (embutidos.pronto(id)) return await embutidos.mostrar(id, null, retangulo); // já aberto: só traz a tela de volta, sem reconsultar o registro
    const dev = await embutivelDe(appEmbutivel(id));
    if (!dev) return { ok: false, motivo: 'indisponivel' };
    return await embutidos.mostrar(id, dev, retangulo);
  } catch (erro) { return { ok: false, motivo: 'falha', detalhe: erro.message }; }
});
// Chat da tela Início: independente dos apps (Claude Code, modelo mais barato, sem histórico).
const conversa = criarConversa({
  pasta: path.join(app.getPath('userData'), 'conversa'),
  emit: (ev) => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(CHANNELS.conversaEvento, ev); },
});
ipcMain.handle(CHANNELS.conversaEstado, (e) => (windowFrom(e) ? conversa.estado() : { disponivel: false }));
ipcMain.handle(CHANNELS.conversaEnviar, (e, texto) => (windowFrom(e) ? conversa.enviar(texto) : { ok: false }));
ipcMain.handle(CHANNELS.conversaNova, (e) => { if (windowFrom(e)) conversa.nova(); return true; });
// Versão do Hub e dos apps: o app que roda embutido tem a versão lida da pasta dele; os demais, a do registro do Windows.
ipcMain.handle(CHANNELS.versoes, async (e) => {
  if (!windowFrom(e)) return { hub: '', apps: {} };
  const apps = {};
  try {
    const dev = localizarDev();
    const instalados = await detectarApps(appsReais()).catch(() => ({}));
    for (const a of appsReais()) {
      let v = instalados[a.id]?.versao || null;
      if (a.embutir === 'electron' && dev) { try { v = JSON.parse(require('node:fs').readFileSync(path.join(dev.pasta, 'package.json'), 'utf8')).version || v; } catch { /* sem package.json */ } }
      if (v) apps[a.id] = String(v);
    }
  } catch { /* sem versões: o rodapé fica sem o número */ }
  return { hub: app.getVersion(), apps };
});
ipcMain.handle(CHANNELS.usuario, (e) => {
  if (!windowFrom(e)) return { nome: '' };
  let nome = '';
  try { nome = os.userInfo().username || ''; } catch { /* sem usuário legível */ }
  return { nome };
});
ipcMain.handle(CHANNELS.capturar, async (e, id) => (windowFrom(e) && appEmbutivel(id) ? embutidos.capturar(id) : null));
ipcMain.on(CHANNELS.embutirAjustar, (e, id, retangulo) => { if (windowFrom(e) && appEmbutivel(id)) embutidos.ajustar(id, retangulo); });
ipcMain.on(CHANNELS.embutirVisivel, (e, id, sim) => { if (windowFrom(e) && appEmbutivel(id)) embutidos.visivel(id, sim); });
ipcMain.on(CHANNELS.tema, (e, tema) => { if (windowFrom(e)) embutidos.definirTema(tema === 'light' ? 'light' : 'dark'); });
ipcMain.handle(CHANNELS.notificacoes, (e) => (windowFrom(e) ? central.listar() : []));
ipcMain.on(CHANNELS.notificacoesVistas, (e) => { if (windowFrom(e)) { central.marcarVistas(); avisarNotificacoes(); } });
// Abre a aba do app que gerou a notificação (o renderer já trouxe o app para a frente).
ipcMain.handle(CHANNELS.notificacaoAbrir, async (e, id) => {
  if (!windowFrom(e)) return false;
  const item = central.obter(id);
  return item ? embutidos.comando(item.appId, { canal: 'notify:click', tabId: item.tabId }) : false;
});
// Desinstalar: abre o desinstalador que o próprio app registrou no Windows (pede administrador). Só com o app fechado.
ipcMain.handle(CHANNELS.desinstalar, async (e, id) => {
  if (!windowFrom(e)) return { ok: false, motivo: 'janela' };
  try {
    const a = appsReais().find((x) => x.id === id);
    if (!a) return { ok: false, motivo: 'desconhecido' };
    const estados = await anexarExecucao([a], await detectarApps([a]));
    if (embutidos.estado(id) === 'rodando') return { ok: false, motivo: 'em-execucao' };
    return await desinstalarApp(estados[a.id]);
  } catch { return { ok: false, motivo: 'falha' }; }
});
// Instalar ou atualizar: baixa o instalador da última release do app e o executa em modo silencioso (src/main/instalacao.js).
const instalando = new Set();
ipcMain.handle(CHANNELS.instalar, async (e, id) => {
  const w = windowFrom(e);
  if (!w) return { ok: false, motivo: 'janela' };
  const a = appsReais().find((x) => x.id === id);
  if (!a) return { ok: false, motivo: 'desconhecido' };
  if (instalando.has(id)) return { ok: false, motivo: 'em-andamento' };
  instalando.add(id);
  const avisar = (dados) => { if (!w.isDestroyed()) w.webContents.send(CHANNELS.instalacaoMudou, { id, ...dados }); };
  try {
    const estados = await anexarExecucao([a], await detectarApps([a]));
    const rodando = estados[a.id]?.rodando === true || embutidos.estado(id) === 'rodando';
    const r = await instalarApp(a, { ...estados[a.id], rodando }, { aoMudar: avisar });
    avisar({ fase: r.ok ? 'pronto' : 'erro', motivo: r.motivo, progresso: 1 });
    if (r.ok) setTimeout(verificarAtualizacoes, 1500);
    return r;
  } catch { avisar({ fase: 'erro', motivo: 'falha' }); return { ok: false, motivo: 'falha' }; } finally { instalando.delete(id); }
});
ipcMain.handle(CHANNELS.hubAtualizacao, (e) => (windowFrom(e) ? hubAtualizacao.estado() : { fase: 'nenhuma' }));
ipcMain.handle(CHANNELS.hubAtualizacaoChecar, async (e) => { if (!windowFrom(e)) return { fase: 'nenhuma' }; await verificarHub(); return hubAtualizacao.estado(); });
// Aplicar (clique em Atualizar): baixa e prepara com a barra andando na interface; quando tudo termina, lança a troca de
// arquivos (ou o instalador, no caminho de reserva) e fecha o Hub. A troca renomeia os arquivos e reabre o Hub quase na hora.
ipcMain.handle(CHANNELS.hubAtualizacaoAplicar, async (e) => {
  if (!windowFrom(e)) return { ok: false, motivo: 'janela' };
  const final = await hubAtualizacao.atualizar();
  if (final.fase !== 'pronta') return { ok: false, motivo: 'erro' };
  const r = hubAtualizacao.aplicar();
  if (r.ok && !r.falso) setTimeout(() => app.quit(), 200);
  return r;
});
ipcMain.handle(CHANNELS.atualizacoes, async (e) => (windowFrom(e) ? atualizacoes.listar(await instaladasAgora()) : {}));
ipcMain.handle(CHANNELS.atualizacoesChecar, async (e) => {
  if (!windowFrom(e)) return {};
  await verificarAtualizacoes();
  return atualizacoes.listar(await instaladasAgora());
});
ipcMain.on(CHANNELS.atualizacoesVisto, (e, id) => { if (windowFrom(e) && appsReais().some((x) => x.id === id)) atualizacoes.marcarVisto(id); });
ipcMain.on(CHANNELS.atualizacoesFechar, (e, id) => { if (windowFrom(e) && appsReais().some((x) => x.id === id)) atualizacoes.fecharAviso(id); });
ipcMain.on(CHANNELS.trocaFoco, (e) => { const w = windowFrom(e); if (w) w.webContents.focus(); });
ipcMain.on(CHANNELS.embutirOcultar, (e) => { if (windowFrom(e)) embutidos.ocultarTodos(); });
// A página de releases sai do catálogo (repositório do app), nunca de um endereço vindo da janela.
ipcMain.handle(CHANNELS.releases, async (e, id) => {
  if (!windowFrom(e)) return false;
  const a = appsReais().find((x) => x.id === id);
  if (!a) return false;
  await shell.openExternal(urlReleases(a));
  return true;
});

// Instância única: abrir de novo traz a janela existente para a frente.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  app.whenReady().then(() => { createWindow(); setTimeout(verificarAtualizacoes, 4000); setInterval(verificarAtualizacoes, 3 * 60 * 60 * 1000); limparPreparoAntigo(); setTimeout(verificarHub, 6000); setInterval(verificarHub, 3 * 60 * 60 * 1000); }); // confere ao abrir e a cada 3 h
  app.on('before-quit', () => { embutidos.pararTodos(); conversa.nova(); }); // encerra os apps embutidos e os processos que eles abriram
  app.on('window-all-closed', () => app.quit());
}
