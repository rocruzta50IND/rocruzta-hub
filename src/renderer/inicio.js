'use strict';

// Tela Início: só o que é real. Hoje, os apps do catálogo. Comunicados, notícias, equipe e agenda
// voltam quando houver dados reais (TASK-006, 007, 018 e 019); até lá não aparece nada fingido.
// Depende de icons.js, catalogo.js e ui.js (carregados antes, em index.html).
// O chat da tela Início usa o Claude Code (modelo mais barato, Haiku) e não depende de nenhum app.
// `CHAT` e `htmlMensagens` vêm de conversa.js.
function htmlComposer(placeholder) {
  const ok = Boolean(CHAT.estado && CHAT.estado.disponivel);
  return `<form class="composer" id="composer" autocomplete="off">
      <textarea id="c-texto" rows="1" placeholder="${placeholder}" aria-label="Mensagem"${ok ? '' : ' disabled'}></textarea>
      <div class="c-barra">
        <span class="c-dest">${ic('spark')}Claude Haiku</span>
        <button class="c-enviar" id="c-enviar" type="submit" aria-label="Enviar" disabled>${ic('send')}</button>
      </div>
    </form>`;
}

function htmlInicio() {
  const ok = Boolean(CHAT.estado && CHAT.estado.disponivel);
  const dica = ok
    ? 'Conversa com o Claude Haiku. Nada fica guardado: ao fechar o Hub ou iniciar uma nova conversa, ela some.'
    : 'Para conversar por aqui, o Claude Code precisa estar instalado e com o login feito neste computador.';
  if (CHAT.msgs.length) {
    return `<div class="chat-tela">
      <div class="chat-rolagem" id="c-rolagem"><div class="chat-fio" id="c-fio">${htmlMensagens()}</div></div>
      <div class="chat-pe">${htmlComposer('Responder...')}</div>
    </div>`;
  }
  return `<div class="inicio-chat">
    <img class="ic-logo" src="logo.png" alt="">
    <h1>O que vamos fazer hoje?</h1>
    ${htmlComposer('Descreva uma tarefa ou faça uma pergunta')}
    <p class="c-dica">${dica}</p>
  </div>`;
}

// Tela Apps, no formato de loja: cartões por grupo com o estado real de cada app neste computador
// (instalado, em execução, não instalado) e os anunciados como "Em breve". Clicar num cartão abre o detalhe.
// Instalar e atualizar pelo GitHub ainda não existe: enquanto isso, "não instalado" oferece a página de releases.
const LOJA = { filtro: 'todos', busca: '', detalhe: null, desinstalar: null };
const FILTROS_LOJA = [['todos', 'Todos'], ['instalados', 'Instalados'], ['disponiveis', 'Para instalar'], ['em-breve', 'Em breve']];

const todosApps = () => [...APPS, ...EM_BREVE];
const estadoApp = (a) => (a.emBreve ? 'em-breve' : naoInstalado(a.id) ? 'nao-instalado' : 'instalado');
const versaoApp = (a) => ESTADOS[a.id]?.versao || '';

function passaFiltroLoja(a) {
  const e = estadoApp(a);
  if (LOJA.filtro === 'instalados' && e !== 'instalado') return false;
  if (LOJA.filtro === 'disponiveis' && e !== 'nao-instalado') return false;
  if (LOJA.filtro === 'em-breve' && e !== 'em-breve') return false;
  const q = LOJA.busca.trim().toLowerCase();
  return !q || `${a.nome} ${a.desc} ${a.grupo}`.toLowerCase().includes(q);
}

function acaoApp(a) {
  const e = estadoApp(a);
  if (e === 'em-breve') return '<span class="selo selo-breve">Em breve</span>';
  if (e === 'nao-instalado') return `<button class="btn" data-releases="${a.id}">Ver releases</button>`;
  return `<button class="btn pri" data-app="${a.id}">Abrir</button>`;
}

// Botão de atualizar, ao lado de "Abrir". Por enquanto leva à página da release (o Hub ainda não instala);
// quando o Hub passar a instalar, é este mesmo botão que vira "Atualizar".
const botaoAtualizar = (a) => (estadoApp(a) === 'instalado' && comAtualizacao(a.id) ? `<button class="btn att" data-releases="${a.id}">Baixar v${atuDe(a.id).versaoNova}</button>` : '');

// Desinstalar: abre o desinstalador do próprio app (Windows pede permissão). Pede confirmação e só com o app fechado.
function controleDesinstalar(a) {
  // Com o app rodando da pasta de desenvolvimento, o desinstalador seria o de OUTRA cópia (a do Windows): não oferece.
  if (estadoApp(a) !== 'instalado' || !ESTADOS[a.id]?.desinstalador || ESTADOS[a.id]?.embutidoDev) return '';
  if (LOJA.desinstalar === a.id) return `<span class="des-pergunta">Desinstalar o ${a.nome}?</span><button class="btn perigo" data-des-ok="${a.id}">Desinstalar</button><button class="btn" data-des-cancelar="1">Cancelar</button>`;
  if (emExecucao(a.id)) return `<button class="btn ghost" disabled title="Feche o ${a.nome} antes de desinstalar">Desinstalar</button>`;
  return `<button class="btn ghost" data-des="${a.id}">Desinstalar</button>`;
}

function estadoTexto(a) {
  const e = estadoApp(a);
  if (e === 'em-breve') return a.desc;
  if (e === 'nao-instalado') return 'Não instalado';
  const versao = comAtualizacao(a.id) ? ` · v${versaoApp(a)} → v${atuDe(a.id).versaoNova}` : versaoApp(a) ? ` · v${versaoApp(a)}` : '';
  return `${emExecucao(a.id) ? '<small class="rodando"><i class="dot"></i>Em execução</small>' : 'Instalado'}${versao}`;
}

// Selo "Atualização" nos cartões e no destaque: aparece enquanto houver versão nova, tenha a pessoa visto ou não.
const seloAtualizacao = (a) => (comAtualizacao(a.id) ? '<span class="selo-att">Atualização</span>' : '');

const DATA_LONGA = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
const dataRelease = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '' : DATA_LONGA.format(d); };
const escNotas = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Novidades do app (releases públicas do GitHub): a versão mais nova fica em destaque, já aberta, e as anteriores
// ficam numa lista que abre ao clicar. Sem notas na release, não se inventa texto.
const previaNotas = (n) => {
  const l = String(n || '').split('\n').map((x) => x.replace(/^[-*#\s]+/, '').replace(/\*\*/g, '').trim()).find(Boolean) || '';
  return l.length > 90 ? `${l.slice(0, 87)}…` : l;
};
function htmlAtualizacoes(a) {
  const atu = atuDe(a.id);
  if (!a.repositorio || !atu || !atu.historico || !atu.historico.length) return '';
  const inst = atu.instalada;
  const marca = (r) => (comAtualizacao(a.id) && inst && compararVersoesLoja(r.versao, inst) > 0 ? '<span class="selo-att">Nova</span>' : r.versao === inst ? '<span class="att-atual">Instalada</span>' : '');
  const corpo = (r) => (r.notas ? (typeof mdLite === 'function' ? mdLite(r.notas) : `<p>${escNotas(r.notas)}</p>`) : '<p class="att-sem">Sem notas nesta versão.</p>');
  const [novo, ...antigos] = atu.historico;
  const destaque = `<article class="att-dest"><div class="att-dest-topo"><b>v${novo.versao}</b>${marca(novo)}<span class="att-data">${dataRelease(novo.data)}</span></div><div class="att-notas c-texto">${corpo(novo)}</div></article>`;
  const anteriores = antigos.length ? `<div class="att-sub">Versões anteriores</div><div class="att-lista">${antigos.map((r) => `<details class="att-item"><summary><b>v${r.versao}</b>${marca(r)}<span class="att-previa">${escNotas(previaNotas(r.notas))}</span><span class="att-data">${dataRelease(r.data)}</span></summary><div class="att-notas c-texto">${corpo(r)}</div></details>`).join('')}</div>` : '';
  return `<section class="cfg-bloco det-att"><div class="att-topo"><h2>Novidades</h2><button class="att-checar" data-checar-att="1">Verificar agora</button></div>${destaque}${anteriores}</section>`;
}
const compararVersoesLoja = (x, y) => {
  const p = (v) => String(v).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const [a, b] = [p(x), p(y)];
  for (let i = 0; i < 3; i++) if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0) ? 1 : -1;
  return 0;
};

function cartaoApp(a) {
  return `<div class="loja-card ${estadoApp(a)}" data-detalhe="${a.id}" role="button" tabindex="0">
    <div class="lc-topo"><span class="glyph" data-c="${a.cor}">${ic(a.icone)}</span><span class="lc-nome"><b>${a.nome}</b><small>${a.grupo}</small></span>${seloAtualizacao(a)}</div>
    <div class="lc-pe"><span class="lc-estado">${estadoTexto(a)}</span>${acaoApp(a)}</div></div>`;
}

function htmlCartoesLoja() {
  const lista = todosApps().filter(passaFiltroLoja);
  const grupos = GRUPOS.filter((g) => lista.some((a) => a.grupo === g))
    .map((g) => `<div class="grp-l">${g}</div><div class="loja-grade">${lista.filter((a) => a.grupo === g).map(cartaoApp).join('')}</div>`).join('');
  return grupos || `<div class="vazio">${LOJA.busca || LOJA.filtro !== 'todos' ? 'Nenhum app com esse filtro.' : SECOES.find((x) => x.id === 'apps').vazio}</div>`;
}

const urlPrevia = (v) => `../previas/${v.arquivo}`;

// Carrossel de imagens do app (capturas reais guardadas em src/previas/<app>/). Sem imagens, a seção não aparece.
function htmlCarrossel(a) {
  if (!a.previas || !a.previas.length) return '';
  const itens = a.previas.map((v) => `<figure class="car-item"><img src="${urlPrevia(v)}" alt="${v.legenda}" loading="lazy"><figcaption>${v.legenda}</figcaption></figure>`).join('');
  const setas = a.previas.length > 1 ? `<button class="car-nav prev" data-car="-1" aria-label="Imagem anterior">${ic('back')}</button><button class="car-nav next" data-car="1" aria-label="Próxima imagem">${ic('fwd')}</button>` : '';
  return `<section class="car" aria-label="Imagens de ${a.nome}"><div class="car-faixa" id="car-faixa">${itens}</div>${setas}</section>`;
}

function htmlDetalheApp(a) {
  const e = estadoApp(a);
  const situacao = e === 'em-breve' ? 'Em breve' : e === 'nao-instalado' ? 'Não instalado' : emExecucao(a.id) ? 'Em execução' : 'Instalado';
  const linha = (nome, valor) => `<div><span class="t"><b>${nome}</b></span><span class="cfg-valor">${valor}</span></div>`;
  const infos = [linha('Situação', situacao), linha('Grupo', a.grupo)];
  if (e === 'instalado' && versaoApp(a)) infos.push(linha('Versão instalada', `v${versaoApp(a)}`));
  if (a.repositorio) infos.push(linha('Repositório', `github.com/${a.repositorio}`));
  const config = e === 'em-breve' ? 'Este app ainda não foi lançado.' : e === 'nao-instalado' ? 'Instale o app para configurá-lo.' : 'Este app ainda não tem configurações pelo Hub.';
  const sobre = a.sobre ? `<section class="cfg-bloco det-sobre"><h2>Sobre</h2><p>${a.sobre}</p></section>` : '';
  return `<div class="page loja-det">
    <button class="loja-voltar" data-loja-voltar="1">${ic('back')}Apps</button>
    <div class="det-head"><span class="glyph" data-c="${a.cor}">${ic(a.icone)}</span>
      <div class="det-nome"><h1>${a.nome}</h1><p>${a.grupo} · ${situacao}${e === 'instalado' && versaoApp(a) ? ` · v${versaoApp(a)}` : ''}</p></div><div class="det-acoes">${acaoApp(a)}${botaoAtualizar(a)}${controleDesinstalar(a)}</div></div>
    ${htmlCarrossel(a)}
    <div class="det-cols">
      <div class="det-main">${sobre}${htmlAtualizacoes(a)}</div>
      <aside class="det-lado">
        <section class="cfg-bloco"><h2>Informações</h2><div class="box list">${infos.join('')}</div></section>
        <section class="cfg-bloco"><h2>Configurações</h2><div class="box list"><div><span class="t"><small>${config}</small></span></div></div></section>
      </aside>
    </div>
  </div>`;
}

// Destaque no topo da loja: o app marcado com "destaque" e com imagens, sem filtro nem busca ativos.
function htmlDestaque() {
  const a = APPS.find((x) => x.destaque && x.previas && x.previas.length);
  if (!a || LOJA.filtro !== 'todos' || LOJA.busca.trim()) return '';
  return `<div class="loja-hero" data-detalhe="${a.id}" role="button" tabindex="0">
    <div class="hero-txt"><span class="hero-sel">Em destaque</span>
      <div class="hero-id"><span class="glyph" data-c="${a.cor}">${ic(a.icone)}</span><h2>${a.nome}</h2>${seloAtualizacao(a)}</div>
      <p>${a.desc}</p>
      <div class="hero-acao">${acaoApp(a)}${botaoAtualizar(a)}<span class="hero-estado">${estadoTexto(a)}</span></div></div>
    <img class="hero-img" src="${urlPrevia(a.previas[0])}" alt="${a.previas[0].legenda}"></div>`;
}

function htmlApps() {
  const s = SECOES.find((x) => x.id === 'apps');
  const det = LOJA.detalhe && todosApps().find((a) => a.id === LOJA.detalhe);
  if (det) return htmlDetalheApp(det);
  LOJA.detalhe = null;
  const chips = FILTROS_LOJA.map(([id, nome]) => `<button class="chip${LOJA.filtro === id ? ' on' : ''}" data-filtro="${id}">${nome}</button>`).join('');
  return `<div class="page loja">
    <div class="p-head"><div><h1>${s.nome}</h1><p>${s.desc}</p></div></div>
    ${htmlDestaque()}
    <div class="loja-barra"><input class="loja-busca" id="l-busca" type="search" placeholder="Buscar apps" value="${LOJA.busca.replace(/"/g, '&quot;')}" aria-label="Buscar apps"><div class="chips">${chips}</div></div>
    <section class="apps" id="l-lista">${htmlCartoesLoja()}</section>
  </div>`;
}

// Tela Configurações (aberta pelo menu do usuário): só o que é real hoje.
function htmlConfig() {
  const e = CHAT.estado;
  const ok = Boolean(e && e.disponivel);
  const linha = (nome, desc, valor, cls = '') => `<div><span class="t"><b>${nome}</b><small>${desc}</small></span><span class="cfg-valor ${cls}">${valor}</span></div>`;
  return `<div class="page">
    <div class="p-head"><div><h1>Configurações</h1><p>O chat do Início.</p></div></div>
    <section class="cfg-bloco"><h2>Chat do Início</h2>
      <div class="box list">
        ${linha('Claude Code', 'O login do Claude Code é usado para conversar.', ok ? 'Encontrado' : 'Não encontrado', ok ? 'ok' : 'ruim')}
        ${ok ? linha('Local', 'Onde o Hub encontrou o Claude Code.', escHtml(e.caminho)) : ''}
        ${linha('Modelo', 'Sempre o mais barato disponível (Haiku).', 'Claude Haiku')}
        ${linha('Histórico', 'As conversas do Início não são guardadas.', 'Desligado')}
      </div>
    </section>
  </div>`;
}
