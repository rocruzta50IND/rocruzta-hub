'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ordenarPorRecentes, registrarRecente, selecaoInicial, mover } = require('../src/renderer/troca');
const { classificarTecla } = require('../src/main/teclas');

const ids = (l) => l.map((x) => x.id);
const raiz = path.join(__dirname, '..');

test('ordenarPorRecentes: mais recente primeiro, nunca usados no fim na ordem original', () => {
  const itens = [{ id: 'hub' }, { id: 'termix' }, { id: 'desk' }, { id: 'midia' }];
  assert.deepEqual(ids(ordenarPorRecentes(itens, ['desk', 'hub'])), ['desk', 'hub', 'termix', 'midia']);
  assert.deepEqual(ids(ordenarPorRecentes(itens, [])), ['hub', 'termix', 'desk', 'midia']);
  assert.deepEqual(ids(ordenarPorRecentes(itens, undefined)), ['hub', 'termix', 'desk', 'midia']);
  assert.deepEqual(ids(ordenarPorRecentes(itens, ['inexistente', 'midia'])), ['midia', 'hub', 'termix', 'desk']);
});

test('registrarRecente: move para o início, sem duplicar, e limita o tamanho', () => {
  assert.deepEqual(registrarRecente(['hub', 'termix'], 'termix'), ['termix', 'hub']);
  assert.deepEqual(registrarRecente([], 'hub'), ['hub']);
  assert.deepEqual(registrarRecente(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
});

test('selecaoInicial e mover: abre no item anterior e dá a volta nos dois sentidos', () => {
  assert.equal(selecaoInicial(0), 0);
  assert.equal(selecaoInicial(1), 0);
  assert.equal(selecaoInicial(2), 1);
  assert.equal(selecaoInicial(5), 1);
  assert.equal(mover(1, 3), 2);
  assert.equal(mover(2, 3), 0);
  assert.equal(mover(0, 3, true), 2);
  assert.equal(mover(0, 0), 0);
});

test('Alt+Tab com Hub e Termix: dois Ctrl+Espaço seguidos voltam ao app de origem', () => {
  const lista = ordenarPorRecentes([{ id: 'hub' }, { id: 'termix' }], registrarRecente(['hub'], 'termix'));
  assert.deepEqual(ids(lista), ['termix', 'hub']);
  let sel = selecaoInicial(lista.length); // 1 = hub (o anterior)
  assert.equal(lista[sel].id, 'hub');
  sel = mover(sel, lista.length); // segundo Ctrl+Espaço
  assert.equal(lista[sel].id, 'termix');
});

test('classificarTecla: Ctrl+Espaço abre ou avança, Shift volta, soltar o Ctrl confirma', () => {
  const k = (o) => ({ type: 'keyDown', key: ' ', code: 'Space', control: true, shift: false, alt: false, meta: false, isAutoRepeat: false, ...o });
  assert.deepEqual(classificarTecla(k()), { acao: 'espaco', voltar: false, repeticao: false });
  assert.deepEqual(classificarTecla(k({ shift: true })), { acao: 'espaco', voltar: true, repeticao: false });
  assert.equal(classificarTecla(k({ isAutoRepeat: true })).repeticao, true);
  assert.deepEqual(classificarTecla({ type: 'keyUp', key: 'Control', code: 'ControlLeft' }), { acao: 'soltou' });
});

test('classificarTecla: ignora Espaço sem Ctrl, com Alt (AltGr no ABNT2) ou Meta, e outras teclas', () => {
  const k = (o) => ({ type: 'keyDown', key: ' ', code: 'Space', control: true, shift: false, alt: false, meta: false, ...o });
  assert.equal(classificarTecla(k({ control: false })), null);
  assert.equal(classificarTecla(k({ alt: true })), null);
  assert.equal(classificarTecla(k({ meta: true })), null);
  assert.equal(classificarTecla(k({ key: 'a', code: 'KeyA' })), null);
  assert.equal(classificarTecla({ type: 'keyUp', key: ' ', code: 'Space', control: true }), null);
  assert.equal(classificarTecla(null), null);
});

test('troca: teclas das telas dos apps no processo principal e as da página do Hub no renderer; sem atalho global e sem HTML inline', () => {
  const main = fs.readFileSync(path.join(raiz, 'src/main/main.js'), 'utf8');
  assert.doesNotMatch(main, /escutarTeclasDeTroca\(mainWindow\.webContents\)/); // na página do Hub o atalho é do renderer (os keyUp seriam engolidos)
  assert.match(main, /mainWindow\.webContents\.focus\(\)/);
  assert.match(main, /aoCriarView: escutarTeclasDeTroca/);
  assert.match(main, /before-input-event/);
  assert.doesNotMatch(main, /globalShortcut/);
  const emb = fs.readFileSync(path.join(raiz, 'src/main/embutido.js'), 'utf8');
  assert.match(emb, /aoCriarView\(wc\)/);
  assert.doesNotMatch(fs.readFileSync(path.join(raiz, 'src/renderer/index.html'), 'utf8'), /\sstyle="/);
});
