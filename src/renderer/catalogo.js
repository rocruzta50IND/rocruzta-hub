'use strict';

// Catálogo de apps e telas do Hub. GRUPOS e APPS vêm do src/apps.json (lido pelo processo principal,
// validado em src/main/apps.js) e são preenchidos por definirCatalogo() antes de a casca iniciar.
// Só entra no apps.json o que existe de verdade; como um app entra: docs/DECISOES.md, seção 11.
const GRUPOS = [];

const HUB = { id: 'hub', nome: 'Hub', icone: 'home', cor: '#3b82f6' };

const APPS = [];

// Estado de cada app detectado no Windows: { [id]: { instalado, versao? } }. Vazio até a detecção responder
// (ou se ela falhar): sem estado conhecido, o app aparece normal.
const ESTADOS = {};
const naoInstalado = (id) => ESTADOS[id]?.instalado === false;
const emExecucao = (id) => ESTADOS[id]?.instalado === true && ESTADOS[id]?.rodando === true;

function definirEstados(estados) {
  for (const k of Object.keys(ESTADOS)) delete ESTADOS[k];
  Object.assign(ESTADOS, estados || {});
}

// Preenche GRUPOS e APPS no lugar (os outros scripts guardam a referência dos arrays).
function definirCatalogo(dados) {
  GRUPOS.splice(0, GRUPOS.length, ...dados.grupos);
  APPS.splice(0, APPS.length, ...dados.apps);
}

// Telas internas do Hub. `tecla` é o atalho interno (só com a janela em foco).
const SECOES = [
  { id: 'inicio', nome: 'Início', icone: 'home', tecla: '1', desc: 'Seus apps da Rocruzta.' },
  { id: 'noticias', nome: 'Notícias', icone: 'news', tecla: '2', desc: 'Tecnologia, segurança e negócios, filtrados para o que importa pra gente.', vazio: 'Ainda não há notícias. Elas aparecem aqui quando houver uma fonte conectada.' },
  { id: 'comunicados', nome: 'Comunicados', icone: 'mega', tecla: '3', desc: 'Avisos e decisões da empresa em um só lugar.', vazio: 'Ainda não há comunicados.' },
  { id: 'equipe', nome: 'Equipe', icone: 'users', tecla: '4', desc: 'Quem é quem na Rocruzta.', vazio: 'Ainda não há ninguém cadastrado.' },
];

if (typeof module !== 'undefined') module.exports = { GRUPOS, HUB, APPS, SECOES, ESTADOS, naoInstalado, emExecucao, definirCatalogo, definirEstados };
