'use strict';

const fs = require('node:fs');
const https = require('node:https');

// Atualizações dos apps (só aviso, TASK-027): o Hub lê as releases PÚBLICAS do GitHub de cada app e compara com a
// versão instalada. Nada é baixado nem instalado, e nenhum app é alterado. Sem Electron: testável com Node puro.
// Regras do aviso: docs/DECISOES.md, seção 14.

const limpar = (v) => String(v || '').trim().replace(/^v/i, '');
const partes = (v) => { const m = /^(\d+)\.(\d+)\.(\d+)/.exec(limpar(v)); return m ? m.slice(1).map(Number) : null; };

// 1 se a > b, -1 se a < b, 0 se iguais ou se alguma não for uma versão reconhecível.
function compararVersoes(a, b) {
  const x = partes(a), y = partes(b);
  if (!x || !y) return 0;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i] ? 1 : -1;
  return 0;
}

// Releases publicadas (sem rascunho nem pré-lançamento), da mais nova para a mais antiga.
function normalizarReleases(lista, max = 10) {
  if (!Array.isArray(lista)) return [];
  return lista
    .filter((r) => r && !r.draft && !r.prerelease && partes(r.tag_name))
    .map((r) => ({ versao: limpar(r.tag_name), nome: String(r.name || ''), data: r.published_at || null, notas: String(r.body || '').trim(), url: String(r.html_url || '') }))
    .sort((a, b) => compararVersoes(b.versao, a.versao))
    .slice(0, max);
}

// Lê as releases públicas do repositório (dono/repo). Sem token: repositórios privados respondem 404 e viram erro.
function buscarReleases(repo, { get = https.get, tempo = 8000 } = {}) {
  return new Promise((resolve, reject) => {
    const req = get({ host: 'api.github.com', path: `/repos/${repo}/releases?per_page=10`, headers: { 'User-Agent': 'Rocruzta-Hub', Accept: 'application/vnd.github+json' } }, (res) => {
      let corpo = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { corpo += c; if (corpo.length > 2e6) req.destroy(new Error('resposta grande demais')); });
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`GitHub respondeu ${res.statusCode}`));
        try { resolve(JSON.parse(corpo)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(tempo, () => req.destroy(new Error('tempo esgotado')));
  });
}

function criarAtualizacoes({ arquivo, buscar = buscarReleases, agora = Date.now }) {
  let estado = { apps: {}, cache: {} }; // apps: avisos por app; cache: último histórico lido (vale sem internet)
  try { const lido = JSON.parse(fs.readFileSync(arquivo, 'utf8')); if (lido && typeof lido === 'object') estado = { apps: lido.apps || {}, cache: lido.cache || {} }; } catch { /* primeira vez ou arquivo ilegível */ }
  const salvar = () => { try { fs.writeFileSync(arquivo, JSON.stringify(estado)); } catch { /* sem gravar: o aviso só não persiste */ } };

  // Consulta o GitHub de cada app com repositório. `instaladas`: { id: '0.3.5' }. Devolve true se algo visível mudou.
  async function checar(apps, instaladas) {
    let mudou = false;
    await Promise.all(apps.filter((a) => a.repositorio && !a.emBreve).map(async (a) => {
      let historico;
      try { historico = normalizarReleases(await buscar(a.repositorio)); } catch { return; } // sem rede ou repositório fechado: mantém o que já sabia
      const antes = JSON.stringify([estado.cache[a.id]?.historico, estado.apps[a.id]]);
      estado.cache[a.id] = { historico, checadoEm: agora() };
      const nova = historico[0];
      if (nova && instaladas[a.id] && compararVersoes(nova.versao, instaladas[a.id]) > 0) {
        if (estado.apps[a.id]?.versaoNova !== nova.versao) estado.apps[a.id] = { versaoNova: nova.versao, detectadoEm: agora(), visto: false, avisoFechado: false };
      } else delete estado.apps[a.id];
      if (antes !== JSON.stringify([estado.cache[a.id].historico, estado.apps[a.id]])) mudou = true;
    }));
    salvar();
    return mudou;
  }

  // Estado para a interface. `disponivel` é recalculado com a versão instalada de agora (atualizou: o aviso some sozinho).
  function listar(instaladas = {}) {
    const saida = {};
    for (const [id, c] of Object.entries(estado.cache)) {
      const av = estado.apps[id];
      const disponivel = Boolean(av && instaladas[id] && compararVersoes(av.versaoNova, instaladas[id]) > 0);
      saida[id] = { historico: c.historico, checadoEm: c.checadoEm, instalada: instaladas[id] || null, disponivel, ...(disponivel ? { versaoNova: av.versaoNova, detectadoEm: av.detectadoEm, visto: av.visto, avisoFechado: av.avisoFechado } : {}) };
    }
    return saida;
  }

  const alterar = (id, campo) => { if (estado.apps[id] && !estado.apps[id][campo]) { estado.apps[id][campo] = true; salvar(); return true; } return false; };
  return { checar, listar, marcarVisto: (id) => alterar(id, 'visto'), fecharAviso: (id) => alterar(id, 'avisoFechado') };
}

module.exports = { compararVersoes, normalizarReleases, buscarReleases, criarAtualizacoes };
