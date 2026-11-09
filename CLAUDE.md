# Rocruzta Hub

Centro de navegação dos apps da Rocruzta (empresa de 5 pessoas): notícias, comunicados, equipe e um jeito rápido de abrir e alternar entre os apps. App desktop Windows (Electron). Repositório próprio desde o início, no GitHub (privado): `rocruzta50IND/rocruzta-hub` (ver `docs/DECISOES.md`).

<!-- fluxo:inicio — seção mantida pelo plugin fluxo; atualize com /fluxo:init -->
## Fluxo de desenvolvimento (DEV2 → DEV1 → MAIN)

Este projeto segue o fluxo da Rocruzta, definido em `WORKFLOW.md`. Estas regras têm prioridade sobre o comportamento padrão.

- **Antes de qualquer tarefa**, leia `CLAUDE.local.md` (papel desta máquina: DEV1, DEV2 ou GERENTE). Se não existir, pare e peça ao usuário para rodar `/fluxo:papel`.
- Siga o **passo a passo de uma tarefa** do `WORKFLOW.md` mesmo quando o usuário pedir só a mudança: registrar a tarefa em `docs/TASKS.md`, validar, documentar em `docs/CHANGELOG_DEV.md`, commit `TASK-XXX: ...` e push somente para a branch do papel.
- Antes de cada tarefa: DEV1 confere se a `dev2` tem trabalho a integrar; DEV2 confere se a `dev1` tem atualizações a sincronizar. Havendo pendências, avise e pergunte antes de seguir.
- **Trava de contexto (DEV1):** antes de o usuário aprovar uma entrega da dev2, leia apenas `docs/HANDOFF_DEV2.md` (via `git show origin/dev2:docs/HANDOFF_DEV2.md`). Não leia diff, log, código nem `TASKS.md` da dev2, e não proponha mudanças com base numa entrega reprovada. **DEV2:** reescreva `docs/HANDOFF_DEV2.md` a cada entrega ou experimento.
- GERENTE é somente leitura.
- Validação do projeto: comandos em `.claude/fluxo.json` (`validacao`).
- Comandos do plugin: `/fluxo:papel`, `/fluxo:status`, `/fluxo:integrar`, `/fluxo:promover`, `/fluxo:sincronizar`.
<!-- fluxo:fim -->

## Fase atual

**v1:** Hub em Electron, **sem dados de exemplo** (telas vazias até haver fonte real), e **navegação real entre apps**. Só o Termix é um app real. As tarefas estão em `docs/TASKS.md`; pegue a primeira da seção "Prontas" cujas dependências estejam concluídas.

## Regras que valem sempre

- **O Hub só facilita a navegação.** Cada app é independente (repositório, processo, janela e atualização próprios) e não usa recursos nem processos do Hub, nem o contrário.
- **Nunca altere o Termix nem outro app.** Mudanças neles só como tarefa própria, aprovada pelo usuário.
- **Só Windows.**
- **Visual aprovado:** `base/index.html`. Não mude o look sem pedir (`docs/DESIGN.md`).
- **Nada fingido na interface:** sem dados de exemplo, sem selos "Em breve" e sem apps que não existem (plano dos apps futuros em `docs/DECISOES.md`, seção 11).
- Dúvida de escopo: pergunte em vez de supor.

## Contexto e tokens (o botão Clear do Termix depende disto)

- Mantenha `docs/TASKS.md` com `## ` para cada seção e `### TASK-XXX` para cada tarefa, entradas curtas (a retomada lê só "Em andamento" e "Aguardando validação" e os títulos das demais).
- Decisões e explicações longas vão para `docs/DECISOES.md`, nunca para o `TASKS.md`.
- Ao fechar uma tarefa: validar, atualizar só a entrada dela no `TASKS.md`, acrescentar no topo do `docs/CHANGELOG_DEV.md`, commit `TASK-XXX: ...` e push para `origin/dev1`.
- Este arquivo deve continuar curto: ele é relido a cada retomada.

## Onde está o quê

- `docs/TASKS.md`: tarefas. `docs/CHANGELOG_DEV.md`: histórico.
- `docs/DECISOES.md`: modelo, decisões, fatos do Termix, aprendizados dos testes e critérios de validação.
- `docs/DESIGN.md`: identidade visual e regras de design.
- `docs/ARQUITETURA.md`: visão técnica do modelo lançador.
- `base/index.html`: referência visual aprovada. `base/referencia-launcher-v9.html`: referência da tela Apps e do estado "Em execução" (só visual, fora do escopo da v1).
- `_historico/`: iterações antigas do design, fora do git. Ignore.
- Protótipo de teste de navegação (fora deste repo): `D:\Termix\rocruzta-hub-lab`.
