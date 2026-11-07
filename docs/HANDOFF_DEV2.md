<!-- fluxo:v1 — escrito pelo DEV2, lido pelo DEV1. É a ÚNICA parte da dev2 que o DEV1 vê antes de o usuário aprovar a entrega. -->
# HANDOFF DEV2 → DEV1

Resumo da entrega atual da dev2. O DEV2 reescreve este arquivo a cada entrega (ou experimento) e o inclui no commit/push da dev2.

**Regras de escrita:** descreva *o quê* e *por quê*, em alto nível. **Não cole código, diffs nem trechos de arquivos.** O DEV1 só tem acesso a este resumo até o usuário aprovar; se a entrega for reprovada, ele não deve ficar com o conteúdo da dev2 no contexto.

- **Status:** AGUARDANDO DECISÃO  <!-- AGUARDANDO DECISÃO | APROVADA | REPROVADA | EXPERIMENTO (não entregar) -->
- **Tarefas:** TASK-XXX
- **IDs de tarefa usados pela dev2:** TASK-XXX (o DEV1 usa esta lista para escolher números livres)
- **Data:** AAAA-MM-DD

## Resumo do que mudou

(2–6 linhas: objetivo e resultado.)

## Áreas e arquivos afetados

(Pastas/módulos tocados, sem detalhar código.)

## Impacto e riscos

(Comportamento que muda, migrações, dependências novas, risco de regressão.)

## Como validar

(Comandos ou passos de teste.)

## Decisão do DEV1 / usuário

(Preenchido depois: aprovada, reprovada e motivo. Em caso de reprovação, o DEV2 desfaz as alterações com `git revert` antes de uma nova entrega — assim o código reprovado não volta pela integração.)
