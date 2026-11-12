'use strict';

// Central de notificações do Hub (TASK-026). Os apps embutidos mandam eventos; o Hub guarda, conta o que não foi visto
// e decide mostrar o aviso do Windows. Sem dependência do Electron (testável com Node puro).
const TIPOS = new Set(['done', 'perm', 'error', 'cache']);
const TITULOS = { done: 'Terminou', perm: 'Precisa de você', error: 'Erro', cache: 'Cache esfriando' };

const texto = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '');

// Aceita só o formato esperado vindo do app; qualquer outra coisa é descartada.
function normalizar(appId, bruto, agora = Date.now()) {
  if (!bruto || typeof bruto !== 'object' || !TIPOS.has(bruto.tipo)) return null;
  const tabId = texto(bruto.tabId, 80);
  if (!tabId) return null;
  return { appId: texto(appId, 40), tabId, quem: texto(bruto.quem, 80), tipo: bruto.tipo, msg: texto(bruto.msg, 300), ts: Number.isFinite(bruto.ts) ? bruto.ts : agora };
}

function criarCentral(max = 60) {
  let seq = 0;
  let itens = []; // mais nova primeiro
  return {
    adicionar(appId, bruto, agora = Date.now()) {
      const ev = normalizar(appId, bruto, agora);
      if (!ev) return null;
      const item = { ...ev, id: ++seq, visto: false };
      itens = [item, ...itens].slice(0, max);
      return item;
    },
    listar: () => itens.map((i) => ({ ...i })),
    pendentes: () => itens.filter((i) => !i.visto).length,
    marcarVistas() { for (const i of itens) i.visto = true; },
    obter: (id) => itens.find((i) => i.id === id) || null,
    limpar() { itens = []; },
  };
}

// Aviso do Windows só quando a pessoa não está olhando para o app que gerou o evento.
const deveAvisarWindows = ({ janelaEmFoco, appVisivel, appId }) => !janelaEmFoco || appVisivel !== appId;

module.exports = { TIPOS, TITULOS, normalizar, criarCentral, deveAvisarWindows };
