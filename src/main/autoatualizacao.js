'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { compararVersoes } = require('./atualizacoes');
const { ultimaRelease, escolherInstalador, lerSha512, lerTexto, baixar } = require('./instalacao');

// Atualização automática do PRÓPRIO Hub (TASK-034, refeita na TASK-045). Lê a última release pública do repositório do Hub
// e avisa que há versão nova (fase 'disponivel'). Quando a pessoa clica em Atualizar:
//   baixando (confere tamanho e sha512 do latest.yml) -> preparando (extrai o instalador numa pasta de preparo, com o Hub em uso)
//   -> pronta. Aí o Hub se fecha, o script de troca renomeia os arquivos e reabre o Hub quase na hora ('troca').
// Se a preparação não for possível (app fora do instalado, sem o 7za, sem espaço), cai no caminho antigo: o instalador roda
// em modo silencioso por cima e reabre o Hub ('instalador'). Sem Electron: testável com Node puro. Decisões em docs/DECISOES.md §18 e §20.

const REPOSITORIO = 'rocruzta50IND/rocruzta-hub';
const PESO_DOWNLOAD = 0.7; // o download vale 70% da barra; a preparação, os outros 30%

function criarAutoAtualizacao({
  versaoAtual,
  repositorio = REPOSITORIO,
  pastaTemp = path.join(os.tmpdir(), 'rocruzta-hub-atualizacao'),
  aoMudar = () => {},
  opcoes,
  // Extrai o instalador baixado para uma pasta de preparo. Devolve { dir, manterExe } ou null (aí vale o instalador).
  preparar = null,
  // Fecha o ciclo pelo caminho rápido: lança a troca de arquivos. Devolve true/false.
  iniciarTroca = () => false,
  iniciar = (exe, args) => { const p = spawn(exe, args, { detached: true, stdio: 'ignore', windowsHide: true }); p.unref(); },
} = {}) {
  // fase: 'nenhuma' | 'disponivel' | 'baixando' | 'preparando' | 'pronta' | 'erro'. progresso: 0..1 da barra inteira.
  let estado = { fase: 'nenhuma', versao: null, progresso: 0, modo: null };
  let release = null; // { versao, asset, yml } da última release mais nova
  let arquivo = null;
  let preparo = null;
  let ocupado = false;
  let rodando = null; // promessa da atualização em andamento
  // Já estamos na versão da release: o instalador que sobrou da atualização (o instalador ainda o usava ao rodar) pode sair.
  const limparTemp = () => { try { for (const f of fs.readdirSync(pastaTemp)) fs.unlinkSync(path.join(pastaTemp, f)); } catch { /* pasta inexistente ou arquivo em uso */ } };
  const definir = (novo) => { estado = { ...estado, ...novo }; aoMudar({ ...estado }); };
  let ultimoEnviado = -1;
  const progredir = (p) => { // avisa a interface a cada 1% (a barra anda sem inundar a janela)
    estado.progresso = p;
    if (Math.abs(p - ultimoEnviado) >= 0.01) { ultimoEnviado = p; aoMudar({ ...estado }); }
  };

  // Confere o GitHub e avisa se houver versão mais nova. Não baixa nada. Sem rede, nada muda (tenta de novo na próxima).
  async function checar() {
    if (ocupado || ['baixando', 'preparando', 'pronta'].includes(estado.fase)) return { ...estado };
    ocupado = true;
    try {
      let rel;
      try { rel = await ultimaRelease(repositorio, opcoes); } catch { return { ...estado }; }
      if (compararVersoes(rel.versao, versaoAtual) <= 0) {
        limparTemp(); release = null;
        if (estado.fase !== 'nenhuma') definir({ fase: 'nenhuma', versao: null, progresso: 0, modo: null });
        return { ...estado };
      }
      const asset = escolherInstalador(rel.assets);
      if (!asset) return { ...estado };
      release = { versao: rel.versao, asset, yml: rel.assets.find((a) => /^latest\.yml$/i.test(a.nome)) || null };
      if (estado.fase === 'nenhuma' || estado.versao !== rel.versao) definir({ fase: 'disponivel', versao: rel.versao, progresso: 0, modo: null });
      return { ...estado };
    } finally { ocupado = false; }
  }

  async function executar() {
    const { versao, asset, yml } = release;
    fs.mkdirSync(pastaTemp, { recursive: true });
    const destino = path.join(pastaTemp, asset.nome);
    ultimoEnviado = -1;
    definir({ fase: 'baixando', versao, progresso: 0, modo: null });
    try {
      const baixado = await baixar(asset.url, destino, (p) => progredir(p * PESO_DOWNLOAD), opcoes);
      if (asset.tamanho && baixado.tamanho !== asset.tamanho) throw new Error('tamanho');
      if (yml) {
        let esperado = null;
        try { esperado = lerSha512(await lerTexto(yml.url, opcoes), asset.nome); } catch { /* sem latest.yml legível: vale o tamanho */ }
        if (esperado && esperado !== baixado.sha512) throw new Error('hash');
      }
    } catch {
      try { fs.unlinkSync(destino); } catch { /* nada a apagar */ }
      definir({ fase: 'erro', progresso: 0, modo: null });
      return { ...estado };
    }
    arquivo = destino;
    // Preparação: extrai o instalador para trocar os arquivos num instante. Falhou ou não dá: segue pelo instalador.
    let prep = null;
    if (preparar) {
      ultimoEnviado = -1;
      definir({ fase: 'preparando', progresso: PESO_DOWNLOAD });
      try { prep = await preparar(arquivo, versao, (pc) => progredir(PESO_DOWNLOAD + (1 - PESO_DOWNLOAD) * Math.min(100, pc) / 100)); } catch { prep = null; }
    }
    preparo = prep || null;
    definir({ fase: 'pronta', versao, progresso: 1, modo: preparo ? 'troca' : 'instalador' });
    return { ...estado };
  }

  // Clique em Atualizar: baixa, confere e prepara. Resolve com o estado final ('pronta' ou 'erro'). Chamadas repetidas esperam a mesma.
  async function atualizar() {
    if (rodando) return rodando;
    if (estado.fase === 'pronta') return { ...estado };
    if (!release) await checar();
    if (!release) { if (estado.fase !== 'erro') definir({ fase: 'erro', progresso: 0 }); return { ...estado }; }
    rodando = executar().finally(() => { rodando = null; });
    return rodando;
  }

  // Fecha o ciclo: lança a troca de arquivos (ou o instalador). Quem chama fecha o Hub logo em seguida.
  function aplicar() {
    if (estado.fase !== 'pronta') return { ok: false, motivo: 'nao-pronta' };
    if (estado.modo === 'troca' && preparo) {
      let ok = false;
      try { ok = iniciarTroca(preparo); } catch { ok = false; }
      if (ok) return { ok: true, versao: estado.versao, modo: 'troca' };
      // a troca não pôde ser lançada: o instalador baixado ainda resolve
    }
    if (!arquivo || !fs.existsSync(arquivo)) return { ok: false, motivo: 'nao-pronta' };
    try { iniciar(arquivo, ['/S', '--updated', '--force-run', '/currentuser']); } catch { return { ok: false, motivo: 'falha' }; }
    return { ok: true, versao: estado.versao, modo: 'instalador' };
  }

  return { checar, atualizar, aplicar, estado: () => ({ ...estado }) };
}

// Para ver a faixa e a barra sem uma release de verdade (HUB_ATUALIZACAO_FALSA=1): mesma interface, sem rede nem arquivos.
function criarAutoAtualizacaoFalsa({ aoMudar = () => {}, versao = '9.9.9', passoMs = 120 } = {}) {
  let estado = { fase: 'nenhuma', versao: null, progresso: 0, modo: null };
  const definir = (n) => { estado = { ...estado, ...n }; aoMudar({ ...estado }); };
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  return {
    async checar() { if (estado.fase === 'nenhuma') definir({ fase: 'disponivel', versao }); return { ...estado }; },
    async atualizar() {
      if (estado.fase === 'pronta') return { ...estado };
      definir({ fase: 'baixando', progresso: 0 });
      for (let p = 0; p <= 100; p += 2) { definir({ progresso: p / 100 * PESO_DOWNLOAD }); await dormir(passoMs / 2); }
      definir({ fase: 'preparando' });
      for (let p = 0; p <= 100; p += 4) { definir({ progresso: PESO_DOWNLOAD + (1 - PESO_DOWNLOAD) * p / 100 }); await dormir(passoMs / 2); }
      definir({ fase: 'pronta', progresso: 1, modo: 'troca' });
      return { ...estado };
    },
    aplicar() { return { ok: true, versao, modo: 'troca', falso: true }; },
    estado: () => ({ ...estado }),
  };
}

module.exports = { REPOSITORIO, criarAutoAtualizacao, criarAutoAtualizacaoFalsa };
