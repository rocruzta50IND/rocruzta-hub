'use strict';

// Catálogo PROVISÓRIO de apps e telas do Hub (a TASK-008 troca APPS por um apps.json).
// Só entra aqui o que existe de verdade: hoje, o Termix. Os apps previstos e como entrarão estão em
// docs/DECISOES.md (seção 11). Nada fingido na interface.
const GRUPOS = ['Operação', 'Negócio', 'Criação'];

const HUB = { id: 'hub', nome: 'Hub', icone: 'home', cor: '#3b82f6' };

const APPS = [
  { id: 'termix', nome: 'Termix', grupo: 'Operação', icone: 'terminal', cor: '#3b82f6', desc: 'Central de sessões de agentes de programação' },
];

// Telas internas do Hub. `tecla` é o atalho interno (só com a janela em foco).
const SECOES = [
  { id: 'inicio', nome: 'Início', icone: 'home', tecla: '1', desc: 'Seus apps da Rocruzta.' },
  { id: 'noticias', nome: 'Notícias', icone: 'news', tecla: '2', desc: 'Tecnologia, segurança e negócios, filtrados para o que importa pra gente.', vazio: 'Ainda não há notícias. Elas aparecem aqui quando houver uma fonte conectada.' },
  { id: 'comunicados', nome: 'Comunicados', icone: 'mega', tecla: '3', desc: 'Avisos e decisões da empresa em um só lugar.', vazio: 'Ainda não há comunicados.' },
  { id: 'equipe', nome: 'Equipe', icone: 'users', tecla: '4', desc: 'Quem é quem na Rocruzta.', vazio: 'Ainda não há ninguém cadastrado.' },
];

if (typeof module !== 'undefined') module.exports = { GRUPOS, HUB, APPS, SECOES };
