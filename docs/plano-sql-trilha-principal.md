# Plano: SQL Como Trilha Principal da Plataforma

## 1. Decisao estrategica

A proxima fase do Data Skill Map deve destacar SQL como a principal trilha pratica inicial da plataforma. A decisao nao abandona Estatistica, Excel, Indicadores e Logica de Dados; essas areas continuam como complementares e importantes para a formacao do usuario.

SQL deve ser usado como laboratorio principal para validar o modelo completo de produto: diagnostico, recomendacao, pratica, feedback, progresso e evolucao. A ideia e provar o ciclo de ponta a ponta em um eixo mais objetivo antes de expandir a mesma logica para outras areas.

## 2. Por que SQL primeiro

SQL e uma boa primeira trilha forte porque permite criar exercicios reais, curtos e verificaveis diretamente no navegador. A resposta do usuario pode ser validada com criterios objetivos, como resultado esperado, colunas retornadas, filtros aplicados e agregacoes corretas.

A trilha tambem permite progressao clara por nivel:

- Junior: fundamentos de consulta e leitura de resultado.
- Pleno: combinacao de tabelas, regras de negocio e consultas analiticas.
- Senior: consultas avancadas, validacao de regra e interpretacao executiva.

A POC com PGlite mostrou que e possivel criar uma experiencia pratica local no navegador, sem executar SQL em banco de producao. O aprendizado obtido com SQL podera ser reaproveitado depois em Estatistica, Excel, Indicadores e Logica.

## 3. Estrutura sugerida da trilha SQL

### Junior

- SELECT basico
- WHERE e filtros
- ORDER BY e LIMIT
- COUNT, SUM, AVG
- GROUP BY
- JOIN basico
- Leitura de resultado

### Pleno

- JOINs multiplos
- Subqueries
- CTEs
- CASE WHEN
- Tratamento de nulos
- Agregacoes com regras de negocio
- Analise por periodo
- Problemas proximos de rotina de dados

### Senior

- Window functions
- CTEs encadeadas
- Otimizacao basica
- Analise de funil
- Cohort/retention basica
- Qualidade de dados
- Validacao de regra de negocio
- Interpretacao executiva do resultado

## 4. Inspiracoes aproveitaveis da HMS SQL Hacker

A plataforma HMS SQL Hacker pode servir como referencia conceitual, sem copia de identidade visual, interface ou linguagem de marca. Pontos aproveitaveis:

- Lista de exercicios por nivel e topico.
- Filtros por nivel e assunto.
- Exercicios com editor SQL.
- Modo pratica e modo desafio.
- Explicacao da query.
- Dica rapida.
- Solucao comentada.
- Anotacoes pessoais.
- Percepcao de dificuldade: facil, medio, dificil.
- Progresso por exercicio.
- Ranking e streak apenas como ideias futuras, nao prioridade agora.
- IA tutora como fase futura, nao como primeira implementacao.

## 5. Proximo MVP recomendado

### Fase 1

- Consolidar entrada pelo Meu Progresso.
- Manter a missao SQL atual como pratica recomendada.
- Melhorar visual e clareza do fluxo.
- Nao gravar progresso real ainda.

### Fase 2

- Criar uma pagina/lista de praticas SQL.
- Exibir exercicios por nivel e topico.
- Permitir que cada exercicio abra uma missao/pratica.
- Manter os exercicios inicialmente locais ou sinteticos.

### Fase 3

- Persistir tentativas e progresso no Supabase.
- Criar novas tabelas ou usar a estrutura existente com cuidado.
- Definir evidencia real de conclusao.

### Fase 4

- Expandir SQL para Pleno e Senior.
- Criar historico de tentativas.
- Criar revisao de erros.
- Criar recomendacao da proxima pratica.

## 6. Riscos e cuidados

- Nao criar links soltos sem fluxo claro.
- Nao marcar progresso real sem persistencia confiavel.
- Nao executar SQL em banco de producao.
- Nao expor respostas como fonte da verdade.
- Evitar construir dezenas de telas antes de validar o ciclo minimo.
- Evitar gastar tempo demais em microajustes visuais sem avanco funcional.

## 7. Criterio de avanco concreto

A proxima etapa so deve ser considerada concluida quando houver:

- Entrada clara no fluxo.
- Pratica acessivel.
- Execucao e feedback funcionando.
- Usuario entende o que fazer.
- Validacao manual desktop/mobile feita.
- Plano claro para persistencia futura.

## 8. Recomendacao final

A proxima implementacao real recomendada e uma "Pagina de Praticas SQL" ou "Central SQL", acessivel apos o diagnostico e pelo Meu Progresso, com exercicios organizados por nivel e topico.

O primeiro recorte deve ser pequeno: 5 a 10 exercicios Junior, suficientes para validar descoberta, escolha da pratica, execucao, feedback e entendimento do usuario. Neste momento, porem, a acao e apenas registrar este plano; a pagina ainda nao deve ser implementada.
