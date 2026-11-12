'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { lerSaidaReg, pastaDoComando, comandoDesinstalar, versaoReal, lerVersaoPacote, acharApp, detectarApps } = require('../src/main/deteccao');
const { carregarCatalogo, urlReleases } = require('../src/main/apps');

const SAIDA = [
  '',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\{outro}',
  '    DisplayName    REG_SZ    Outro Programa',
  '    InstallLocation    REG_SZ    C:\\Outro',
  '',
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\52868943-b978-5394-a0e4-a5b93a0abd10',
  '    DisplayName    REG_SZ    Termix 0.3.7',
  '    DisplayVersion    REG_SZ    0.3.7',
  '    InstallLocation    REG_SZ    ',
  '    UninstallString    REG_SZ    "D:\\Termix\\Uninstall Termix.exe" /allusers',
  '',
].join('\r\n');

const det = { registro: 'Termix', executavel: 'Termix.exe' };

test('lerSaidaReg: separa as chaves e aceita valor vazio', () => {
  const e = lerSaidaReg(SAIDA);
  assert.equal(e.length, 2);
  assert.equal(e[1].valores.DisplayName, 'Termix 0.3.7');
  assert.equal(e[1].valores.InstallLocation, '');
  assert.equal(e[1].valores.UninstallString, '"D:\\Termix\\Uninstall Termix.exe" /allusers');
});

test('pastaDoComando: com aspas, sem aspas e inválidos', () => {
  assert.equal(pastaDoComando('"D:\\Termix\\Uninstall Termix.exe" /allusers'), 'D:\\Termix');
  assert.equal(pastaDoComando('C:\\Apps\\Meu\\unins000.exe /silent'), 'C:\\Apps\\Meu');
  assert.equal(pastaDoComando('MsiExec.exe /X{GUID}'), null);
  assert.equal(pastaDoComando(''), null);
  assert.equal(pastaDoComando(undefined), null);
});

test('acharApp: Termix com InstallLocation vazio, pasta deduzida do UninstallString', () => {
  const r = acharApp(lerSaidaReg(SAIDA), det, () => true);
  assert.deepEqual(r, { instalado: true, pasta: 'D:\\Termix', executavel: 'D:\\Termix\\Termix.exe', versao: '0.3.7', desinstalador: { exe: 'D:\\Termix\\Uninstall Termix.exe', args: ['/allusers'] } });
});

test('acharApp: usa InstallLocation quando existe', () => {
  const e = [{ chave: 'k', valores: { DisplayName: 'Termix', InstallLocation: 'E:\\Apps\\Termix' } }];
  assert.equal(acharApp(e, det, () => true).pasta, 'E:\\Apps\\Termix');
});

test('acharApp: não instalado quando não há entrada, o nome só parece ou o executável sumiu', () => {
  assert.deepEqual(acharApp([], det, () => true), { instalado: false });
  const parecido = [{ chave: 'k', valores: { DisplayName: 'Termix SSH Client', UninstallString: '"D:\\X\\u.exe"' } },
    { chave: 'k2', valores: { DisplayName: 'MeuTermix', UninstallString: '"D:\\Y\\u.exe"' } }];
  assert.equal(acharApp(parecido, { ...det, registro: 'Termi' }, () => true).instalado, false);
  assert.equal(acharApp(lerSaidaReg(SAIDA), det, () => false).instalado, false);
});

test('detectarApps: um estado por app do catálogo', async () => {
  const apps = carregarCatalogo().apps.filter((a) => !a.emBreve);
  const achou = await detectarApps(apps, async () => lerSaidaReg(SAIDA), () => true);
  assert.equal(achou.termix.instalado, true);
  const nao = await detectarApps(apps, async () => [], () => true);
  assert.deepEqual(nao, { termix: { instalado: false } });
});

test('urlReleases vem do repositório do catálogo', () => {
  assert.equal(urlReleases(carregarCatalogo().apps[0]), 'https://github.com/rocruzta50IND/termix/releases');
});

test('a detecção só lê o registro: sem instalar, escrever nem executar o app', () => {
  const js = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'deteccao.js'), 'utf8');
  assert.doesNotMatch(js, /'(add|delete|import)'|spawn\(|openPath|writeFile/);
  assert.match(js, /execFile\('reg\.exe', \['query'/);
});

test('renderer: Apps mostra "Não instalado" com botão de releases só quando a detecção disse', () => {
  const renderer = path.join(__dirname, '..', 'src', 'renderer');
  const read = (f) => fs.readFileSync(path.join(renderer, f), 'utf8');
  const rodar = (estados) => vm.runInNewContext(`${['icons.js', 'catalogo.js', 'inicio.js'].map(read).join('\n')}
    definirCatalogo(${JSON.stringify(carregarCatalogo())}); definirEstados(${JSON.stringify(estados)}); htmlApps();`);
  const nao = rodar({ termix: { instalado: false } });
  assert.match(nao, /Não instalado/);
  assert.match(nao, /data-releases="termix"/);
  assert.doesNotMatch(nao, /data-app="termix"/);
  for (const e of [{ termix: { instalado: true } }, null, {}]) {
    const html = rodar(e);
    assert.ok(!/Não instalado|data-releases/.test(html));
    assert.match(html, /<button class="btn pri" data-app="termix">Abrir/);
  }
  assert.ok(!/style=/.test(nao));
});

test('comandoDesinstalar: só .exe dentro da pasta do app e só /allusers ou /currentuser', () => {
  const W = path.win32;
  const pasta = 'D:\\Termix';
  const un = W.join(pasta, 'Uninstall Termix.exe');
  assert.deepEqual(comandoDesinstalar(`"${un}" /allusers`, pasta), { exe: un, args: ['/allusers'] });
  assert.deepEqual(comandoDesinstalar(`"${un}"`, pasta), { exe: un, args: [] });
  assert.equal(comandoDesinstalar('"C:\\Windows\\evil.exe" /allusers', pasta), null, 'fora da pasta do app');
  assert.equal(comandoDesinstalar(`"${un}" /S`, pasta), null, 'modo silencioso não vale');
  assert.equal(comandoDesinstalar(`"${un}" /allusers & calc`, pasta), null);
  assert.equal(comandoDesinstalar('"D:\\Termix2\\u.exe"', pasta), null, 'pasta parecida não conta');
  assert.equal(comandoDesinstalar('', pasta), null);
});

test('versaoReal: o código em disco manda quando é mais novo, e nunca rebaixa', () => {
  assert.equal(versaoReal('0.2.7', '0.7.0'), '0.7.0');
  assert.equal(versaoReal('0.7.0', '0.2.7'), '0.7.0');
  assert.equal(versaoReal('0.7.0', null), '0.7.0');
  assert.equal(versaoReal(null, '0.7.0'), '0.7.0');
  assert.equal(versaoReal(null, null), null);
  assert.equal(versaoReal('0.7.0', 'lixo'), '0.7.0');
});

test('acharApp: registro desatualizado (0.3.7) e código em disco 0.7.0 vira 0.7.0', () => {
  assert.equal(acharApp(lerSaidaReg(SAIDA), det, () => true, () => '0.7.0').versao, '0.7.0');
  assert.equal(acharApp(lerSaidaReg(SAIDA), det, () => true, () => null).versao, '0.3.7');
});

test('lerVersaoPacote: lê resources/app/package.json e ignora pasta sem ele', () => {
  const pasta = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'hub-det-'));
  try {
    assert.equal(lerVersaoPacote(pasta), null);
    fs.mkdirSync(path.join(pasta, 'resources', 'app'), { recursive: true });
    fs.writeFileSync(path.join(pasta, 'resources', 'app', 'package.json'), '{"version":"0.7.0"}');
    assert.equal(lerVersaoPacote(pasta), '0.7.0');
    fs.writeFileSync(path.join(pasta, 'resources', 'app', 'package.json'), 'quebrado');
    assert.equal(lerVersaoPacote(pasta), null);
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});
