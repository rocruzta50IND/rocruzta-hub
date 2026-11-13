'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Contrato de tema entre o Hub e um app embutido (TASK-036, docs/DECISOES.md §19). O Hub injeta src/temas-apps/<id>.css, que só
// REDEFINE variáveis de cor do app (--text, --border...). Estas funções leem esse CSS e o CSS do app e dizem se as variáveis
// que o Hub controla ainda existem no app. Sem Electron: testável com Node puro.

// Variáveis (--nome) que o CSS do Hub redefine dentro de blocos html[data-hub-theme=...].
function variaveisDoTema(css) {
  const nomes = new Set();
  for (const bloco of String(css || '').matchAll(/html\[data-hub-theme[^\]]*\][^{]*\{([^}]*)\}/g)) {
    for (const m of bloco[1].matchAll(/(^|[;\s])(--[a-z0-9-]+)\s*:/gi)) nomes.add(m[2]);
  }
  return [...nomes].sort();
}

// Todos os .css do app (sem node_modules nem build), com o texto lido.
function lerCssDoApp(pasta, profundidade = 4) {
  const achados = [];
  const andar = (dir, nivel) => {
    let itens;
    try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const i of itens) {
      if (i.name === 'node_modules' || i.name === 'dist' || i.name === '.git') continue;
      const p = path.join(dir, i.name);
      if (i.isDirectory()) { if (nivel < profundidade) andar(p, nivel + 1); } else if (/\.css$/i.test(i.name)) {
        try { achados.push({ arquivo: path.relative(pasta, p), texto: fs.readFileSync(p, 'utf8') }); } catch { /* ilegível: ignora */ }
      }
    }
  };
  andar(pasta, 0);
  return achados;
}

// Compara o que o Hub controla com o CSS do app. `faltando`: variáveis que o app não menciona mais (o Hub manda um valor que
// ninguém usa). `coresFixas`: declarações de cor escritas direto (#hex, rgb()) fora de definições de variável: não acompanham o tema.
function verificarTema(cssHub, cssDoApp) {
  const variaveis = variaveisDoTema(cssHub);
  const todo = cssDoApp.map((c) => c.texto).join('\n');
  const faltando = variaveis.filter((v) => !new RegExp(`${v.replace(/[-]/g, '\-')}(?![a-z0-9-])`, 'i').test(todo));
  const coresFixas = [];
  for (const { arquivo, texto } of cssDoApp) {
    texto.split('\n').forEach((linha, i) => {
      const sem = linha.replace(/\/\*.*?\*\//g, '');
      if (/(^|[;{\s])--[a-z0-9-]+\s*:/i.test(sem)) return; // definição de variável: é o lugar certo para ter cor
      if (/(?:^|[;{\s])(?:color|background(?:-color)?|border(?:-[a-z]+)*|outline|fill|stroke|box-shadow)\s*:[^;]*(#[0-9a-f]{3,8}\b|rgba?\()/i.test(sem)) coresFixas.push({ arquivo, linha: i + 1 });
    });
  }
  return { variaveis, faltando, coresFixas };
}

module.exports = { variaveisDoTema, lerCssDoApp, verificarTema };
