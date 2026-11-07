# Design do Rocruzta Hub

Referência visual aprovada: `base/index.html` (tema escuro com vidro). Reproduza com fidelidade e **não mude o look sem pedir**.

## Identidade (de rocruzta.com.br)

| Item | Valor |
|---|---|
| Azul principal | `#3B82F6` |
| Azuis de apoio | `#60BEFA`, `#A7C7FF` |
| Azuis profundos | `#0B1F4D`, `#1E3A8A` |
| Fundo escuro | `#0A0C10`, com manchas só em azul-marinho, bem baixas |
| Fonte | Inter, embutida no app |
| Vidro | painéis translúcidos flutuantes com blur e saturação baixa, para ficar neutro |
| Raios | 6, 8, 12 e 18 px, por hierarquia |

Temas escuro e claro. Todas as cores são variáveis CSS em `:root`.

## Estrutura da tela

- Barra de título própria: logo, "Rocruzta Hub", **seletor de app ao lado do nome**, tema, notificações, controles da janela.
- Sidebar: Início, Notícias, Comunicados, Equipe; apps agrupados em Operação, Negócio e Criação.
- Conteúdo em painel de vidro. Barra de status fina embaixo.

## Selo "Em breve" e "Dados de exemplo"

Um componente único, discreto, aplicado a tudo que não é real: notícias, novo comunicado, mensagem, presença da equipe, agenda e todos os apps exceto o Termix.

## Regras para não cair no visual genérico de IA

O plugin `frontend-design` está instalado. Evite:

- rótulos em caixa-alta e fonte mono acima de todo título (a base ainda tem alguns, pode refinar);
- cartões todos iguais, mesmo raio e mesma sombra em tudo, e gradientes só como decoração;
- texto com pontos do meio ("A · B · C") e setas "→" em todo link;
- animação de entrada em todas as seções (movimento só em resposta a uma ação do usuário);
- cor sem significado (use cor só para apps, categorias e presença da equipe).

## Referências visuais

- `base/index.html`: layout aprovado (Hub e tela do Termix).
- `base/referencia-launcher-v9.html`: tela Apps e bloco "Em execução". Só referência visual, fora do escopo da v1.
