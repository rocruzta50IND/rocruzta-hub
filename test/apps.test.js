'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { ARQUIVO, validarCatalogo, carregarCatalogo } = require('../src/main/apps');
const { ICONES } = require('../src/renderer/icons');

const base = () => JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));

test('apps.json: válido e só com o Termix', () => {
  const dados = carregarCatalogo();
  assert.deepEqual(dados.apps.map((a) => a.id), ['termix']);
  const t = dados.apps[0];
  assert.equal(t.repositorio, 'rocruzta50IND/termix');
  assert.equal(t.deteccao.registro, 'Termix');
  assert.equal(t.deteccao.executavel, 'Termix.exe');
  for (const a of dados.apps) assert.ok(ICONES[a.icone], `${a.id}: ícone ${a.icone} ausente`);
});

test('validação: rejeita campos faltando, id repetido, grupo, cor e repositório inválidos', () => {
  const d = base();
  d.apps.push({ ...d.apps[0] }); // id repetido
  d.apps.push({ ...d.apps[0], id: 'x', grupo: 'Outro', cor: 'azul', repositorio: 'sem-barra' });
  const erros = validarCatalogo(d).join('\n');
  assert.match(erros, /id repetido/);
  assert.match(erros, /grupo "Outro"/);
  assert.match(erros, /"cor"/);
  assert.match(erros, /"repositorio"/);
  const sem = base();
  delete sem.apps[0].deteccao;
  assert.match(validarCatalogo(sem).join('\n'), /falta "deteccao"/);
  assert.ok(validarCatalogo(null).length);
  assert.ok(validarCatalogo({ grupos: [] }).length);
});

test('adicionar um app é só editar o JSON: grupo novo e app novo aparecem no catálogo', () => {
  const d = base();
  d.grupos.push('Extra');
  d.apps.push({ ...d.apps[0], id: 'novo', nome: 'Novo', grupo: 'Extra', repositorio: 'rocruzta50IND/novo' });
  assert.deepEqual(validarCatalogo(d), []);
  const tmp = path.join(require('node:os').tmpdir(), `apps-${process.pid}.json`);
  fs.writeFileSync(tmp, JSON.stringify(d));
  try { assert.equal(carregarCatalogo(tmp).apps.length, 2); } finally { fs.unlinkSync(tmp); }
  assert.throws(() => carregarCatalogo(path.join(__dirname, 'nao-existe.json')));
});

test('definirCatalogo preenche GRUPOS e APPS no lugar', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'catalogo.js'), 'utf8');
  const r = vm.runInNewContext(`${js}\nconst ref = APPS;\ndefinirCatalogo(${JSON.stringify(base())});\n({ mesmo: ref === APPS, n: APPS.length, g: GRUPOS.length })`);
  assert.equal(r.mesmo, true);
  assert.equal(r.n, 1);
  assert.equal(r.g, 3);
});

test('não há lista de apps escrita no renderer nem apps fora do catálogo', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'catalogo.js'), 'utf8');
  assert.doesNotMatch(js, /termix/i);
});
