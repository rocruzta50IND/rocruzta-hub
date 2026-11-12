'use strict';

// Catálogo de apps e telas do Hub. GRUPOS e APPS vêm do src/apps.json (lido pelo processo principal,
// validado em src/main/apps.js) e são preenchidos por definirCatalogo() antes de a casca iniciar.
// Só entra no apps.json o que existe de verdade; como um app entra: docs/DECISOES.md, seção 11.
const GRUPOS = [];

const HUB = { id: 'hub', nome: 'Hub', icone: 'home', cor: '#3570dc' };

const APPS = [];
// Apps anunciados que ainda não existem: aparecem só na loja (tela Apps), nunca no seletor, na barra lateral nem no Início.
const EM_BREVE = [];

// Estado de cada app detectado no Windows: { [id]: { instalado, versao? } }. Vazio até a detecção responder
// (ou se ela falhar): sem estado conhecido, o app aparece normal.
const ESTADOS = {};
// `embutivel`: o main achou o app em modo embutido (roda sem janela dentro do Hub, não precisa de instalação).
const naoInstalado = (id) => ESTADOS[id]?.instalado === false && !ESTADOS[id]?.embutivel;
const emExecucao = (id) => (ESTADOS[id]?.instalado === true || ESTADOS[id]?.embutivel === true) && ESTADOS[id]?.rodando === true;

// Atualizações dos apps (só aviso), lidas pelo processo principal das releases públicas do GitHub:
// { [id]: { disponivel, versaoNova?, instalada, historico: [{ versao, data, notas, url }], checadoEm, detectadoEm?, visto?, avisoFechado? } }
const ATU = {};
const atuDe = (id) => ATU[id] || null;
const comAtualizacao = (id) => ATU[id]?.disponivel === true;
const avisoNaoVisto = (id) => comAtualizacao(id) && ATU[id].visto !== true;
function definirAtualizacoes(dados) {
  for (const k of Object.keys(ATU)) delete ATU[k];
  Object.assign(ATU, dados || {});
}

function definirEstados(estados) {
  for (const k of Object.keys(ESTADOS)) delete ESTADOS[k];
  Object.assign(ESTADOS, estados || {});
}

// Preenche GRUPOS e APPS no lugar (os outros scripts guardam a referência dos arrays).
function definirCatalogo(dados) {
  GRUPOS.splice(0, GRUPOS.length, ...dados.grupos);
  APPS.splice(0, APPS.length, ...dados.apps.filter((a) => !a.emBreve));
  EM_BREVE.splice(0, EM_BREVE.length, ...dados.apps.filter((a) => a.emBreve));
}

// Telas internas do Hub. `tecla` é o atalho interno (só com a janela em foco).
const SECOES = [
  { id: 'inicio', nome: 'Início', icone: 'home', tecla: '1', desc: 'Seus apps da Rocruzta.' },
  { id: 'apps', nome: 'Apps', icone: 'grid', tecla: '2', desc: 'Instale, abra e acompanhe os apps da Rocruzta.', vazio: 'Nenhum app encontrado.' },
  { id: 'noticias', nome: 'Notícias', icone: 'news', tecla: '3', desc: 'Tecnologia, segurança e negócios, filtrados para o que importa pra gente.', vazio: 'Ainda não há notícias. Elas aparecem aqui quando houver uma fonte conectada.' },
  { id: 'comunicados', nome: 'Comunicados', icone: 'mega', tecla: '4', desc: 'Avisos e decisões da empresa em um só lugar.', vazio: 'Ainda não há comunicados.' },
  { id: 'equipe', nome: 'Equipe', icone: 'users', tecla: '5', desc: 'Quem é quem na Rocruzta.', vazio: 'Ainda não há ninguém cadastrado.' },
  { id: 'config', nome: 'Configurações', icone: 'gear', tecla: '', rodape: true, desc: 'O chat do Início.' }, // aberta pelo menu do usuário (rodapé da barra lateral); fora da lista lateral
];

if (typeof module !== 'undefined') module.exports = { ATU, atuDe, comAtualizacao, avisoNaoVisto, definirAtualizacoes, GRUPOS, HUB, APPS, EM_BREVE, SECOES, ESTADOS, naoInstalado, emExecucao, definirCatalogo, definirEstados };
