# CHANGELOG_DEV — Rocruzta Hub

Histórico legível do que foi desenvolvido, alterado ou corrigido. Uma entrada por tarefa, mais recente no topo, com data e papel.

> **BASELINE — 2026-11-07.** O que existia antes da adoção do fluxo é só design: a referência visual aprovada (`base/index.html`) e a documentação de arquitetura (desatualizada, a ser reescrita na TASK-001). Não há código de produto. O changelog detalhado começa nesta data.

---

## 2026-11-08

**TASK-009 — Detectar a instalação do Termix** (DEV1)

- `src/main/deteccao.js`: lê o registro com `reg.exe query` (só leitura) em HKLM e HKCU, Uninstall e WOW6432Node. Acha a entrada pelo `registro` do `apps.json` ("Termix" ou "Termix <versão>"; no registro real o nome é "Termix 0.3.7"), tira a pasta do `InstallLocation` ou, vazio, do `UninstallString`, e só conta como instalado se o executável existir ali. Devolve `{ instalado, pasta, executavel, versao }`.
- IPC `apps:detectar` e `apps:releases` (`hub.detectarApps()` e `hub.abrirReleases(id)` no preload). A página de releases sai do repositório do catálogo, nunca de um endereço vindo da janela.
- Interface: se a detecção disser "não instalado", o bloco do app no Início mostra "Não instalado" e o botão "Ver releases"; clicar no app só avisa. A detecção roda ao abrir e a cada foco da janela (redesenha só se mudou). Se ela falhar, nenhum estado é inventado e o app aparece normal.
- Validado: `npm test` (47 testes, 9 novos em `test/deteccao.test.js`) e `node tools/verificar-app.js` no app real; no registro desta máquina o Termix foi achado em `D:\Termix`, v0.3.7. O harness agora espera a casca iniciar. Não verificado: o clique em "Ver releases" abrindo o navegador, e a detecção numa máquina sem o Termix (só simulada nos testes).
- Acentos em caminhos: a saída do `reg.exe` vem na página de código do console; um caminho com acento pode não bater com o disco e cair em "Não instalado". Não ocorre em `D:\Termix`.

**TASK-008 — Catálogo de apps** (DEV1)

- Novo `src/apps.json` (grupos e apps) com, para o Termix: id, nome, grupo, ícone, cor, descrição, repositório `rocruzta50IND/termix` e dicas de detecção (nome no registro "Termix", `Termix.exe`, `com.termix.app`), para a TASK-009.
- `src/main/apps.js` lê e valida o JSON (campos, id único, grupo existente, cor e repositório) e falha com mensagem clara. O processo principal entrega o catálogo à janela pelo canal `apps:list` (`hub.apps()` no preload); o renderer só inicia a casca depois de recebê-lo, e mostra uma mensagem se falhar.
- `catalogo.js` deixou de ter a lista de apps: `GRUPOS` e `APPS` são preenchidos por `definirCatalogo()`. Adicionar um app é só editar o `apps.json`; grupo novo aparece sozinho.
- Validado: `npm test` (38 testes, 5 novos em `test/apps.test.js`) e `node tools/verificar-app.js` (31 verificações no app real, com o catálogo vindo do IPC). Não verificado: mensagem de erro com `apps.json` quebrado na janela.
- Os estados instalado, não instalado e em execução ficam para as TASK-009 e 010.

**TASK-022 — Tirar "Em breve" e dados de exemplo; só o que é real** (DEV1)

- Removidos `exemplos.js` e `capas.js` (equipe, comunicados, agenda, notícias e capas inventados) e os ícones que só eles usavam. O catálogo (`catalogo.js`) ficou só com o Termix; sidebar e seletor mostram só grupos que têm app.
- Início mostra só o bloco de apps (Termix, com a descrição) e a data real. Notícias, Comunicados e Equipe mostram estado vazio ("Ainda não há…"). Nenhum selo "Em breve" ou "Dados de exemplo" aparece em tela.
- Plano dos apps futuros e de como entram (repositório e release próprios, `apps.json`, estados instalado, não instalado e em execução) em `docs/DECISOES.md`, seção 11. TASK-006, 007 e 008 reescritas; 006 e 007 agora dependem das APIs (TASK-018 e 019). `CLAUDE.md`, `ARQUITETURA.md` e `DESIGN.md` ajustados à regra nova.
- Validado: `npm test` (33 testes) e `node tools/verificar-app.js` (31 verificações no app real: Início só com o Termix, telas vazias sem selos, menu com Hub e Termix, cliques, atalhos, tema e janela). Screenshot escuro conferido. Não verificado: tema claro. O ajuste de fundo em vidro que o usuário citou não está no repositório e não foi tocado.

## 2026-11-07

**TASK-021 — Ícone do app (pétalas)** (DEV1)

- `assets/icone.png` (1024x1024, vindo de `hub-petalas-preview.png`) passa a ser o ícone da janela e da barra de tarefas, no lugar do padrão do Electron (`ICON` em `src/main/config.js`, `icon` na `BrowserWindow`).
- Fora do escopo: a marca "R" da barra de título continua como estava (aprovada em `base/index.html`); o `.ico` multitamanho para o executável e o instalador fica para a TASK-014.
- Validado: `npm test` e execução real do app. Não verificado: como o ícone aparece na barra de tarefas (conferência visual do usuário).

**TASK-005 — Tela Início (exemplo)** (DEV1)

- Tela Início em `src/renderer/inicio.js` e `inicio.css`: comunicados, notícias em alta, apps por grupo, equipe e agenda, no layout de `base/index.html`. Links e cartões levam à seção; o bloco do Termix só avisa que abrir vem na próxima etapa e os apps "Em breve" não respondem.
- Dados de exemplo isolados em `exemplos.js` (equipe, comunicados, agenda, categorias e 12 notícias, já no formato que as APIs das TASK-018 e 019 vão devolver) e capas geradas por categoria em `capas.js`; as duas serão reaproveitadas nas TASK-006 e 007. Ícones novos em `icons.js`.
- Selo "Dados de exemplo" em cada bloco que não é real (comunicados, notícias, equipe, agenda). O bloco Apps vem do catálogo e não leva o selo; os cinco apps sem instalação mostram "Em breve".
- Diferenças da referência, de propósito: sem saudação com nome, contadores ("3 de 5 pessoas online", "2 novos"), versões dos apps, perfil na sidebar e "sincronizado", por serem dados fingidos; sem caixa-alta mono nos títulos de bloco, sem setas nos links e sem pontos do meio no texto (regras do `DESIGN.md`). Título da tela continua "Início", com a data real embaixo.
- Corrigido durante a conferência visual: a descrição longa do Termix alargava a coluna e empurrava o Workflow para fora do bloco; o fundo dos blocos de app ficava cinza no tema claro. A descrição saiu do bloco e as colunas ganharam largura fixa.
- Validado: `npm test` (36 testes, 7 novos) e `node tools/verificar-app.js` (37 verificações no app real, 9 novas: blocos, selos, contagens, cores, rolagem horizontal, links e cliques nos apps). Screenshots escuro e claro conferidos contra `base/index.html`. Não verificado: tela estreita (menos de 1180 px, onde as colunas empilham) e o clique no Termix abrindo de fato (TASK-010).

**TASK-004 — Casca do Hub e navegação interna** (DEV1)

- Casca em `src/renderer/`: barra de título (logo, seletor de app, tema, notificações "em breve" e controles da janela), sidebar de vidro (Início, Notícias, Comunicados, Equipe e apps por grupo), painel central e barra de status. Arquivos: `shell.css`, `shell.js`, `icons.js`, `catalogo.js` (provisório até a TASK-008), `atalhos.js`; `renderer.js` virou o ponto de entrada.
- Seletor e sidebar vêm do catálogo: Termix ativo, os outros cinco desabilitados com "Em breve". Clicar no Termix só avisa que abrir vem na próxima etapa (a abertura real é a TASK-010).
- Telas internas vazias com o selo "Dados de exemplo"; conteúdo nas TASK-005 a 007. Tema escuro/claro lembrado em `localStorage`.
- Atalhos internos: 1 a 4 trocam de tela e Esc fecha o seletor, só fora de campos de texto e sem Ctrl/Alt/Meta. Nenhum atalho global.
- Removido `styles.css` provisório; contadores e "sincronizado" da referência ficaram de fora por serem dados fingidos.
- Validado: `npm test` (29 testes) e `node tools/verificar-app.js`, que dirige o app real (28 verificações: troca de telas, seletor, Esc, atalhos dentro e fora de campo, tema e os botões minimizar, maximizar e fechar da barra de título, que ficaram sem verificação na TASK-002). Screenshots escuro e claro conferidos contra `base/index.html`. Não verificado: o clique no Termix abrindo de fato (TASK-010).

**TASK-003 — Tokens de design e componentes base** (DEV1)

- CSS em `src/renderer/styles/`: `fonts.css` (Inter variável embutida, subconjunto latin, licença OFL em `fonts/`), `tokens.css` (escuro e claro, valores finais da referência), `base.css`, `glass.css` e `components.css` (botões, chips, segmentado, tags, avatares, glyphs, lista agrupada, menu e o selo único `.selo-breve` / `.selo-exemplo`).
- `@fontsource-variable/inter` como `devDependency` (só para obter o arquivo da fonte); a casca provisória da TASK-002 passou a usar os tokens.
- Cor por elemento: a CSP bloqueia `style=""`, então usa-se `data-c` e `aplicarCores()` (`src/renderer/ui.js`).
- Ferramentas de desenvolvimento: `src/renderer/componentes.html` (amostra, o app não a abre) e `tools/captura.js` (screenshot no Electron).
- Validado: `npm test` (15 testes; os de tokens falham se um valor divergir da referência, conferido com uma alteração de teste) e screenshots escuro e claro contra `base/index.html`. Não verificado: fidelidade pixel a pixel (conferência visual), nem as telas completas (TASK-004 em diante).

**TASK-002 — Esqueleto do app Electron (Windows)** (DEV1)

- Projeto Electron 45.2.3: `src/main` (janela sem moldura, instância única, `com.rocruzta.hub`, dados em `%APPDATA%\Rocruzta Hub`, IPC de minimizar/maximizar/fechar), `src/preload` (API mínima `window.hub`) e `src/renderer` (barra de título própria, CSP restritiva).
- Segurança: `contextIsolation` ligado, sem `nodeIntegration`, `sandbox` ligado.
- Scripts `start` e `test`; `validacao` = `npm test` em `.claude/fluxo.json`. Sem lint.
- Validado: `npm test` (6 testes) e execução real (janela abre, segunda instância não duplica processo, pasta de dados criada, processos encerrados). Não verificado: clique nos botões da barra de título (IPC) na janela real.

**TASK-001 — Reescrever docs/ARQUITETURA.md para o modelo lançador** (DEV1)

- `docs/ARQUITETURA.md` reescrito do zero (54 linhas): Hub como lançador, catálogo, detecção, abrir e focar, seletor global, bandeja, estrutura do código e fases (v1 e depois).
- Removido o modelo antigo (módulos, `hubApi`, registro de versões, apps na janela do Hub); Termix identificado como o app da Rocruzta.
- Validação manual: sem menções ao modelo antigo (grep), critérios de aceite conferidos.

**TASK-000 — Adotar o fluxo DEV2 → DEV1 → MAIN** (DEV1)

- Fluxo adotado via plugin `fluxo` v1: branches `main`/`dev1`/`dev2`, `WORKFLOW.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` e `.claude/fluxo.json`.
- Repositório criado do zero, com `origin` local (`D:\Termix\_origins\rocruzta-hub.git`) no lugar do GitHub.
- Contexto organizado para a retomada após o Clear: `CLAUDE.md` enxuto, `docs/DECISOES.md`, `docs/DESIGN.md` e as tarefas da v1 (TASK-001 a TASK-013) em `docs/TASKS.md`.
- Iterações antigas do design movidas para `_historico/` (fora do git).
