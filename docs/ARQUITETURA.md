# Arquitetura do Rocruzta Hub

> **DESATUALIZADO. Não use como referência.** Este texto descreve o modelo antigo (módulos, manifesto, ponte `hubApi`, registro de versões, apps dentro da janela do Hub) e trata o Termix como o projeto open source de outra empresa. O modelo decidido está em `docs/DECISOES.md` e este arquivo será reescrito na TASK-001.

> **Status:** rascunho para discussão. Nada aqui está decidido ainda. As recomendações são pontos de partida, e as
> decisões fechadas devem ser movidas para a seção "Decisões tomadas" no fim do arquivo.

## 1. O problema

O Hub reúne vários apps (Termix, Workflow, Instamidia, RocStudio, FinanPro, Lignum). Cada app deve ser um **repositório
isolado**, com versionamento próprio, de modo que:

1. publicar uma versão nova do FinanPro **não exige** tocar no Hub nem em nenhum outro app;
2. um app com bug ou quebrado **não derruba** os demais nem o Hub;
3. o Hub consiga **abrir, instalar, atualizar e reverter** cada app de forma independente;
4. a pessoa use tudo como **um produto só**: mesmo login, mesma aparência, mesmas notificações.

Em uma frase: o Hub é o **shell** e o **contrato**, e os apps são **pacotes independentes** que se encaixam nele.

## 2. Princípios

- **Isolamento por padrão.** Cada app roda separado (processo, sessão e armazenamento próprios). Nenhum app lê código ou dados de outro.
- **Contrato pequeno e versionado.** O Hub e os apps só se falam por uma interface estreita, com versão (`hubApi`).
- **Versão por app.** Cada repo segue semver e publica releases. O Hub só "enxerga" apps pelo registro e pelo manifesto.
- **O Hub não conhece os apps.** Nenhum nome de app no código do shell. Tudo vem do registro de apps (hoje `APPS` no mockup).
- **Falhar de forma segura.** Se um app não carrega, o Hub mostra um erro e oferece reverter para a versão anterior.

## 3. Visão geral

```
                     ┌───────────────────────────────────────────────┐
                     │                  ROCRUZTA HUB                 │
                     │  (shell: título, seletor de app, sidebar,     │
                     │   notícias, comunicados, equipe, atalhos)     │
                     │                                               │
                     │  Registro de apps ── Gerenciador de apps      │
                     │  Sessão única (login) ── Barramento de eventos│
                     └───────┬──────────────┬──────────────┬─────────┘
                             │  Contrato do Hub (manifesto + ponte)  │
              ┌──────────────┴──┐   ┌───────┴────────┐   ┌─┴────────────────┐
              │  app-termix     │   │  app-finanpro  │   │  app-lignum  ... │
              │  repo próprio   │   │  repo próprio  │   │  repo próprio    │
              │  v1.9.2         │   │  v2.1.0        │   │  v0.2.0          │
              └─────────────────┘   └────────────────┘   └──────────────────┘
                        ▲                    ▲                    ▲
                        └────────── Registro (JSON) ──────────────┘
                              lista apps, versões e artefatos
```

Peças:

| Peça | O que faz |
|---|---|
| **Shell do Hub** | Janela, navegação, seletor de app, notícias, comunicados, equipe. Hospeda cada app em uma "view" isolada. |
| **Contrato do Hub** | O manifesto do app (`manifest.json`) e a **ponte** (API que o app usa para falar com o Hub). |
| **SDK de app** | Biblioteca, CLI e template para criar um app que respeita o contrato (e empacotar, validar, publicar). |
| **Registro** | Arquivo JSON versionado que diz quais apps existem, suas versões e onde baixar. |
| **Gerenciador de apps** | Dentro do Hub: instala, atualiza, desativa e reverte apps a partir do registro. |
| **Sessão única** | O Hub autentica a pessoa uma vez e entrega aos apps uma credencial curta. |

## 4. Como o Hub abre um app: opções

Esta é a decisão central. Quatro caminhos possíveis:

### A. Apps como serviços web (o Hub só aponta para uma URL)

Cada app é um site/servidor próprio. O Hub abre a URL em um iframe sandbox ou numa view nativa.

- **Prós:** isolamento total; o app é deployado sozinho; fácil de começar; funciona para apps que já têm backend.
- **Contras:** depende de rede/servidor; sem offline; atualizar = redeploy no servidor; integração visual e de login exige trabalho.

### B. Apps como pacotes instalados (estilo plugin do Termix)

Cada app é buildado em um **pacote** (manifesto + arquivos do front, opcionalmente um backend). O Hub baixa o pacote do
registro, guarda em disco e serve localmente em uma view isolada.

- **Prós:** versionamento e rollback simples (pasta por versão); funciona offline; instalação e atualização controladas pelo Hub; um app não afeta o outro.
- **Contras:** mais trabalho inicial (empacotar, assinar, gerenciar versões); apps com backend próprio precisam de uma saída (ver abaixo).

### C. Módulos no mesmo runtime (o app é código carregado dentro do Hub)

O Hub importa o código do app na mesma página/processo.

- **Prós:** integração perfeita; sem custo de views.
- **Contras:** **um app com bug derruba o Hub**; dependências podem conflitar; isolamento fraco. Vai contra o objetivo.

### D. Apps independentes lançados pelo Hub (janelas/processos separados)

O Hub só lista e abre outros executáveis.

- **Prós:** isolamento máximo; cada app pode usar qualquer stack.
- **Contras:** experiência fragmentada (janelas soltas), sem seletor de app no mesmo shell, aparência inconsistente.

### Comparação

| Critério | A. URL | B. Pacote | C. Mesmo runtime | D. Janelas |
|---|---|---|---|---|
| Isolamento entre apps | alto | alto | **baixo** | máximo |
| Versionamento independente | médio | **alto** | baixo | alto |
| Rollback fácil | baixo | **alto** | baixo | médio |
| Funciona offline | não | **sim** | sim | sim |
| Integração visual e de login | média | **boa** | ótima | fraca |
| Esforço inicial | **baixo** | médio | médio | baixo |

### Recomendação (para discutir)

**Híbrido B + A, com o mesmo contrato:** o manifesto declara como o app é aberto.

- `entry.type = "package"`: o Hub serve os arquivos do pacote localmente (ex.: protocolo interno `rocapp://finanpro/`).
- `entry.type = "remote"`: o Hub abre uma URL (apps que dependem de servidor, como o próprio Termix com seu backend).

Nos dois casos o app roda numa **view isolada** e fala com o Hub pela **mesma ponte**. Assim dá para começar com `remote`
(rápido) e migrar app a app para `package` sem mudar o Hub.

> **Atenção com o Termix:** hoje ele é um app Electron completo, com backend e banco próprios (SQLite) e seu próprio
> sistema de plugins. Embuti-lo dentro do Hub é diferente de embutir um app web leve. Opções: (1) o Hub abre a
> **versão web** do Termix apontando para um servidor Termix (`remote`); (2) o Hub apenas **lança o app desktop**
> existente; (3) criar um front dedicado ao Hub falando com o backend do Termix. Precisa ser decidido separadamente.

## 5. Isolamento em tempo de execução

Cada app roda isolado dos demais e do Hub:

- **View por app**, com **sessão e armazenamento separados** (partição própria): cookies, `localStorage` e cache de um app não são visíveis ao outro.
- **Sandbox:** sem acesso a Node/Electron; só o que a ponte oferece.
- **Segurança de conteúdo (CSP):** o app só carrega recursos do próprio pacote ou de domínios permitidos no manifesto.
- **Permissões declaradas** no manifesto e aprovadas pelo Hub (rede, notificações, armazenamento, abrir links externos).
- **Falha contida:** se a view de um app trava ou cai, o Hub mostra uma tela de erro com "Recarregar" e "Voltar para a versão anterior".

Como referência, o Termix já embute páginas externas em `WebContentsView` isoladas (sessão não persistente, sem
permissões, só http(s) e ws(s)), ver `electron/embedded-view.cjs` e `electron/isolated-window.cjs`.

## 6. O contrato do app

### 6.1 Manifesto (`manifest.json`, na raiz do repo/pacote do app)

Proposta inicial (campos sujeitos a discussão):

```json
{
  "id": "finanpro",
  "name": "FinanPro",
  "version": "2.1.0",
  "description": "Contas, caixa e relatórios",
  "hubApi": "^1.0.0",
  "group": "Negócio",
  "icon": "icon.svg",
  "accent": "#f0a000",
  "entry": { "type": "package", "path": "dist/index.html" },
  "sections": [
    { "id": "painel", "label": "Painel" },
    { "id": "contas", "label": "Contas" },
    { "id": "caixa",  "label": "Fluxo de caixa" }
  ],
  "permissions": ["notifications", "storage", "external-links"],
  "repository": "github.com/rocruzta/app-finanpro"
}
```

- `id`, `name`, `version`, `icon`, `accent`, `group` alimentam o seletor, a sidebar e a faixa de apps (hoje o registro `APPS`).
- `hubApi` diz com qual versão do contrato o app foi feito (ver 7.3).
- `sections` alimenta a sidebar interna do app dentro do Hub.
- `entry` diz como abrir (`package` ou `remote`).

### 6.2 A ponte Hub ↔ app

Uma API pequena, trocada por mensagens (`postMessage`), exposta ao app por um SDK. Ideias de superfície inicial:

| Direção | Chamada | Para quê |
|---|---|---|
| Hub → app | `hub.context` | pessoa logada, tema (claro/escuro), idioma, seção ativa |
| Hub → app | `hub.onThemeChange` | app acompanha o tema do Hub |
| app → Hub | `hub.navigate(section)` | mudar a seção ativa (atualiza a sidebar) |
| app → Hub | `hub.badge.set(n)` | número no ícone (ex.: 2 posts para revisar) |
| app → Hub | `hub.notify({...})` | notificação para a pessoa |
| app → Hub | `hub.openExternal(url)` | abrir link no navegador, com permissão |
| app → Hub | `hub.events.emit/on` | eventos entre apps, **mediados pelo Hub** |

Regra de ouro: **apps nunca falam direto entre si**. Se o Workflow precisa avisar o FinanPro, emite um evento ao Hub, que
entrega só a quem declarou interesse e tem permissão.

## 7. Versionamento independente

### 7.1 Um repo, uma versão, um release

- Cada app usa **semver** no próprio repo (`app-finanpro` v2.1.0, `app-lignum` v0.2.0, ...).
- Um release no GitHub gera um **artefato** (`finanpro-2.1.0.rocapp`, um zip com manifesto e arquivos) + checksum/assinatura.
- Mudar um app **nunca** exige commit em outro repo.

### 7.2 O registro

Um repo/arquivo separado (`rocruzta-registry`) com um `apps.json`:

```json
{
  "apps": [
    {
      "id": "finanpro",
      "channel": { "stable": "2.1.0", "beta": "2.2.0-beta.1" },
      "versions": [
        { "version": "2.1.0", "hubApi": "^1.0.0", "url": "https://.../finanpro-2.1.0.rocapp", "sha256": "..." }
      ]
    }
  ]
}
```

O Hub lê o registro, compara com o que está instalado e oferece "Atualizar". Publicar um app novo = abrir um PR no
registro (ou o CI do app fazer isso sozinho).

### 7.3 Compatibilidade entre o Hub e os apps

- O **contrato do Hub** (`hubApi`) tem semver próprio.
- Mudança **compatível** (campo novo opcional, chamada nova): sobe o minor, nenhum app precisa mudar.
- Mudança **quebrando**: sobe o major. O Hub mantém compatibilidade com o major anterior por um tempo (camada de compatibilidade) e avisa quais apps estão defasados.
- Cada app declara o intervalo que suporta (`"hubApi": "^1.0.0"`). O Hub **só instala** versões compatíveis com ele.

### 7.4 Atualização e rollback

- O Hub mantém **a versão atual e a anterior** de cada app em pastas separadas (`apps/finanpro/2.1.0/`, `.../2.0.3/`).
- Atualizar = baixar, verificar checksum, trocar o ponteiro. Reverter = voltar o ponteiro.
- Canais `stable` e `beta` por app, para testar uma versão sem afetar os 5 usuários.
- Atualização **por app**: atualizar o FinanPro não reinicia nada além dele.

### 7.5 Código compartilhado sem acoplar

Para manter o visual igual sem criar dependência entre os apps:

- Um pacote versionado de **design** (`@rocruzta/ui`: tokens de cor, tipografia, componentes) que cada app **embute na sua própria versão**.
- Atualizar o `@rocruzta/ui` não força nenhum app a mudar. Cada um adota a versão nova quando quiser.
- Os tokens (cores da marca, vidro, raios) já estão em variáveis CSS na base visual.

## 8. Login e dados compartilhados

- **Uma sessão só:** a pessoa entra no Hub. Quando abre um app, o Hub entrega um **token curto e assinado** (quem é a pessoa, papel, validade).
- O app valida o token (chave pública do Hub) e **não precisa de um login próprio**.
- **Equipe e presença** ("Ana usando o FinanPro") vêm do Hub, que recebe o estado de cada app pela ponte.
- **Dados de cada app ficam com o app** (cada um com seu banco/armazenamento, namespaced). O Hub guarda só o que é da empresa: usuários, comunicados, notícias salvas, agenda.
- Com 5 pessoas dá para um backend simples e self-hosted (ver "decisões em aberto").

## 9. Estrutura de repositórios proposta

| Repositório | Conteúdo |
|---|---|
| `rocruzta-hub` | O shell (esta pasta, quando virar produto): janela, navegação, gerenciador de apps, notícias, comunicados, equipe. |
| `rocruzta-app-sdk` | Tipos da ponte, CLI (`validate`, `build`, `pack`, `sign`, `dev`) e **template de app**. |
| `rocruzta-registry` | `apps.json` com apps e versões. |
| `rocruzta-ui` | Tokens e componentes de design (versionado). |
| `app-termix`, `app-workflow`, `app-instamidia`, `app-rocstudio`, `app-finanpro`, `app-lignum` | Um repo por app, cada um com o seu semver e o seu CI. |

Fluxo de release de um app (CI no próprio repo): `tag vX.Y.Z` → build → empacotar `.rocapp` → assinar → release no
GitHub → atualizar o registro. O Hub só vê o resultado no registro.

## 10. Fluxos do usuário

1. **Abrir um app:** clicar no ícone (ou tecla 1 a 6). O Hub cria a view isolada do app e entrega o contexto (pessoa, tema).
2. **Instalar:** pela tela de apps, "Instalar" baixa o pacote do registro e verifica o checksum.
3. **Atualizar:** badge "Atualização disponível" no ícone, "Atualizar" troca só aquele app. "Reverter" volta à anterior.
4. **Notificações:** o app chama `hub.badge.set` e `hub.notify`, e o Hub mostra no ícone e no sino da barra de título.
5. **Troca de app:** o seletor ao lado do nome "Rocruzta Hub" (já no mockup) alterna entre as views sem recarregar as outras.

## 11. Segurança

- Pacotes **assinados**, com verificação antes de instalar (o Termix já faz isso com `.tmxplug`, `sign` e `verify`).
- Instalar só de registros configurados (o Hub não aceita URL arbitrária).
- Sandbox, CSP e permissões declaradas por app (seção 5).
- Tokens de sessão **curtos** e escopados ao app.
- Apps `remote` só por `https` (ou `localhost` em desenvolvimento).

## 12. O que o Termix já resolve (referência)

O Termix tem uma arquitetura parecida para os plugins dele. Vale estudar antes de desenhar a nossa (licença Apache 2.0, conferir antes de copiar código):

| Conceito | Onde olhar no repo do Termix (`D:\Termix\termix`) |
|---|---|
| Plugin com manifesto | `packages/plugin-sdk` (CLI `termix-plugin validate/build/pack`), `src/backend/plugins/manifest.ts` |
| Pacote assinado (`.tmxplug`) e `verify` | `packages/plugin-sdk/README.md` (comandos `sign`, `verify`, `keygen`) |
| Registros de plugins | `src/backend/plugins/registries.ts`, repositório `Termix-Registry` |
| Fixar versões embutidas | `scripts/pin-bundled-plugins.cjs` |
| Atualização automática | `src/backend/plugins/auto-update.ts` |
| Views nativas isoladas | `electron/embedded-view.cjs`, `electron/isolated-window.cjs` |
| Cada plugin com repo próprio | tabela de plugins no `README.md` (`Plugin-Docker`, `Plugin-File-Manager`, etc.) |
| Guia de criação de plugin | `packages/plugin-sdk/PLUGIN-GUIDE.md` |

Diferença importante: os plugins do Termix rodam **dentro** do processo do Termix (mesmo runtime, modelo C). Nós queremos
**mais isolamento** (modelo B/A), porque um app do Hub pode ser um produto completo e independente.

## 13. Riscos e trade-offs

- **Custo de manter a ponte:** o contrato precisa de disciplina de versão. Mitigação: começar mínimo (contexto, tema, badge, notificação, navegar).
- **Mais peças** (SDK, registro, assinatura) do que "só abrir uma URL". Mitigação: começar com `remote` e evoluir.
- **Memória:** uma view por app aberto consome RAM. Mitigação: suspender views inativas, abrir sob demanda.
- **Termix é um caso à parte** (app grande, com backend). Decidir cedo como ele entra.
- **Time pequeno (5 pessoas):** evitar infraestrutura grande demais. Registro em JSON no GitHub e CI simples bastam no começo.

## 14. Fases sugeridas (planejamento, sem código ainda)

| Fase | Objetivo | Entrega |
|---|---|---|
| 0 | Decidir a arquitetura | Este documento com as decisões fechadas |
| 1 | Shell mínimo | Janela, seletor de app, sidebar, um app de exemplo local ("Olá") aberto em view isolada |
| 2 | Contrato e SDK | Manifesto, ponte (contexto, tema, badge, navegar), CLI `validate/pack`, template de app |
| 3 | Registro e atualização | `rocruzta-registry`, instalar, atualizar e reverter por app |
| 4 | Dados da empresa | Login único, comunicados, equipe, presença, agenda |
| 5 | Notícias | Cliente da API de notícias, filtros, salvos |
| 6 | Apps reais | Migrar um app por vez (Termix por último ou em paralelo, por ser caso à parte) |

## 15. Decisões em aberto (discutir, com recomendação inicial)

| # | Pergunta | Recomendação inicial |
|---|---|---|
| 1 | Plataforma do shell: Electron, web ou os dois? | Electron primeiro (Windows), com o front sem depender de Node para poder virar web depois |
| 2 | Modelo de abertura dos apps | Híbrido `package` + `remote`, mesma ponte |
| 3 | Como o Termix entra no Hub | Decidir à parte; começar abrindo o Termix como `remote` ou lançando o desktop |
| 4 | Linguagem e stack dos apps | Livre, desde que cumpram o contrato; template em TypeScript |
| 5 | Stack do shell | React + Vite (como o Termix), reaproveitando o design da base |
| 6 | Backend da empresa (comunicados, equipe, notícias) | Servidor leve self-hosted (Node + SQLite/Postgres), tempo real para presença |
| 7 | Fonte das notícias | Agregador de RSS/API + filtro por categoria; curadoria por IA como evolução |
| 8 | Assinatura de pacotes | Sim, desde o início (chave da Rocruzta) |
| 9 | Onde hospedar o registro | Repositório GitHub `rocruzta-registry` (JSON) |
| 10 | Canais de release | `stable` e `beta` por app |

## 16. Decisões tomadas

_(vazio, preencher conforme a conversa avançar, com data e motivo)_
