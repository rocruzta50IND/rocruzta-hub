# CHANGELOG_DEV — Rocruzta Hub

Histórico legível do que foi desenvolvido, alterado ou corrigido. Uma entrada por tarefa, mais recente no topo, com data e papel.

> **BASELINE — 2026-11-07.** O que existia antes da adoção do fluxo é só design: a referência visual aprovada (`base/index.html`) e a documentação de arquitetura (desatualizada, a ser reescrita na TASK-001). Não há código de produto. O changelog detalhado começa nesta data.

---

## 2026-11-07

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
