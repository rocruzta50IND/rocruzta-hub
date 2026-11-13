'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { sanitizarOpcoes, tratarPedido } = require('../src/main/dialogos');

test('diálogos: só passa campos simples e conhecidos', () => {
  const o = sanitizarOpcoes({ title: 'Pasta', defaultPath: 'C:/x', properties: ['openDirectory', 'multiSelections', 'executar'], filters: [{ name: 'Texto', extensions: ['txt', '../x', 'md'] }, { name: 'Vazio', extensions: ['..'] }], extra: () => 1 });
  assert.deepStrictEqual(o, { title: 'Pasta', defaultPath: 'C:/x', properties: ['openDirectory', 'multiSelections'], filters: [{ name: 'Texto', extensions: ['txt', 'md'] }] });
  assert.deepStrictEqual(sanitizarOpcoes(null), {});
  assert.strictEqual(sanitizarOpcoes({ title: 'x'.repeat(500) }).title, undefined);
});

function cenario(resposta) {
  const chamadas = [];
  const respostas = [];
  const janela = { isDestroyed: () => false, isMinimized: () => false, show() { chamadas.push('show'); }, focus() { chamadas.push('focus'); } };
  const dialog = {
    showOpenDialog: async (w, o) => { chamadas.push(['abrir', w === janela, o]); return resposta; },
    showSaveDialog: async (w, o) => { chamadas.push(['salvar', w === janela, o]); return resposta; },
  };
  return { chamadas, respostas, ctx: { dialog, janela, responder: async (c) => { respostas.push(c); return true; } } };
}

test('diálogos: abrir pasta fica preso à janela do Hub e devolve as pastas', async () => {
  const { chamadas, respostas, ctx } = cenario({ canceled: false, filePaths: ['C:/a', 'C:/b'] });
  assert.strictEqual(await tratarPedido({ evento: 'dialogo', id: 7, metodo: 'abrir', opcoes: { properties: ['openDirectory'] } }, ctx), true);
  assert.deepStrictEqual(chamadas.find((c) => Array.isArray(c)).slice(0, 2), ['abrir', true]);
  assert.deepStrictEqual(respostas, [{ canal: 'dialogo:resultado', id: 7, canceled: false, filePaths: ['C:/a', 'C:/b'] }]);
});

test('diálogos: salvar devolve o caminho; cancelar devolve só canceled', async () => {
  const salvar = cenario({ canceled: false, filePath: 'C:/x.txt' });
  await tratarPedido({ id: 1, metodo: 'salvar', opcoes: {} }, salvar.ctx);
  assert.deepStrictEqual(salvar.respostas, [{ canal: 'dialogo:resultado', id: 1, canceled: false, filePath: 'C:/x.txt' }]);
  const cancelar = cenario({ canceled: true, filePaths: [] });
  await tratarPedido({ id: 2, metodo: 'abrir', opcoes: {} }, cancelar.ctx);
  assert.deepStrictEqual(cancelar.respostas, [{ canal: 'dialogo:resultado', id: 2, canceled: true }]);
});

test('diálogos: pedido inválido é ignorado; sem janela ou com erro responde cancelado', async () => {
  const a = cenario({ canceled: false, filePaths: [] });
  assert.strictEqual(await tratarPedido({ id: 'x', metodo: 'abrir' }, a.ctx), false);
  assert.strictEqual(await tratarPedido({ id: 3, metodo: 'apagar' }, a.ctx), false);
  assert.deepStrictEqual(a.respostas, []);
  const semJanela = cenario({});
  await tratarPedido({ id: 4, metodo: 'abrir' }, { ...semJanela.ctx, janela: null });
  assert.deepStrictEqual(semJanela.respostas, [{ canal: 'dialogo:resultado', id: 4, canceled: true }]);
  const erro = cenario({});
  erro.ctx.dialog.showOpenDialog = async () => { throw new Error('x'); };
  await tratarPedido({ id: 5, metodo: 'abrir' }, erro.ctx);
  assert.deepStrictEqual(erro.respostas, [{ canal: 'dialogo:resultado', id: 5, canceled: true }]);
});
