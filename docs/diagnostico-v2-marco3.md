# Diagnóstico V2 — Marco 3, prévia isolada

O Diagnóstico V1 continua sendo o fluxo padrão. A interface V2 só abre em
`diagnostico.html?preview=v2` quando **a página e a API Supabase** usam
`localhost` ou `127.0.0.1`. Uma flag na publicação oficial não ativa o V2.

## Percurso funcional

- O adaptador usa os cinco RPCs homologados: `start`, `next`, `submit`, `result` e `claim`.
- A tentativa e seus tokens ficam em `sessionStorage` para retomada na mesma sessão. A conta é conferida antes de mostrar um resultado vinculado.
- A tela mostra até 25 perguntas, sem gabarito, e o resultado separado das cinco áreas. Desempenho observado e nível demonstrado recebem rótulos distintos.
- Meu Progresso mostra a metodologia do histórico V1 e consulta até dez resultados V2 concluídos da conta autenticada, inclusive em outro dispositivo. Os números das duas metodologias não são comparados.
- A única prática com destino confirmado no catálogo é a competência `sql.filtering.where_logic`; quando não há destino validado, a orientação aparece sem botão fictício.
- Eventos V2 distinguem início, questão exibida, resposta salva, conclusão, resultado por área, recomendação, prática iniciada e retorno. A duração aproximada de resposta e dificuldades por competência seguem em metadados sem alternativa correta ou token; o tempo persistido pelo motor permanece a referência técnica.

## Homologação

O workflow `diagnostic-v2-homologation.yml` cria uma stack Supabase local descartável
com 60 perguntas **sintéticas**, executa a jornada no Chrome em 1366 px e 390 px,
salva capturas sintéticas como artifact temporário e então repete os testes de
segurança do motor. O teste do motor esgota intencionalmente o pool SQL no fim;
por isso a jornada de navegador roda primeiro.

Para executar localmente, iniciar a stack isolada em
`tests/diagnostic-v2-homologation`, servir o repositório em `127.0.0.1:4173`
e configurar `src/supabase-config.js` para a API local. A suíte automatizada do
workflow injeta essa configuração apenas no navegador de teste.

## Pendências para o piloto

- A consulta de histórico V2 foi adicionada em migration local com leitura limitada a `auth.uid()`. Ainda depende de revisão e aplicação posterior em ambiente autorizado; nenhuma migration foi aplicada ao Supabase remoto.
- A auditoria editorial consolidada está em `docs/diagnostico-v2-curadoria-marco3.md`. Itens reais exigem revisão humana e importação privada.
- Permanecem os bloqueadores de produção: regressão V1 ponta a ponta em ambiente representativo, verificação dos schemas da Data API de produção, limite de taxa anônima na borda, exposição do gabarito V1 durante a transição e homologação final da experiência do aluno.
