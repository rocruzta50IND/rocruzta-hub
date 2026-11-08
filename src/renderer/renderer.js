'use strict';

// Ponto de entrada do renderer: ícones fixos da barra de título, controles da janela e a casca.
const botoes = { 'btn-min': 'minus', 'btn-max': 'square', 'btn-close': 'x', notif: 'bell' };
for (const [id, icone] of Object.entries(botoes)) {
  document.getElementById(id).innerHTML = ic(icone);
}
document.querySelector('#btn-max svg').style.setProperty('width', '12px');
document.querySelector('#btn-max svg').style.setProperty('height', '12px');

document.getElementById('btn-min').addEventListener('click', () => window.hub.minimize());
document.getElementById('btn-max').addEventListener('click', () => window.hub.toggleMaximize());
document.getElementById('btn-close').addEventListener('click', () => window.hub.close());

// O glyph do seletor mostra onde o Hub está (hoje só o próprio Hub).
document.getElementById('cur-g').innerHTML = ic(HUB.icone);
aplicarCores(document.getElementById('titlebar'));

// O catálogo vem do apps.json pelo processo principal; a casca só inicia com ele carregado.
window.hub.apps().then((dados) => {
  definirCatalogo(dados);
  iniciarShell();
}).catch((erro) => {
  console.error('Falha ao carregar apps.json', erro);
  document.getElementById('hmain').textContent = 'Não foi possível carregar o catálogo de apps.';
});
