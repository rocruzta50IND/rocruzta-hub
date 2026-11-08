'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Catálogo de apps do Hub: lê e valida o apps.json. Sem dependência do Electron (testável com Node puro).
// Como um app entra: docs/DECISOES.md, seção 11.
const ARQUIVO = path.join(__dirname, '..', 'apps.json');

const TEXTOS = ['id', 'nome', 'grupo', 'icone', 'desc'];

function validarCatalogo(dados) {
  const erros = [];
  if (!dados || typeof dados !== 'object') return ['catálogo não é um objeto'];
  const { grupos, apps } = dados;
  if (!Array.isArray(grupos) || grupos.some((g) => typeof g !== 'string' || !g)) erros.push('"grupos" deve ser uma lista de textos');
  if (!Array.isArray(apps)) return [...erros, '"apps" deve ser uma lista'];
  const ids = new Set();
  apps.forEach((a, i) => {
    const nome = `app ${i + 1}${a && a.id ? ` (${a.id})` : ''}`;
    if (!a || typeof a !== 'object') { erros.push(`${nome}: não é um objeto`); return; }
    for (const campo of TEXTOS) if (typeof a[campo] !== 'string' || !a[campo]) erros.push(`${nome}: falta "${campo}"`);
    if (ids.has(a.id)) erros.push(`${nome}: id repetido`);
    ids.add(a.id);
    if (Array.isArray(grupos) && !grupos.includes(a.grupo)) erros.push(`${nome}: grupo "${a.grupo}" não existe em "grupos"`);
    if (typeof a.cor !== 'string' || !/^#[0-9a-f]{6}$/i.test(a.cor)) erros.push(`${nome}: "cor" deve ser #rrggbb`);
    if (typeof a.repositorio !== 'string' || !/^[\w.-]+\/[\w.-]+$/.test(a.repositorio)) erros.push(`${nome}: "repositorio" deve ser dono/repo do GitHub`);
    const d = a.deteccao;
    if (!d || typeof d !== 'object') erros.push(`${nome}: falta "deteccao"`);
    else for (const campo of ['registro', 'executavel']) if (typeof d[campo] !== 'string' || !d[campo]) erros.push(`${nome}: falta "deteccao.${campo}"`);
  });
  return erros;
}

function carregarCatalogo(arquivo = ARQUIVO) {
  const dados = JSON.parse(fs.readFileSync(arquivo, 'utf8'));
  const erros = validarCatalogo(dados);
  if (erros.length) throw new Error(`apps.json inválido:\n- ${erros.join('\n- ')}`);
  return dados;
}

const urlReleases = (app) => `https://github.com/${app.repositorio}/releases`;

module.exports = { ARQUIVO, validarCatalogo, carregarCatalogo, urlReleases };
