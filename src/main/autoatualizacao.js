'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { compararVersoes } = require('./atualizacoes');
const { ultimaRelease, escolherInstalador, lerSha512, lerTexto, baixar } = require('./instalacao');

// Atualização automática do PRÓPRIO Hub (TASK-034). Lê a última release pública do repositório do Hub, baixa o instalador
// em segundo plano (confere tamanho e sha512 do latest.yml) e o deixa pronto. Só instala quando a pessoa confirma:
// aí o Hub se fecha, o instalador roda em modo silencioso por cima e reabre o Hub (`--updated --force-run`, como o
// electron-updater faz). Sem Electron: testável com Node puro. Decisões em docs/DECISOES.md §18.

const REPOSITORIO = 'rocruzta50IND/rocruzta-hub';

function criarAutoAtualizacao({
  versaoAtual,
  repositorio = REPOSITORIO,
  pastaTemp = path.join(os.tmpdir(), 'rocruzta-hub-atualizacao'),
  aoMudar = () => {},
  opcoes,
  iniciar = (exe, args) => { const p = spawn(exe, args, { detached: true, stdio: 'ignore', windowsHide: true }); p.unref(); },
} = {}) {
  // fase: 'nenhuma' | 'baixando' | 'pronta' | 'erro'
  let estado = { fase: 'nenhuma', versao: null, progresso: 0 };
  let arquivo = null;
  let ocupado = false;
  const definir = (novo) => { estado = { ...estado, ...novo }; aoMudar({ ...estado }); };

  // Confere o GitHub e baixa se houver versão mais nova. Devolve o estado. Sem rede, nada muda (tenta de novo na próxima).
  async function checar() {
    if (ocupado || estado.fase === 'pronta') return { ...estado };
    ocupado = true;
    try {
      let rel;
      try { rel = await ultimaRelease(repositorio, opcoes); } catch { return { ...estado }; }
      if (compararVersoes(rel.versao, versaoAtual) <= 0) { if (estado.fase !== 'nenhuma') definir({ fase: 'nenhuma', versao: null, progresso: 0 }); return { ...estado }; }
      const asset = escolherInstalador(rel.assets);
      if (!asset) return { ...estado };
      fs.mkdirSync(pastaTemp, { recursive: true });
      const destino = path.join(pastaTemp, asset.nome);
      definir({ fase: 'baixando', versao: rel.versao, progresso: 0 });
      try {
        const baixado = await baixar(asset.url, destino, (p) => { estado.progresso = p; }, opcoes);
        if (asset.tamanho && baixado.tamanho !== asset.tamanho) throw new Error('tamanho');
        const yml = rel.assets.find((a) => /^latest\.yml$/i.test(a.nome));
        if (yml) {
          let esperado = null;
          try { esperado = lerSha512(await lerTexto(yml.url, opcoes), asset.nome); } catch { /* sem latest.yml legível: vale o tamanho */ }
          if (esperado && esperado !== baixado.sha512) throw new Error('hash');
        }
      } catch {
        try { fs.unlinkSync(destino); } catch { /* nada a apagar */ }
        definir({ fase: 'erro', progresso: 0 });
        return { ...estado };
      }
      arquivo = destino;
      definir({ fase: 'pronta', versao: rel.versao, progresso: 1 });
      return { ...estado };
    } finally { ocupado = false; }
  }

  // Lança o instalador já baixado. Quem chama fecha o Hub logo em seguida (o instalador espera o Hub sair).
  function aplicar() {
    if (estado.fase !== 'pronta' || !arquivo || !fs.existsSync(arquivo)) return { ok: false, motivo: 'nao-pronta' };
    try { iniciar(arquivo, ['/S', '--updated', '--force-run', '/currentuser']); } catch { return { ok: false, motivo: 'falha' }; }
    return { ok: true, versao: estado.versao };
  }

  return { checar, aplicar, estado: () => ({ ...estado }) };
}

module.exports = { REPOSITORIO, criarAutoAtualizacao };
