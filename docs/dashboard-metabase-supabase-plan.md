# Data Skill Map - Plano da Camada Analitica Externa

## Decisao arquitetural

- A plataforma publica continua leve e sem dashboard interno.
- O painel analitico sera externo e privado no Metabase Cloud.
- O Supabase continua como fonte oficial dos dados.
- O Metabase deve consultar somente views analiticas aprovadas.
- O frontend nao deve ler dados analiticos e nao deve usar `dashboard.html`.

## Seguranca, governanca e privacidade

- Nao expor tabelas base para consumo BI.
- Nao liberar views analiticas para `anon` e `authenticated`.
- Conceder acesso minimo para o role `dsm_dashboard_reader`.
- Nao conceder acesso da view `vw_satisfaction_comments_admin` ao reader padrao.
- Nao expor dados pessoais diretos nas views gerais.
- Usar apenas `anonymous_user_id` em analises por usuario.
- Comentarios livres ficam em view separada e restrita.

## Views oficiais de BI

Views para dashboards gerais:

- `public.vw_platform_activity_daily`
- `public.vw_user_activity_daily`
- `public.vw_satisfaction_feedback_daily`

View restrita para analise qualitativa admin:

- `public.vw_satisfaction_comments_admin`

## Regras tecnicas das views

- Agregacoes diarias devem usar:
  - `date_trunc('day', <timestamp> at time zone 'America/Sao_Paulo')::date`
- `challenge_id` e `diagnostic_id` sao derivados de `attempt_id` por `context`:
  - `desafios_sessao` -> `challenge_id`
  - `diagnostico_resultado` -> `diagnostic_id`
- `vw_satisfaction_feedback_daily` nao expoe coluna `comment`.
- `comments_count` conta somente comentarios preenchidos.

## Estrutura recomendada no Metabase Cloud

### Dashboard 1 - Visao da Plataforma

Fontes:

- `vw_platform_activity_daily`
- `vw_satisfaction_feedback_daily`

Indicadores:

- usuarios ativos
- diagnosticos realizados
- desafios respondidos
- acuracia de diagnostico e desafios
- satisfacao media
- total de avaliacoes
- evolucao diaria
- comentarios preenchidos (somente contagem)

### Dashboard 2 - Visao por Usuario

Fonte:

- `vw_user_activity_daily`

Indicadores:

- `activity_date`
- `anonymous_user_id`
- volume de diagnosticos e desafios
- acuracia
- satisfacao media
- filtros por periodo e usuario anonimo

### Dashboard 3 - Qualidade de Experiencia

Fonte:

- `vw_satisfaction_feedback_daily`

Indicadores:

- evolucao da satisfacao
- media por contexto
- distribuicao de notas 1..5
- volume de comentarios preenchidos
- corte por desafio/diagnostico derivado

Regras:

- nao exibir texto livre de comentario em dashboards gerais
- nao habilitar link publico
- nao habilitar embed publico
- compartilhar somente com usuarios autenticados no Metabase

## Ordem de execucao no Supabase

1. `docs/supabase-views.sql`
2. `docs/supabase-permissions-bi.sql`
3. `docs/supabase-validation-checklist.sql`

## Checklist operacional

- Executar as 3 SQLs na ordem recomendada.
- Validar leitura das views aprovadas.
- Validar bloqueio do reader em tabelas base.
- Validar bloqueio do reader em `vw_satisfaction_comments_admin`.
- Validar ausencia de grants para `anon`/`authenticated` nas views analiticas.
- Validar timezone local em registros proximos da meia-noite.
- Validar contagens das views vs tabelas base no mesmo recorte.

## Criterios de aceite

1. Sem dashboard interno na plataforma publica.
2. Sem criacao de `dashboard.html`.
3. Sem leitura analitica no frontend.
4. Sem alteracao na logica de coleta/salvamento atual.
5. Views com agregacao diaria em `America/Sao_Paulo`.
6. `vw_satisfaction_feedback_daily` sem texto livre de comentario.
7. `vw_satisfaction_comments_admin` separada e restrita.
8. `dsm_dashboard_reader` com acesso somente as 3 views aprovadas.
9. `dsm_dashboard_reader` sem acesso a tabelas base.
10. `anon` e `authenticated` sem acesso as views analiticas.

## Pontos manuais

- A criacao da role `dsm_dashboard_reader` com senha pode depender da politica do ambiente Supabase e pode exigir execucao manual.
