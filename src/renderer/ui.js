'use strict';

// A CSP do Hub (style-src 'self') bloqueia o atributo style="". Para dar cor a um glyph, avatar,
// pill ou capa, use data-c="#3b82f6" no HTML e chame aplicarCores(); ela define --c via CSSOM,
// que a CSP permite. Chame de novo depois de inserir elementos novos.
function aplicarCores(root = document) {
  for (const el of root.querySelectorAll('[data-c]')) {
    el.style.setProperty('--c', el.dataset.c);
  }
}
