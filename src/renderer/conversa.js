'use strict';

// Estado e HTML do chat da tela Início. É do Hub, independente dos apps: conversa com o Claude Code (modelo mais barato),
// sem ferramentas e SEM histórico (nada é guardado em disco; "Nova conversa" zera). Depende de icons.js (carregado antes).
const CHAT = {
  msgs: [],          // { papel: 'eu' | 'ia', texto, erro? }
  gerando: false,    // aguardando/recebendo a resposta
  estado: null,      // { disponivel, caminho, modelo } vindo do processo principal
};

const escHtml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Markdown enxuto e seguro (o texto é escapado primeiro): blocos de código, código em linha, negrito, listas e parágrafos.
function mdLite(texto) {
  const partes = String(texto).split(/```/);
  return partes.map((p, i) => {
    if (i % 2 === 1) { const corpo = p.replace(/^[^\n]*\n/, ''); return `<pre><code>${escHtml(corpo.replace(/\n$/, ''))}</code></pre>`; }
    const blocos = escHtml(p).split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b) => {
      const linhas = b.split('\n');
      const lista = linhas.every((l) => /^\s*[-*]\s+/.test(l));
      const inline = (l) => l.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
      if (lista) return `<ul>${linhas.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
      return `<p>${linhas.map(inline).join('<br>')}</p>`;
    });
    return blocos.join('');
  }).join('');
}

function htmlMensagens(msgs = CHAT.msgs, gerando = CHAT.gerando) {
  // O mascote fica sobre o avatar da última resposta (ou da que está sendo esperada); as anteriores mostram um pontinho.
  const esperando = gerando && (!msgs.length || msgs[msgs.length - 1].papel === 'eu');
  const ultimaIa = esperando ? -1 : msgs.map((m) => m.papel).lastIndexOf('ia');
  const itens = msgs.map((m, i) => (m.papel === 'eu'
    ? `<div class="c-linha eu"><div class="c-bolha">${escHtml(m.texto).replace(/\n/g, '<br>')}</div></div>`
    : `<div class="c-linha ia${m.erro ? ' erro' : ''}"><div class="c-avatar${i === ultimaIa ? '' : ' ponto'}"></div><div class="c-texto">${m.erro ? escHtml(m.texto) : mdLite(m.texto)}</div></div>`)).join('');
  const aguardando = esperando
    ? '<div class="c-linha ia"><div class="c-avatar"></div><div class="c-texto"><span class="c-pontos" aria-label="Pensando"><i></i><i></i><i></i></span></div></div>' : '';
  return itens + aguardando;
}

if (typeof module !== 'undefined') module.exports = { CHAT, mdLite, htmlMensagens, escHtml };
