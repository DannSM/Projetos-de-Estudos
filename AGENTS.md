# Instrucoes permanentes do projeto

## 1. Contexto do projeto

* Projeto: Data Skill Map.
* Stack: HTML, CSS e JavaScript frontend com Supabase.
* Fluxo principal atual: diagnostico -> prioridade -> trilha personalizada -> proximo passo -> Meu Progresso.
* `main` deve ser tratada como branch estavel.

### Publicacao, dominio e infraestrutura

* Repositorio publicado via GitHub Pages.
* Dominio oficial atual: `https://trilhadedados.com.br`.
* O dominio foi configurado para apontar para a publicacao do projeto.
* Cloudflare esta sendo usado na camada de DNS/dominio.
* Alteracoes publicadas na `main` devem refletir no dominio oficial apos o tempo normal de deploy/cache.
* Ao validar em producao, usar preferencialmente:

  * `https://trilhadedados.com.br`
  * paginas principais: `/`, `/diagnostico`, `/trilhas`, `/meu-progresso`, `/analytics`
* Se houver divergencia entre local e producao, considerar:

  * atraso de deploy do GitHub Pages;
  * cache do navegador;
  * cache/CDN do Cloudflare;
  * necessidade de hard refresh ou teste em aba anonima;
  * propagacao de DNS/cache.

### Autenticacao e contas

* Supabase Auth e usado para login/cadastro.
* Login por e-mail/senha esta ativo.
* Login com Google esta ativo.
* Conta admin principal do projeto: `daniellysson@gmail.com`.
* Conta comum criada para teste/uso recente: `admin.trilhadedados@gmail.com`.
* Admin deve ser controlado pela tabela/regra de autorizacao `admin_users` / `admin_is_authorized`.
* Usuario comum nao deve ver Analytics na navegacao.
* Usuario anonimo pode fazer diagnostico, mas sem garantia de salvar historico vinculado a conta.
* Ao criar conta por e-mail/senha, pode haver confirmacao por e-mail conforme configuracao do Supabase.
* Links de confirmacao/recuperacao podem redirecionar para o dominio oficial conforme Site URL/Redirect URLs do Supabase.
* Nao alterar configuracoes de Supabase Auth, Redirect URLs, Site URL, OAuth Google, RLS ou policies sem autorizacao explicita.

### Produto atual

* O diagnostico pode ser feito sem login.
* Ao iniciar diagnostico anonimo, deve aparecer modal premium informando a importancia de entrar/criar conta para salvar progresso.
* O usuario pode continuar sem login ou entrar/criar conta antes de iniciar.
* Apos diagnostico logado, o resultado deve alimentar recomendacao de trilha, proximo passo e Meu Progresso.
* `diagnostic_sessions` e `diagnostic_answers` sao fonte da verdade do diagnostico.
* `user_skill_progress` deve funcionar como consolidado por area/habilidade calculado a partir do historico de respostas.
* `user_learning_progress` representa progresso em trilhas/passos.
* `learning_recommendations` guarda recomendacoes geradas para o usuario.
* A frente de Desafios/Praticar nao deve aparecer na navegacao/CTA enquanto nao estiver ativa no produto.


## 2. Regras de Git

* Antes de alterar arquivos, verificar branch e working tree.
* Trabalhar em feature branch, nunca direto na `main`, exceto quando o usuario pedir merge explicitamente.
* Nao fazer merge na `main` sem autorizacao explicita.
* Se houver working tree sujo inesperado, parar e reportar.
* Preferir merge fast-forward quando autorizado.
* Quando o usuario autorizar commit/push, fazer commit claro e push para a branch atual apos validacoes.
* Confirmar antes do commit que arquivos fora do escopo nao foram incluidos.

## 3. Regras de seguranca/Supabase

* Nao alterar banco, Supabase, RLS, policies, schema, migrations, seeds ou configs sensiveis sem autorizacao explicita.
* Consultas MCP Supabase devem ser somente leitura, salvo autorizacao explicita.
* Nunca executar `insert`, `update`, `delete`, `alter`, `create`, `drop` ou `truncate` sem autorizacao explicita.
* Nao limpar dados antigos sem autorizacao explicita.
* Quando houver consulta Supabase, registrar claramente se foi somente leitura.
* Confirmar no relatorio final se arquivos sensiveis, SQL, RLS, policies, migrations, seeds ou dados foram alterados ou nao.

## 4. Validacoes padrao

* Priorizar validacoes deterministicas antes da validacao visual:

  * `git diff --check`.
  * `node --check` nos JS alterados.
  * `node --check` em todos os JS de `src` quando houver alteracao JS.
  * Smoke test Node, se existir.
* Rodar `git diff --check`.
* Rodar `node --check` nos JS alterados.
* Rodar `node --check` em todos os JS de `src` quando houver alteracao JS.
* Para paginas estaticas, preferir Node como primeira opcao.
* Nao usar Python como primeira opcao, pois pode nao estar disponivel no ambiente do Codex mesmo que esteja instalado na maquina local.
* Confirmar que arquivos sensiveis nao foram alterados.

## 5. Validacao visual obrigatoria

Sempre que houver alteracao de UI, layout, header, menu, modal, formulario, feedback visual, responsividade ou navegacao, validar visualmente desktop e mobile antes de finalizar.

### 5.1 Ordem obrigatoria para validacao visual

1. Verificar se ja existe servidor local ativo:

   * Testar primeiro:

     * `http://127.0.0.1:4173`
     * `http://localhost:4173`
   * Se alguma URL responder HTTP 200, usar esse servidor e nao tentar subir outro.

2. Se nao existir servidor ativo, subir servidor estatico simples com Node:

   * Usar no maximo 2 tentativas para subir servidor local.
   * Preferir servidor estatico Node simples, sem criar arquivo dentro do repositorio.
   * Se precisar criar arquivo temporario para servidor, criar fora do repositorio, em pasta temporaria do sistema.
   * Metodo que funcionou no ambiente Codex em Windows: criar script temporario em `$env:TEMP\data-skill-map-static-server.js`, iniciar com Node na porta `4173` e confirmar HTTP 200.
   * Se o sandbox encerrar processos em background, pedir permissao elevada apenas para iniciar o servidor local persistente.
   * Apagar o arquivo temporario ao final da validacao.
   * Nao criar arquivo auxiliar dentro do projeto sem autorizacao.

3. Abrir a pagina no navegador disponivel na sessao do Codex, se existir:

   * Usar no maximo 1 tentativa para o navegador disponivel na sessao.
   * Validar desktop.
   * Validar mobile com largura aproximada de 390px.
   * Conferir console sem erros relevantes.
   * Conferir o estado anonimo.
   * Conferir estado logado/admin quando possivel ou quando a mudanca exigir.

4. Se o navegador disponivel na sessao falhar, tentar Playwright somente se ja estiver disponivel:

   * Usar no maximo 1 tentativa para Playwright.
   * Nao instalar dependencias novas sem autorizacao.
   * Nao gastar tempo configurando Playwright do zero.
   * No ambiente Codex atual, Playwright pode existir no runtime empacotado, mas falhar se os browsers nao estiverem instalados. Nesse caso, registrar a falha e seguir para DOM/CSS/JS por Node.

5. Se browser/Playwright nao estiverem disponiveis, fazer validacao automatizada por DOM/CSS/JS com Node:

   * Tratar DOM/CSS/JS por Node como fallback tecnico, nao como validacao visual completa.
   * Confirmar presenca/ausencia de seletores esperados.
   * Confirmar classes/atributos importantes.
   * Confirmar que textos removidos nao aparecem.
   * Confirmar que menus/CTAs seguem a regra esperada.
   * Confirmar que nao ha referencias visuais indevidas, como Desafios/Praticar quando o escopo atual nao usa essa frente.

6. So marcar validacao visual manual como pendente se todas as rotas abaixo falharem ou forem insuficientes:

   * servidor local existente;
   * servidor Node padronizado;
   * navegador disponivel na sessao;
   * Playwright disponivel;
   * validacao DOM/CSS/JS por Node.

### 5.2 Regras para nao desperdiçar limite

* Nao gastar muitas mensagens tentando subir servidor local.
* Nao testar varias combinacoes de quoting PowerShell/Node.
* Nao insistir repetidamente em `Start-Job`, `Start-Process`, `cmd`, Python ou alternativas complexas.
* Nao gastar tempo com multiplas variacoes de quoting, `Start-Process`, `cmd`, PowerShell ou sandbox.
* Limites: maximo de 2 tentativas para servidor local, 1 tentativa para navegador disponivel na sessao e 1 tentativa para Playwright se ja estiver disponivel.
* Primeiro sempre verificar se ja existe servidor ativo.
* Se o servidor Node padronizado falhar, registrar a falha e seguir para DOM/Playwright/browser disponivel.
* Nunca consumir a maior parte da sessao apenas tentando manter processo em background.
* Quando um metodo funcionar, registrar no relatorio final e priorizar o mesmo metodo nas proximas tarefas.

### 5.3 Metodo preferido atual do projeto

Metodo visual preferido:

* servidor local em `http://127.0.0.1:4173` ou `http://localhost:4173`;
* navegador disponivel na sessao do Codex;
* validacao desktop/mobile;
* conferencia do console.

Antes de tentar subir servidor, sempre testar se `127.0.0.1:4173` ou `localhost:4173` ja estao respondendo.

Metodo operacional validado neste ambiente:

* servidor Node estatico em `127.0.0.1:4173` com script temporario fora do repositorio;
* confirmacao por HTTP 200 em `index.html`, `diagnostico.html`, `meu-progresso.html` e `analytics.html` quando aplicavel;
* depois abrir a pagina no navegador disponivel na sessao do Codex, se existir;
* se navegador disponivel na sessao nao estiver disponivel e Playwright nao tiver browser instalado, usar validacao DOM/CSS/JS por Node como fallback tecnico automatizado;
* validacao manual so fica pendente para inspecao visual real de layout/console quando browser/Playwright nao estiverem disponiveis.

### 5.4 O que registrar no relatorio final

Quando houver validacao visual, informar:

* metodo usado;
* URL testada;
* paginas testadas;
* viewports desktop/mobile, se foi possivel;
* resultado do console, se foi possivel conferir;
* se ficou apenas fallback DOM/Node, marcar validacao visual real como pendente;
* o que ficou pendente, se houver.

Exemplo esperado:

* Validacao visual: executada via navegador disponivel na sessao em `http://127.0.0.1:4173`.
* Desktop: ok.
* Mobile 390px: ok.
* Console: sem erros relevantes.
* Pendencia visual: nenhuma.

## 6. Estilo de trabalho

* Ser objetivo, mas nao excessivamente curto.
* Evitar relatorios longos.
* Evitar repetir historico ja documentado.
* Durante a execucao, informar apenas decisoes relevantes.
* Nao narrar cada tentativa tecnica de servidor/browser, salvo se falhar de forma importante.
* Se algo falhar, parar e explicar o motivo.
* Relatorios finais devem conter:

  * branch;
  * commit;
  * arquivos alterados;
  * resumo funcional;
  * validacoes deterministicas;
  * validacao visual executada;
  * metodo visual usado;
  * push;
  * pendencias.

## 7. Escopo de produto

* Nao prometer plano Pro, certificado, preco ou recursos nao implementados.
* Analytics nao deve aparecer na navegacao publica.
* CTA principal da landing deve levar para `diagnostico.html`.
* Manter textos em portugues.
* Manter labels visuais amigaveis: Aula, Pratica, Projeto.
* Nao exibir referencias a Desafios/Praticar enquanto essa frente nao estiver ativa no produto.
* Menu desktop e mobile devem nascer da mesma regra/fonte de navegacao, para evitar divergencia por dispositivo.
* Estados de navegacao devem ser consistentes entre desktop e mobile:

  * anonimo;
  * usuario comum;
  * admin.
