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
- **No GitHub desde 2026-11-09 (TASK-015).** `origin` = `https://github.com/rocruzta50IND/rocruzta-hub` (**público**, conta `rocruzta50IND`; ver §18), com as branches `main`, `dev1` e `dev2`. Antes disso o `origin` era um repositório local em `D:\Termix\_origins\rocruzta-hub.git` (agora só um backup antigo). Em outra máquina: `git clone` do endereço acima, `npm install` e `/fluxo:papel` para criar o `CLAUDE.local.md`, que não é versionado.
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

## 12. Apps dentro da janela do Hub: reavaliação (TASK-023, 2026-11-12)

**Pedido do usuário:** a sensação de não sair do Hub tem que ser real. Cada app continua em repositório próprio, versionado, com releases; o Hub instala, atualiza, desinstala e **monta a tela do app dentro dele**, aceitando perder o vidro do Termix. Isto reabre a §1 (que descartou apps embutidos): a §1 vale até o usuário aprovar o contrato abaixo. A janela solta do Windows de hoje é o motivo da queixa.

**Caminhos avaliados:** (A) `SetParent` do Win32 sobre a janela do app: frágil, foco/DPI/GPU quebram, descartado; (B) **app serve a interface em `127.0.0.1` e o Hub a mostra num `WebContentsView` isolado: escolhido para estudo**; (C) Hub como trilho/dock com o app colado ao lado: sem mexer no app, mas depende de Win32 e janelas sincronizadas; (D) transição contínua (mesmas bordas, agrupar na barra de tarefas, "← Hub"): barato, não é "dentro"; (E) apps como módulos do Hub: descartado na §1, acopla versões.

**Contrato proposto (v1, ainda não aprovado):**
- Release do app traz `app.json`: `id`, `nome`, `versao`, `contrato`, `start`, `health`.
- O Hub instala em pasta própria por versão (mantém a anterior para rollback); desinstalar = apagar a pasta; dados do usuário ficam em outro lugar.
- O app roda como processo headless (Electron com `ELECTRON_RUN_AS_NODE` ou Node), sobe em `127.0.0.1` porta aleatória, imprime `HUB_READY <porta>`, exige token (cookie `hubt`) e confere o `Host`.
- O Hub mostra cada app num `WebContentsView` com `sandbox`, sem preload, sem Node e `partition` por app. Se o app cai, o Hub mostra "caiu, reiniciar" e os outros seguem.
- Apps que não seguirem o contrato (nativos, de terceiros) continuam abrindo em janela própria, como hoje.

**Protótipo (`lab/embed/`, fora do produto):** Hub mínimo e 2 apps de mentira. `npx electron lab/embed/hub` abre para uso manual; `npx electron lab/embed/hub --selftest` roda 14 verificações (todas OK em 2026-11-12): processos separados; 401 sem token e token de um app não vale no outro; interface renderizada dentro do Hub sem Node nem API do Hub; sessões separadas; falha grave de um app não afeta o outro nem o Hub; reinício; atualização 1.0.0→1.1.0 com rollback; desinstalar. **Não provado:** foco e teclado com o Termix real, desempenho de terminal, GPU compartilhada, checagem de `Origin`, backpressure.

**Estudo do Termix 0.6.3 (somente leitura, nada alterado):** JS puro sem build, ~3.100 linhas no main e ~4.000 no renderer; o renderer só usa `window.termix` (66 métodos: ~37 `handle`, 17 `on`, 18 eventos main→renderer). Terminal: `@lydell/node-pty`, saída já em lotes de ~8 ms/64 KB, mapeia bem para WebSocket (falta backpressure). Caminho incremental viável: tabela de canais única, preload IPC e cliente WebSocket implementam a mesma API, o main registra handlers num registro servido pelos dois transportes, e o que usa Electron (dialogs, `shell`, clipboard, notificação, `userData`) fica atrás de uma interface `platform`. Estimativa: ~2 semanas para funcionar, ~3 com acabamento. **Maiores riscos:** (1) aba Web (`WebContentsView`) e dock do Termix não têm equivalente fora do Electron: ficam no Hub ou são reescritos; (2) diálogos nativos e `shell` precisam de ponte para o Hub; (3) segurança de pty e `fs` por WebSocket local. Pontos a conferir: intervalo das métricas e o caminho de instalação (instalado em `D:\Nova pasta\Termix` nesta máquina, não em `D:\Termix`).

**Terminais:** continuam rodando na máquina do usuário, como filhos do backend do app. Não há servidor remoto. Problemas esperados: terminais morrem se o backend morrer (decidir se fechar o Hub mata as sessões); reconexão sem perder saída (buffer de scrollback); backpressure; segurança da porta local (token, `Origin`, `Host`, CSP); hooks do Claude usam `process.execPath`; foco, Ctrl+C/V e IME dentro da view; GPU/WebGL com vários terminais; atualizar app com terminais ativos.

**Próximos passos (precisam de aprovação do usuário):** TASK-024 (protótipo com terminal real, medir foco, teclado, desempenho e segurança) e, se passar, TASK-025 (modo embutível do Termix, no repositório do Termix). Só então reescrever a §1 e o `apps.json` para o contrato.

## 13. Termix embutido no Hub real: quem manda no quê (TASK-024/026, 2026-11-12)

**Aprovado pelo usuário:** o Termix roda sem janela e aparece dentro da janela do Hub; a lógica dele não muda, só ganhou o modo `--embed` (repo do Termix, TASK-134 a 136). O Hub só o mostra quando a pasta de desenvolvimento do Termix tem esse modo (`HUB_TERMIX_DEV`, padrão `C:/Termix/termix`); senão abre o Termix instalado em janela, como antes.

**Quem manda no quê (dentro do Hub):**
- **Janela e cabeçalho:** do Hub. O Termix esconde a barra de título, a moldura, o fundo, o chip de atualização e o painel de notificações. Atualizar o app embutido é papel do Hub.
- **Design e tema:** do Hub. O Termix não sabe de claro ou escuro. O Hub injeta `src/temas-apps/<id>.css` na tela do app e marca `<html data-hub-theme="dark|light">`. O escuro é o padrão do próprio Termix (mesmos tokens do Hub); o claro é só valores novos no arquivo do Hub. **Hoje o claro cobre sidebar, rodapé e cores de texto; a área do chat e o terminal têm cores fixas e ainda ficam escuros.** Terminar o claro é trabalho só do lado do Hub.
- **Notificações:** do Hub. O Termix continua detectando os eventos e os manda por linhas `HUB_EVENT {json}` na saída do processo; o Hub guarda (`src/main/notificacoes.js`), mostra o sino com contador e a lista, e dispara o aviso do Windows quando a pessoa não está olhando para o app. Clicar leva ao app e, por um comando autenticado (`POST /__cmd`, token do app), à aba que gerou o aviso. Esse é o canal Hub e app (app para Hub por saída, Hub para app por comando), que também servirá às conexões compartilhadas (GitHub etc.).
- **Consumo:** só os anéis (contexto, 5 h, 7 d, cache); a barra de consumo do topo não existe no embutido.

**Segurança:** a tela do app roda num `WebContentsView` com `sandbox`, sem preload e sem Node; só o processo principal do Hub fala com o app, e só o canal `notify:click` é aceito no comando. O app encerra sozinho se o Hub morrer (`HUB_PARENT_PID`), e o Hub encerra o app e os terminais ao sair.

**Ainda não provado:** teclado, foco e IME no terminal embutido; vários terminais e saída em volume; diálogos nativos (escolher pasta), aba Web e dock do Termix (provavelmente não funcionam ainda).

## 14. Tela Apps como loja de apps (TASK-027, 2026-11-12)

**Pedido do usuário:** a tela Apps vira uma loja, onde o Hub passa a gerenciar a instalação e a configuração de cada app. Também pediu para anunciar **Desk, Midia e Studio** como "Em breve". Isto **revoga em parte a §11** (que proibia selos "Em breve" e apps inexistentes): agora o "Em breve" é permitido, mas só na loja.

**Regras do "Em breve":** entrada no `apps.json` com `"emBreve": true` (não exige repositório nem detecção). Aparece só na tela Apps, com o selo `selo-breve`, sem botão de abrir nem de instalar. O processo principal ignora esses apps na detecção, na abertura e nas versões; o renderer os guarda em `EM_BREVE` e não os põe em `APPS` (seletor, barra lateral e Início só veem apps reais). Descrição provisória "Em desenvolvimento" (o usuário ainda não definiu o que cada um faz).

| App | Grupo | Cor | Ícone |
|---|---|---|---|
| Desk | Operação | `#4cc38a` | desk (monitor) |
| Midia | Criação | `#ec6a8b` | camera |
| Studio | Criação | `#a78bfa` | film |

**Loja (etapa 1, só leitura e abrir):** busca, filtros (Todos, Instalados, Para instalar, Em breve), cartões por grupo com estado real (instalado com versão do registro, em execução, não instalado) e tela de detalhe (situação, grupo, versão, repositório, bloco de configurações). Não instalado oferece só "Ver releases".

**Formato Store (2026-11-12):** a lista tem um destaque no topo (app com `"destaque": true` e prévias), busca, filtros e cartões. Clicar abre a página do app: cabeçalho com botão principal, carrossel de imagens, "Sobre", informações e configurações. Métricas de uso ficam de fora por decisão do usuário. Campos novos no `apps.json`: `destaque`, `sobre` e `previas` (lista de `{arquivo, legenda}`, arquivos em `src/previas/<app>/`); app sem imagens não mostra carrossel nem destaque. As 3 imagens do Termix são capturas reais da interface num Termix isolado (modo `--embed`, pasta de dados temporária, projetos e conversas de exemplo, tema do Hub injetado). A tela de Consumo ficou de fora por mostrar dados reais da máquina.

**Avisos de atualização (só aviso, aprovado pelo usuário em 2026-11-12):** repositórios públicos por enquanto; a conexão com o GitHub e o acesso a repositórios privados ficam para a tela de configurações. `src/main/atualizacoes.js` lê `api.github.com/repos/<repo>/releases` (sem token, sem baixar nem instalar nada), compara com a versão instalada no registro do Windows e guarda o estado em `%APPDATA%\Rocruzta Hubtualizacoes.json` (checa 4 s depois de abrir, a cada 3 h e no botão "Verificar agora"; sem rede mantém o último estado). Como aparece: (1) faixa fina abaixo da barra de título, "App vX disponível" com "Ver" e dispensar, que some sozinha 15 min depois de a versão ser detectada (a contagem não reinicia a cada checagem), ao ver a página do app ou ao dispensar; (2) bolinha em Apps na barra lateral, que fica até a pessoa abrir a página do app (ou atualizar); (3) selo "Atualização" e "v0.3.5 → v0.6.4" nos cartões e no destaque, enquanto houver versão nova; (4) na página do app, seção "Atualizações" com o histórico das últimas 10 releases (data, notas do GitHub, "Nova" nas mais novas que a instalada; release sem notas diz "Sem notas nesta versão", nada inventado). Nada disto altera o Termix. A versão comparada é a instalada no Windows, não a da pasta de desenvolvimento embutida.

**Etapa 2 (pendente de decisão do usuário):** instalar, atualizar e desinstalar. Bloqueios: o repositório do Termix é privado (baixar a release exige token ou release pública); o Termix é um instalador NSIS para todos os usuários e pede administrador; "atualização disponível" depende de ler a última release. Configuração por app só vale para o que o próprio Hub controla; o Termix não expõe configurações.

**Botões e novidades na página do app (2026-11-12):** ao lado de "Abrir" ficam "Baixar vX.Y.Z" (só quando há versão nova; hoje abre a página das releases no GitHub, porque o Hub ainda não instala, e quando instalar este mesmo botão vira "Atualizar") e "Desinstalar". Desinstalar pede confirmação no próprio lugar, só aparece se o registro do Windows traz o desinstalador, fica desligado com o app aberto e apenas lança o desinstalador do próprio app com permissão de administrador (`Start-Process -Verb RunAs`); o Hub não apaga nada. Só aceita um `.exe` dentro da pasta do app e as opções `/allusers` e `/currentuser`. **Nunca foi executado de verdade** (testes só com lançador falso). A seção "Novidades" mostra a versão mais nova em destaque, já aberta com as notas, e as anteriores numa lista que abre ao clicar (uma linha de prévia em cada); a página tem duas colunas (sobre e novidades, e ao lado informações e configurações).

## 15. Termix embutido em qualquer máquina (TASK-028, 2026-11-12)

**Pedido do usuário:** desenvolver em uma máquina, subir o Hub e o Termix para o GitHub e, em outra máquina, só puxar o Hub (o Termix atualiza).

**Decisão:** o Hub embute o Termix de duas formas, nesta ordem: (1) pasta de desenvolvimento (`HUB_TERMIX_DEV`, padrão `C:/Termix/termix`), usada para desenvolver; (2) Termix instalado, se a versão detectada no registro for >= `embutirDesde` do catálogo (Termix: **0.7.0**, a primeira release com `--embed`), executando o `Termix.exe` com `--embed --user-data-dir=<dados do Hub>`. Sem nenhuma das duas, o Hub abre o Termix instalado em janela, como antes (não quebra com Termix antigo). Dados do app embutido ficam isolados em `%APPDATA%\Rocruzta Hub\apps\termix`.

**Versões:** o aviso de atualização compara com a versão que o Hub roda (a da pasta de desenvolvimento, se for ela; senão a instalada). Com a pasta de desenvolvimento, o botão Desinstalar não aparece (seria o desinstalador de outra cópia).

**Em outra máquina:** `git clone` do Hub, `git checkout dev1` (ou `main`), `npm install`, `npm start`; instalar ou atualizar o Termix para >= 0.7.0. O Hub ainda não tem instalador próprio (TASK-014).

## 16. Troca rápida entre apps: Ctrl+Espaço (TASK-030, 2026-11-12)

**Pedido do usuário:** o mesmo efeito da Visão de Tarefas do Windows para alternar entre apps. **Por que não Alt+Tab:** é do sistema, o app não o recebe (interceptar exige gancho nativo de teclado, frágil e que prende o usuário no Hub).

**Comportamento:** Ctrl+Espaço abre um painel em tela cheia (fundo desfocado) com um cartão por item (Hub e apps instalados), ordenados por uso recente, já selecionando o anterior. Cada novo Ctrl+Espaço avança (Shift volta); **soltar o Ctrl confirma**; Esc cancela; setas, Enter, 1 a 9 e clique também valem. Confirmar o item atual só fecha. As telas internas do Hub (Início, Notícias...) não são cartões. Só vale com a janela do Hub em foco; o seletor global `Ctrl+Alt+Espaço` segue para a TASK-011. Sem Alt nem Meta (AltGr no ABNT2, §5).

**Como funciona (e o que não é óbvio):**
- A tela de um app embutido é uma camada nativa por cima da página, então o painel só aparece depois de o app ser fotografado e escondido (mecanismo `capturar`/`#v-snap` que o seletor já usava). As miniaturas são **a última foto do app, não a tela ao vivo**: tiradas ao sair dele e ao abrir o painel. Apps parados mostram o ícone.
- Com o foco **dentro** de um app, a tecla é pega no processo principal (`before-input-event`) e **não chega ao app**: no terminal, o Ctrl+Espaço (caractere NUL) deixa de existir enquanto o Hub está em foco. Quando o processo principal trata uma tecla, o Chromium descarta os `keyUp` seguintes daquela tela, **inclusive o do Ctrl**. Por isso o foco passa para a página do Hub na hora, e é ela que vê o Ctrl ser solto. Com o foco na própria página do Hub o atalho é tratado no renderer, onde isso não acontece.
- Teste automático: `node tools/verificar-troca.js` (abre o Hub, o Termix embutido e confere o fluxo). O `Input.dispatchKeyEvent` do CDP não passa por `before-input-event`, então as teclas da tela do app entram por `--inspect` e `webContents.sendInputEvent`.

**Não provado:** o teclado físico e o foco do Windows com o Hub em primeiro plano; muitos apps (grade com quebra de linha); tema claro do painel; miniatura de apps que não são embutidos (aparecem só com ícone).

## 17. Instalador do Hub e instalação de apps pelo Hub (TASK-014 e 016, 2026-11-13)

**Pedido do usuário:** só o Rocruzta Hub fica na área de trabalho; o Termix é instalado e atualizado pelo Hub. O Termix é publicado no repositório dele, e o Hub abre sempre o que estiver instalado (>= `embutirDesde`).

**Decisões:** instalador do Hub por usuário (sem administrador). Instalar app novo: `/S /currentuser`. Atualizar: mesmo modo do desinstalador registrado. O Hub só apaga o atalho `<Nome>.lnk` criado pela própria instalação, nunca arquivos do app. O Termix não foi alterado. Alternativa mais limpa, se um dia valer a pena: o instalador do Termix não criar o atalho (repositório dele). O auto-atualizador do próprio Termix pode recriar o atalho.

**Teste:** `npm run empacotar` e `powershell -File tools\sandboxodar.ps1` (feche qualquer Sandbox aberto antes; o Sandbox às vezes não executa o script se reaberto logo após fechar, espere ~20 s). O `.wsb` não pode ter BOM.

## 18. Repositórios públicos e atualização do Hub (decidido em 2026-11-13)

- Os repositórios `rocruzta-hub` e `termix` são **públicos** (conferido pela API do GitHub sem token). Decisão do usuário: manter assim até depois do MVP; a documentação antiga que dizia "privado" estava desatualizada.
- Por isso a atualização automática do Hub (TASK-034) lê as releases públicas, sem token, igual ao Termix.
- Fatos que guiaram a decisão: um instalador Electron leva o JavaScript do app em `app.asar`, que qualquer pessoa extrai e lê (Slack, VS Code e Discord também); o que protege o negócio é o que fica no servidor, atrás de login. Quem tem só o instalador não recebe o histórico do git, os docs, os testes nem as ferramentas.
- **Pós-MVP (TASK-035):** (1) código-fonte privado e instaladores num repositório de releases separado (sem token em lugar nenhum); (2) com o backend e o login único (TASK-019), servidor de atualização que exige login por pessoa; (3) alternativa descartada por ora: token somente leitura embutido no instalador (extraível por quem tiver o arquivo, e a rotação cortaria a atualização dos Hubs já instalados). Privar o Termix exige antes um token ou outro lugar para as releases dele, senão o Termix instalado deixa de se atualizar.

## 19. Contrato de tema com os apps embutidos (TASK-036, decidido em 2026-11-13)

- **Quem manda no visual é o Hub.** O app não sabe de tema claro ou escuro: o Hub injeta `src/temas-apps/<id>.css` e marca `<html data-hub-theme="dark|light">`. Se mexer no Termix deixar o visual estranho dentro do Hub, o conserto é só ajustar esse CSS no Hub; a funcionalidade do app não depende dele.
- **O que o Hub controla é uma lista de variáveis de cor** (hoje 22 no `termix.css`: `--text`, `--border`, `--glass`, `--field`, `--pane`, `--sheet`, `--hover`, `--ov` etc.). O CSS do Hub só redefine variáveis, nunca seletores de estrutura (teste garante). Mover botão, trocar texto ou renomear função no app não afeta o tema.
- **Regras para o app (Termix):** (1) toda cor usa uma dessas variáveis, nunca valor fixo (`#hex`, `rgba()`): cor fixa não acompanha o tema claro; (2) não renomear nem remover uma variável da lista sem ajustar o `termix.css` do Hub.
- **Rede de segurança:** `npm test` (`test/tema-contrato.test.js`) falha se o Termix de desenvolvimento deixar de mencionar alguma variável do contrato (pula onde a pasta não existe). `node tools/verificar-tema-termix.js [pasta]` faz a mesma conferência no Termix de desenvolvimento ou no instalado (`%LOCALAPPDATA%/Programs/Termix/resources/app`) e avisa quantas cores fixas existem (hoje cerca de 350, muitas são camadas translúcidas brancas; é só aviso, não falha).
- **Antes de publicar uma release do Termix:** rodar essa ferramenta e abrir o Hub apontando para a pasta de desenvolvimento (`HUB_TERMIX_DEV`) para ver os dois temas. Há uma janela entre publicar o Termix e o Hub ser corrigido e atualizado; olhar antes evita que ela exista.
- **Alternativa guardada (não adotada):** o Termix carregar o próprio tema claro e o Hub só avisar "claro" ou "escuro". Mais independente, mas mexe no Termix e o claro dele pode divergir do Hub.
