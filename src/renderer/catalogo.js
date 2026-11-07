'use strict';

// Catálogo PROVISÓRIO de apps e telas do Hub. A TASK-008 troca APPS por um apps.json.
// estado: 'ativo' (lançável) ou 'em-breve' (aparece desabilitado com o selo).
const GRUPOS = ['Operação', 'Negócio', 'Criação'];

const HUB = { id: 'hub', nome: 'Hub', icone: 'home', cor: '#3b82f6' };

const APPS = [
  { id: 'termix', nome: 'Termix', grupo: 'Operação', icone: 'terminal', cor: '#3b82f6', desc: 'Central de sessões de agentes de programação', estado: 'ativo' },
  { id: 'workflow', nome: 'Workflow', grupo: 'Operação', icone: 'workflow', cor: '#4cc38a', desc: 'Fluxos, tarefas e automações', estado: 'em-breve' },
  { id: 'finanpro', nome: 'FinanPro', grupo: 'Negócio', icone: 'wallet', cor: '#e5a63b', desc: 'Contas, fluxo de caixa e relatórios', estado: 'em-breve' },
  { id: 'lignum', nome: 'Lignum', grupo: 'Negócio', icone: 'tree', cor: '#c08a5a', desc: 'Estoque, pedidos e clientes', estado: 'em-breve' },
  { id: 'instamidia', nome: 'Instamidia', grupo: 'Criação', icone: 'camera', cor: '#ec6a8b', desc: 'Conteúdo e publicações para redes sociais', estado: 'em-breve' },
  { id: 'rocstudio', nome: 'RocStudio', grupo: 'Criação', icone: 'film', cor: '#a78bfa', desc: 'Estúdio de criação: design e vídeo', estado: 'em-breve' },
];

// Telas internas do Hub. `tecla` é o atalho interno (só com a janela em foco).
const SECOES = [
  { id: 'inicio', nome: 'Início', icone: 'home', tecla: '1', desc: 'Resumo do dia: comunicados, notícias, apps, equipe e agenda.' },
  { id: 'noticias', nome: 'Notícias', icone: 'news', tecla: '2', desc: 'Tecnologia, segurança e negócios, filtrados para o que importa pra gente.' },
  { id: 'comunicados', nome: 'Comunicados', icone: 'mega', tecla: '3', desc: 'Avisos e decisões da empresa em um só lugar.' },
  { id: 'equipe', nome: 'Equipe', icone: 'users', tecla: '4', desc: 'Quem é quem e o que cada pessoa está usando.' },
];

if (typeof module !== 'undefined') module.exports = { GRUPOS, HUB, APPS, SECOES };
