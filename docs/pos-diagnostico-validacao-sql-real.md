# Validação real de SQL nas missões pós-diagnóstico

Este documento separa a validação local do protótipo atual da validação real que deve existir quando a prática digitada de SQL virar uma experiência de produto.

## Por que palavra-chave não basta

Validação por `includes`, substring ou presença de palavras-chave não é suficiente para prática SQL. Ela pode aceitar uma consulta sintaticamente inválida, aceitar uma consulta que retorna resultado errado, rejeitar variações corretas e ignorar detalhes críticos como vírgula, ordem das cláusulas, operador, agrupamento e filtro aplicado no lugar certo.

No protótipo atual, a validação continua local, determinística e sem execução real de SQL. Ela serve para impedir falsos positivos óbvios e guiar o feedback pedagógico, mas não deve ser apresentada como validação real de banco.

## Caminho recomendado

A validação real deve combinar:

- parser ou análise sintática;
- execução controlada contra dataset seguro e sintético;
- comparação com resultado esperado;
- limites de segurança;
- feedback pedagógico.

Comparar texto normalizado pode ser útil como camada auxiliar em atividades muito guiadas, mas não deve ser a fonte da verdade para prática digitada aberta.

## Arquitetura futura sugerida

1. A atividade exibe enunciado, schema e dataset controlado.
2. O aluno envia uma tentativa SQL.
3. A aplicação envia a tentativa para uma camada segura.
4. A camada segura valida:
   - sintaxe;
   - comandos permitidos;
   - tempo limite;
   - leitura apenas;
   - resultado esperado.
5. A resposta retorna:
   - correto;
   - parcial;
   - incorreto;
   - erro de sintaxe;
   - feedback pedagógico;
   - próxima tentativa permitida ou não.

Essa camada não deve expor a resposta correta no frontend. O frontend pode exibir feedback e estado da missão, mas a decisão de correção real deve ficar fora do cliente.

## Segurança

Nunca executar SQL livre diretamente no banco de produção. A prática digitada precisa usar base isolada, sandbox ou dataset sintético com permissões estritamente limitadas.

Regras mínimas:

- permitir apenas `select`;
- bloquear `insert`, `update`, `delete`, `drop`, `alter`, `truncate`, `create`, `grant`, `revoke` e chamadas externas;
- aplicar timeout;
- aplicar limite de linhas;
- usar usuário somente leitura;
- registrar tentativas sem gravar secrets nem dados sensíveis;
- não permitir acesso a tabelas reais de produção.

## Estratégias possíveis

Uma implementação futura pode seguir um destes caminhos, ou combinar mais de um:

- RPC ou Edge Function validando em ambiente controlado;
- banco separado somente leitura com dataset sintético;
- parser SQL no backend para bloquear comandos e validar estrutura;
- engine local/isolada para datasets pequenos;
- comparação por resultado esperado em vez de comparação textual.

Para prática real, a comparação por resultado costuma ser mais robusta do que comparar a query, porque aceita soluções equivalentes sem abrir mão da correção.

## Critério de produto

Para missões iniciais, alternativas guiadas e validação local podem ser suficientes. Para prática SQL digitada, a validação deve evoluir para sintaxe e execução controladas.

O usuário só deve concluir uma missão quando houver evidência de resposta correta. No protótipo, essa evidência é uma regra local mais rígida. No produto real, deve ser resultado validado por camada segura.
