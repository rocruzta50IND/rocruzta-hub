'use strict';

// Lógica pura do painel de troca rápida entre apps (TASK-030): ordem por uso recente e seleção.
// Sem DOM, para testar em Node. O desenho do painel fica em shell.js.

// Lista de itens ({ id, ... }) ordenada do mais recente para o mais antigo; quem nunca foi usado vai ao fim,
// na ordem original. `recentes` é uma lista de ids, mais recente primeiro.
function ordenarPorRecentes(itens, recentes) {
  const pos = (id) => { const i = (recentes || []).indexOf(id); return i < 0 ? Infinity : i; };
  return itens
    .map((item, i) => ({ item, i }))
    .sort((a, b) => (pos(a.item.id) - pos(b.item.id)) || (a.i - b.i) || 0)
    .map((x) => x.item);
}

// Registra o uso de `id` e devolve a nova lista de recentes (sem duplicados, tamanho limitado).
function registrarRecente(recentes, id, max = 20) {
  return [id, ...(recentes || []).filter((x) => x !== id)].slice(0, max);
}

// Seleção ao abrir: o item anterior (o 2º da lista, já que o 1º é o atual), como no Alt+Tab. Com 1 item só, o próprio.
function selecaoInicial(total) {
  return total > 1 ? 1 : 0;
}

// Avança (ou volta) com volta ao início. Total 0 não tem seleção.
function mover(indice, total, voltar = false) {
  if (!total) return 0;
  return (indice + (voltar ? -1 : 1) + total) % total;
}

if (typeof module !== 'undefined') module.exports = { ordenarPorRecentes, registrarRecente, selecaoInicial, mover };
