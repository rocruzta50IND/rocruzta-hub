'use strict';

const path = require('node:path');

// Constantes do app, sem dependência do Electron (testáveis com Node puro).
module.exports = {
  APP_ID: 'com.rocruzta.hub',
  APP_NAME: 'Rocruzta Hub',
  // Ícone da janela e da barra de tarefas (PNG 1024x1024, pétalas azuis).
  ICON: path.join(__dirname, '..', '..', 'assets', 'icone.png'),
  // Pasta de dados em %APPDATA%\Rocruzta Hub (appData do Windows + nome do app).
  // HUB_DADOS (só para testes) separa os dados e, com eles, a instância única: permite abrir um segundo Hub ao lado do instalado.
  userDataDir: (appData, env = process.env) => env.HUB_DADOS || path.join(appData, 'Rocruzta Hub'),
  WINDOW: { width: 1180, height: 760, minWidth: 880, minHeight: 560 },
  CHANNELS: {
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
    instalar: 'apps:instalar',
    instalacaoMudou: 'apps:instalacao-mudou',
    trocaEspaco: 'troca:espaco',
    trocaSoltou: 'troca:soltou',
    trocaFoco: 'troca:foco',
  },
};
