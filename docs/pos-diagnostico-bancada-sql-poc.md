# POC de bancada SQL local

## Decisão técnica

A prova de conceito usa PGlite `0.4.5`, executado em memória no navegador.

PGlite foi escolhido porque executa PostgreSQL em WebAssembly e é o caminho mais próximo do dialeto usado pelo Supabase. A POC não conecta nem envia dados ao Supabase.

Alternativas avaliadas:

- `sql.js`: simples e maduro para execução local, mas usa SQLite e poderia mascarar diferenças de sintaxe e comportamento em relação ao PostgreSQL.
- `DuckDB-Wasm`: adequado para exploração analítica e datasets colunares, porém adicionaria complexidade desnecessária para uma única tabela didática pequena.

## Escopo da POC

Apenas a Missão 3 usa execução SQL real:

> Conte pedidos pagos por categoria. O filtro de status precisa acontecer antes do agrupamento.

A bancada:

- cria uma instância efêmera de PostgreSQL no navegador;
- cria a tabela sintética `pedidos`;
- insere sete registros fictícios;
- aceita uma consulta `SELECT`;
- exibe resultado ou erro técnico;
- compara o resultado retornado com o resultado esperado;
- só conclui a missão após a ação explícita `Validar missão`.

`Executar consulta` e `Validar missão` são ações separadas. Alterar o editor invalida a execução anterior.

Uma execução só pode seguir para validação quando retorna ao menos uma coluna e uma linha. Consultas que executam sem resultado tabular útil recebem estado de atenção, não estado verde de sucesso.

Erros técnicos do PostgreSQL permanecem visíveis e recebem uma orientação pedagógica curta para casos comuns, como:

- campos sem vírgula no `select`;
- ausência de `from`;
- coluna comum ao lado de agregação sem `group by`;
- ordem inválida das cláusulas.

A orientação não exibe a consulta correta.

## Segurança e limites

A POC:

- permite apenas uma consulta por execução;
- aceita somente consultas iniciadas por `SELECT` ou `WITH`;
- bloqueia comandos de escrita e DDL;
- não usa banco de produção;
- não usa dados reais;
- não persiste tentativas;
- não altera Supabase, RLS, policies ou migrations.

Como toda validação executada integralmente no cliente, o resultado esperado pode ser descoberto por alguém que inspecione o código JavaScript. Ele não é exibido na interface, mas não deve ser tratado como segredo.

Uma versão de produto deve mover dataset, execução e validação para uma camada isolada no backend, conforme `docs/pos-diagnostico-validacao-sql-real.md`.

## Dependência e carregamento

No navegador, PGlite é carregado por import dinâmico do jsDelivr com versão fixa. Em Node, a mesma versão fica registrada em `package.json` e `package-lock.json` para os testes de execução.

Se o CDN estiver indisponível, a Missão 3 exibe uma falha de inicialização e não permite validar a missão.

## Testes

O script `scripts/test-sql-poc-engine.js` cobre:

- consulta vazia ou apenas `select`;
- erro de sintaxe;
- ausência de `from`, `where` ou `group by`;
- ordem inválida entre `group by` e `where`;
- resultado somente com categoria;
- consulta válida com resultado incompleto;
- consulta válida com resultado errado;
- consulta correta em uma linha;
- consulta correta com quebras de linha;
- consulta correta com alias;
- bloqueio de comandos de escrita e DDL;
- invalidação da execução depois que o editor é alterado.
