'use strict';
// Confere o contrato de tema entre o Hub e o Termix (TASK-036). Uso: node tools/verificar-tema-termix.js [pasta do Termix]
// Sem argumento usa HUB_TERMIX_DEV ou C:/Termix/termix. Serve também para o Termix instalado: ...\Programs\Termix\resources\app
// Falha (exit 1) se o Termix deixou de ter alguma variável que o Hub controla; as cores fixas são só um aviso.
const fs = require('node:fs');
const path = require('node:path');
const { variaveisDoTema, lerCssDoApp, verificarTema } = require('../src/main/tema-contrato');

const pasta = process.argv[2] || process.env.HUB_TERMIX_DEV || 'C:/Termix/termix';
const cssHub = fs.readFileSync(path.join(__dirname, '..', 'src', 'temas-apps', 'termix.css'), 'utf8');
const cssApp = lerCssDoApp(pasta);
if (!cssApp.length) { console.log(`FALHOU nenhum .css em ${pasta}`); process.exit(1); }
const r = verificarTema(cssHub, cssApp);
console.log(`Termix em ${pasta}: ${cssApp.length} arquivos .css`);
console.log(`${r.faltando.length ? 'FALHOU' : 'OK    '} ${r.variaveis.length - r.faltando.length}/${r.variaveis.length} variáveis do Hub existem no Termix${r.faltando.length ? ` -> faltam: ${r.faltando.join(', ')}` : ''}`);
console.log(`${r.coresFixas.length ? 'AVISO ' : 'OK    '} ${r.coresFixas.length} declarações de cor fixa (não acompanham o tema claro)`);
for (const c of r.coresFixas.slice(0, 15)) console.log(`        ${c.arquivo}:${c.linha}`);
if (r.coresFixas.length > 15) console.log(`        ... e mais ${r.coresFixas.length - 15}`);
process.exit(r.faltando.length ? 1 : 0);
