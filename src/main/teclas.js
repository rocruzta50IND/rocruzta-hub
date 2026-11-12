'use strict';

// Teclas de troca rápida entre apps (TASK-030). Valem só com a janela do Hub em foco, mas o foco do teclado
// costuma estar DENTRO da tela de um app embutido, então quem escuta é o processo principal (before-input-event),
// em cada tela, e não a página do Hub.
//
// Ctrl+Espaço abre o painel e cada novo Ctrl+Espaço avança (com Shift volta). Soltar o Ctrl confirma, como o Alt+Tab.
// Sem Alt nem Meta: Ctrl+Alt é AltGr no ABNT2 (ver docs/DECISOES.md, seção 5).

// Recebe o `input` do Electron ({ type, key, code, control, shift, alt, meta, isAutoRepeat }).
// Devolve { acao: 'espaco', voltar, repeticao } | { acao: 'soltou' } | null.
function classificarTecla(input) {
  if (!input || typeof input !== 'object') return null;
  if (input.type === 'keyUp' && input.key === 'Control') return { acao: 'soltou' };
  if (input.type !== 'keyDown') return null;
  const espaco = input.code === 'Space' || input.key === ' ';
  if (!espaco || !input.control || input.alt || input.meta) return null;
  return { acao: 'espaco', voltar: Boolean(input.shift), repeticao: Boolean(input.isAutoRepeat) };
}

module.exports = { classificarTecla };
