'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizar, criarCentral, deveAvisarWindows } = require('../src/main/notificacoes');

const ev = (extra = {}) => ({ tipo: 'done', tabId: 't1', quem: 'Hub', msg: 'Terminou', ts: 1000, ...extra });

test('normalizar: só aceita os tipos conhecidos e exige a aba', () => {
  assert.equal(normalizar('termix', ev({ tipo: 'qualquer' })), null);
  assert.equal(normalizar('termix', ev({ tabId: '' })), null);
  assert.equal(normalizar('termix', null), null);
  assert.deepEqual(normalizar('termix', ev()), { appId: 'termix', tabId: 't1', quem: 'Hub', tipo: 'done', msg: 'Terminou', ts: 1000 });
});

test('normalizar: limita tamanho e tira caracteres de controle', () => {
  const r = normalizar('termix', ev({ msg: 'a\u0000b\nc' + 'x'.repeat(500), quem: 'q'.repeat(200) }));
  assert.equal(r.msg.length, 300);
  assert.ok(!/[\u0000-\u001f]/.test(r.msg));
  assert.equal(r.quem.length, 80);
});

test('central: mais nova primeiro, conta pendentes e limita a lista', () => {
  const c = criarCentral(3);
  for (let i = 1; i <= 5; i++) c.adicionar('termix', ev({ msg: `m${i}` }));
  const l = c.listar();
  assert.deepEqual(l.map((x) => x.msg), ['m5', 'm4', 'm3']);
  assert.equal(c.pendentes(), 3);
  c.marcarVistas();
  assert.equal(c.pendentes(), 0);
  assert.equal(c.adicionar('termix', { tipo: 'lixo' }), null);
  assert.equal(c.obter(l[0].id).msg, 'm5');
  assert.equal(c.obter(999), null);
});

test('deveAvisarWindows: só quando a pessoa não está olhando para o app que avisou', () => {
  assert.equal(deveAvisarWindows({ janelaEmFoco: false, appVisivel: 'termix', appId: 'termix' }), true);
  assert.equal(deveAvisarWindows({ janelaEmFoco: true, appVisivel: null, appId: 'termix' }), true);
  assert.equal(deveAvisarWindows({ janelaEmFoco: true, appVisivel: 'termix', appId: 'termix' }), false);
});
