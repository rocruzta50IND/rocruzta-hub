# TASKS — Rocruzta Hub

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`. Contexto e decisões em `docs/DECISOES.md`.

---

## Em andamento

_Nenhuma no momento._

## Aguardando validação DEV1

### TASK-039 — Diálogos de arquivo dos apps embutidos presos à janela do Hub

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (8 verificações no Hub real; 119 testes). Depende da TASK-139 do Termix (já feita, falta release).
- **Feito:** `src/main/dialogos.js`: o app embutido pede o diálogo por `HUB_EVENT` (`evento: "dialogo"`), o Hub o abre preso à janela do Hub e responde por `/__cmd` (`dialogo:resultado`). Opções saneadas (só campos conhecidos). `tools/verificar-dialogo.js` e `tools/janelas-do-processo.ps1` conferem o dono da janela do Windows.

### TASK-036 — Contrato de tema com os apps embutidos

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (115 testes; conferido no Termix de desenvolvimento e no Termix 0.7.0 instalado)
- **Feito:** contrato por escrito (`docs/DECISOES.md` §19), `src/main/tema-contrato.js`, `test/tema-contrato.test.js` (o `termix.css` só redefine variáveis; falha se o Termix perder uma delas) e `tools/verificar-tema-termix.js [pasta]` (22/22 variáveis; avisa cores fixas).

### TASK-034 — Atualização automática do Hub (releases públicas do GitHub)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 no Windows Sandbox (falta a conferência do usuário em máquina real)
- **Feito:** `src/main/autoatualizacao.js`: ao abrir e a cada 3 h o Hub app instalado lê a última release de `rocruzta50IND/rocruzta-hub` (sem token), baixa o instalador em segundo plano, confere tamanho e sha512 e mostra a faixa "Hub vX pronto para instalar · Reiniciar e atualizar". Só instala quando a pessoa clica: o Hub fecha, o instalador roda por cima (`/S --updated --force-run /currentuser`) e reabre o Hub. Releases v0.1.1 e v0.1.2 publicadas para o teste.
- **Verificado:** Sandbox limpo, Hub 0.1.1 viu a v0.1.2, baixou, aplicou, fechou e reabriu sozinho, registro foi para 0.1.2; no mesmo teste, instalar, abrir, desinstalar (pelo menu ⋯) e reinstalar o Termix. 110 testes.

### TASK-033 — Menu "⋯" dos apps na barra lateral

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (10 verificações no app real; falta o usuário testar o Desinstalar de verdade)
- **Feito:** botão "⋯" em cada app da barra lateral com Abrir, Ver novidades (página do app na loja) e Desinstalar (leva à confirmação da página do app; desativado com o app aberto, rodando da pasta de desenvolvimento ou sem desinstalador). `tools/verificar-menu-app.js`; `HUB_DADOS` (só testes) abre uma segunda instância. "Fixar" ficou de fora (sem efeito com um app só).

### TASK-014 — Empacotar o instalador do Hub

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 no Windows Sandbox (falta a conferência do usuário em máquina real)
- **Feito:** `npm run empacotar` gera `dist/Rocruzta-Hub-Setup-<versão>.exe` (electron-builder, NSIS por usuário, sem administrador, atalho na área de trabalho e no menu Iniciar). Sem atualização automática do próprio Hub (fica no Backlog).
- **Verificado:** `tools/sandbox/rodar.ps1` abre um Windows Sandbox limpo, instala o Hub, instala o Termix pelo Hub, abre o Termix embutido, usa o botão Desinstalar e instala de novo (detalhes em `docs/DECISOES.md` §17).

### TASK-016 — Instalar e atualizar apps pelas releases do GitHub (v1)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 no Windows Sandbox (falta a conferência do usuário)
- **Feito:** botões "Instalar" e "Atualizar para vX" na loja (`src/main/instalacao.js`): baixa o instalador da última release, confere tamanho e hash (`latest.yml`) e executa em modo silencioso (`/S /currentuser`; atualização segue o modo já instalado). Apaga só o atalho do app criado na área de trabalho (`atalhoNaAreaDeTrabalho: false` no catálogo). Desinstalar de instalação por usuário abre sem pedir administrador. 105 testes.

### TASK-023 — Estudo: apps dentro da janela do Hub

- **Responsável:** DEV1
- **Status:** AGUARDANDO VALIDAÇÃO DEV1
- **Resultado:** protótipo em `lab/embed/` (14 verificações OK), estudo do Termix e contrato proposto em `docs/DECISOES.md` §12. Nada do Hub nem do Termix foi alterado. Falta o usuário aprovar (ou não) o contrato e a direção.

## Validadas em DEV1

### TASK-024 — Terminal real no Hub embutido (Termix dentro da janela do Hub)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (o usuário testou no Hub real em 2026-11-12: "ficou perfeito")
- **Feito:** o Termix roda sem janela e aparece dentro da janela do Hub (`src/main/embutido.js`, `WebContentsView`; contrato em `docs/DECISOES.md` §12 e §13), com layout encaixado, tema claro e escuro do Hub (`src/temas-apps/termix.css`), notificações no sino do Hub (painel à direita que empurra a tela) e aviso do Windows. A tela nasce escondida e só aparece depois de carregar.
- **Verificado:** testes automáticos no Hub real e 87 testes do Hub.

### TASK-026 — Estética do Termix (clean, flat) e casca do Hub

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (usuário aprovou em 2026-11-12)
- **Feito:** visual do Termix embutido no estilo do Claude Desktop (feito no repositório do Termix, TASK-134, só no modo embutido); no Hub: barra lateral recolhível, ícones e engrenagem iguais aos do Termix, tema escolhido só pelo menu do usuário, ícones dos apps minimalistas, painel de notificações à direita.

### TASK-027 — Tela Apps como loja de apps, apps "Em breve" e avisos de atualização

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (usuário aprovou em 2026-11-12)
- **Feito:** loja estilo Store (destaque, busca, filtros, cartões por grupo, página do app em duas colunas com carrossel de capturas reais do Termix, "Sobre" e "Novidades" com a versão mais nova em destaque); Desk, Midia e Studio como "Em breve" só na loja; aviso de atualização (faixa no topo por 15 min, bolinha em Apps até ver o app, selo nos cartões, botão "Baixar vX" ao lado de "Abrir") lendo as releases públicas do GitHub; botão Desinstalar (nunca executado de verdade, só testado com lançador falso). Decisões em `docs/DECISOES.md` §14.
- **Pendente:** instalar, atualizar e desinstalar pelo Hub; tela de configuração das conexões com o GitHub (repositórios privados).

### TASK-028 — Hub embute o Termix instalado (qualquer máquina, sem pasta de código)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testes automáticos; o caminho do instalado só se prova de fato numa máquina com o Termix 0.7.0 instalado)
- **Feito:** o catálogo ganhou `embutirDesde` (primeira versão do app com `--embed`; Termix: 0.7.0). `embutivelDe` (`src/main/main.js`): a pasta de desenvolvimento (`HUB_TERMIX_DEV`, padrão `C:/Termix/termix`) tem prioridade; sem ela, o Hub usa o Termix instalado se a versão for >= `embutirDesde` (`localizarInstalado`, `argumentosInstalado` em `src/main/embutido.js`). Versão antiga ou sem o Termix: abre o app instalado em janela, como antes. Termix 0.7.0 publicado no repositório do Termix (TASK-134).
- **Em outra máquina:** `git pull` do Hub + `npm install` + `npm start`; atualizar o Termix para a 0.7.0 (atualização automática dele ou instalador da release); o aviso do Hub mostra "Termix 0.7.0 disponível" enquanto não atualizar.

### TASK-029 — Versão real do app instalado (registro desatualizado)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testes automáticos e detecção real nesta máquina)
- **Feito:** o Termix se atualiza por cima dos arquivos e não corrige o `DisplayVersion` do registro (aqui: registro 0.2.7, código 0.7.0), então o Hub achava o app "antigo" e não o embutia. `src/main/deteccao.js` agora lê `resources/app/package.json` da pasta instalada e usa essa versão quando for maior que a do registro (nunca rebaixa). Afeta a decisão de embutir (`embutirDesde`) e os avisos de atualização.

### TASK-030 — Troca rápida entre apps (Ctrl+Espaço)

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (testes e verificação no app real; falta a conferência sua com o teclado de verdade)
- **Feito:** painel em tela cheia, estilo Alt+Tab, com um cartão por app instalado e miniatura da última tela. Ctrl+Espaço abre e avança (Shift volta), soltar o Ctrl confirma, Esc cancela; também setas, Enter, números e clique. Só com o Hub em foco, inclusive com o foco dentro do Termix embutido. Detalhes e armadilhas em `docs/DECISOES.md` §16.

### TASK-031 — Voltar a um app já aberto sem "Abrindo..."

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (verificação no app real; falta a sua conferência visual)
- **Feito:** depois da primeira abertura, voltar ao Termix (barra lateral, seletor ou Ctrl+Espaço) não mostra mais a tela "Abrindo o Termix...": a tela escondida volta direto, com a última foto no lugar até reaparecer. Só a primeira abertura (ou depois de o app cair) mostra o carregamento.

### TASK-032 — Troca rápida fluida ao alternar depressa

- **Responsável:** DEV1
- **Status:** VALIDADA EM DEV1 (teclado real medido; falta a sua conferência)
- **Feito:** entrar num app já aberto não consulta mais o registro do Windows (levava mais de 300 ms e fazia toques seguidos se perderem); gestos de Ctrl+Espaço em sequência não se atropelam (ficam enfileirados); o painel não é redesenhado a cada Espaço e perdeu a animação de entrada.

## Prontas

Ordem de execução da v1. Pegue a primeira cujas dependências estejam concluídas.

### TASK-006 — Tela Notícias

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Média
- **Depende de:** TASK-018
- **Objetivo:** blog de notícias com destaque, grade, filtros por categoria, busca, "Em alta", tópicos e salvos, só com dados reais (sem exemplos). Fica parada até haver uma fonte real (TASK-018); até lá a tela mostra o estado vazio.
- **Critérios de aceite:** dados vindos de uma função isolada que lê a API; sem dados fingidos.

### TASK-007 — Telas Comunicados e Equipe

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Média
- **Depende de:** TASK-019
- **Objetivo:** as duas telas com dados reais do backend. Até lá mostram o estado vazio.
- **Critérios de aceite:** nenhuma ação finge funcionar; nada de dados de exemplo.

### TASK-011 — Seletor global por atalho

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Alta
- **Depende de:** TASK-010
- **Objetivo:** `Ctrl+Alt+Espaço` abre um popup do Hub (sem moldura, sempre no topo, no monitor do cursor) com Hub e apps e o estado de cada um.
- **Critérios de aceite:** setas, Enter, Esc e números; atalho configurável; sem atalhos globais com `Ctrl+Alt+dígito` (AltGr no ABNT2).

### TASK-012 — Bandeja do Windows

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Alta
- **Depende de:** TASK-011
- **Objetivo:** ícone do Hub na bandeja: clique abre o seletor, menu com Abrir Hub, apps e Sair.
- **Critérios de aceite:** fechar a janela só esconde o Hub; "Sair" encerra o Hub sem fechar os apps abertos.

### TASK-013 — Validar a troca entre apps

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Alta
- **Depende de:** TASK-012
- **Objetivo:** provar com o Termix real e 2 apps de teste que a navegação funciona, medindo o foco.
- **Critérios de aceite:** os 7 critérios de `docs/DECISOES.md` (seção 7), com testes automatizados e relatório do que passou, falhou e não deu para verificar. Se o foco falhar, investigar as alternativas listadas e reportar.

## Backlog

Fora da v1. O DEV1 promove para "Prontas" quando decidir.

### TASK-025 — Modo embutível do Termix (repositório do Termix)

- **Responsável:** A definir
- **Status:** FEITA no repositório do Termix como TASK-134 (versão 0.7.0, só o modo `--embed`; a camada `platform` completa segue no Backlog)
- **Depende de:** TASK-024 e aprovação do usuário (mexe no Termix, tarefa própria no repositório dele)
- **Objetivo:** transporte único (IPC ou WebSocket), camada `platform` e modo headless conforme `docs/DECISOES.md` §12. Estimativa ~2 a 3 semanas.

### TASK-017 — Botão "← Hub" e identificador de app comum no Termix

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa
- **Objetivo:** extras opcionais que alteram o repo do Termix (só com aprovação do usuário): voltar ao Hub e agrupar os ícones na barra de tarefas. Testar o agrupamento no laboratório antes.

### TASK-018 — Notícias reais por API

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** trocar o `fetchNews()` de exemplo por uma API, com cache e filtros.

### TASK-019 — Comunicados, equipe e login único com backend

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa
- **Objetivo:** dados compartilhados da empresa (comunicados, equipe, presença, agenda) e sessão única. Exige decidir servidor e banco.

### TASK-020 — Estudar apps dentro da janela do Hub

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Baixa
- **Objetivo:** experimento descartável, só se o usuário voltar a querer isso. Motivos do descarte atual em `docs/DECISOES.md`.

### TASK-037 — Modelo de app novo (repositório template) e fluxo de integração com o Hub

- **Responsável:** A definir
- **Status:** BACKLOG (anotada em 2026-11-13; o usuário quer reavaliar mais tarde)
- **Prioridade:** Média
- **Ideia:** um repositório "template" no GitHub com o app mínimo já no contrato do Hub (modo `--embed`, notificações `HUB_EVENT`, variáveis de cor padrão, empacotamento, script de release, verificação de tema, `CLAUDE.md` e checklist). Novo app = criar o repositório a partir do template, rodar o script `novo-app` (nome, id, ícone, cor, appId) e o Claude conduz o resto: release 0.0.1 com o app vazio, entrada no catálogo do Hub e release do Hub, tudo com OK do usuário antes de publicar. Subir o app vazio antes da primeira função valida o caminho inteiro cedo. O segundo app real é quem prova o contrato (hoje só o Termix o usa). Conversa em `docs/DECISOES.md` §19 (alternativa de o app carregar o próprio tema).

### TASK-038 — Catálogo de apps remoto (app novo aparece sem release do Hub)

- **Responsável:** A definir
- **Status:** BACKLOG (ideia anotada; só depois do segundo app)
- **Prioridade:** Baixa
- **Ideia:** o Hub ler o catálogo (`apps.json`) de um arquivo publicado (por exemplo `catalogo.json` no GitHub) em vez de embutido no código. Decidir o que mostrar sem rede e o que muda para a segurança (lista pública).

### TASK-035 — Repositórios privados e atualização com acesso controlado (pós-MVP)

- **Responsável:** A definir
- **Status:** BACKLOG (pós-MVP)
- **Prioridade:** Média
- **Objetivo:** hoje os repositórios do Hub e do Termix são públicos de propósito. Depois do MVP: código-fonte privado e instaladores num repositório de releases separado e, com o backend e o login único (TASK-019), servidor de atualização que exige login por pessoa. Opções e custos em `docs/DECISOES.md` §18.

## Concluídas

### TASK-015 — Publicar o repositório no GitHub

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Média
- **Objetivo:** criar o repo no GitHub e trocar o `origin` local por ele.
- **Critérios de aceite:** repositório privado `rocruzta50IND/rocruzta-hub` com `main`, `dev1` e `dev2` e o `origin` apontando para ele.
- **Concluída em:** 2026-11-09 (antecipada a pedido do usuário, para continuar em outra máquina)

### TASK-010 — Abrir e focar o Termix, e estado "Em execução"

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** TASK-009
- **Objetivo:** abrir o `Termix.exe` desvinculado do Hub; abrir de novo traz a janela existente para a frente (trava de instância única do Termix).
- **Critérios de aceite:** sem processo duplicado; selo "Em execução" detectado pelo caminho do executável e atualizado em poucos segundos.
- **Concluída em:** 2026-11-08

### TASK-009 — Detectar a instalação do Termix

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** TASK-008
- **Objetivo:** achar o Termix pelo registro do Windows (HKLM e HKCU, Uninstall e WOW6432Node), deduzindo a pasta do `UninstallString`.
- **Critérios de aceite:** instalado: estado com pasta, executável e versão; sem achar: "Não instalado" com botão que abre a página de releases; nada é instalado.
- **Concluída em:** 2026-11-08
- **Fora do escopo:** abrir o app e o estado "Em execução" (TASK-010).

### TASK-008 — Catálogo de apps

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** TASK-004
- **Objetivo:** `src/apps.json` com id, nome, grupo, cor, ícone, repositório do GitHub e dicas de detecção, lido e validado pelo processo principal.
- **Critérios de aceite:** só o Termix no catálogo; adicionar app é só editar o JSON (`docs/DECISOES.md`, seção 11); nada de "Em breve".
- **Concluída em:** 2026-11-08
- **Fora do escopo:** estados instalado, não instalado e em execução na interface vêm das TASK-009 e 010 (dependem da detecção).

### TASK-022 — Tirar "Em breve" e dados de exemplo; só o que é real

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** TASK-005
- **Objetivo:** o Hub não mostra nada fingido: sem selos "Em breve" e "Dados de exemplo", sem comunicados, notícias, equipe e agenda inventados, e só o Termix no catálogo. O plano para os apps futuros fica em `docs/DECISOES.md` (seção 11).
- **Critérios de aceite:** Início mostra só os apps reais; Notícias, Comunicados e Equipe mostram estado vazio honesto; nenhum dado de exemplo no código; testes e verificação no app real passando.
- **Concluída em:** 2026-11-08

### TASK-021 — Ícone do app (pétalas)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Média
- **Objetivo:** trocar o ícone padrão do Electron pelo ícone das pétalas na janela e na barra de tarefas.
- **Critérios de aceite:** `assets/icone.png` (1024 px) usado pela janela; arquivo `.ico` para o instalador fica na TASK-014.
- **Concluída em:** 2026-11-07

### TASK-005 — Tela Início (exemplo)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Média
- **Depende de:** TASK-004
- **Objetivo:** Início como em `base/index.html`, com dados de exemplo marcados.
- **Critérios de aceite:** comunicados, notícias em alta, apps, equipe e agenda, todos com o selo adequado.
- **Concluída em:** 2026-11-07

### TASK-004 — Casca do Hub e navegação interna

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** TASK-003
- **Objetivo:** barra de título com o seletor de app, sidebar (Início, Notícias, Comunicados, Equipe e apps agrupados) e troca de telas.
- **Critérios de aceite:**
  - Seletor e sidebar listam os apps do catálogo, Termix ativo e os demais com "Em breve".
  - Atalhos internos só com a janela em foco e fora de campos de texto.
- **Concluída em:** 2026-11-07

### TASK-003 — Tokens de design e componentes base

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** TASK-002
- **Objetivo:** levar o visual de `base/index.html` para arquivos CSS reutilizáveis.
- **Critérios de aceite:**
  - Variáveis CSS (escuro e claro), vidro, Inter embutida, botões, listas agrupadas e o componente "Em breve" / "Dados de exemplo".
  - Aparência fiel à referência, conferida por screenshot.
- **Concluída em:** 2026-11-07

### TASK-002 — Esqueleto do app Electron (Windows)

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** nada
- **Objetivo:** projeto Electron que abre uma janela sem moldura com barra de título própria e controles por IPC.
- **Critérios de aceite:**
  - `package.json`, estrutura `src/main`, `src/renderer`, `src/preload`, `contextIsolation` ligado e sem `nodeIntegration`.
  - Instância única, identificador `com.rocruzta.hub`, dados em `%APPDATA%\Rocruzta Hub`.
  - Scripts `start` e `test` (e lint, se couber) funcionando, e `validacao` preenchida em `.claude/fluxo.json`.
- **Concluída em:** 2026-11-07

### TASK-001 — Reescrever docs/ARQUITETURA.md para o modelo lançador

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Prioridade:** Alta
- **Depende de:** nada
- **Objetivo:** substituir o documento antigo (módulos, `hubApi`, registro, janela embutida, Termix open source) pelo modelo decidido em `docs/DECISOES.md`.
- **Critérios de aceite:**
  - Descreve o Hub como centro e lançador, apps independentes, catálogo, detectar, abrir e focar, seletor global e bandeja.
  - Não menciona módulos, `hubApi` nem registro de versões, e identifica o Termix correto.
  - Traz o plano em fases (v1 e depois) e fica curto, sem repetir o `DECISOES.md`.
- **Concluída em:** 2026-11-07

### TASK-000 — Adotar o fluxo DEV2 → DEV1 → MAIN

- **Responsável:** DEV1
- **Status:** CONCLUÍDA
- **Descrição:** Adoção do fluxo via plugin `fluxo` v1: branches `main`/`dev1`/`dev2`, `WORKFLOW.md`, seção do fluxo no `CLAUDE.md`, `docs/TASKS.md`, `docs/CHANGELOG_DEV.md` e `.claude/fluxo.json`. O `origin` é um repositório local por enquanto.
- **Concluída em:** 2026-11-07

<!--
Modelo de tarefa:

### TASK-XXX — Título curto

- **Responsável:** DEV1 | DEV2 | A definir
- **Status:** BACKLOG | PRONTA | EM ANDAMENTO | AGUARDANDO VALIDAÇÃO DEV1 | VALIDADA EM DEV1 | CONCLUÍDA
- **Prioridade:** Alta | Média | Baixa
- **Objetivo:** ...
- **Critérios de aceite:**
  - ...
-->
