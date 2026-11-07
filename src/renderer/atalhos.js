'use strict';

// Atalhos INTERNOS do Hub. Valem só com a janela do Hub em foco (o keydown só chega aqui assim)
// e fora de campos de texto. Não há atalho global aqui (o seletor global é a TASK-011).

function ehCampoDeTexto(el) {
  if (!el) return false;
  const tag = String(el.tagName || '').toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || Boolean(el.isContentEditable);
}

// Devolve { acao: 'secao', id } | { acao: 'fechar-seletor' } | null.
function resolverAtalho(ev, estado, secoes) {
  if (!ev || ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return null;
  if (ehCampoDeTexto(ev.target)) return null;
  if (ev.key === 'Escape') return estado && estado.seletorAberto ? { acao: 'fechar-seletor' } : null;
  const sec = (secoes || []).find((s) => s.tecla === ev.key);
  return sec ? { acao: 'secao', id: sec.id } : null;
}

if (typeof module !== 'undefined') module.exports = { ehCampoDeTexto, resolverAtalho };
