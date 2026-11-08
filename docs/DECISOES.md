# Decisões do Rocruzta Hub

Registro do que foi decidido e do que se sabe. Leia só a seção que a tarefa exige.

## 1. Modelo (decidido em 2026-11-07)

- O Hub é o **centro e o lançador** dos apps da Rocruzta. Cada app é independente: repositório, processo, janela e atualização próprios.
- Os apps **não usam recursos nem processos do Hub**, e o Hub não usa os deles. O Hub só facilita a navegação.
- **Descartado:** módulos embutidos, ponte `hubApi`, manifesto de módulo, registro de versões e apps dentro da janela do Hub. Motivos: exigiriam refatorar o Termix e acoplariam as versões do Hub e dos apps. Prender a janela de um app dentro da janela do Hub é frágil e quebra o vidro do Termix.
- O Hub faz: catálogo de apps (`apps.json`), detectar se o app está instalado, abrir e focar, mostrar "Em execução", seletor global por atalho e ícone na bandeja. **Depois (fora da v1):** instalar e atualizar apps pelas releases do GitHub.
- Só Windows. Repositórios dos apps públicos por enquanto, privados no futuro.
- Se um dia o usuário quiser apps dentro da janela do Hub, é um experimento novo (TASK de estudo no Backlog).

## 2. Repositório

- O Hub tem repositório próprio desde o início, com o fluxo DEV2 → DEV1 → MAIN (`WORKFLOW.md`).
- **Ainda sem GitHub.** O `origin` é um repositório local em `D:\Termix\_origins\rocruzta-hub.git`, só para o fluxo (push das tarefas) funcionar e servir de backup. Quando for publicar: criar o repo no GitHub e rodar `git remote set-url origin <url>` (TASK no Backlog).
- Identidade de commit local: `Rocruzta DEV1 <dev1@rocruzta.com.br>` (trocar com `git config --local` se quiser outro nome).

## 3. Termix (primeiro app)

Fatos verificados nesta máquina em 2026-11-07:

- É o app Electron **da Rocruzta**, v0.3.7 ("central de sessões de agentes de programação em terminal"). **Não** é o projeto open source Termix SSH, que só serviu de referência no início.
- Repositório e releases: `github.com/rocruzta50IND/termix` (o `app-update.yml` aponta para lá). Ele se atualiza sozinho (`electron-updater`).
- Instalado **para todos os usuários**, em `D:\Termix`. No registro do Windows (HKLM, Uninstall) aparece como "Termix 0.3.7", com `UninstallString` = `"D:\Termix\Uninstall Termix.exe" /allusers`. O `InstallLocation` vem **vazio**, então a pasta se deduz do `UninstallString`.
- Identificador de app do Windows: `com.termix.app`.
- Trava de instância única (`requestSingleInstanceLock`) e evento `second-instance` que restaura e foca a janela. **Abrir o executável de novo = trazer a janela existente para a frente.**
- O botão **Clear** do Termix usa o fluxo Rocruzta: fecha a tarefa (valida, edita só a entrada ativa do `TASKS.md`, atualiza o `CHANGELOG_DEV.md`, faz commit e push), manda `/clear` e a retomada lê o mínimo. Por isso o `origin` precisa existir.
- Extras opcionais para depois, que mexem no Termix (só com aprovação): botão "← Hub" e identificador de app comum.

## 4. Navegação entre apps: o que já se sabe

Laboratório em `D:\Termix\rocruzta-hub-lab` (Hub Electron e 3 apps de teste com processo próprio):

- Com teclado real, o atalho global abre o seletor por cima do app em foco e o seletor recebe o foco.
- Abrir o app de novo não cria segundo processo.
- **Não provado:** trazer a janela de outro app para a frente de forma confiável. O Windows bloqueia roubo de foco sem entrada real do usuário, e em um teste o seletor não conseguiu foco vindo de uma janela de app de teste. O teste automático teve erro (o título da janela era sobrescrito pela página) e ficou inconclusivo. **Meça antes de afirmar que funciona.** Se falhar: `AllowSetForegroundWindow`, truque da tecla Alt via script auxiliar, abrir o app de novo no momento da entrada do usuário.
- Ler a janela em primeiro plano: `GetForegroundWindow` via PowerShell, com `-ExecutionPolicy Bypass` só na chamada (a política do sistema bloqueia `-File`).

## 5. Atalhos

- **Não registrar `Ctrl+Alt+1..9` como atalho global.** No teclado ABNT2, Ctrl+Alt é AltGr e isso roubaria caracteres (², ³, £, ¢, ¬) nos outros programas.
- Atalho do seletor: `Ctrl+Alt+Espaço`, configurável.
- Atalhos dentro do Hub (teclas 1 a 6, Esc) só valem com a janela do Hub em foco e fora de campos de texto.

## 6. Stack sugerida para a v1 (confirmar na TASK-002)

Electron (estável atual), HTML, CSS e JS puros em arquivos, sem framework nem build no início. `contextIsolation` ligado, sem `nodeIntegration`, preload com API mínima. Janela sem moldura com barra de título própria. Instância única. Identificador de app: `com.rocruzta.hub`. Dados do usuário em `%APPDATA%\Rocruzta Hub`. Fonte Inter embutida no app (sem depender de CDN).

## 7. Critérios de aceite da troca entre apps (TASK-013)

Testar com o Termix real e 2 apps de teste, medindo com ferramentas:

1. De dentro do Termix, o atalho global abre o seletor do Hub e ele recebe o foco.
2. Do seletor, escolher o Termix traz a janela dele para a frente, sem segundo processo.
3. Do seletor, escolher o Hub traz o Hub para a frente.
4. Com 2 apps abertos, alternar entre eles e o Hub dezenas de vezes sem perder foco nem duplicar processos.
5. Fechar a janela do Hub o mantém na bandeja; "Sair" encerra o Hub sem tocar nos apps abertos.
6. O estado "Em execução" bate com a realidade (abrir e fechar o Termix muda o selo em poucos segundos).
7. O Hub funciona com o Termix desinstalado (mostra "Não instalado") e com ele aberto.

Encerrar os processos de teste ao terminar e confirmar que nada ficou rodando.

## 8. Fora do escopo da v1

Instalar ou atualizar apps pelo GitHub, login, backend, API real de notícias, abrir apps dentro da janela do Hub, mexer no Termix, repositórios privados, notificações vindas dos apps.

## 9. CSS e CSP (TASK-003)

- A CSP do renderer é `default-src 'self'; style-src 'self'; script-src 'self'; font-src 'self'`. Ela bloqueia `style="..."` e scripts inline. Cor por elemento (`--c`) vai em `data-c="#hex"` e `aplicarCores()` (`src/renderer/ui.js`) a aplica via CSSOM, que a CSP permite. Não relaxar para `'unsafe-inline'`.
- Inter: subconjunto latin do `@fontsource-variable/inter` (OFL), copiado para `src/renderer/fonts/` e versionado. Atualizar a fonte é copiar o arquivo de novo.
- Conferir visual: `npx electron tools/captura.js <html> <png> [claro|escuro]` e comparar com `base/index.html` (o vidro só é fiel no Electron).

## 10. Casca e atalhos internos (TASK-004)

- `src/renderer/catalogo.js` é provisório: a TASK-008 o troca por `apps.json` mantendo os campos (id, nome, grupo, icone, cor, desc, estado).
- Teclas internas: 1 a 4 trocam de tela (Início, Notícias, Comunicados, Equipe) e Esc fecha o seletor de app. Abrir app pelo teclado entra com a TASK-010/011. Não valem em campos de texto nem com Ctrl/Alt/Meta (AltGr no ABNT2).
- Títulos de grupo na sidebar ficam em fonte sans (não mono em caixa-alta), conforme `docs/DESIGN.md`. Contadores e "sincronizado" da referência não entram enquanto não houver dado real.
- Verificação ponta a ponta do app real: `node tools/verificar-app.js` (usa `--remote-debugging-port=9333`; o Electron não expõe `Browser.getWindowForTarget`, então o estado minimizado vem do Windows via `IsIconic`).



## 11. Só o que é real, e como os apps futuros entram (TASK-022, 2026-11-08)

**Decisão do usuário:** o Hub não mostra nada fingido. Sem selos "Em breve" e "Dados de exemplo", sem comunicados, notícias, equipe e agenda inventados e sem apps que ainda não existem. Hoje o catálogo tem só o Termix. Notícias, Comunicados e Equipe mostram um estado vazio ("Ainda não há…") até haver fonte real (TASK-018 e 019). O componente de selo continua em `components.css` para uso futuro, mas nenhuma tela o usa.

**Apps previstos** (nomes, grupos, cores e ícones do catálogo antigo, só para não se perder; nada disto está na interface):

| App | Grupo | Cor | Ícone | Descrição |
|---|---|---|---|---|
| Workflow | Operação | `#4cc38a` | workflow | Fluxos, tarefas e automações |
| FinanPro | Negócio | `#e5a63b` | wallet | Contas, fluxo de caixa e relatórios |
| Lignum | Negócio | `#c08a5a` | tree | Estoque, pedidos e clientes |
| Instamidia | Criação | `#ec6a8b` | camera | Conteúdo e publicações para redes sociais |
| RocStudio | Criação | `#a78bfa` | film | Estúdio de criação: design e vídeo |

**Como cada app entra, no futuro:**

1. Um app só aparece no Hub quando existe de verdade: tem repositório próprio no GitHub e uma release instalável. Antes disso não há entrada, selo nem espaço reservado.
2. Entrar é editar o `apps.json` (TASK-008): id, nome, grupo, cor, ícone, repositório e dicas de detecção. Seletor e sidebar já mostram só os grupos que têm app, então um grupo novo aparece sozinho.
3. O estado vem de fatos, nunca de rótulo: **instalado** (achado no registro do Windows, TASK-009), **não instalado** (existe no `apps.json` mas não foi achado; oferece instalar pela release, TASK-016) e **em execução** (processo vivo, TASK-010). "Em breve" deixa de existir como estado.
4. Cada app continua independente: repositório, processo, janela e atualização próprios. O Hub só detecta, abre, foca e, mais tarde, instala e atualiza.
5. Mudanças dentro de um app (botão "← Hub", identificador comum) só como tarefa própria aprovada (TASK-017).
