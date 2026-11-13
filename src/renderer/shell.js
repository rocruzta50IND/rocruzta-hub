'use strict';

// Casca do Hub: seletor de app, sidebar, troca de telas, tema e atalhos internos.
// Depende de icons.js, catalogo.js, atalhos.js e ui.js (carregados antes, em index.html).

const CHAVE_TEMA = 'rocruzta-hub:tema';
const INTERVALO_ESTADOS = 4000;

function iniciarShell() {
  const $ = (s) => document.querySelector(s);
  const seletor = $('#switch');
  const botaoSeletor = $('#sw-btn');
  const menu = $('#menu');
  const raiz = document.documentElement;
  let secaoAtual = 'inicio';
  let appAtual = null; // id do app embutido aberto dentro do Hub (null = telas do Hub)
  let embutidoVisivel = true;
  let painelAberto = false;
  let notificacoes = [];
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
    return `<button class="menu-item${app.id === appAtual ? ' cur' : ''}" role="menuitem" data-app="${app.id}">
      <span class="glyph" data-c="${app.cor}">${ic(app.icone)}</span>
      <span class="t nome">${app.nome}<small>${emExecucao(app.id) ? 'Em execução' : app.desc}</small></span>${emExecucao(app.id) ? '<i class="dot"></i>' : ''}${app.id === appAtual ? ic('check') : ''}</button>`;
  }

  // Só mostra grupos que têm algum app.
  const gruposComApps = () => GRUPOS.filter((g) => APPS.some((a) => a.grupo === g));

  function montarMenu() {
    const hub = `<button class="menu-item${appAtual ? '' : ' cur'}" role="menuitem" data-hub="1">
      <span class="glyph" data-c="${HUB.cor}">${ic(HUB.icone)}</span>
      <span class="t">Hub<small>Notícias, comunicados e equipe</small></span>${appAtual ? '' : ic('check')}</button><hr>`;
    const grupos = gruposComApps().map((g) => `<div class="group-title">${g}</div>${APPS.filter((a) => a.grupo === g).map(itemApp).join('')}`).join('');
    menu.innerHTML = hub + grupos;
    aplicarCores(menu);
  }

  function definirSeletor(aberto) {
    seletor.classList.toggle('open', aberto);
    botaoSeletor.setAttribute('aria-expanded', String(aberto));
    sincronizarEmbutido();
  }
  // A tela do app embutido é desenhada por cima da página: some enquanto o seletor está aberto.
  // Com o seletor aberto, o app embutido sai da frente e uma foto dele ocupa o lugar: o fundo continua visível.
  let seqSnap = 0;
  const limparSnap = () => { const sn = $('#v-snap'); sn.hidden = true; sn.removeAttribute('src'); };
  async function sincronizarEmbutido() {
    const quer = !(seletorAberto() || trocaAberta());
    if (!appAtual || embutidoVisivel === quer) return;
    embutidoVisivel = quer;
    const id = appAtual, meu = ++seqSnap;
    if (!quer) {
      let url = await window.hub.capturarEmbutido(id).catch(() => null);
      if (!url && meu === seqSnap) { await new Promise((r) => setTimeout(r, 80)); if (meu === seqSnap) url = await window.hub.capturarEmbutido(id).catch(() => null); } // a 1ª foto pode sair vazia se a tela ainda não pintou
      if (meu !== seqSnap || appAtual !== id) return; // fechou o menu (ou trocou de app) enquanto a foto era feita
      if (url) { miniaturas[id] = url; const sn = $('#v-snap'); sn.src = url; sn.hidden = false; try { await sn.decode(); } catch { /* segue mesmo assim */ } if (meu !== seqSnap) return; }
      window.hub.visivelEmbutido(id, false);
    } else {
      window.hub.visivelEmbutido(id, true);
      setTimeout(() => { if (meu === seqSnap) limparSnap(); }, 90); // dá tempo do app reaparecer antes de tirar a foto
    }
  }
  const seletorAberto = () => seletor.classList.contains('open');

  async function clicarApp(id) {
    const app = APPS.find((a) => a.id === id);
    if (!app) return;
    definirSeletor(false);
    if (ESTADOS[id]?.embutivel) return entrarApp(id);
    if (naoInstalado(id)) return avisar(`${app.nome} não está instalado neste computador.`);
    avisar(`Abrindo o ${app.nome}...`);
    const r = await window.hub.abrirApp(id).catch(() => ({ ok: false }));
    if (!r.ok) {
      avisar(r.motivo === 'nao-instalado' ? `${app.nome} não está instalado neste computador.` : `Não foi possível abrir o ${app.nome}.`);
    } else {
      avisar(`${app.nome} aberto.`);
      setTimeout(atualizarEstados, 1500);
    }
  }

  // ---- Troca rápida entre apps (Ctrl+Espaço): painel com um cartão por app, como o Alt+Tab (TASK-030, TASK-032) ----
  // As teclas chegam pelo processo principal (o foco costuma estar dentro do app). Soltar o Ctrl confirma.
  // Gestos seguidos não podem se atropelar: um novo Ctrl+Espaço espera a navegação anterior terminar (`navegacao`) e, se chegar
  // enquanto o gesto anterior ainda confirma, fica guardado em `proxima` (com o Ctrl dele, se já soltou) e abre logo depois.
  const painelTroca = $('#troca');
  const abertos = new Set();  // apps embutidos cuja tela já foi mostrada e que seguem rodando
  let recentes = ['hub'];     // ids usados por último primeiro ('hub' ou id do app)
  const miniaturas = {};      // id -> foto (data URL) da última vez que o app foi visto
  let troca = null;           // { itens, sel, pronto, soltou } enquanto o painel está aberto
  let proxima = null;         // { soltou } um novo gesto que chegou enquanto o anterior ainda confirmava
  let navegacao = Promise.resolve(); // última troca de tela em andamento (entrar no app ou voltar ao Hub)
  const trocaAberta = () => troca !== null;
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  async function guardarMiniatura(id) {
    const url = await Promise.race([window.hub.capturarEmbutido(id).catch(() => null), esperar(250).then(() => null)]);
    if (url) miniaturas[id] = url;
  }
  function itensDaTroca() {
    const atual = appAtual || 'hub';
    const todos = [{ id: 'hub', nome: HUB.nome, cor: HUB.cor, icone: HUB.icone }, ...APPS.filter((a) => !naoInstalado(a.id)).map((a) => ({ id: a.id, nome: a.nome, cor: a.cor, icone: a.icone }))];
    return ordenarPorRecentes(todos, registrarRecente(recentes, atual)).map((it) => ({ ...it, atual: it.id === atual, rodando: it.id === 'hub' || emExecucao(it.id) }));
  }
  // Desenha os cartões uma vez por abertura; avançar só troca a marca de seleção (redesenhar recarregaria as fotos a cada Espaço).
  function desenharTroca() {
    if (!troca) return;
    painelTroca.innerHTML = `<div class="troca-grade" role="listbox">${troca.itens.map((it, i) => `<button class="troca-card" role="option" data-i="${i}">
      <span class="troca-cab"><span class="glyph" data-c="${it.cor}">${ic(it.icone)}</span><b>${it.nome}</b><small>${it.atual ? 'Aberto agora' : it.rodando ? 'Em execução' : ''}</small></span>
      <span class="troca-mini">${miniaturas[it.id] ? `<img alt="" src="${miniaturas[it.id]}">` : `<span class="troca-vazio"><span class="glyph" data-c="${it.cor}">${ic(it.icone)}</span></span>`}</span>
    </button>`).join('')}</div><p class="troca-dica"><kbd>Ctrl</kbd> + <kbd>Espaço</kbd> avança · solte o <kbd>Ctrl</kbd> para abrir · <kbd>Esc</kbd> cancela</p>`;
    aplicarCores(painelTroca);
    marcarSelecaoTroca();
  }
  function marcarSelecaoTroca() {
    if (!troca) return;
    painelTroca.querySelectorAll('.troca-card').forEach((c, i) => { c.classList.toggle('sel', i === troca.sel); c.setAttribute('aria-selected', String(i === troca.sel)); });
  }
  async function abrirTroca(soltouJa = false) {
    if (troca) return;
    const minha = { itens: [], sel: 0, extra: 0, pronto: false, soltou: soltouJa };
    troca = minha; // marca já: Espaços e Ctrl solto que chegarem durante a preparação entram neste gesto
    await Promise.race([navegacao, esperar(300)]); // a tela anterior precisa ter terminado de trocar (senão ela reapareceria por cima do painel)
    if (troca !== minha) return;
    const itens = itensDaTroca();
    if (itens.length < 2) { troca = null; return; } // só o Hub: não há para onde trocar
    minha.itens = itens;
    minha.sel = (((selecaoInicial(itens.length) + minha.extra) % itens.length) + itens.length) % itens.length; // inclui os Espaços que já chegaram
    definirSeletor(false);
    window.hub.focarJanela();
    await sincronizarEmbutido(); // tira a foto do app e o esconde: a tela dele é uma camada nativa e cobriria o painel
    if (troca !== minha) return; // Esc durante a preparação
    desenharTroca(); // as fotos novas já estão em `miniaturas`
    painelTroca.hidden = false;
    minha.pronto = true;
    if (minha.soltou) efetivarTroca(); // a pessoa já soltou o Ctrl antes de o painel aparecer: vale o que foi escolhido
  }
  function moverTroca(voltar) {
    if (!troca) { abrirTroca(); return; }
    if (troca.soltou) { proxima = { soltou: false }; return; } // Ctrl+Espaço novo, com o gesto anterior ainda confirmando
    if (!troca.itens.length) { troca.extra += voltar ? -1 : 1; return; } // ainda preparando: conta o Espaço e aplica quando os cartões existirem
    troca.sel = mover(troca.sel, troca.itens.length, voltar);
    if (troca.pronto) marcarSelecaoTroca();
  }
  function fecharTroca(restaurar) {
    if (!troca) return Promise.resolve();
    troca = null;
    painelTroca.hidden = true; painelTroca.innerHTML = '';
    return restaurar ? sincronizarEmbutido() : Promise.resolve();
  }
  // Ctrl solto: confirma o que está selecionado (ou, se o painel ainda não apareceu, deixa marcado para confirmar ao aparecer).
  function confirmarTroca() {
    if (!troca) return;
    if (troca.soltou) { if (proxima) proxima.soltou = true; return; } // já confirmando: o Ctrl solto agora é do gesto seguinte
    troca.soltou = true;
    if (troca.pronto) efetivarTroca();
  }
  function efetivarTroca() {
    const alvo = troca.itens[((troca.sel % troca.itens.length) + troca.itens.length) % troca.itens.length];
    const atual = appAtual || 'hub';
    const seguinte = proxima; proxima = null;
    if (!alvo || alvo.id === atual) navegacao = fecharTroca(true);
    else {
      const embutivel = alvo.id === 'hub' || ESTADOS[alvo.id]?.embutivel;
      fecharTroca(!embutivel); // indo para outro app embutido, ele mesmo cuida de mostrar/esconder; senão devolve o app atual
      navegacao = alvo.id === 'hub' ? voltarHub() : Promise.resolve(clicarApp(alvo.id));
    }
    if (seguinte) abrirTroca(seguinte.soltou);
  }
  window.hub.onTrocaEspaco((voltar) => moverTroca(voltar));
  window.hub.onTrocaSoltou(() => confirmarTroca());
  painelTroca.addEventListener('click', (e) => {
    const c = e.target.closest('.troca-card');
    if (!troca) return;
    if (c && troca.pronto) { troca.sel = Number(c.dataset.i); troca.soltou = true; efetivarTroca(); } else if (!c) { proxima = null; fecharTroca(true); }
  });
  // Com o foco na página do Hub, o Ctrl+Espaço é tratado aqui (nas telas dos apps é o processo principal que o repassa).
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.ctrlKey && !e.altKey && !e.metaKey) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) moverTroca(e.shiftKey); }
  }, true);
  document.addEventListener('keydown', (e) => {
    if (!troca || !troca.pronto) return;
    const k = e.key;
    if (k === 'Escape') { proxima = null; fecharTroca(true); }
    else if (k === 'Enter') { troca.soltou = true; efetivarTroca(); }
    else if (k === 'ArrowRight' || k === 'ArrowDown') moverTroca(false);
    else if (k === 'ArrowLeft' || k === 'ArrowUp') moverTroca(true);
    else if (/^[1-9]$/.test(k) && troca.itens[Number(k) - 1]) { troca.sel = Number(k) - 1; troca.soltou = true; efetivarTroca(); }
    else return;
    e.preventDefault(); e.stopPropagation();
  }, true);
  document.addEventListener('keyup', (e) => { if (e.key === 'Control') confirmarTroca(); });

  botaoSeletor.addEventListener('click', (e) => {
    e.stopPropagation();
    definirSeletor(!seletorAberto());
    if (seletorAberto()) (menu.querySelector('.menu-item.cur') || menu.querySelector('.menu-item')).focus();
  });
  document.addEventListener('click', () => definirSeletor(false));
  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    if (item.dataset.hub) { definirSeletor(false); voltarHub(); }
    else clicarApp(item.dataset.app);
  });
  menu.addEventListener('keydown', (e) => {
    const itens = [...menu.querySelectorAll('.menu-item:not(.off)')];
    const i = itens.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { itens[(i + 1) % itens.length].focus(); e.preventDefault(); }
    if (e.key === 'ArrowUp') { itens[(i - 1 + itens.length) % itens.length].focus(); e.preventDefault(); }
  });

  // ---- Notificações dos apps embutidos (o Hub é quem mostra) ----
  const naoVistas = () => notificacoes.filter((n) => !n.visto).length;
  const TITULO_TIPO = { done: 'Terminou', perm: 'Precisa de você', error: 'Erro', cache: 'Cache esfriando' };
  const horaCurta = (ts) => new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function montarNotificacoes() {
    const n = naoVistas();
    const selo = $('#nbadge');
    selo.hidden = n === 0;
    selo.textContent = n > 9 ? '9+' : String(n);
    $('#notif-menu').innerHTML = notificacoes.length ? notificacoes.map((x) => {
      const app = APPS.find((a) => a.id === x.appId);
      return `<button class="menu-item n-item" role="menuitem" data-notif="${x.id}">
        <span class="glyph" data-c="${app ? app.cor : '#3570dc'}">${ic(app ? app.icone : HUB.icone)}</span>
        <span class="t nome">${esc(x.quem || (app ? app.nome : ''))} · ${TITULO_TIPO[x.tipo] || ''}<small>${esc(x.msg)} · ${horaCurta(x.ts)}</small></span>${x.visto ? '' : '<i class="nova"></i>'}</button>`;
    }).join('') : '<div class="n-vazio">Nenhuma notificação.</div>';
    aplicarCores($('#notif-menu'));
  }
  async function carregarNotificacoes() {
    notificacoes = (await window.hub.notificacoes().catch(() => [])) || [];
    montarNotificacoes();
  }
  function definirPainel(aberto) {
    if (aberto === painelAberto) return;
    painelAberto = aberto;
    document.body.classList.toggle('notif-aberto', aberto);
    $('#v-notif').setAttribute('aria-hidden', String(!aberto));
    $('#notif').setAttribute('aria-expanded', String(aberto));
    if (!aberto) window.hub.marcarNotificacoesVistas(); // abriu e fechou: o que estava lá já foi visto
  }
  async function abrirNotificacao(id) {
    const n = notificacoes.find((x) => x.id === id);
    if (!n) return;
    definirPainel(false);
    if (appAtual !== n.appId) await entrarApp(n.appId);
    window.hub.abrirNotificacao(id); // o app leva a pessoa até a aba que gerou o aviso
  }
  $('#notif').addEventListener('click', (e) => { e.stopPropagation(); definirSeletor(false); definirPainel(!painelAberto); });
  $('#notif-menu').addEventListener('click', (e) => { e.stopPropagation(); const item = e.target.closest('[data-notif]'); if (item) abrirNotificacao(Number(item.dataset.notif)); });
  window.hub.onNotificacoesMudou(carregarNotificacoes);
  window.hub.onAbrirNotificacao(abrirNotificacao);
  carregarNotificacoes();

  // ---- Barra lateral: esconde por inteiro (como no Claude Desktop); a escolha fica guardada ----
  const CHAVE_SIDE = 'rocruzta-hub:side-oculta';
  const aplicarSide = (oculta) => { document.body.classList.toggle('side-oculta', oculta); $('#btn-side').setAttribute('aria-pressed', String(oculta)); };
  aplicarSide(localStorage.getItem(CHAVE_SIDE) === '1');
  $('#btn-side').addEventListener('click', () => {
    const oculta = !document.body.classList.contains('side-oculta');
    localStorage.setItem(CHAVE_SIDE, oculta ? '1' : '0');
    aplicarSide(oculta);
  });

  // ---- Sidebar ----
  let menuApp = null; // id do app cujo menu "⋯" está aberto
  function montarSidebar() {
    const secoes = SECOES.filter((s) => !s.rodape).map((s) => `<button class="sub${s.id === secaoAtual ? ' act' : ''}" data-sec="${s.id}"${s.id === secaoAtual ? ' aria-current="page"' : ''}>
      ${ic(s.icone)}<span>${s.nome}</span>${s.id === 'apps' && APPS.some((a) => avisoNaoVisto(a.id)) ? '<i class="dot-att" title="Atualização disponível"></i>' : ''}</button>`).join('');
    const apps = gruposComApps().map((g) => `<div class="group-title">${g}</div>${APPS.filter((a) => a.grupo === g).map((a) => `<div class="sub-linha${menuApp === a.id ? ' aberto' : ''}"><button class="sub" data-app="${a.id}">
      <span class="glyph" data-c="${a.cor}">${ic(a.icone)}</span><span class="nome">${a.nome}</span>${emExecucao(a.id) ? '<i class="dot" title="Em execução"></i>' : ''}</button><button class="mais" data-mais="${a.id}" aria-label="Mais opções de ${a.nome}" aria-haspopup="menu" title="Mais opções">${ic('mais')}</button></div>`).join('')}`).join('');
    $('#side').innerHTML = secoes + apps;
    aplicarCores($('#side'));
  }

  // ---- Menu "⋯" de cada app na barra lateral: Abrir, Ver novidades (página do app na loja) e Desinstalar (TASK-033) ----
  function fecharMenuApp() {
    if (!menuApp) return;
    menuApp = null;
    $('#menu-app')?.remove();
    document.querySelector('.sub-linha.aberto')?.classList.remove('aberto');
  }
  function abrirMenuApp(id, botao) {
    const app = APPS.find((a) => a.id === id);
    if (!app) return;
    fecharMenuApp();
    menuApp = id;
    botao.closest('.sub-linha').classList.add('aberto');
    const est = ESTADOS[id] || {};
    const instalado = !naoInstalado(id);
    const item = (cls, acao, icone, texto, dica) => `<button class="menu-item ${cls}" role="menuitem"${acao ? ` data-mais-acao="${acao}"` : ` disabled title="${dica}"`}>${ic(icone)}<span class="nome">${texto}</span></button>`;
    let des = '';
    if (instalado) {
      if (!est.desinstalador) des = item('off', '', 'lixo', 'Desinstalar', 'Não achei o desinstalador registrado no Windows');
      else if (est.embutidoDev) des = item('off', '', 'lixo', 'Desinstalar', 'Rodando da pasta de desenvolvimento: o desinstalador seria o de outra cópia');
      else if (emExecucao(id)) des = item('off', '', 'lixo', 'Desinstalar', `Feche o ${app.nome} antes de desinstalar`);
      else des = item('perigo', 'desinstalar', 'lixo', 'Desinstalar');
    }
    const m = document.createElement('div');
    m.id = 'menu-app';
    m.className = 'menu menu-app';
    m.setAttribute('role', 'menu');
    m.innerHTML = `${instalado ? item('', 'abrir', 'abrir', 'Abrir') : ''}${item('', 'novidades', 'novidades', 'Ver novidades')}${des ? `<hr>${des}` : ''}`;
    document.body.appendChild(m);
    const r = botao.getBoundingClientRect();
    m.style.top = `${Math.max(8, Math.min(r.bottom + 4, window.innerHeight - m.offsetHeight - 8))}px`;
    m.style.left = `${Math.max(8, Math.min(r.left, 236 - m.offsetWidth - 8))}px`;
    m.querySelector('.menu-item:not(.off)')?.focus();
  }
  document.addEventListener('click', (e) => {
    const acao = e.target.closest('#menu-app [data-mais-acao]');
    if (acao) {
      const id = menuApp;
      fecharMenuApp();
      if (acao.dataset.maisAcao === 'abrir') return clicarApp(id);
      irParaSecao('apps');
      if (acao.dataset.maisAcao === 'desinstalar') LOJA.desinstalar = id;
      return abrirDetalheApp(id);
    }
    if (!e.target.closest('#menu-app') && !e.target.closest('[data-mais]')) fecharMenuApp();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuApp) { const b = document.querySelector('.sub-linha.aberto .mais'); fecharMenuApp(); b?.focus(); } });
  window.addEventListener('blur', fecharMenuApp);

  $('#side').addEventListener('click', (e) => {
    const mais = e.target.closest('[data-mais]');
    if (mais) { const mesmo = menuApp === mais.dataset.mais; fecharMenuApp(); if (!mesmo) abrirMenuApp(mais.dataset.mais, mais); return; }
    const sec = e.target.closest('[data-sec]');
    if (sec) return irParaSecao(sec.dataset.sec);
    const app = e.target.closest('[data-app]');
    if (app) clicarApp(app.dataset.app);
  });

  // ---- Chat da tela Início (do Hub, independente dos apps; sem histórico) ----
  const campoChat = () => $('#c-texto');
  function ajustarCampo() {
    const c = campoChat(); if (!c) return;
    c.style.height = 'auto';
    c.style.height = `${Math.min(c.scrollHeight, 220)}px`;
    $('#c-enviar').disabled = !c.value.trim() || CHAT.gerando || !(CHAT.estado && CHAT.estado.disponivel);
  }
  const rolarFim = () => { const r = $('#c-rolagem'); if (r) r.scrollTop = r.scrollHeight; };
  function atualizarFio() {
    const fio = $('#c-fio'); if (!fio) return;
    const r = $('#c-rolagem'); const perto = r.scrollHeight - r.scrollTop - r.clientHeight < 80;
    fio.innerHTML = htmlMensagens();
    if (perto) rolarFim();
    ajustarCampo();
  }
  window.hub.onConversaEvento((ev) => {
    if (ev.tipo === 'delta') {
      const ult = CHAT.msgs[CHAT.msgs.length - 1];
      if (ult && ult.papel === 'ia' && !ult.erro) ult.texto += ev.texto; else CHAT.msgs.push({ papel: 'ia', texto: ev.texto });
    } else if (ev.tipo === 'fim') {
      CHAT.gerando = false;
      if (ev.erro) CHAT.msgs.push({ papel: 'ia', texto: ev.erro, erro: true });
    }
    if (secaoAtual === 'inicio' && !appAtual) atualizarFio();
  });
  async function enviarChatInicio(texto) {
    if (!texto.trim() || CHAT.gerando || !(CHAT.estado && CHAT.estado.disponivel)) return;
    const primeira = CHAT.msgs.length === 0;
    CHAT.msgs.push({ papel: 'eu', texto: texto.trim() });
    CHAT.gerando = true;
    if (primeira) { renderTela(); campoChat()?.focus(); } else atualizarFio();
    rolarFim();
    const r = await window.hub.conversaEnviar(texto.trim()).catch(() => ({ ok: false, erro: 'Não foi possível falar com o Claude Code.' }));
    if (!r.ok) { CHAT.gerando = false; CHAT.msgs.push({ papel: 'ia', texto: r.erro || 'Não foi possível enviar a mensagem.', erro: true }); atualizarFio(); }
  }
  $('#hmain').addEventListener('input', (e) => { if (e.target.id === 'c-texto') ajustarCampo(); });
  $('#hmain').addEventListener('keydown', (e) => {
    if (e.target.id === 'c-texto' && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); $('#composer').requestSubmit(); }
  });
  $('#hmain').addEventListener('submit', (e) => {
    if (e.target.id !== 'composer') return;
    e.preventDefault();
    const c = campoChat(); const texto = c.value;
    if (!texto.trim()) return;
    c.value = ''; ajustarCampo();
    enviarChatInicio(texto);
  });
  $('#btn-nova-conversa').addEventListener('click', async () => {
    await window.hub.conversaNova().catch(() => false);
    CHAT.msgs = []; CHAT.gerando = false;
    renderTela();
    campoChat()?.focus();
  });
  window.hub.conversaEstado().then((e) => { CHAT.estado = e; if (secaoAtual === 'inicio' && !appAtual && !CHAT.msgs.length) renderTela(); }).catch(() => { CHAT.estado = { disponivel: false }; });

  // ---- Usuário (rodapé da barra lateral) ----
  const usuarioEl = $('#usuario');
  function itemMenu(acao, icone, texto, extra = '') { return `<button class="menu-item${extra}" role="menuitem" data-acao="${acao}">${ic(icone)}<span class="t">${texto}</span></button>`; }
  function montarMenuUsuario() {
    const claro = raiz.dataset.theme === 'light';
    $('#usuario-menu').innerHTML = itemMenu('config', 'gear', 'Configurações') + itemMenu('tema', claro ? 'moon' : 'sun', claro ? 'Tema escuro' : 'Tema claro') + '<hr>' + itemMenu('fechar', 'x', 'Fechar o Hub', ' perigo');
  }
  function definirMenuUsuario(aberto) { usuarioEl.classList.toggle('open', aberto); $('#usuario-btn').setAttribute('aria-expanded', String(aberto)); if (aberto) montarMenuUsuario(); }
  $('#usuario-btn').addEventListener('click', (e) => { e.stopPropagation(); definirMenuUsuario(!usuarioEl.classList.contains('open')); });
  $('#usuario-menu').addEventListener('click', (e) => {
    const item = e.target.closest('[data-acao]'); if (!item) return;
    definirMenuUsuario(false);
    if (item.dataset.acao === 'config') irParaSecao('config');
    else if (item.dataset.acao === 'tema') alternarTema();
    else if (item.dataset.acao === 'fechar') window.hub.close();
  });
  document.addEventListener('click', () => definirMenuUsuario(false));
  window.hub.usuario().then((u) => {
    const nome = (u && u.nome) || 'Usuário';
    $('#usuario-nome').textContent = nome;
    $('#usuario-av').textContent = nome.trim()[0]?.toUpperCase() || 'U';
  }).catch(() => { $('#usuario-nome').textContent = 'Usuário'; $('#usuario-av').textContent = 'U'; });

  // Cliques dentro das telas: links e cartões de seção (data-sec) e blocos de app (data-app).
  $('#hmain').addEventListener('click', (e) => {
    const rel = e.target.closest('[data-releases]');
    if (rel) return window.hub.abrirReleases(rel.dataset.releases);
    const sec = e.target.closest('[data-sec]');
    if (sec) return irParaSecao(sec.dataset.sec);
    const app = e.target.closest('[data-app]');
    if (app) return clicarApp(app.dataset.app);
    // Loja (tela Apps): filtros, detalhe de um app e voltar para a lista.
    const filtro = e.target.closest('[data-filtro]');
    if (filtro) { LOJA.filtro = filtro.dataset.filtro; return renderTela(); }
    const car = e.target.closest('[data-car]');
    if (car) { const f = $('#car-faixa'); if (f) f.scrollBy({ left: Number(car.dataset.car) * f.clientWidth * 0.82, behavior: 'smooth' }); return; }
    const inst = e.target.closest('[data-instalar]');
    if (inst) { instalarApp(inst.dataset.instalar); return; }
    const des = e.target.closest('[data-des]');
    if (des) { LOJA.desinstalar = des.dataset.des; return renderTela(); }
    if (e.target.closest('[data-des-cancelar]')) { LOJA.desinstalar = null; return renderTela(); }
    const desOk = e.target.closest('[data-des-ok]');
    if (desOk) { desinstalarApp(desOk.dataset.desOk); return; }
    const det = e.target.closest('[data-detalhe]');
    if (det) { abrirDetalheApp(det.dataset.detalhe); return; }
    const chk = e.target.closest('[data-checar-att]');
    if (chk) { verificarAgora(chk); return; }
    if (e.target.closest('[data-loja-voltar]')) { LOJA.detalhe = null; renderTela(); }
  });
  $('#hmain').addEventListener('input', (e) => {
    if (e.target.id !== 'l-busca') return;
    LOJA.busca = e.target.value;
    $('#l-lista').innerHTML = htmlCartoesLoja(); // só a lista: o campo de busca mantém o foco
    aplicarCores($('#l-lista'));
  });
  $('#hmain').addEventListener('keydown', (e) => {
    const card = e.target.closest?.('.loja-card, .loja-hero');
    if (card && e.target === card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); card.click(); }
  });

  // ---- Telas (Notícias, Comunicados e Equipe mostram estado vazio até haver dados reais) ----
  function renderTela() {
    const s = SECOES.find((x) => x.id === secaoAtual);
    if (secaoAtual === 'inicio') {
      $('#hmain').innerHTML = htmlInicio();
    } else if (secaoAtual === 'apps') {
      $('#hmain').innerHTML = htmlApps();
    } else if (secaoAtual === 'config') {
      $('#hmain').innerHTML = htmlConfig();
    } else {
      $('#hmain').innerHTML = `<div class="page">
        <div class="p-head"><div><h1>${s.nome}</h1><p>${s.desc}</p></div></div>
        <div class="vazio">${s.vazio}</div></div>`;
    }
    aplicarCores($('#hmain'));
    $('#hmain').scrollTop = 0;
    $('#sb-titulo').textContent = s.nome;
    $('#btn-nova-conversa').hidden = !(secaoAtual === 'inicio' && CHAT.msgs.length > 0);
    if (!appAtual) $('#st-mid').textContent = `Hub · ${s.nome}`;
  }

  // Relê o registro do Windows e redesenha se algo mudou (ex.: o Termix foi instalado com o Hub aberto).
  let consultando = false;
  async function atualizarEstados() {
    if (consultando) return;
    consultando = true;
    try {
      const novos = await window.hub.detectarApps().catch(() => null);
      if (!novos || JSON.stringify(novos) === JSON.stringify(ESTADOS)) return;
      definirEstados(novos);
      for (const id of [...abertos]) if (novos[id]?.embutido !== 'rodando') abertos.delete(id);
      montarMenu();
      montarSidebar();
      renderTela();
      if (appAtual && novos[appAtual]?.embutido === 'caiu') mostrarCaiu();
    } finally { consultando = false; }
  }
  window.addEventListener('focus', atualizarEstados);
  // O selo "Em execução" acompanha a realidade: relê a cada poucos segundos enquanto a janela está visível.
  setInterval(() => { if (document.visibilityState === 'visible') atualizarEstados(); }, INTERVALO_ESTADOS);

  // ---- Atualizações dos apps (só aviso): faixa no topo por ~15 min, bolinha em Apps até a pessoa ver o app ----
  const JANELA_AVISO = 15 * 60 * 1000;
  const appDoAviso = () => APPS.find((a) => { const u = atuDe(a.id); return comAtualizacao(a.id) && !u.visto && !u.avisoFechado && Date.now() - u.detectadoEm < JANELA_AVISO; });
  function atualizarBannerAtt() {
    const a = appDoAviso();
    const faixa = $('#aviso-att');
    faixa.hidden = !a;
    if (!a) return;
    faixa.dataset.app = a.id;
    $('#aa-texto').innerHTML = `<b>${a.nome} v${atuDe(a.id).versaoNova}</b> disponível`;
  }
  function atualizarIndicadoresAtt() { atualizarBannerAtt(); montarSidebar(); }
  async function carregarAtualizacoes() {
    definirAtualizacoes(await window.hub.atualizacoes().catch(() => null));
    atualizarIndicadoresAtt();
    if (secaoAtual === 'apps' && !appAtual) renderTela();
  }
  function abrirDetalheApp(id) {
    LOJA.detalhe = id;
    if (atuDe(id) && atuDe(id).visto === false) { atuDe(id).visto = true; window.hub.marcarAtualizacaoVista(id); atualizarIndicadoresAtt(); }
    renderTela();
  }
  async function instalarApp(id) {
    const app = APPS.find((a) => a.id === id);
    if (!app || instalandoApp(id)) return;
    INSTAL[id] = { fase: 'buscando', progresso: 0 };
    renderTela();
    const r = await window.hub.instalarApp(id).catch(() => ({ ok: false, motivo: 'falha' }));
    delete INSTAL[id];
    const msg = { 'em-execucao': `Feche o ${app.nome} antes de atualizar.`, 'sem-rede': 'Sem conexão com o GitHub. Tente de novo.', 'sem-instalador': `A última versão do ${app.nome} não tem instalador.`, 'arquivo-corrompido': 'O arquivo baixado veio incompleto. Tente de novo.', cancelado: 'Instalação cancelada.', 'em-andamento': `O ${app.nome} já está sendo instalado.` };
    avisar(r.ok ? `${app.nome} v${r.versao} instalado.` : (msg[r.motivo] || `Não foi possível instalar o ${app.nome}.`));
    await atualizarEstados();
    renderTela();
  }
  let ultimoProgresso = 0;
  window.hub.onInstalacaoMudou((d) => {
    if (!d || !INSTAL[d.id]) return;
    INSTAL[d.id] = { fase: d.fase, progresso: d.progresso || 0 };
    const agora = Date.now();
    if (d.fase !== 'baixando' || agora - ultimoProgresso > 250) { ultimoProgresso = agora; if (secaoAtual === 'apps' && !appAtual) renderTela(); }
  });
  async function desinstalarApp(id) {
    const app = APPS.find((a) => a.id === id);
    LOJA.desinstalar = null;
    renderTela();
    const r = await window.hub.desinstalarApp(id).catch(() => ({ ok: false, motivo: 'falha' }));
    const msg = { 'em-execucao': `Feche o ${app.nome} antes de desinstalar.`, cancelado: 'Desinstalação cancelada.', 'nao-instalado': `${app.nome} não está instalado.`, 'sem-desinstalador': `Não achei o desinstalador do ${app.nome}.` };
    avisar(r.ok ? `Desinstalador do ${app.nome} aberto.` : (msg[r.motivo] || `Não foi possível desinstalar o ${app.nome}.`));
    if (r.ok) setTimeout(atualizarEstados, 4000);
  }
  async function verificarAgora(botao) {
    botao.textContent = 'Verificando…'; botao.disabled = true;
    definirAtualizacoes(await window.hub.verificarAtualizacoes().catch(() => null));
    atualizarIndicadoresAtt();
    renderTela();
  }
  $('#aviso-att').addEventListener('click', (e) => {
    const id = $('#aviso-att').dataset.app;
    if (e.target.closest('[data-aa-ver]')) { irParaSecao('apps'); abrirDetalheApp(id); }
    else if (e.target.closest('[data-aa-fechar]')) { if (atuDe(id)) atuDe(id).avisoFechado = true; window.hub.fecharAvisoAtualizacao(id); atualizarBannerAtt(); }
  });
  window.hub.onAtualizacoesMudou(carregarAtualizacoes);
  setInterval(atualizarBannerAtt, 30000); // a faixa some sozinha depois da janela de 15 minutos

  // Histórico de telas do Hub (setas ‹ › do cabeçalho).
  let historico = [];
  let posicao = -1;
  function atualizarSetas() {
    const pode = { 'btn-back': posicao > 0, 'btn-fwd': posicao < historico.length - 1 };
    for (const [id, ok] of Object.entries(pode)) $('#' + id).setAttribute('aria-disabled', String(!ok));
  }
  function irParaSecao(id, registrar = true) {
    if (!SECOES.some((s) => s.id === id)) return;
    voltarHub();
    if (registrar && historico[posicao] !== id) { historico = historico.slice(0, posicao + 1); historico.push(id); posicao = historico.length - 1; }
    atualizarSetas();
    if (id !== secaoAtual) LOJA.detalhe = null;
    secaoAtual = id;
    definirSeletor(false);
    montarSidebar();
    renderTela();
    history.replaceState(null, '', `#${id}`);
  }

  // ---- App embutido (experimental): o app roda sem janela e a tela dele aparece nesta área ----
  const areaApp = $('#v-app');
  const retangulo = () => { const r = areaApp.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
  function mostrarTela(qual) { $('#v-hub').hidden = qual !== 'hub'; areaApp.hidden = qual !== 'app'; document.body.classList.toggle('app-aberto', qual === 'app'); }
  // Versão do app em foco (Hub ou app embutido) no rodapé, à direita.
  let VERSOES = { hub: '', apps: {} };
  function mostrarVersao() {
    const app = APPS.find((a) => a.id === appAtual);
    const v = app ? VERSOES.apps[app.id] : VERSOES.hub;
    $('#st-ver').textContent = v ? `v${v}` : '';
  }
  window.hub.versoes().then((v) => { VERSOES = v || VERSOES; mostrarVersao(); }).catch(() => {});
  function definirTitulo() {
    mostrarVersao();
    const app = APPS.find((a) => a.id === appAtual);
    const item = app || HUB;
    $('#cur-name').textContent = item.nome;
    const g = $('#cur-g'); g.innerHTML = ic(item.icone); g.dataset.c = item.cor;
    aplicarCores($('#titlebar'));
    $('#st-mid').textContent = app ? app.nome : '';
    montarMenu();
  }
  function mensagemApp(titulo, detalhe, botao) {
    areaApp.innerHTML = `<div class="app-msg"><b>${titulo}</b><span>${detalhe}</span>${botao ? `<button class="btn" data-tentar="1">${botao}</button>` : ''}</div>`;
  }
  function mostrarCaiu() { const a = APPS.find((x) => x.id === appAtual); mensagemApp(`${a.nome} parou`, 'O Hub e os outros apps seguem normais.', 'Abrir de novo'); }
  async function entrarApp(id) {
    const app = APPS.find((a) => a.id === id);
    if (appAtual && appAtual !== id && embutidoVisivel) await guardarMiniatura(appAtual);
    recentes = registrarRecente(recentes, id);
    appAtual = id; embutidoVisivel = true; seqSnap++; limparSnap();
    mostrarTela('app');
    definirTitulo();
    // App que já foi aberto e segue rodando: volta direto, sem "Abrindo..." (a tela dele só estava escondida). Enquanto ela
    // reaparece, a última foto ocupa o lugar, para não piscar.
    const jaAberto = abertos.has(id) && ESTADOS[id]?.embutido === 'rodando';
    if (jaAberto) {
      areaApp.innerHTML = '';
      if (miniaturas[id]) { const sn = $('#v-snap'); sn.src = miniaturas[id]; sn.hidden = false; }
    } else {
      mensagemApp(`Abrindo o ${app.nome}...`, '');
      await new Promise((r) => { requestAnimationFrame(r); setTimeout(r, 100); }); // o layout da área precisa estar pronto para medir (o timeout cobre janela oculta, onde o quadro não vem)
    }
    const r = await window.hub.mostrarEmbutido(id, retangulo()).catch(() => ({ ok: false }));
    if (jaAberto && appAtual === id) setTimeout(() => { if (appAtual === id && embutidoVisivel) limparSnap(); }, 90);
    if (appAtual !== id) return;
    if (r.ok) abertos.add(id); else abertos.delete(id);
    if (!r.ok) return mensagemApp(`Não foi possível abrir o ${app.nome} aqui dentro`, r.motivo === 'indisponivel' ? 'O modo embutido não está disponível neste computador.' : (r.detalhe || 'Falha ao iniciar.'), 'Tentar de novo');
    areaApp.innerHTML = '';
    atualizarEstados();
    return true;
  }
  async function voltarHub() {
    if (!appAtual) return;
    if (embutidoVisivel) await guardarMiniatura(appAtual);
    if (!appAtual) return;
    recentes = registrarRecente(recentes, 'hub');
    appAtual = null; embutidoVisivel = true; seqSnap++; limparSnap();
    window.hub.ocultarEmbutido();
    mostrarTela('hub');
    definirTitulo();
  }
  areaApp.addEventListener('click', (e) => { if (e.target.closest('[data-tentar]') && appAtual) entrarApp(appAtual); });
  new ResizeObserver(() => { if (appAtual && !areaApp.hidden) window.hub.ajustarEmbutido(appAtual, retangulo()); }).observe(areaApp);
  window.hub.onEmbutidoMudou(() => atualizarEstados());

  // ---- Tema ----
  function aplicarTema(tema) {
    if (tema === 'light') raiz.dataset.theme = 'light';
    else delete raiz.dataset.theme;
    window.hub.definirTema(tema); // os apps embutidos seguem o tema do Hub
  }
  function alternarTema() {
    const novo = raiz.dataset.theme === 'light' ? 'dark' : 'light';
    aplicarTema(novo);
    try { localStorage.setItem(CHAVE_TEMA, novo); } catch { /* sem armazenamento: só não lembra */ }
  }

  // ---- Atalhos internos ----
  document.addEventListener('keydown', (e) => {
    const r = resolverAtalho(e, { seletorAberto: seletorAberto() }, SECOES);
    if (!r) return;
    if (r.acao === 'secao') irParaSecao(r.id);
    else if (r.acao === 'fechar-seletor') { definirSeletor(false); botaoSeletor.focus(); }
  });

  $('#brand').addEventListener('click', () => irParaSecao('inicio'));
  $('#btn-back').addEventListener('click', () => { if (posicao > 0) { posicao -= 1; irParaSecao(historico[posicao], false); } });
  $('#btn-fwd').addEventListener('click', () => { if (posicao < historico.length - 1) { posicao += 1; irParaSecao(historico[posicao], false); } });

  // ---- Início ----
  let temaSalvo = null;
  try { temaSalvo = localStorage.getItem(CHAVE_TEMA); } catch { /* ignora */ }
  aplicarTema(temaSalvo === 'light' ? 'light' : 'dark');
  montarMenu();
  const daUrl = location.hash.slice(1);
  if (SECOES.some((s) => s.id === daUrl)) secaoAtual = daUrl;
  historico = [secaoAtual]; posicao = 0; atualizarSetas();
  montarSidebar();
  renderTela();
  atualizarBannerAtt();
}
