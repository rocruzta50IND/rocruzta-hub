'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Canais duplicados de config.js de propósito: o preload em sandbox só enxerga `electron`.
// O teste confere que os dois arquivos continuam iguais.
const CH = {
  minimize: 'win:minimize',
  toggleMaximize: 'win:toggle-maximize',
  close: 'win:close',
  isMaximized: 'win:is-maximized',
  maximizedChanged: 'win:maximized-changed',
  apps: 'apps:list',
  detectar: 'apps:detectar',
  releases: 'apps:releases',
  abrir: 'apps:abrir',
  embutir: 'apps:embutir',
  embutirAjustar: 'apps:embutir-ajustar',
  embutirVisivel: 'apps:embutir-visivel',
  embutirOcultar: 'apps:embutir-ocultar',
  embutidoMudou: 'apps:embutido-mudou',
  tema: 'apps:tema',
  conversaEnviar: 'conversa:enviar',
  conversaNova: 'conversa:nova',
  conversaEstado: 'conversa:estado',
  conversaEvento: 'conversa:evento',
  usuario: 'usuario:info',
  versoes: 'app:versoes',
  capturar: 'apps:capturar',
  notificacoes: 'notif:listar',
  notificacoesMudou: 'notif:mudou',
  notificacoesVistas: 'notif:vistas',
  notificacaoAbrir: 'notif:abrir',
  notificacaoAbrirPedido: 'notif:abrir-pedido',
  atualizacoes: 'atu:listar',
  atualizacoesMudou: 'atu:mudou',
  atualizacoesChecar: 'atu:checar',
  atualizacoesVisto: 'atu:visto',
  atualizacoesFechar: 'atu:fechar',
  desinstalar: 'apps:desinstalar',
  trocaEspaco: 'troca:espaco',
  trocaSoltou: 'troca:soltou',
  trocaFoco: 'troca:foco',
};

contextBridge.exposeInMainWorld('hub', {
  minimize: () => ipcRenderer.send(CH.minimize),
  toggleMaximize: () => ipcRenderer.send(CH.toggleMaximize),
  close: () => ipcRenderer.send(CH.close),
  isMaximized: () => ipcRenderer.invoke(CH.isMaximized),
  apps: () => ipcRenderer.invoke(CH.apps),
  detectarApps: () => ipcRenderer.invoke(CH.detectar),
  abrirApp: (id) => ipcRenderer.invoke(CH.abrir, String(id)),
  desinstalarApp: (id) => ipcRenderer.invoke(CH.desinstalar, String(id)),
  abrirReleases: (id) => ipcRenderer.invoke(CH.releases, String(id)),
  // Apps embutidos (experimental): o app roda sem janela e aparece dentro da janela do Hub.
  // Chat da tela Início (independente dos apps): conversa com o Claude Code, sem histórico.
  conversaEstado: () => ipcRenderer.invoke(CH.conversaEstado),
  conversaEnviar: (texto) => ipcRenderer.invoke(CH.conversaEnviar, String(texto)),
  conversaNova: () => ipcRenderer.invoke(CH.conversaNova),
  onConversaEvento: (cb) => {
    const listener = (_e, ev) => cb(ev);
    ipcRenderer.on(CH.conversaEvento, listener);
    return () => ipcRenderer.removeListener(CH.conversaEvento, listener);
  },
  usuario: () => ipcRenderer.invoke(CH.usuario),
  versoes: () => ipcRenderer.invoke(CH.versoes),
  // Foto da tela do app embutido, para mostrar no lugar dele enquanto um menu do Hub está aberto.
  capturarEmbutido: (id) => ipcRenderer.invoke(CH.capturar, String(id)),
  mostrarEmbutido: (id, retangulo) => ipcRenderer.invoke(CH.embutir, String(id), retangulo),
  ajustarEmbutido: (id, retangulo) => ipcRenderer.send(CH.embutirAjustar, String(id), retangulo),
  visivelEmbutido: (id, sim) => ipcRenderer.send(CH.embutirVisivel, String(id), Boolean(sim)),
  ocultarEmbutido: () => ipcRenderer.send(CH.embutirOcultar),
  // O Hub manda no tema: avisa o tema atual para os apps embutidos o aplicarem.
  definirTema: (tema) => ipcRenderer.send(CH.tema, String(tema)),
  // Atualizações dos apps (só aviso): estado lido das releases públicas do GitHub.
  atualizacoes: () => ipcRenderer.invoke(CH.atualizacoes),
  verificarAtualizacoes: () => ipcRenderer.invoke(CH.atualizacoesChecar),
  marcarAtualizacaoVista: (id) => ipcRenderer.send(CH.atualizacoesVisto, String(id)),
  fecharAvisoAtualizacao: (id) => ipcRenderer.send(CH.atualizacoesFechar, String(id)),
  onAtualizacoesMudou: (cb) => {
    const listener = () => cb();
    ipcRenderer.on(CH.atualizacoesMudou, listener);
    return () => ipcRenderer.removeListener(CH.atualizacoesMudou, listener);
  },
  // Notificações dos apps embutidos (quem mostra é o Hub).
  notificacoes: () => ipcRenderer.invoke(CH.notificacoes),
  marcarNotificacoesVistas: () => ipcRenderer.send(CH.notificacoesVistas),
  abrirNotificacao: (id) => ipcRenderer.invoke(CH.notificacaoAbrir, Number(id)),
  onNotificacoesMudou: (cb) => {
    const listener = () => cb();
    ipcRenderer.on(CH.notificacoesMudou, listener);
    return () => ipcRenderer.removeListener(CH.notificacoesMudou, listener);
  },
  onAbrirNotificacao: (cb) => {
    const listener = (_e, id) => cb(Number(id));
    ipcRenderer.on(CH.notificacaoAbrirPedido, listener);
    return () => ipcRenderer.removeListener(CH.notificacaoAbrirPedido, listener);
  },
  // Troca rápida entre apps (Ctrl+Espaço): as teclas chegam pelo processo principal, mesmo com o foco dentro de um app.
  onTrocaEspaco: (cb) => {
    const listener = (_e, voltar) => cb(Boolean(voltar));
    ipcRenderer.on(CH.trocaEspaco, listener);
    return () => ipcRenderer.removeListener(CH.trocaEspaco, listener);
  },
  onTrocaSoltou: (cb) => {
    const listener = () => cb();
    ipcRenderer.on(CH.trocaSoltou, listener);
    return () => ipcRenderer.removeListener(CH.trocaSoltou, listener);
  },
  focarJanela: () => ipcRenderer.send(CH.trocaFoco),
  onEmbutidoMudou: (cb) => {
    const listener = () => cb();
    ipcRenderer.on(CH.embutidoMudou, listener);
    return () => ipcRenderer.removeListener(CH.embutidoMudou, listener);
  },
  onMaximizedChange: (cb) => {
    const listener = (_e, value) => cb(Boolean(value));
    ipcRenderer.on(CH.maximizedChanged, listener);
    return () => ipcRenderer.removeListener(CH.maximizedChanged, listener);
  },
});
