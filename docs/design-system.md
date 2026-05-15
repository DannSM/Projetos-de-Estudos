# Data Study Map - Guia de Layout, Estilo e Identidade Visual

## Conceito

Data Study Map e uma plataforma educacional para aprender SQL, estatistica, BI, indicadores e analise de dados por meio de diagnostico, trilhas e desafios praticos.

## Identidade

- Nome oficial: Data Study Map
- Fonte principal: Inter
- Estilo: SaaS educacional limpo, claro e profissional
- Paleta: azul como cor principal, verde para progresso/sucesso, amarelo para destaque e cinzas claros para estrutura

## Estrutura Atual

- `index.html`: home, trilhas e desafios.
- `diagnostico.html`: diagnostico adaptativo por niveis.
- `src/data/content.js`: perguntas, desafios e guias de estudo.
- `src/quiz.js`: fluxo do diagnostico.
- `src/challenges.js`: desafios praticos.
- `styles/`: base, layout, componentes e responsividade.

## Diagnostico

O diagnostico tem 10 perguntas divididas em tres niveis:

- Basico: 4 perguntas.
- Intermediario: 4 perguntas.
- Avancado: 2 perguntas.

O usuario precisa atingir 75% no nivel atual para liberar o proximo. Se nao atingir, o resultado aparece com recomendacao de reforco no nivel em que parou.

## Usabilidade

- O diagnostico fica em pagina propria para evitar rolagem excessiva na home.
- A resposta so e avaliada depois do clique em `Confirmar resposta`.
- Cada pergunta mostra nivel, area, conceito, progresso geral e feedback imediato.
- O resultado mostra desempenho por nivel, mapa por area, recomendacao e revisao dos erros.
