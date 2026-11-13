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

## Ícone do app, abertura e mascote

Ícone: "H com chapéu" (telhado curvo de chapéu de mago, dois pilares e uma travessa, em degradê azul sobre ladrilho arredondado). Fontes: `src/renderer/icone-hub.svg` (ladrilho claro) e `icone-hub-escuro.svg` (ladrilho azul-marinho, para o tema escuro); `assets/icone.png` é gerado do claro por `tools/exportar-icone.js`. Vale para o ícone do app (barra de tarefas, atalho, instalador) e para a marca ao lado de "ocruzta" na barra de título. Os ícones de navegação continuam em traço de uma cor.

Mascote: o mago em pixel (`mago.js`), presença da IA na tela Início: sentado na quina superior direita do campo de mensagem, avatar da última resposta no chat. A abertura (`abertura.js`) cobre o app com um véu que segue o tema e termina com o mago no lugar dele. Referência: `iconemascote/abertura-final`.

## Estrutura da tela

- Barra de título própria: logo, "Rocruzta Hub", **seletor de app ao lado do nome**, tema, notificações, controles da janela.
- Sidebar: Início, Notícias, Comunicados, Equipe; apps agrupados em Operação, Negócio e Criação.
- Conteúdo em painel de vidro. Barra de status fina embaixo.

## Selo "Em breve" e "Dados de exemplo"

Desde a TASK-022 o Hub não mostra nada fingido, então nenhuma tela usa o selo. O componente único continua em `components.css` para o caso de aparecer algo provisório; se isso acontecer, deve ser discreto e marcar tudo que não é real.

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
