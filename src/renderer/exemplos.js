'use strict';

// DADOS DE EXEMPLO. Nada aqui é real: cada tela que os usa mostra o selo "Dados de exemplo".
// Quando as APIs existirem (TASK-018 e 019), estes arrays viram a resposta delas, no mesmo formato.
// `por` em ANUNCIOS é o índice em EQUIPE. `presenca`: on, aw (ausente) ou off.
const EQUIPE = [
  { nome: 'Rodrigo Cruz', papel: 'Fundador, Tecnologia', cor: '#3b82f6', presenca: 'on', app: 'termix', agora: 'no Termix' },
  { nome: 'Ana Souza', papel: 'Financeiro', cor: '#e5a63b', presenca: 'on', app: 'finanpro', agora: 'no FinanPro' },
  { nome: 'Bruno Lima', papel: 'Operações', cor: '#4cc38a', presenca: 'aw', app: 'workflow', agora: 'ausente, volta às 15h' },
  { nome: 'Carla Mendes', papel: 'Conteúdo e redes', cor: '#ec6a8b', presenca: 'on', app: 'instamidia', agora: 'no Instamidia' },
  { nome: 'Diego Alves', papel: 'Estoque e pedidos', cor: '#c08a5a', presenca: 'off', app: 'lignum', agora: 'offline desde ontem' },
];

const ANUNCIOS = [
  { fixado: true, tag: 'Evento', cor: '#3b82f6', titulo: 'Reunião semanal: segunda, 9h', texto: 'Pauta: metas do mês, pendências do Workflow e demos dos apps.', por: 0, quando: 'hoje' },
  { fixado: true, tag: 'Aviso', cor: '#e5a63b', titulo: 'Fechamento financeiro até sexta', texto: 'Lancem as notas e comprovantes no FinanPro até sexta, 18h.', por: 1, quando: 'ontem' },
  { fixado: false, tag: 'Atualização', cor: '#3b82f6', titulo: 'Termix 1.9.2 já está disponível', texto: 'Terminais mais rápidos e novos servidores MCP. Atualizem pelo Hub.', por: 0, quando: 'ontem' },
  { fixado: false, tag: 'Conteúdo', cor: '#ec6a8b', titulo: 'Calendário de posts de novembro publicado', texto: 'Revisem os rascunhos no Instamidia e comentem até quarta.', por: 3, quando: 'há 2 dias' },
  { fixado: false, tag: 'Operação', cor: '#4cc38a', titulo: 'Novo fluxo de aprovação de pedidos', texto: 'Pedidos acima de R$ 5 mil agora passam por aprovação no Workflow.', por: 2, quando: 'há 3 dias' },
  { fixado: false, tag: 'Estoque', cor: '#c08a5a', titulo: 'Inventário trimestral agendado', texto: 'Contagem na quinta de manhã. Diego coordena e avisa as janelas.', por: 4, quando: 'há 4 dias' },
];

const AGENDA = [
  { hora: '09:00', titulo: 'Reunião semanal', detalhe: 'Sala virtual', cor: '#3b82f6' },
  { hora: '11:30', titulo: 'Revisão do calendário de posts', detalhe: 'Carla, no Instamidia', cor: '#ec6a8b' },
  { hora: '15:00', titulo: 'Fechamento do caixa', detalhe: 'Ana, no FinanPro', cor: '#e5a63b' },
];

// Categorias das notícias: cor e ícone (a cor só existe para distinguir categoria).
const CATEGORIAS = {
  'IA': { cor: '#a78bfa', icone: 'cpu' },
  'Desenvolvimento': { cor: '#3b82f6', icone: 'code' },
  'Segurança': { cor: '#ec5d5d', icone: 'shield' },
  'Infra': { cor: '#2dd4bf', icone: 'server' },
  'Negócios': { cor: '#e5a63b', icone: 'brief' },
  'Design': { cor: '#ec6a8b', icone: 'palette' },
  'Marketing': { cor: '#4cc38a', icone: 'mega' },
  'Produto': { cor: '#fb923c', icone: 'box' },
};

// `alta` é a pontuação de "em alta"; `min` é o tempo de leitura. A TASK-018 troca isto por uma API.
const NOTICIAS = [
  { id: 1, cat: 'IA', titulo: 'Agentes de código entram na revisão de pull requests: o que muda para times pequenos', resumo: 'Ferramentas que sugerem correções e escrevem testes já aparecem na rotina de equipes enxutas. Veja onde elas ajudam e onde ainda erram.', fonte: 'Dev Journal', quando: 'há 2 h', min: 7, alta: 92, tags: ['agentes', 'código', 'produtividade'] },
  { id: 2, cat: 'Segurança', titulo: 'Passkeys no lugar de senhas: guia de adoção para pequenas empresas', resumo: 'Do login da equipe aos acessos de clientes: um roteiro simples para migrar sem travar ninguém.', fonte: 'Segurança Hoje', quando: 'há 4 h', min: 6, alta: 88, tags: ['passkeys', 'autenticação'] },
  { id: 3, cat: 'Desenvolvimento', titulo: 'Monorepo ou um repositório por app? Prós e contras na prática', resumo: 'Quando separar compensa, como versionar dependências compartilhadas e o custo oculto de cada escolha.', fonte: 'Tech Radar', quando: 'há 6 h', min: 9, alta: 81, tags: ['arquitetura', 'repositórios'] },
  { id: 4, cat: 'Negócios', titulo: 'Fluxo de caixa para PMEs: indicadores que importam além do saldo', resumo: 'Prazo médio, previsibilidade e margem por cliente: o painel mínimo para decidir com segurança.', fonte: 'Negócios BR', quando: 'ontem', min: 5, alta: 74, tags: ['finanças', 'pme'] },
  { id: 5, cat: 'Infra', titulo: 'Self-hosting em 2026: quando vale mais do que um SaaS', resumo: 'Custos reais, tempo de manutenção e riscos. Um checklist para decidir o que hospedar por conta própria.', fonte: 'Tech Radar', quando: 'ontem', min: 8, alta: 70, tags: ['self-hosted', 'custos'] },
  { id: 6, cat: 'Design', titulo: 'Interfaces densas e calmas: princípios para apps internos', resumo: 'Hierarquia, espaçamento e cor com propósito para ferramentas usadas o dia inteiro.', fonte: 'Design Notes', quando: 'ontem', min: 6, alta: 63, tags: ['ui', 'ux'] },
  { id: 7, cat: 'Marketing', titulo: 'Vídeos curtos e calendário editorial: rotina para equipes de 1 a 5 pessoas', resumo: 'Como manter constância sem agência: pauta semanal, lotes de gravação e métricas que importam.', fonte: 'Mídia Lab', quando: 'há 2 dias', min: 5, alta: 58, tags: ['vídeo', 'redes sociais'] },
  { id: 8, cat: 'Segurança', titulo: 'Backup 3-2-1 para quem tem um único servidor', resumo: 'Três cópias, dois meios, uma fora do local. Passo a passo e como testar a restauração.', fonte: 'Segurança Hoje', quando: 'há 2 dias', min: 6, alta: 55, tags: ['backup', 'servidor'] },
  { id: 9, cat: 'IA', titulo: 'Modelos menores e locais ganham espaço em tarefas do dia a dia', resumo: 'Privacidade, custo e latência: quando um modelo local resolve e quando a nuvem ainda vence.', fonte: 'Dev Journal', quando: 'há 3 dias', min: 7, alta: 52, tags: ['llm', 'local'] },
  { id: 10, cat: 'Produto', titulo: 'Do protótipo ao produto: como validar um app interno antes de escalar', resumo: 'Teste com cinco usuários, meça uso real e decida o que cortar antes de construir mais.', fonte: 'Produto em Foco', quando: 'há 3 dias', min: 6, alta: 47, tags: ['mvp', 'validação'] },
  { id: 11, cat: 'Desenvolvimento', titulo: 'TypeScript, Rust ou Go: como equipes enxutas escolhem a stack', resumo: 'Curva de aprendizado, ecossistema e contratação pesam mais do que benchmarks.', fonte: 'Dev Journal', quando: 'há 4 dias', min: 8, alta: 44, tags: ['stack', 'linguagens'] },
  { id: 12, cat: 'Negócios', titulo: 'Automatizar cobranças reduz inadimplência? O que dizem os números', resumo: 'Régua de cobrança, lembretes e conciliação: o impacto medido em empresas pequenas.', fonte: 'Negócios BR', quando: 'há 5 dias', min: 5, alta: 41, tags: ['cobrança', 'automação'] },
];

if (typeof module !== 'undefined') module.exports = { EQUIPE, ANUNCIOS, AGENDA, CATEGORIAS, NOTICIAS };
