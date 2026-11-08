'use strict';

// Tela Início: só o que é real. Hoje, os apps do catálogo. Comunicados, notícias, equipe e agenda
// voltam quando houver dados reais (TASK-006, 007, 018 e 019); até lá não aparece nada fingido.
// Depende de icons.js, catalogo.js e ui.js (carregados antes, em index.html).
function blocoApp(app) {
  if (naoInstalado(app.id)) {
    // Não instalado: o bloco informa e oferece só a página de releases (nada é instalado pelo Hub).
    return `<div class="tile nao-instalado" data-app="${app.id}">
      <span class="glyph" data-c="${app.cor}">${ic(app.icone)}</span>
      <span class="nome"><b>${app.nome}</b><small>Não instalado</small></span>
      <button class="btn" data-releases="${app.id}">Ver releases</button></div>`;
  }
  return `<button class="tile" data-app="${app.id}">
    <span class="glyph" data-c="${app.cor}">${ic(app.icone)}</span>
    <span class="nome"><b>${app.nome}</b><small>${app.desc}</small></span></button>`;
}

function htmlInicio(agora = new Date()) {
  const data = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const s = SECOES.find((x) => x.id === 'inicio');
  const grupos = GRUPOS.filter((g) => APPS.some((a) => a.grupo === g))
    .map((g) => `<div class="grp-l">${g}</div><div class="tiles">${APPS.filter((a) => a.grupo === g).map(blocoApp).join('')}</div>`).join('');
  return `<div class="page">
    <div class="p-head"><div><h1>${s.nome}</h1><p>${data[0].toUpperCase()}${data.slice(1)}</p></div></div>
    <section class="apps"><div class="sec-t"><h2>Apps</h2></div>${grupos}</section>
  </div>`;
}
