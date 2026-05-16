# Data Skill Map

Aplicacao web estatica para diagnostico de conhecimentos em dados, trilhas sugeridas e desafios praticos.

## Estrutura

- `index.html`: pagina principal.
- `diagnostico.html`: pagina do diagnostico adaptativo por niveis.
- `style.css`: ponto de entrada dos estilos.
- `styles/`: estilos separados por base, layout, componentes e responsividade.
- `src/`: codigo JavaScript modularizado.
- `src/data/`: perguntas, desafios e guias de conteudo.
- `assets/`: imagens e demais recursos visuais.
- `docs/`: documentacao de design e identidade visual.

## Como executar

Abra `index.html` em um navegador moderno ou sirva a pasta com um servidor estatico.

## Integracao Supabase (anonima)

O projeto foi preparado para enviar eventos ao Supabase sem bloquear o fluxo da interface.
Se o Supabase nao estiver configurado ou falhar, o diagnostico e os desafios continuam funcionando normalmente.

### 1) Configurar URL e chave publica

Edite o arquivo `src/supabase-config.js`:

- `url`: Project URL do Supabase
- `anonKey`: chave publica (`anon` / `publishable`)

Importante: nunca usar `service_role` no frontend.

### 2) Tabelas esperadas (nomes padrao)

Os servicos usam por padrao:

- `diagnostic_sessions`
- `diagnostic_answers`
- `challenge_attempts`
- `satisfaction_feedback`

Se quiser outro nome, ajuste em `src/supabase-config.js` no bloco `tables`.
Existe um schema inicial em `docs/supabase-schema.sql`.
As views de acompanhamento estao em `docs/supabase-views.sql`.
Plano e scripts da camada analitica externa (Metabase Cloud):

- `docs/dashboard-metabase-supabase-plan.md`
- `docs/supabase-views.sql`
- `docs/supabase-permissions-bi.sql`
- `docs/supabase-validation-checklist.sql`

### 3) O que ja esta sendo enviado

- `anonymous_user_id` (persistido em `localStorage`)
- dados consolidados do diagnostico
- respostas individuais do diagnostico
- tentativas de desafios (tema, nivel, acerto/erro, pontos, horario)
- pesquisa de satisfacao no diagnostico e nos desafios (nota de 1 a 5 e comentario opcional)

### 4) Comportamento de falha

Todas as funcoes de persistencia usam fallback seguro. Erros de rede, chave invalida, tabela ausente ou indisponibilidade do Supabase nao interrompem a experiencia do usuario.
