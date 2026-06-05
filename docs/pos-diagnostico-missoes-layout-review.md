# Revisao de layout - experiencia de missoes pos-diagnostico

Este documento pausa ajustes visuais diretos e organiza uma revisao de UX/layout antes de uma nova rodada de implementacao.

Escopo desta revisao:

- analisar a composicao atual da `missao.html`;
- propor alternativas de layout sem codar;
- recomendar uma direcao para a proxima iteracao;
- manter a decisao de produto: missao curta, pratica ativa, feedback imediato e progresso por evidencia.

Fora de escopo:

- aplicar SQL;
- alterar Supabase;
- alterar RLS, policies, migrations, seeds reais, secrets ou configuracoes sensiveis;
- conectar banco;
- implementar progresso real;
- alterar diagnostico;
- alterar CSS ou JavaScript nesta etapa.

## 1. Diagnostico visual da tela atual

### O que funciona

- A proposta de missao pos-diagnostico esta correta: o usuario recebe uma acao curta conectada a uma lacuna.
- A pratica SQL e a parte mais forte da experiencia. Ela exige tentativa, gera feedback e nao conclui a missao por clique vazio.
- O fluxo de correto, parcial e incorreto reforca a ideia de evidencia de aprendizagem.
- A liberacao da proxima missao somente apos resposta correta comunica que progresso depende de atividade real.
- A existencia de uma area de progresso e proximas missoes ajuda a mostrar continuidade alem da atividade atual.

### O que nao funciona

- A pagina ainda parece composta por blocos de naturezas diferentes: hero de landing page, painel de dashboard e card de pratica.
- A sidebar, mesmo agrupada, ainda compete com o fluxo principal porque tenta explicar motivo, progresso, status, criterio e proximas missoes no mesmo eixo visual.
- O hero ainda ocupa espaco e peso visual demais para uma tela cujo valor principal deveria ser praticar.
- A barra de progresso aparece como elemento informativo, mas nao como parte organica da jornada de tentativa e feedback.
- O bloco "Por que esta missao?" e o progresso pertencem ao mesmo contexto, mas visualmente ainda podem parecer anexos a pratica, nao sua moldura.
- O fechamento apos as 3 missoes existe, mas ainda depende de a pagina ter uma hierarquia clara o bastante para o usuario perceber que chegou a um marco.

### Por que a pagina ainda parece desalinhada

O problema principal nao e apenas largura ou tamanho. E uma combinacao de hierarquia, modelo mental e grid.

- **Hierarquia:** a tela precisa dizer "voce veio aqui para praticar uma lacuna", mas o hero e a sidebar ainda disputam atencao com a pratica.
- **Grid:** a composicao de duas colunas faz sentido para desktop, mas o painel lateral precisa justificar sua permanencia. Se ele tiver conteudo demais, vira dashboard; se tiver conteudo de menos, parece solto.
- **Sidebar:** o painel lateral tenta cumprir varias funcoes ao mesmo tempo: orientacao, contexto, progresso, status e navegacao. Isso pode ser util, mas precisa ser secundario e muito bem integrado.
- **Hero:** o hero funciona para apresentar uma pagina, mas a missao deveria parecer mais uma bancada operacional. Um topo compacto tende a funcionar melhor.
- **Modelo mental:** a experiencia desejada e pratica guiada. A tela atual ainda carrega sinais de landing page e dashboard, o que enfraquece a sensacao de uma sessao de estudo ativa.

## 2. Avaliacao da experiencia atual

### A missao parece uma bancada de pratica?

Parcialmente. A atividade em si parece uma pratica, mas a composicao geral ainda nao parece uma bancada. A bancada deveria colocar o usuario rapidamente diante da tarefa, com contexto suficiente e progresso discreto. Hoje ha mais camadas de apresentacao e acompanhamento do que o necessario.

### A pratica SQL esta no centro?

Funcionalmente, sim. Visualmente, ainda nao totalmente. A pratica esta boa, mas compete com hero, sidebar e progresso. A tela precisa reduzir a sensacao de "pagina de apresentacao com exercicio" e aumentar a sensacao de "sessao de pratica guiada".

### O progresso ajuda ou distrai?

Ajuda como conceito, mas pode distrair como composicao. O progresso precisa responder rapidamente:

- onde estou;
- o que falta;
- o que libera a proxima missao.

Se o painel tiver muito detalhe, ele passa a competir com a atividade. Para esta fase, o progresso deve ser mais orientador do que analitico.

### O hero esta grande demais?

Sim, para o objetivo da tela. O usuario ja chegou com uma missao recomendada. O topo deve confirmar a lacuna, tempo e proxima acao, nao vender a experiencia de novo. Um hero compacto ou uma faixa de missao tende a funcionar melhor.

### A sidebar faz sentido ou deveria virar faixa horizontal?

A sidebar faz sentido se a tela for tratada como dashboard de pratica. Mas, para uma primeira missao pos-diagnostico, uma faixa horizontal de progresso pode funcionar melhor porque:

- reduz competicao lateral;
- funciona melhor no mobile;
- deixa a pratica ocupar o centro;
- deixa claro que progresso e parte do fluxo, nao um painel paralelo.

Ainda assim, uma sidebar pode funcionar se for mais enxuta, persistente e visualmente conectada ao card de pratica.

### O layout mobile esta seguindo uma ordem natural?

A ordem ideal para mobile e:

1. missao recomendada;
2. lacuna, tempo e nivel;
3. progresso compacto;
4. por que esta missao;
5. conteudo curto;
6. pratica;
7. feedback;
8. proxima acao;
9. footer.

A versao atual se aproxima disso, mas o painel ainda pode ficar grande demais. Mobile precisa favorecer fluxo linear, nao espelhar uma sidebar desktop.

## 3. Alternativas de layout

## Alternativa A - Missao em fluxo vertical

### Estrutura da pagina

```text
Header
Faixa compacta: Missao recomendada + lacuna + tempo + nivel
Faixa de progresso: 1 de 3 missoes + stepper horizontal
Por que esta missao?
Conteudo curto
Pratique agora
Feedback
Proxima missao / Meu Progresso
Footer
```

### Vantagens

- E a alternativa mais simples e direta.
- Reduz a sensacao de dashboard poluido.
- Funciona naturalmente no mobile.
- O progresso vira parte do fluxo, nao uma sidebar competindo com a pratica.
- A pratica fica claramente no eixo principal da pagina.
- Evita grandes desalinhamentos causados por coluna lateral.

### Riscos

- No desktop, pode parecer menos sofisticada se a faixa de progresso for simples demais.
- Pode desperdiçar largura horizontal em telas grandes.
- Se todos os blocos forem cards verticais, a pagina pode ficar longa e um pouco monotona.

### Impacto no desktop

Desktop fica mais linear e previsivel. A tela deixa de parecer dashboard e passa a parecer uma sessao guiada. Pode precisar de largura maxima menor para manter leitura boa.

### Impacto no mobile

Muito positivo. A ordem fica natural e a implementacao responsiva tende a ser mais simples.

### Mudanca no codigo atual

Media. Exige remover a dependencia da sidebar como estrutura principal, reorganizar a renderizacao e simplificar o CSS. Mantem os componentes principais existentes.

### Mantem a pratica SQL como foco?

Sim. E provavelmente a alternativa que mais protege a pratica como foco.

## Alternativa B - Dashboard de pratica

### Estrutura da pagina

```text
Header
Grid desktop:
  Coluna principal:
    Missao recomendada compacta
    Conteudo curto
    Pratique agora
    Feedback
    Estado final
  Sidebar:
    Por que esta missao?
    Seu avanco
    Barra de progresso
    Etapa atual / tentativas / status
    Stepper de proximas missoes
Footer
```

### Vantagens

- Aproveita melhor telas desktop.
- Da sensacao de produto mais completo.
- Permite manter progresso e proximas missoes sempre visiveis.
- Pode comunicar continuidade pos-diagnostico de forma forte.

### Riscos

- E a alternativa mais parecida com a tela atual, portanto carrega o mesmo risco de parecer um painel solto.
- Pode ficar poluida se a sidebar tiver muitos detalhes.
- Exige excelente alinhamento visual para nao competir com a pratica.
- No mobile, a sidebar precisa virar fluxo compacto, o que cria duas experiencias diferentes.

### Impacto no desktop

Pode ficar premium se a sidebar for realmente enxuta e integrada. Mas se o painel continuar pesado, a pratica perde protagonismo.

### Impacto no mobile

Risco medio. A sidebar precisa virar uma faixa ou bloco compacto, sem manter toda a densidade do desktop.

### Mudanca no codigo atual

Baixa a media. A estrutura atual ja se aproxima disso, mas exigiria refinamento conceitual, nao apenas CSS: menos conteudo na sidebar, hero mais compacto e relacao visual mais clara entre atividade e acompanhamento.

### Mantem a pratica SQL como foco?

Sim, desde que a sidebar seja secundaria. Se a sidebar crescer, o foco se dilui.

## Alternativa C - Bancada de pratica

### Estrutura da pagina

```text
Header
Topo da bancada:
  Missao recomendada + lacuna + tempo
  Seu avanco: 1 de 3 + stepper compacto
Pratique agora como card dominante
  Contexto da tabela
  Enunciado
  Resposta / query
  Enviar resposta
  Feedback imediato
Blocos secundarios:
  Por que esta missao?
  Conteudo curto
  Proximas missoes
Estado final
Footer
```

### Vantagens

- Coloca a pratica como elemento dominante da pagina.
- Parece mais uma bancada de trabalho do que landing page ou dashboard.
- O progresso aparece no topo como orientacao, sem virar painel paralelo.
- O conteudo curto pode ficar antes da pratica ou como bloco secundario, mantendo a proporcao 20% teoria / 80% pratica.
- Funciona bem para a promessa pos-diagnostico: "comece por aqui e pratique esta lacuna".

### Riscos

- Exige repensar a ordem atual dos blocos.
- Se o conteudo curto vier depois da pratica, alguns usuarios podem sentir falta de preparacao antes de responder.
- Precisa equilibrar "pratica dominante" com explicacao suficiente para nao parecer prova seca.

### Impacto no desktop

Muito positivo para foco. O desktop pode usar uma faixa superior com missao/progresso e um card de pratica grande, sem depender de sidebar. Blocos secundarios podem ficar abaixo em grid leve.

### Impacto no mobile

Bom, desde que a ordem seja:

1. missao;
2. progresso compacto;
3. contexto/conteudo minimo;
4. pratica;
5. feedback;
6. proximas acoes.

### Mudanca no codigo atual

Media a alta. Exige reorganizar a arquitetura visual, mas reaproveita o fluxo de tentativa, feedback, missoes mockadas e validacoes locais.

### Mantem a pratica SQL como foco?

Sim. E a alternativa que mais explicitamente transforma a pratica no centro da experiencia.

## 4. Recomendacao

Recomendacao: **Alternativa C - Bancada de pratica**, com uma adaptacao importante: manter um conteudo curto antes da atividade, mas visualmente menor que a pratica.

Motivos:

- O Data Skill Map precisa vender valor no pos-diagnostico, e o valor aqui nao e ver um dashboard: e sentir que o diagnostico virou uma acao concreta.
- A tela deve parecer pratica guiada, nao curso generico. A alternativa C favorece acao, tentativa e feedback.
- A alternativa B ainda corre risco de parecer dashboard poluido, especialmente porque progresso e proximas missoes competem com a atividade.
- A alternativa A e simples e segura, mas pode parecer comum demais se todos os blocos forem verticais.
- A alternativa C permite uma experiencia mais proprietaria: uma bancada curta, objetiva, com progresso como orientacao e pratica como centro.
- Mobile continua simples porque a bancada pode virar uma sequencia linear.
- O progresso ajuda sem competir: ele aparece no topo como estado da jornada, nao como painel lateral cheio de informacao.

Direcao recomendada para a proxima implementacao:

- Reduzir o hero para uma faixa de missao.
- Remover a sidebar como elemento estrutural principal.
- Transformar progresso em faixa compacta logo abaixo do topo.
- Fazer o card de pratica dominar a pagina.
- Colocar "Por que esta missao?" e conteudo curto como apoio, nao como painel paralelo.
- Mostrar o estado final como bloco claro apos a pratica concluida.

## 5. Wireframe textual da alternativa recomendada

```text
Header

[Faixa da missao]
Missao recomendada: filtre exatamente o recorte pedido
Lacuna: filtros com WHERE | 10 min | Basico
[Comece aqui]

[Seu avanco]
1 de 3 missoes concluidas
(1) Filtros com WHERE - atual/concluida
(2) COUNT, nulos e distintos - disponivel/bloqueada
(3) Filtro antes da agregacao - bloqueada

[Por que esta missao?]
Esta missao apareceu porque o diagnostico encontrou uma lacuna...
Aviso discreto: Prototipo local, sem salvamento real ainda.

[Conteudo curto]
O que o WHERE precisa fazer
Exemplo minimo de query

[Pratique agora - card dominante]
Contexto da tabela
Enunciado
Opcoes ou campo de query
[Enviar resposta]

[Feedback]
Correto / Parcial / Incorreto
Explicacao curta
[Continuar para proxima missao] [Ver Meu Progresso]

[Estado final, apos 3 missoes corretas]
Piloto SQL Essencial concluido
Parabens, voce praticou as 3 lacunas do piloto.
[Ver Meu Progresso] [Voltar para Trilhas] [Refazer diagnostico]

Footer
```

## 6. Criterios para a proxima rodada de implementacao

Antes de codar novamente, decidir:

- A tela vai abandonar a sidebar como estrutura principal?
- O progresso sera faixa horizontal compacta?
- O conteudo curto fica antes da pratica ou dentro de um bloco recolhivel?
- O estado final aparece imediatamente apos o feedback da terceira missao?
- A proxima missao deve trocar a atividade na mesma pagina ou navegar/ancorar para o topo?

Checklist de aceite visual para a proxima rodada:

- A pratica SQL deve ser o maior bloco funcional da tela.
- O progresso deve ser entendido em ate 3 segundos.
- O usuario nao deve precisar olhar para uma sidebar para entender o que fazer.
- O mobile deve parecer uma sequencia natural, nao uma sidebar empilhada.
- O estado final deve ser inconfundivel.
- A pagina nao deve parecer landing page com exercicio colado.
- A pagina nao deve parecer dashboard administrativo.
