# Instrucoes permanentes do projeto

## 1. Contexto do projeto

- Projeto: Data Skill Map.
- Stack: HTML, CSS e JavaScript frontend com Supabase.
- Fluxo principal atual: diagnostico -> prioridade -> trilha personalizada -> proximo passo -> Meu Progresso.
- `main` deve ser tratada como branch estavel.

## 2. Regras de Git

- Antes de alterar arquivos, verificar branch e working tree.
- Trabalhar em feature branch, nunca direto na `main`, exceto quando o usuario pedir merge explicitamente.
- Nao fazer merge na `main` sem autorizacao explicita.
- Se houver working tree sujo inesperado, parar e reportar.
- Preferir merge fast-forward quando autorizado.
- Quando o usuario autorizar commit/push, fazer commit claro e push para a branch atual apos validacoes.

## 3. Regras de seguranca/Supabase

- Nao alterar banco, Supabase, RLS, policies, schema, migrations, seeds ou configs sensiveis sem autorizacao explicita.
- Consultas MCP Supabase devem ser somente leitura, salvo autorizacao explicita.
- Nunca executar `insert`, `update`, `delete`, `alter`, `create`, `drop` ou `truncate` sem autorizacao explicita.
- Nao limpar dados antigos sem autorizacao explicita.

## 4. Validacoes padrao

- Priorizar validacoes deterministicas antes da validacao visual:
  - `git diff --check`.
  - `node --check` nos JS alterados.
  - `node --check` em todos os JS de `src` quando houver alteracao JS.
  - Smoke test Node, se existir.
- Rodar `git diff --check`.
- Rodar `node --check` nos JS alterados.
- Rodar `node --check` em todos os JS de `src` quando houver alteracao JS.
- Para paginas estaticas, preferir Node como primeira opcao.
- Nao usar Python como primeira opcao, pois pode nao estar disponivel no ambiente do Codex mesmo que esteja instalado na maquina local.
- Quando precisar subir servidor local, tentar primeiro comandos Node ja disponiveis no projeto ou servidor estatico simples em Node.
- Considerar `127.0.0.1`/`localhost` como ambiente local de validacao, mas nao insistir se o navegador embutido bloquear.
- Tentar navegador embutido ou Playwright apenas se estiver disponivel.
- Se navegador embutido, Playwright, localhost, `127.0.0.1` ou sandbox falhar uma vez, nao repetir varias tentativas.
- Parar, reportar a limitacao e marcar validacao visual como pendente/manual.
- Nao gastar limite tentando multiplas alternativas de browser quando o ambiente bloquear.
- Informar no relatorio final quais validacoes automaticas foram executadas e se a validacao visual ficou pendente.
- Validar desktop e mobile quando houver alteracao visual.
- Conferir console sem erros quando possivel.
- Confirmar que arquivos sensiveis nao foram alterados.

## 5. Estilo de trabalho

- Ser objetivo.
- Evitar relatorios longos.
- Evitar repetir historico ja documentado.
- Relatorios finais devem conter apenas: branch, commit, arquivos alterados, validacoes, push e pendencias.
- Se algo falhar, parar e explicar o motivo.

## 6. Escopo de produto

- Nao prometer plano Pro, certificado, preco ou recursos nao implementados.
- Analytics nao deve aparecer na navegacao publica.
- CTA principal da landing deve levar para `diagnostico.html`.
- Manter textos em portugues.
- Manter labels visuais amigaveis: Aula, Pratica, Projeto.
