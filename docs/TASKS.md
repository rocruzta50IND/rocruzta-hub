# TASKS — Rocruzta Hub

Controle de tarefas do projeto. Ao receber um pedido, o Claude localiza a tarefa aqui (ou cria uma nova entrada) antes de desenvolver.

Formato do ID: `TASK-XXX` — numeração sequencial, sem reuso, livre em todas as branches. Status e responsabilidades em `WORKFLOW.md`. Contexto e decisões em `docs/DECISOES.md`.

---

## Em andamento

_Nenhuma no momento._

## Aguardando validação DEV1

_Nenhuma no momento._

## Validadas em DEV1

_Nenhuma no momento._

## Prontas

Ordem de execução da v1. Pegue a primeira cujas dependências estejam concluídas.

### TASK-004 — Casca do Hub e navegação interna

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Alta
- **Depende de:** TASK-003
- **Objetivo:** barra de título com o seletor de app, sidebar (Início, Notícias, Comunicados, Equipe e apps agrupados) e troca de telas.
- **Critérios de aceite:**
  - Seletor e sidebar listam os apps do catálogo, Termix ativo e os demais com "Em breve".
  - Atalhos internos só com a janela em foco e fora de campos de texto.

### TASK-005 — Tela Início (exemplo)

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Média
- **Depende de:** TASK-004
- **Objetivo:** Início como em `base/index.html`, com dados de exemplo marcados.
- **Critérios de aceite:** comunicados, notícias em alta, apps, equipe e agenda, todos com o selo adequado.

### TASK-006 — Tela Notícias (exemplo)

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Média
- **Depende de:** TASK-004
- **Objetivo:** blog de notícias com destaque, grade, filtros por categoria, busca, "Em alta", tópicos e salvos.
- **Critérios de aceite:** dados vindos de uma função `fetchNews()` isolada que devolve exemplos; o selo "Dados de exemplo" visível.

### TASK-007 — Telas Comunicados e Equipe (exemplo)

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Média
- **Depende de:** TASK-004
- **Objetivo:** as duas telas como na referência, com "Em breve" em novo comunicado, mensagem e presença.
- **Critérios de aceite:** nenhuma ação finge funcionar; tudo que é exemplo está marcado.

### TASK-008 — Catálogo de apps

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Alta
- **Depende de:** TASK-004
- **Objetivo:** `apps.json` com id, nome, grupo, cor, ícone, repositório do GitHub e dicas de detecção; estados dos apps na interface.
- **Critérios de aceite:** só o Termix é lançável; os demais aparecem desabilitados com "Em breve"; adicionar um app novo é só editar o JSON.

### TASK-009 — Detectar a instalação do Termix

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Alta
- **Depende de:** TASK-008
- **Objetivo:** achar o Termix pelo registro do Windows.
- **Critérios de aceite:**
  - Procura em HKLM e HKCU (Uninstall, incluindo WOW6432Node) a entrada com DisplayName "Termix" e deduz a pasta do `UninstallString` (`InstallLocation` vem vazio nesta máquina, instalado em `D:\Termix`).
  - Sem achar: estado "Não instalado" com botão que abre a página de releases; nada é instalado.

### TASK-010 — Abrir e focar o Termix, e estado "Em execução"

- **Responsável:** DEV1
- **Status:** PRONTA
- **Prioridade:** Alta
- **Depende de:** TASK-009
- **Objetivo:** abrir o `Termix.exe` desvinculado do Hub; abrir de novo traz a janela existente para a frente (trava de instância única do Termix).
- **Critérios de aceite:** sem processo duplicado; selo "Em execução" detectado pelo caminho do executável e atualizado em poucos segundos.

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

### TASK-014 — Empacotar o instalador do Hub

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** instalador do Windows por usuário (sem administrador) com atualização do próprio Hub.

### TASK-015 — Publicar o repositório no GitHub

- **Responsável:** DEV1
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** criar o repo no GitHub depois que o app estiver pronto para testar com o Termix e trocar o `origin` local por ele (`git remote set-url origin <url>`).

### TASK-016 — Instalar e atualizar apps pelas releases do GitHub

- **Responsável:** A definir
- **Status:** BACKLOG
- **Prioridade:** Média
- **Objetivo:** loja de apps: baixar o instalador da última release, instalar, avisar de versão nova. Considerar que o Termix está instalado para todos os usuários (pede administrador).

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

## Concluídas

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
