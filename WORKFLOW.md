<!-- fluxo:v1 — gerado pelo plugin fluxo (github.com/rocruzta50IND/fluxo-rocruzta). Atualize com /fluxo:init em vez de editar à mão. -->
# WORKFLOW.md — Fluxo oficial de desenvolvimento

Este projeto segue o fluxo **DEV2 → DEV1 → MAIN** da Rocruzta. Este documento define os papéis, o passo a passo de cada tarefa e o que cada papel nunca deve fazer. O `CLAUDE.md` aponta para cá.

```
DEV2 ──> DEV1 ──> MAIN
  ↑        │
  └────────┘  (DEV2 sincroniza a partir da DEV1)
```

## Papéis

O papel é definido **por máquina e por repositório** no arquivo `CLAUDE.local.md` (não versionado), criado com `/fluxo:papel`. A identidade de commit (`user.name`/`user.email`) também é configurada só neste repositório (`git config --local`).

### DEV1 — Responsável técnico principal

Branch: `dev1`.

- Desenvolve diretamente em `dev1`.
- **Antes de cada tarefa**, verifica se a `dev2` tem trabalho novo (`git fetch` + `git log dev1..origin/dev2`). Havendo, avisa o usuário e pergunta se deve integrar primeiro (`/fluxo:integrar`).
- **Trava de contexto:** antes de o usuário aprovar uma entrega da dev2, o DEV1 só lê `docs/HANDOFF_DEV2.md` (`git show origin/dev2:docs/HANDOFF_DEV2.md`) e a contagem de commits. Não lê diff, log, código nem `TASKS.md` da dev2, e não faz merge. Entrega **reprovada** não vira referência: o DEV1 não a analisa nem propõe mudanças com base nela.
- Integra a `dev2` na `dev1` (só após aprovação do usuário), resolve conflitos, roda a validação do projeto e marca as tarefas como **VALIDADA EM DEV1**.
- Promove `dev1 → main` (`/fluxo:promover`) somente com o código validado e com confirmação explícita do usuário. A `main` só avança em fast-forward.
- Não usa `--force` nem reescreve o histórico de `main` ou `dev1`.

### DEV2 — Desenvolvedor auxiliar

Branch: `dev2`.

- **Antes de cada tarefa**, verifica se a `dev1` tem commits que a `dev2` ainda não tem (`git fetch` + `git log dev2..origin/dev1`). Havendo, sincroniza (`/fluxo:sincronizar`) antes de começar — assim trabalha sempre sobre a versão mais recente.
- Desenvolve em `dev2` e faz push **somente** para `origin/dev2`.
- Ao concluir (ou ao propor um experimento), **reescreve `docs/HANDOFF_DEV2.md`** — resumo em alto nível, sem colar código — e o inclui no push. É o único canal pelo qual o DEV1 conhece o trabalho da dev2 antes da aprovação.
- Entrega reprovada: desfaz as alterações com `git revert` (nunca `reset --hard`) e só então publica um novo resumo.
- Ao concluir, marca a tarefa como **AGUARDANDO VALIDAÇÃO DEV1**.
- Nunca envia para `main` ou `dev1`, nunca faz force push, nunca descarta trabalho (`reset --hard`, `clean -f`, `checkout --`, `restore`).

### GERENTE — Acompanhamento

Sem branch própria (normalmente fica na `main`).

- Acompanha branches, `docs/TASKS.md` e `docs/CHANGELOG_DEV.md` (`/fluxo:status`).
- **Somente leitura:** não edita arquivos do projeto, não faz commit, push, merge, rebase, reset, cherry-pick, revert ou tag.
- Recomendações viram tarefas que o DEV1 registra.

## Passo a passo de uma tarefa (DEV1 e DEV2)

1. **Papel e branch** — ler `CLAUDE.local.md`; estar na branch do papel (`dev1` ou `dev2`).
2. **Atualizar** — `git fetch origin` e `git pull --ff-only`. Depois:
   - DEV1: conferir só a **contagem** `git rev-list --count dev1..origin/dev2` e ler o resumo `docs/HANDOFF_DEV2.md` (trava de contexto; o código da dev2 só depois da aprovação do usuário).
   - DEV2: conferir `dev2..origin/dev1` (atualizações da DEV1 a sincronizar).
   - Havendo pendências, avisar o usuário e perguntar antes de seguir.
3. **Contexto** — ler `CLAUDE.md`, este arquivo e `docs/TASKS.md`.
4. **Tarefa** — localizar a tarefa em `docs/TASKS.md` ou criar uma entrada com o próximo número livre. O número deve ser livre em **todas** as branches: DEV2 confere `git show origin/dev1:docs/TASKS.md`; DEV1 confere `origin/main` e a lista "IDs de tarefa usados pela dev2" do `docs/HANDOFF_DEV2.md` (não abre o `TASKS.md` da dev2). Escopo ambíguo → confirmar com o usuário.
5. **Desenvolver** — somente o escopo da tarefa.
6. **Validar** — rodar os comandos de `validacao` de `.claude/fluxo.json` (e testar manualmente quando a mudança for visual).
7. **Documentar** — atualizar `docs/TASKS.md` (status) e `docs/CHANGELOG_DEV.md` (entrada com data).
8. **Commit** — `TASK-XXX: descrição curta no imperativo`. Revisar `git status`/`git diff` antes; nunca versionar `.env`, credenciais ou `CLAUDE.local.md`.
9. **Push** — somente para a branch do papel.
10. **Encaminhar**:
    - DEV2 → tarefa em **AGUARDANDO VALIDAÇÃO DEV1** e avisar o usuário.
    - DEV1 → tarefa pronta para promoção; promover só quando o usuário pedir.

## Status das tarefas (`docs/TASKS.md`)

| Status | Significado | Quem define |
|---|---|---|
| BACKLOG | Identificada, escopo definido, sem prioridade | qualquer um (registrada pelo DEV1/DEV2) |
| PRONTA | Priorizada, pode ser iniciada | DEV1 |
| EM ANDAMENTO | Em desenvolvimento em `dev1` ou `dev2` | quem desenvolve |
| AGUARDANDO VALIDAÇÃO DEV1 | DEV2 concluiu e enviou para `dev2` | DEV2 |
| VALIDADA EM DEV1 | Integrada e validada na `dev1`, aguardando promoção | DEV1 |
| CONCLUÍDA | Promovida para `main` | DEV1 |

## Convenções

- Commits: `TASK-XXX: descrição curta no imperativo` (ex.: `TASK-012: adicionar seção de contato`).
- Integração da `dev2`: commit de merge `TASK-XXX: integrar dev2 na dev1 (...)`.
- Branches auxiliares para tarefas grandes: `dev1/task-012` ou `dev2/task-012`, sempre mescladas de volta na branch de origem — nunca direto na `main`.

## Nunca (qualquer papel)

- `git push --force` em branch compartilhada; excluir `main`, `dev1` ou `dev2`.
- Pular hooks (`--no-verify`).
- `git reset --hard` ou descartar trabalho sem confirmação explícita do usuário.
- Commitar `.env`, credenciais, certificados, chaves ou `CLAUDE.local.md`.
- Levar código da `dev2` para a `main` sem passar pela `dev1`.
- DEV1 ler ou aproveitar código de uma entrega da dev2 ainda não aprovada (ou reprovada).

## Guardrails

O plugin `fluxo` instala hooks que aplicam estas regras automaticamente no Claude Code (Bash e PowerShell): bloqueiam push do DEV2 para `main`/`dev1`, a leitura do código da dev2 pelo DEV1 antes da aprovação do usuário, qualquer escrita do GERENTE, commits sem papel definido, force push em `main`/`dev1`, exclusão de branches do fluxo e `--no-verify`. Os guardrails só funcionam em máquinas com o plugin instalado — por isso ele é obrigatório para toda a equipe.
