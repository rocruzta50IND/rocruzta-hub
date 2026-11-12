'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { interpretar, argumentos, localizarClaude, candidatos, MODELO } = require('../src/main/conversa');

test('chat do Início: modelo mais barato (Haiku), sem ferramentas e sem histórico em disco', () => {
  assert.equal(MODELO, 'haiku');
  const a = argumentos();
  assert.equal(a[a.indexOf('--model') + 1], 'haiku');
  assert.equal(a[a.indexOf('--tools') + 1], '', 'sem ferramentas');
  assert.ok(a.includes('--no-session-persistence'), 'nada fica guardado pelo Claude Code');
  assert.ok(a.includes('--strict-mcp-config') && a.includes('--disable-slash-commands'));
  assert.ok(!a.includes('--dangerously-skip-permissions'));
});

test('chat do Início: interpreta só o texto que chega e o fim da resposta', () => {
  assert.deepEqual(interpretar({ type: 'stream_event', event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'oi' } } }), { tipo: 'delta', texto: 'oi' });
  assert.equal(interpretar({ type: 'stream_event', event: { type: 'message_start' } }), null);
  assert.equal(interpretar({ type: 'assistant', message: {} }), null);
  assert.deepEqual(interpretar({ type: 'result', is_error: false, result: 'ok' }), { tipo: 'fim' });
  assert.deepEqual(interpretar({ type: 'result', is_error: true, result: 'sem login' }), { tipo: 'fim', erro: 'sem login' });
  assert.equal(interpretar(null), null);
});

test('chat do Início: procura o Claude Code no PATH e nos lugares comuns', () => {
  const env = { PATH: ['C:\\a', 'C:\\b'].join(path.delimiter), APPDATA: 'C:\\Users\\u\\AppData\\Roaming', LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' };
  const lista = candidatos(env, 'C:\\Users\\u');
  assert.equal(lista[0], path.join('C:\\a', 'claude.exe'));
  assert.ok(lista.includes(path.join('C:\\Users\\u', '.local', 'bin', 'claude.exe')));
  assert.equal(localizarClaude((p) => p === path.join('C:\\b', 'claude.exe'), env, 'C:\\Users\\u'), path.join('C:\\b', 'claude.exe'));
  assert.equal(localizarClaude(() => false, env, 'C:\\Users\\u'), null);
});
