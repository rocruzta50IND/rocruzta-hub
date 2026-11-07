'use strict';

// Tela Início: comunicados, notícias em alta, apps, equipe e agenda.
// Só os apps vêm do catálogo (real). O resto são dados de exemplo e cada bloco leva o selo.
// Depende de icons.js, catalogo.js, exemplos.js, capas.js e ui.js (carregados antes, em index.html).
const iniciais = (nome) => nome.split(' ').map((x) => x[0]).slice(0, 2).join('');

const avatar = (p) => `<span class="ava" data-c="${p.cor}">${iniciais(p.nome)}<i class="st ${p.presenca}"></i></span>`;

function itemAnuncio(a) {
  const autor = EQUIPE[a.por];
  return `<div class="ann" data-sec="comunicados">${avatar(autor)}<div class="t">
    <h3>${a.fixado ? `<span class="pinned" title="Fixado">${ic('pin')}</span>` : ''}${a.titulo}<span class="pill" data-c="${a.cor}">${a.tag}</span></h3>
    <p>${a.texto}</p><div class="m"><span>${autor.nome}</span><span>${a.quando}</span></div></div></div>`;
}

function itemNoticia(n) {
  return `<div class="mini" data-sec="noticias">${capa(n)}<div>${etiquetaCat(n.cat)}<h3>${n.titulo}</h3>
    <div class="m"><span>${n.fonte}</span><span>${n.quando}</span><span>${n.min} min</span></div></div></div>`;
}

function blocoApp(app) {
  const off = app.estado !== 'ativo';
  return `<button class="tile${off ? ' off' : ''}" data-app="${app.id}"${off ? ' aria-disabled="true"' : ''}>
    <span class="glyph" data-c="${app.cor}">${ic(app.icone)}</span>
    <span class="nome"><b>${app.nome}</b>${off ? '<span class="selo selo-breve">Em breve</span>' : ''}</span></button>`;
}

const SELO_EXEMPLO = '<span class="selo selo-exemplo">Dados de exemplo</span>';

function titulo(texto, extra = '') {
  return `<div class="sec-t"><h2>${texto}</h2>${extra}</div>`;
}

function htmlInicio(agora = new Date()) {
  const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const s = SECOES.find((x) => x.id === 'inicio');
  const emAlta = [...NOTICIAS].sort((a, b) => b.alta - a.alta).slice(0, 3);
  const grupos = GRUPOS.map((g) => `<div class="grp-l">${g}</div><div class="tiles">${APPS.filter((a) => a.grupo === g).map(blocoApp).join('')}</div>`).join('');

  return `<div class="page">
    <div class="p-head"><div><h1>${s.nome}</h1><p>${data[0].toUpperCase()}${data.slice(1)}</p></div></div>
    <div class="cols">
      <div class="stack">
        <section>${titulo('Comunicados', `${SELO_EXEMPLO}<button class="link" data-sec="comunicados">Ver todos</button>`)}
          <div class="box">${ANUNCIOS.slice(0, 3).map(itemAnuncio).join('')}</div></section>
        <section>${titulo('Em alta nas notícias', `${SELO_EXEMPLO}<button class="link" data-sec="noticias">Abrir notícias</button>`)}
          <div class="box">${emAlta.map(itemNoticia).join('')}</div></section>
      </div>
      <div class="stack">
        <section>${titulo('Apps')}${grupos}</section>
        <section>${titulo('Equipe', `${SELO_EXEMPLO}<button class="link" data-sec="equipe">Ver equipe</button>`)}
          <div class="box">${EQUIPE.map((p) => `<div class="person">${avatar(p)}<div class="t">${p.nome.split(' ')[0]}<small>${p.agora}</small></div></div>`).join('')}</div></section>
        <section>${titulo('Hoje', SELO_EXEMPLO)}
          <div class="box">${AGENDA.map((e) => `<div class="ev" data-c="${e.cor}"><time>${e.hora}</time><i class="bar"></i><div>${e.titulo}<small>${e.detalhe}</small></div></div>`).join('')}</div></section>
      </div>
    </div></div>`;
}
