# Arquitetura do Rocruzta Hub

O modelo e as decisões estão em `docs/DECISOES.md`; aqui fica só a visão técnica. Só Windows.

## 1. Papel do Hub

O Hub é o **centro e o lançador** dos apps da Rocruzta. Ele só facilita a navegação. Cada app é independente, com repositório, processo, janela e atualização próprios, e **não usa recursos nem processos do Hub, nem o contrário**.

```
┌──────────────────────── Rocruzta Hub (Electron) ────────────────────────┐
│  Janela principal   Seletor global (atalho)   Bandeja                   │
│  Telas: Início, Notícias, Comunicados, Equipe                           │
│  Catálogo (apps.json) → detectar → abrir/focar → "Em execução"          │
└───────────────┬───────────────────────────────┬─────────────────────────┘
                │ abre o executável             │ abre o executável
        ┌───────▼───────┐               ┌───────▼───────┐
        │    Termix     │               │ outros apps   │
        │ processo      │               │ (Em breve)    │
        │ próprio       │               │               │
        └───────────────┘               └───────────────┘
```

## 2. Peças

| Peça | O que faz |
|---|---|
| **Janela principal** | Sem moldura, com barra de título própria (controles por IPC), seletor de app, sidebar e troca de telas. |
| **Telas** | Início, Notícias, Comunicados e Equipe. Na v1 são exemplo e levam o selo "Dados de exemplo" ou "Em breve". |
| **Catálogo** | `apps.json`: id, nome, grupo, cor, ícone, repositório do GitHub e dicas de detecção. Adicionar um app é editar o JSON. |
| **Detecção** | Procura a instalação no registro do Windows (HKLM e HKCU, Uninstall, incluindo WOW6432Node) e deduz a pasta do `UninstallString`. Sem achar: "Não instalado", com link para as releases. |
| **Abrir e focar** | Abre o executável desvinculado do Hub. Abrir de novo traz a janela existente para a frente (trava de instância única do app). |
| **Estado "Em execução"** | Detectado pelo caminho do executável e atualizado em poucos segundos. |
| **Seletor global** | Popup sem moldura, sempre no topo, no monitor do cursor, aberto por `Ctrl+Alt+Espaço` (configurável). Setas, Enter, Esc e números. |
| **Bandeja** | Clique abre o seletor; menu com Abrir Hub, apps e Sair. Fechar a janela só esconde o Hub; "Sair" não fecha os apps abertos. |

## 3. Estrutura do código

- `src/main`: processo principal (janela, instância única, detecção, abrir/focar, atalho global, bandeja).
- `src/preload`: ponte mínima para o renderer, com `contextIsolation` ligado e sem `nodeIntegration`.
- `src/renderer`: HTML, CSS e JS puros, sem framework nem build. Fonte Inter embutida.
- Identificador `com.rocruzta.hub`; dados do usuário em `%APPDATA%\Rocruzta Hub`.

## 4. Apps

- **Termix** é o único app real: o app Electron da Rocruzta (`rocruzta50IND/termix`), instalado em `D:\Termix` nesta máquina. Não é o projeto open source Termix SSH.
- Os demais aparecem desabilitados com "Em breve".
- O Hub não altera nenhum app. Mudanças neles só como tarefa própria, aprovada pelo usuário.

## 5. Plano em fases

| Fase | Conteúdo | Tarefas |
|---|---|---|
| **v1** | Esqueleto, design, telas de exemplo, catálogo, detectar, abrir e focar o Termix, seletor global, bandeja e validação da troca entre apps. | TASK-002 a 013 |
| **Depois** | Instalador do Hub, publicar no GitHub, instalar e atualizar apps pelas releases, notícias reais, backend e login único, extras no Termix. | Backlog |
