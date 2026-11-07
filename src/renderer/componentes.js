'use strict';

// Só para a página de amostra: ?theme=light troca o tema.
const theme = new URLSearchParams(location.search).get('theme');
if (theme === 'light') document.documentElement.dataset.theme = 'light';

aplicarCores();
