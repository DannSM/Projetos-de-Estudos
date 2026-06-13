# Auditoria das práticas SQL - Etapas 3 a 5

Data da auditoria: 13 de junho de 2026.

## Padrão encontrado

- Não existe pasta `supabase/migrations` no repositório.
- O SQL do projeto é versionado em `docs/` para aplicação manual após revisão.
- A Etapa 1 foi cadastrada no arquivo `supabase-sql-practice-foundation.sql`.
- A Etapa 2 foi cadastrada no arquivo idempotente
  `supabase-sql-practice-step2-count-nulos-distintos.sql`.
- Ambos usam transação, `insert ... on conflict ... do update` por slug ou
  activity, e validações somente leitura ao final.

## Etapas 1 e 2

As duas etapas versionadas possuem:

- activity completa em `public.learning_activities`;
- dataset ativo em `public.sql_datasets`;
- exercício ativo em `public.sql_practice_exercises`;
- prompt, objetivo, apoio teórico, validator, resultado esperado e solução;
- execução local por PGlite;
- validator e testes automatizados no frontend.

Datasets:

- Etapa 1: `pedidos-sinteticos-v1`;
- Etapa 2: `pedidos-count-nulos-distintos-v1`.

## Estado das Etapas 3, 4 e 5

Os arquivos versionados e as telas de produção mostram que as activities já
existem no catálogo, originalmente com `status = coming_soon`.

Na Etapa 3, a tela de produção abre a activity, mas não recebe exercício ou
dataset completo: enunciado, tabela, conceito e dica ficam vazios.

Não foi encontrado seed versionado de exercício para as Etapas 3, 4 e 5 antes
desta mudança.

## Datasets

- Etapa 3 reutiliza `pedidos-sinteticos-v1`.
- Etapa 4 reutiliza `pedidos-sinteticos-v1`.
- Etapa 5 precisa de duas tabelas. Nenhum dataset versionado existente atende
  esse requisito.
- Foi proposto `pedidos-clientes-join-v1`, com quatro clientes e seis pedidos
  determinísticos.

## Resultados confirmados localmente

Com `pedidos-sinteticos-v1`:

- Etapa 3: `5` pedidos pagos e valor total `517.70`.
- Etapa 4:
  - `casa | 1 | 78.30`
  - `eletrônicos | 3 | 438.40`
  - `livros | 3 | 135.50`

Com `pedidos-clientes-join-v1`:

- `101 | Ana | 120.00`
- `103 | Bruno | 250.00`
- `104 | Carla | 90.00`
- `106 | Bruno | 150.00`

## Riscos e compatibilidade

- O executor original aceitava apenas uma tabela por dataset. O suporte a
  múltiplas tabelas foi adicionado de forma retrocompatível; os datasets
  existentes continuam usando `schema_config.table` e `seed_data` plano.
- A view pública não expõe `validation_config`, `expected_result` ou
  `solution_sql`. Os validators continuam no frontend, como nas Etapas 1 e 2,
  sem duplicar enunciado, apoio teórico ou dataset das novas práticas.
- A Etapa 3 possui mapeamento de progresso existente. As Etapas 4 e 5 não
  possuem passos correspondentes na trilha `sql-essencial` versionada; por
  isso, esta mudança não cria nem altera progresso.
- Nenhuma alteração de schema, RLS, policies, Auth ou dados de usuário foi
  preparada.

## Consulta remota

A consulta somente leitura ao projeto Supabase foi tentada, mas o conector
atingiu o limite de uso da sessão antes de executar o `SELECT`. A conferência
remota dos registros atuais permanece obrigatória antes da aplicação manual do
seed em produção.
