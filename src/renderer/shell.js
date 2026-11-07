'use strict';

// Casca do Hub: seletor de app, sidebar, troca de telas, tema e atalhos internos.
// Depende de icons.js, catalogo.js, atalhos.js e ui.js (carregados antes, em index.html).

const CHAVE_TEMA = 'rocruzta-hub:tema';

function iniciarShell() {
  const $ = (s) => document.querySelector(s);
  const seletor = $('#switch');
  const botaoSeletor = $('#sw-btn');
  const menu = $('#menu');
  const raiz = document.documentElement;
  let secaoAtual = 'inicio';
  let timerAviso = null;

  // ---- Aviso curto na barra de status (ex.: abrir apps ainda não existe) ----
  function avisar(texto) {
    const el = $('#st-aviso');
    el.textContent = texto;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { el.textContent = ''; }, 4000);
  }

  // ---- Seletor de app (ao lado do nome) ----
  function itemApp(app) {
    const off = app.estado !== 'ativo';
    return `<button class="menu-item${off ? ' off' : ''}" role="menuitem" data-app="${app.id}"${off ? ' aria-disabled="true"' : ''}>
      <span class="glyph" data-c="${app.cor}">${ic(app.icone)}</span>
      <span class="t nome">${app.nome}<small>${app.desc}</small></span>
      ${off ? '<span class="selo selo-breve">Em breve</span>' : ''}</button>`;
  }

  function montarMenu() {
    const hub = `<button class="menu-item cur" role="menuitem" data-hub="1">
      <span class="glyph" data-c="${HUB.cor}">${ic(HUB.icone)}</span>
      <span class="t">Hub<small>Notícias, comunicados e equipe</small></span></button><hr>`;
    const grupos = GRUPOS.map((g) => `<div class="group-title">${g}</div>${APPS.filter((a) => a.grupo === g).map(itemApp).join('')}`).join('');
    menu.innerHTML = hub + grupos;
    aplicarCores(menu);
  }

  function definirSeletor(aberto) {
    seletor.classList.toggle('open', aberto);
    botaoSeletor.setAttribute('aria-expanded', String(aberto));
  }
  const seletorAberto = () => seletor.classList.contains('open');

  function clicarApp(id) {
    const app = APPS.find((a) => a.id === id);
    if (!app || app.estado !== 'ativo') return;
    definirSeletor(false);
    // Abrir e focar o app é a TASK-010; aqui não finge que abriu.
    avisar(`Abrir o ${app.nome} chega na próxima etapa.`);
  }

  botaoSeletor.addEventListener('click', (e) => {
    e.stopPropagation();
    definirSeletor(!seletorAberto());
    if (seletorAberto()) menu.querySelector('.menu-item.cur').focus();
  });
  document.addEventListener('click', () => definirSeletor(false));
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    if (item.dataset.hub) definirSeletor(false);
    else clicarApp(item.dataset.app);
  });
  menu.addEventListener('keydown', (e) => {
    const itens = [...menu.querySelectorAll('.menu-item:not(.off)')];
    const i = itens.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { itens[(i + 1) % itens.length].focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { itens[(i - 1 + itens.length) % itens.length].focus(); e.preventDefault(); }
  });

  // ---- Sidebar ----
  function montarSidebar() {
    const secoes = SECOES.map((s) => `<button class="sub${s.id === secaoAtual ? ' act' : ''}" data-sec="${s.id}"${s.id === secaoAtual ? ' aria-current="page"' : ''}>
      ${ic(s.icone)}<span>${s.nome}</span><kbd>${s.tecla}</kbd></button>`).join('');
    const apps = GRUPOS.map((g) => `<div class="group-title">${g}</div>${APPS.filter((a) => a.grupo === g).map((a) => {
      const off = a.estado !== 'ativo';
      return `<button class="sub${off ? ' off' : ''}" data-app="${a.id}"${off ? ' aria-disabled="true"' : ''}>
        <span class="glyph" data-c="${a.cor}">${ic(a.icone)}</span><span class="nome">${a.nome}</span>${off ? '<span class="selo selo-breve">Em breve</span>' : ''}</button>`;
    }).join('')}`).join('');
    $('#side').innerHTML = secoes + apps;
    aplicarCores($('#side'));
  }

  $('#side').addEventListener('click', (e) => {
    const sec = e.target.closest('[data-sec]');
    if (sec) return irParaSecao(sec.dataset.sec);
    const app = e.target.closest('[data-app]');
    if (app) clicarApp(app.dataset.app);
  });

  // ---- Telas (conteúdo de exemplo chega nas TASK-005 a 007) ----
  function renderTela() {
    const s = SECOES.find((x) => x.id === secaoAtual);
    $('#hmain').innerHTML = `<div class="page">
      <div class="p-head"><div><h1>${s.nome}</h1><p>${s.desc}</p></div><span class="selo selo-exemplo">Dados de exemplo</span></div>
      <div class="vazio">O conteúdo de exemplo desta tela chega nas próximas etapas.</div></div>`;
    $('#hmain').scrollTop = 0;
    $('#st-mid').textContent = `Hub · ${s.nome}`;
  }

  function irParaSecao(id) {
    if (!SECOES.some((s) => s.id === id)) return;
    secaoAtual = id;
    definirSeletor(false);
    montarSidebar();
    renderTela();
    history.replaceState(null, '', `#${id}`);
  }

  // ---- Tema ----
  function aplicarTema(tema) {
    if (tema === 'light') raiz.dataset.theme = 'light';
    else delete raiz.dataset.theme;
    $('#theme').innerHTML = ic(tema === 'light' ? 'sun' : 'moon');
  }
  $('#theme').addEventListener('click', () => {
    const novo = raiz.dataset.theme === 'light' ? 'dark' : 'light';
    aplicarTema(novo);
    try { localStorage.setItem(CHAVE_TEMA, novo); } catch { /* sem armazenamento: só não lembra */ }
  });

  // ---- Atalhos internos ----
  document.addEventListener('keydown', (e) => {
    const r = resolverAtalho(e, { seletorAberto: seletorAberto() }, SECOES);
    if (!r) return;
    if (r.acao === 'secao') irParaSecao(r.id);
    else if (r.acao === 'fechar-seletor') { definirSeletor(false); botaoSeletor.focus(); }
  });

  $('#brand').addEventListener('click', () => irParaSecao('inicio'));

  // ---- Início ----
  let temaSalvo = null;
  try { temaSalvo = localStorage.getItem(CHAVE_TEMA); } catch { /* ignora */ }
  aplicarTema(temaSalvo === 'light' ? 'light' : 'dark');
  montarMenu();
  const daUrl = location.hash.slice(1);
  if (SECOES.some((s) => s.id === daUrl)) secaoAtual = daUrl;
  montarSidebar();
  renderTela();
}
