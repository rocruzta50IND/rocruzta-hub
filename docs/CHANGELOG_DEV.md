# CHANGELOG_DEV — Rocruzta Hub

Histórico legível do que foi desenvolvido, alterado ou corrigido. Uma entrada por tarefa, mais recente no topo, com data e papel.

> **BASELINE — 2026-11-07.** O que existia antes da adoção do fluxo é só design: a referência visual aprovada (`base/index.html`) e a documentação de arquitetura (desatualizada, a ser reescrita na TASK-001). Não há código de produto. O changelog detalhado começa nesta data.

---

## 2026-11-13

**TASK-044 — Abertura animada com o mago e mascote do Hub** (DEV1)

- Pedido do usuário: implementar no Hub a abertura e o mascote do estudo `iconemascote/abertura-final` (ícone "H com chapéu" vira o mago, que escreve "Rocruzta Hub", vira faísca e cometa e se materializa sentado na quina do campo de mensagem), com o ícone novo no lugar do cometa. Sem a "área de trabalho" simulada, o painel de simulação, o som e a galeria.
- Abertura acoplada ao app: a escrita roda enquanto a casca carrega e a revelação só espera a tela inicial (`splashPronto()`). Começa no primeiro quadro visível (a janela nasce escondida).
- Mascote: `mago.js` (personagem e física), `mascote.js` (onde senta, reações à digitação e ao "pensando", avatar das respostas, arrastar com plataforma mágica, some em pixels fora do Início e reaparece no lugar dele ao voltar). Chat: só a última resposta tem avatar livre; as anteriores ganham um pontinho.
- Ícone: `icone-hub.svg` (claro) e `icone-hub-escuro.svg`; `assets/icone.png` gerado por `tools/exportar-icone.js` (substitui o cometa). O logo do Início saiu; a marca da barra de título usa a versão do tema.
- Verificação: `tools/verificar-abertura.js` no Hub real (21 etapas: abertura, quina do campo, digitação, avatar, pensando, navegação, arrastar), 125 testes, capturas nos dois temas. Abertura e mascote são exceção na regra de "reduzir movimento".
- Substitui a TASK-043 (abertura simples só com a escrita).

**TASK-043 — Abertura do Hub: a escrita "Rocruzta Hub" se monta enquanto o app carrega** (DEV1)

- Pedido do usuário: tirar a sensação de esperar o app abrir. Depois de testar o cometa animado, o usuário pediu uma versão mais simples, só a escrita "Rocruzta Hub" se montando na tela de loading, para ajustar a partir daí. O véu cobre a casca, as letras entram uma a uma (mínimo ~1,3 s) e ele só some quando a casca está pronta.
- Dois achados nos testes: a janela nasce escondida, então a animação tem de contar o tempo a partir do primeiro quadro visível; e a regra global de "reduzir movimento" do `base.css` apagava animações e transições (inclusive a do véu), por isso o `#splash` virou exceção.
- `cometa.svg` (sem fundo, derivado de `assets/icone.svg`) passa a ser o logo da barra de título, da tela Início e o avatar da IA no chat, no lugar do "R", sem a lógica do mascote.

**TASK-042 — Ícone do Hub: cometa em órbita; Configurações centralizada** (DEV1)

- Pedido do usuário: usar o ícone do estudo `iconemascote` no Hub e centralizar o conteúdo da tela Configurações. `hub-icone.svg` é a fonte e o `assets/icone.png` (1024 px, transparente) sai dele. O glifo do Hub no seletor, no menu e na troca de apps usa o cometa; o menu lateral Início mantém a casinha (é navegação). Configurações: `.page.cfg` com 712 px, centralizada.
- A abertura animada (`intro()`) e o mascote ficam para a tela de entrada.

**TASK-039 — Diálogos de arquivo dos apps embutidos presos à janela do Hub** (DEV1)

- Relato do usuário (com captura): "Escolher pasta" no Termix pelo Hub abria janelas soltas do Windows. O Hub passa a abrir o diálogo preso à própria janela (`src/main/dialogos.js`) quando o app embutido o pede (`HUB_EVENT` `dialogo`), e devolve a resposta por `/__cmd`. A mudança do lado do Termix é a TASK-139 (`src/embed.js`).
- Validado no Hub real com `tools/verificar-dialogo.js` (8/8): o diálogo tem a janela do Hub como dono, fechar devolve null ao Termix, e a pasta digitada chega ao Termix. 119 testes (4 novos).
- Entra na próxima release do Hub (junto da limpeza do instalador temporário e do contrato de tema). Com um Termix mais antigo que a TASK-139, o diálogo continua solto.

**TASK-036 — Contrato de tema com os apps embutidos** (DEV1)

- Pedido do usuário: poder mexer no Termix sem medo de quebrar o visual dentro do Hub, e ter controle máximo dos erros possíveis. Decisão: o Hub continua mandando no visual (CSS só de variáveis de cor); regras e alternativa guardada em `docs/DECISOES.md` §19.
- `src/main/tema-contrato.js` + `test/tema-contrato.test.js` (5 testes, 115 no total): o `termix.css` só tem seletores `html[data-hub-theme]`; o teste contra o Termix de desenvolvimento falha dizendo qual variável sumiu.
- `tools/verificar-tema-termix.js [pasta]`: 22/22 variáveis no Termix de desenvolvimento e no instalado (0.7.0). Aviso: ~350 declarações de cor fixa no Termix (não acompanham o tema claro); não bloqueia.

**TASK-034 — Atualização automática do Hub** (DEV1)

- `src/main/autoatualizacao.js`: confere a última release pública do Hub (ao abrir e a cada 3 h, só no app instalado), baixa em segundo plano, confere tamanho e sha512 e deixa pronto. Faixa "Hub vX pronto para instalar" com "Reiniciar e atualizar" (avisa se vai fechar app embutido) e botão para dispensar; só instala com o clique. Sem rede, nada muda; hash errado apaga o arquivo e tenta de novo na próxima checagem.
- Releases publicadas no GitHub: v0.1.1 (com a função) e v0.1.2 (alvo do teste). `npm version` + `npm run empacotar` + `gh release create` com o Setup, o .blockmap e o latest.yml.
- Validado no Windows Sandbox (`tools/sandbox/rodar.ps1 -Versao 0.1.1`, passo 6): faixa apareceu em ~18 s, o clique fechou e reabriu o Hub, registro foi de 0.1.1 para 0.1.2. No mesmo teste: instalar o Termix pelo Hub, abrir embutido, Desinstalar pelo menu ⋯ e reinstalar, tudo OK.
- Achado: sobrava o instalador baixado em `%TEMP%ocruzta-hub-atualizacao` depois de atualizar; agora a próxima checagem o apaga (teste novo, 110 testes). Essa correção entra na próxima release.
- Este PC (físico) precisou habilitar o Windows Sandbox (`Containers-DisposableClientVM`) e reiniciar; resultado em `C:sandbox-hubesultado.txt` (fora do git).

**TASK-033 — Menu "⋯" dos apps na barra lateral** (DEV1)

- Pedido do usuário: o Desinstalar não aparecia no Hub (ele é escondido quando o Termix roda da pasta de desenvolvimento, caso desta máquina). Cada app da barra lateral ganhou o botão "⋯" com Abrir, Ver novidades e Desinstalar (desativado com explicação quando não dá). Fecha com Esc, clique fora ou no "⋯" de novo; o menu cabe na barra lateral (a tela do app fica por cima de qualquer coisa fora dela).
- `tools/verificar-menu-app.js` 10/10 no app real; `HUB_DADOS` (só testes) separa os dados e a instância única. 105 testes.
- Decisões da conversa em `docs/DECISOES.md` §18 (repositórios públicos até depois do MVP; TASK-035) e abertura da TASK-034 (atualização automática do Hub).

**TASK-014 e TASK-016 — Instalador do Hub e instalar/atualizar apps pelo Hub** (DEV1)

- Instalador: `electron-builder` (NSIS por usuário, sem administrador), `npm run empacotar`. Ícone vem de `assets/icone.png`.
- `src/main/instalacao.js`: baixa o instalador da última release pública (só hosts do GitHub, https), confere tamanho e sha512 do `latest.yml`, executa `/S /currentuser` (atualização: mesmo modo do que já está instalado, com administrador se foi para todos). Remove só o `Termix.lnk` criado na área de trabalho durante a instalação (`atalhoNaAreaDeTrabalho: false`). Botões Instalar e Atualizar para vX na loja, com progresso.
- Desinstalar de uma instalação por usuário (`/currentuser`) abre direto, sem pedir administrador.
- Validado no Windows Sandbox (`tools/sandbox/rodar.ps1`): Hub instalado, Termix instalado pelo Hub (0.7.0, embutível), atalho do Termix não aparece, Termix abre dentro do Hub, botão Desinstalar lança o desinstalador, reinstalação pelo Hub. 105 testes.
- Atenção: reinstalar logo depois de desinstalar pode travar enquanto o desinstalador (que se copia para a pasta temporária) ainda roda.

## 2026-11-12

**TASK-032 — Troca rápida fluida ao alternar depressa** (DEV1)

- Problema (relato do usuário): alternando rápido, a troca não era fluida como a Visão de Tarefas do Windows.
- Medido com teclado real (`tools/medir-troca-real.js`, `keybd_event` com o Hub em primeiro plano; aborta se o Hub não estiver à frente): havia toques perdidos (11 de 12, 16 de 20) e estado final errado. Causa: voltar ao Termix passava por `embutivelDe`, que consulta o registro do Windows (4 `reg.exe`) e levava mais de 300 ms; o Ctrl+Espaço seguinte chegava no meio e era tratado como "avançar" no painel anterior. Os quadros da tela já estavam bem (nenhum acima de 33 ms).
- Correções: `embutidos.pronto(id)` evita reconsultar o registro quando o app já está rodando (`main.js`, `embutido.js`); gestos em sequência esperam a navegação anterior e ficam em fila (`proxima`) em `shell.js`; os cartões são desenhados uma vez por abertura (avançar só troca a marca `.sel`); sem animação de entrada e desfoque menor (`shell.css`).
- Validado: teclado real, 7/7: 12 e 20 toques seguidos viram 12 e 20 trocas (com o Ctrl segurado de 30 a 80 ms, soltando o Ctrl antes ou depois do Espaço), ciclar com três Espaços, tempo até o painel e até o destino na casa de poucos ms, nenhum quadro acima de 33 ms. `tools/verificar-troca.js` 13/13, `npm test` 97 OK.
- Não verificado: com o Hub em primeiro plano, as teclas reais chegaram sempre à página do Hub, então o caminho com o foco dentro da tela do app só foi coberto pelo teste de `sendInputEvent`. Depois de trocar para o Termix pelo teclado, não consegui provar que o teclado vai para ele sem clicar (testei 11 formas de focar; a sonda pode estar errada): confirme se dá para digitar no Termix logo após a troca.

**TASK-031 — Voltar a um app já aberto sem "Abrindo..."** (DEV1)

- Problema (relato do usuário): ao trocar entre o Hub e o Termix, depois do primeiro carregamento, ainda aparecia "Abrindo o Termix..." e um carregamento. Causa: `entrarApp` (`src/renderer/shell.js`) mostrava a mensagem e esperava um quadro a cada entrada, mesmo com a tela do app já carregada e só escondida.
- Agora o renderer guarda os apps já mostrados que seguem rodando (`abertos`, limpo quando o app cai) e, para eles, vai direto à tela, com a última foto no lugar até a tela reaparecer (sem piscar).
- Validado: `node tools/verificar-troca.js` 13/13 no app real com o Termix embutido; o novo passo (voltar pelo seletor do cabeçalho depois do primeiro uso, observando se `.app-msg` aparece) reprova com o código antigo e passa com o novo. `npm test` 97 OK. Não verificado: a sensação visual de rapidez (a foto da última tela pode estar um pouco defasada por uns 100 ms) e a primeira abertura, que continua mostrando "Abrindo...".

**TASK-030 — Troca rápida entre apps (Ctrl+Espaço)** (DEV1)

- Pedido do usuário: efeito do Alt+Tab/Visão de Tarefas do Windows para alternar entre os apps sem sair do Hub. O Alt+Tab em si é do Windows e o app não o recebe, então o atalho é Ctrl+Espaço (só com o Hub em foco).
- `src/main/teclas.js` (classifica a tecla), `src/renderer/troca.js` (ordem por uso recente e seleção, pura e testada), painel em `shell.js`/`shell.css`/`index.html` (`#troca`) e canais `troca:*` (config.js e preload). Com o foco dentro de um app embutido, `before-input-event` (em `main.js`, ligado por `aoCriarView` em `embutido.js`) pega a tecla, passa o foco ao Hub e avisa a página; com o foco na página, o renderer trata a tecla. Miniaturas: foto da tela do app guardada ao sair dele e ao abrir o painel (reaproveita `capturar`).
- Validado: `npm test` com 97 testes OK (7 novos em `test/troca.test.js`) e `node tools/verificar-troca.js` no app real com o Termix embutido, 12/12 OK em 2 rodadas (abrir, Esc, soltar o Ctrl confirma, a partir do Hub e de dentro do Termix, miniatura, avançar). Não verificado: o teclado físico (as teclas foram injetadas pelo CDP e por `sendInputEvent`) e o foco do Windows com a janela em primeiro plano.
- Achado: quando o processo principal trata uma tecla, o Chromium descarta os `keyUp` seguintes daquela tela, inclusive o do Ctrl; por isso a página do Hub trata o atalho no próprio renderer e, no app embutido, o foco passa ao Hub na hora.

**TASK-029 — Versão real do app instalado** (DEV1)

- Causa: nesta máquina o registro do Windows dizia Termix 0.2.7 enquanto os arquivos eram da 0.7.0 (o app se atualiza sozinho e não corrige o registro). O Hub lê a versão do registro, achou o app abaixo de `embutirDesde` (0.7.0) e abria o Termix em janela solta em vez de embutir.
- `src/main/deteccao.js`: `lerVersaoPacote` lê `resources/app/package.json` da pasta instalada e `versaoReal` usa a maior entre registro e disco (nunca rebaixa). `acharApp` e `detectarApps` aceitam a leitura injetável para teste.
- Validado: `npm test` com 90 testes OK (3 novos em `test/deteccao.test.js`) e detecção real: versão 0.7.0 e `localizarInstalado` passa a devolver o Termix instalado. Não verificado: o Termix aparecendo dentro da janela do Hub, que precisa abrir o app pela interface.

**TASK-024, 026, 027 e 028 — Termix dentro do Hub, loja de apps e avisos de atualização** (DEV1)

- **Termix embutido (024/026):** o Termix aparece dentro da janela do Hub, sem janela própria, com layout encaixado, tema claro e escuro do Hub, notificações no sino (painel à direita que empurra a tela) e aviso do Windows. A tela do app nasce escondida e só aparece depois de carregar (corrigido um retângulo claro no canto). Barra lateral recolhível, ícones e engrenagem iguais aos do Termix, tema só pelo menu do usuário. Chat do Início com o Claude Code (Haiku), sem histórico.
- **Loja de apps (027):** tela Apps com destaque, busca, filtros, cartões por grupo e página do app (carrossel de capturas reais, "Sobre", "Novidades", informações e configurações). Desk, Midia e Studio aparecem como "Em breve" só na loja (revoga em parte a §11, ver §14). Aviso de atualização lendo as releases públicas do GitHub (faixa por 15 min, bolinha em Apps, selo, botão "Baixar vX"); botão Desinstalar que abre o desinstalador do próprio app (nunca executado de verdade). A versão comparada é a que o Hub realmente roda.
- **Termix instalado (028):** `embutirDesde` no catálogo; sem a pasta de desenvolvimento, o Hub embute o Termix instalado se a versão for >= 0.7.0; senão abre em janela, como antes.
- Validado: `npm test` com 87 testes; testes automáticos no Hub real; usuário aprovou o resultado ("ficou perfeito"). Não verificado: o Termix instalado em modo embutido numa máquina real, instalação e atualização pelo Hub, Desinstalar de verdade.
- Retomar em outra máquina: `git clone`, `git checkout dev1`, `npm install`, `/fluxo:papel`, ler `docs/TASKS.md` e `docs/DECISOES.md` §12 a §14; atualizar o Termix para a 0.7.0.

---

**TASK-023 — Estudo: apps dentro da janela do Hub** (DEV1)

- Pedido do usuário: o Hub deve montar o app dentro da própria janela (sem janela solta do Windows), com apps em repositório próprio e releases, instalados e atualizados pelo Hub. Reavaliação registrada em `docs/DECISOES.md` §12 (contrato proposto, caminhos, riscos, terminais na máquina do usuário). A §1 segue valendo até o usuário aprovar.
- `lab/embed/`: protótipo fora do produto (Hub mínimo e 2 apps de mentira que sobem em `127.0.0.1` com token e aparecem num `WebContentsView` isolado). Abrir: `npx electron lab/embed/hub`; teste: `npx electron lab/embed/hub --selftest`.
- Validado: `selftest` com 14 verificações OK (isolamento de falha, token, sessões, reinício, atualização com rollback, desinstalação) e `npm test` com 55 testes OK. Estudo do Termix 0.6.3 só de leitura, nada alterado nele nem no código do Hub.
- Não verificado: foco, teclado e desempenho com o Termix real e com terminal real; `Origin` e backpressure. Próximas tarefas no Backlog: TASK-024 e TASK-025.
- Retomar em outra máquina: `git clone`, `git checkout dev1`, `npm install`, `/fluxo:papel`, ler `docs/TASKS.md` e `docs/DECISOES.md` §12.

## 2026-11-09

**TASK-015 — Publicar o repositório no GitHub** (DEV1)

- Criado o repositório privado `rocruzta50IND/rocruzta-hub` e enviadas as branches `main`, `dev1` e `dev2` (com `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` e todo o histórico). `origin` agora é `https://github.com/rocruzta50IND/rocruzta-hub.git`; o repositório local em `D:\Termix\_origins` deixa de ser usado.
- Feito antes da hora (estava no Backlog) a pedido do usuário, que vai continuar em outra máquina. Retomada lá: `git clone`, `npm install` e `/fluxo:papel` (o `CLAUDE.local.md` não é versionado).
- Validado: `git push -u` das três branches e `git branch -vv` com todas rastreando `origin`. Não alterado: código do app. Não verificado: clone limpo em outra máquina. O repositório é privado, então a outra máquina precisa estar logada no GitHub com acesso a ele. A TASK-016 (releases) e o botão "Ver releases" do Termix usam o repositório do Termix, não este.

## 2026-11-08

**TASK-010 — Abrir e focar o Termix, e estado "Em execução"** (DEV1)

- `src/main/execucao.js`: `abrirApp` lança o executável detectado (TASK-009) com `spawn` desvinculado (`detached`, `stdio: ignore`, `unref`, pasta do app, ambiente sem `ELECTRON_*` e `NODE_OPTIONS`). Com o Termix aberto, o segundo processo cai na trava de instância única e só traz a janela existente para a frente. O Hub nunca encerra nem controla processos de apps.
- "Em execução" = há processo com o mesmo caminho do executável instalado (`Get-Process -Name Termix`, comparando caminho, nunca só o nome). `apps:detectar` agora devolve também `rodando`; se a consulta falhar, nada é afirmado. Novo canal `apps:abrir` (`hub.abrirApp(id)`): o executável vem da detecção, nunca da janela.
- Interface: clicar no app (Início, sidebar ou seletor) abre e avisa "Termix aberto" ou o motivo da falha. Selo "Em execução" (ponto verde) no bloco do Início, no seletor e na sidebar; a casca relê o estado a cada 4 s com a janela visível e ao ganhar foco, e redesenha só se mudou.
- Validado: `npm test` (55 testes, 8 novos em `test/execucao.test.js`) e `node tools/verificar-app.js` (37 verificações no app real: clique real no Termix já aberto, contagem de processos antes e depois sem crescer, selo igual à realidade). Não verificado: abrir o Termix estando fechado (só testado com `spawn` simulado) e a janela do Termix subindo para a frente (conferência visual do usuário).
- O check da barra de tarefas do Termix e o tempo exato de atualização do selo ao fechar o Termix não foram medidos; o intervalo é de 4 s.

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
