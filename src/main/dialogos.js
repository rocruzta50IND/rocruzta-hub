'use strict';

// Diálogos de arquivo pedidos por um app embutido (TASK-039). O app roda sem janela, então um diálogo aberto por ele nasce
// SEM DONO (janela solta na barra de tarefas). No contrato (docs/DECISOES.md §13) o app manda uma linha HUB_EVENT
// { evento: 'dialogo', id, metodo: 'abrir'|'salvar', opcoes } e o Hub abre o diálogo preso à janela do Hub, devolvendo a
// resposta pelo comando autenticado { canal: 'dialogo:resultado', id, canceled, filePaths | filePath }. Sem Electron: testável.

const PROPRIEDADES = new Set(['openFile', 'openDirectory', 'multiSelections', 'createDirectory', 'showHiddenFiles', 'promptToCreate']);
const texto = (v, max) => (typeof v === 'string' && v.length <= max ? v : undefined);

// O app não manda nada que o Hub não conheça: só campos simples e conhecidos.
function sanitizarOpcoes(opcoes) {
  const o = opcoes && typeof opcoes === 'object' ? opcoes : {};
  const saida = {};
  const title = texto(o.title, 120); if (title) saida.title = title;
  const defaultPath = texto(o.defaultPath, 1024); if (defaultPath) saida.defaultPath = defaultPath;
  const buttonLabel = texto(o.buttonLabel, 40); if (buttonLabel) saida.buttonLabel = buttonLabel;
  if (Array.isArray(o.properties)) saida.properties = o.properties.filter((p) => PROPRIEDADES.has(p));
  if (Array.isArray(o.filters)) {
    saida.filters = o.filters.slice(0, 10)
      .map((f) => ({ name: texto(f && f.name, 60) || 'Arquivos', extensions: (Array.isArray(f && f.extensions) ? f.extensions : []).filter((e) => typeof e === 'string' && /^[a-z0-9*]{1,10}$/i.test(e)).slice(0, 20) }))
      .filter((f) => f.extensions.length);
  }
  return saida;
}

// Trata o pedido de um app: abre o diálogo preso à janela do Hub e responde. `responder(corpo)` envia pelo /__cmd do app.
async function tratarPedido(ev, { dialog, janela, responder }) {
  if (!ev || !Number.isInteger(ev.id) || (ev.metodo !== 'abrir' && ev.metodo !== 'salvar')) return false;
  const w = janela && !janela.isDestroyed() ? janela : null;
  let r = { canceled: true };
  if (w) {
    try {
      if (w.isMinimized()) w.restore();
      w.show(); w.focus();
      const opcoes = sanitizarOpcoes(ev.opcoes);
      r = ev.metodo === 'salvar' ? await dialog.showSaveDialog(w, opcoes) : await dialog.showOpenDialog(w, opcoes);
    } catch { r = { canceled: true }; }
  }
  const corpo = { canal: 'dialogo:resultado', id: ev.id, canceled: Boolean(r.canceled) };
  if (!corpo.canceled) {
    if (ev.metodo === 'salvar') corpo.filePath = String(r.filePath || '');
    else corpo.filePaths = (Array.isArray(r.filePaths) ? r.filePaths : []).map(String);
  }
  await responder(corpo);
  return true;
}

module.exports = { sanitizarOpcoes, tratarPedido };
