# Data Skill Map - Design System

## 1) Objetivo

Este documento define o padrao visual, estrutural e de interacao da plataforma Data Skill Map.
Ele deve ser usado como referencia para manter consistencia entre Home, Diagnostico e Desafios.

## 2) Identidade do Produto

- Nome oficial: `Data Skill Map`
- Proposta: plataforma educacional pratica para evolucao em dados
- Linguagem visual: limpa, profissional, foco em leitura e acao
- Tom da interface: direto, didatico e orientado a progresso

## 3) Arquitetura de Paginas

- `index.html`
  - Hero com resumo da experiencia
  - Bloco "Como funciona"
  - Trilhas de estudo
  - Desafios praticos com filtro e pontuacao
- `diagnostico.html`
  - Diagnostico adaptativo em pagina dedicada
  - Bloco textual principal no topo da pagina
  - Coluna de contexto (resumo, criterio e progresso por area)
  - Quiz em card principal com maior destaque
  - Resultado detalhado por nivel, area e pergunta

## 4) Tipografia

- Fonte principal de interface: `Inter`
- Fonte para codigo: `JetBrains Mono` (fallback `Fira Code`, `Consolas`)
- Escala base:
  - Corpo: `16px`
  - H1: `clamp(2.05rem, 4vw, 3.1rem)`
  - H2: `clamp(1.55rem, 2.4vw, 2.05rem)`
  - H3: `1.08rem`

## 5) Tokens de Design (CSS Variables)

Definidos em `styles/base.css`:

- Fundos e superficies
  - `--color-bg-primary: #f8fafc`
  - `--color-bg-secondary: #f1f5f9`
  - `--color-surface: #ffffff`
  - `--color-surface-muted: #f8fafc`
- Texto
  - `--color-text-primary: #0f172a`
  - `--color-text-secondary: #64748b`
  - `--color-text-muted: #94a3b8`
- Bordas
  - `--color-border: #e2e8f0`
  - `--color-border-soft: #eef2f7`
- Cores funcionais
  - `--color-primary: #2563eb`
  - `--color-primary-light: #dbeafe`
  - `--color-primary-hover: #1d4ed8`
  - `--color-primary-press: #1e40af`
  - `--color-accent: #06b6d4`
  - `--color-accent-strong: #0891b2`
  - `--color-focus-ring: rgba(6, 182, 212, 0.45)`
  - `--color-success: #16a34a`
  - `--color-success-light: #dcfce7`
  - `--color-warning: #f59e0b`
  - `--color-warning-light: #fef3c7`
  - `--color-error: #dc2626`
  - `--color-error-light: #fee2e2`
- Radius
  - `--radius-sm: 8px`
  - `--radius-md: 12px`
  - `--radius-lg: 16px`
  - `--radius-xl: 24px`
- Sombras
  - `--shadow-soft: 0 4px 16px rgba(15, 23, 42, 0.06)`
  - `--shadow-card: 0 8px 24px rgba(15, 23, 42, 0.08)`
  - `--shadow-lift: 0 18px 44px rgba(15, 23, 42, 0.12)`
- Header
  - `--header-height` e atualizado dinamicamente via `ResizeObserver` em `src/app.js`

## 6) Sistema de Layout

- Area util principal: `.section-shell` com `width: min(1120px, calc(100% - 32px))`
- Header: sticky no topo com blur e borda inferior
- Sidebar:
  - Desktop: fixa a esquerda (`15.2rem`)
  - Mobile/tablet: vira barra horizontal sticky abaixo do header
- Home hero:
  - Grid de 2 colunas (conteudo + preview de desafio)
- Diagnostico:
  - Faixa superior com titulo e descricao
  - Grid de 2 colunas (painel de contexto + card do quiz)
  - Painel de contexto em cards (resumo, leitura do resultado, progresso por area)
  - Densidade otimizada (espacamentos reduzidos para leitura mais rapida)
  - Em mobile vira 1 coluna

## 7) Responsividade

Breakpoints em `styles/responsive.css`:

- `@media (max-width: 900px)`
  - Sidebar vira horizontal
  - Grids principais passam para 1 coluna ou 2 colunas compactas
  - Cards de diagnostico e resultado com padding reduzido
- `@media (max-width: 620px)`
  - Header/sections/footer em coluna
  - CTA do header oculto
  - Botoes principais passam a largura total
  - Grids de cards e metricas passam para 1 coluna
  - Margens laterais e espacos internos reduzidos para diminuir rolagem

## 8) Iconografia

- Biblioteca: `Lucide` via CDN (`https://unpkg.com/lucide@latest`)
- Renderizacao: `window.lucide.createIcons()` em `src/app.js`
- Uso atual:
  - Navegacao lateral
  - CTAs
  - Blocos de metricas no hero

## 9) Componentes Principais

- Navegacao
  - `.app-header`, `.app-sidebar`, links com estado `active`
- Botoes
  - Primarios: `.header-cta`, `.button-primary`, `.submit-button` (gradiente azul-ciano)
  - Secundarios: `.button-secondary`, `.restart-button`
  - Hover/active com variacao de gradiente e sombra por profundidade
  - Foco global com `:focus-visible` em anel ciano
- Cards
  - Base: superficie clara, borda suave, radius `lg`, sombra `soft`
  - Hover com elevacao e borda destacada
- Tags
  - `.concept-tag`, `.level-tag`, `.category-tag`, `.badge-sql`
- Progresso
  - Barras em quiz e resultado (`.progress-line`, `.score-track`)
- Feedback
  - `.feedback-box.success` e `.feedback-box.error`
- Loader de resultado
  - `.diagnostic-loading` com `loading-dots` animado
- Contexto de diagnostico
  - `.diagnostic-overview`, `.diagnostic-overview-card`, `.overview-title`, `.overview-copy`
- Microespacamento
  - `area-pill`, `quiz-top`, `answer-list`, `feedback-box`, `result-card`, `review-card` com escala mais compacta
- Revisao por pergunta
  - `question-review-card` com status visual `is-hit` / `is-miss`

## 10) Regras do Diagnostico (versao atual)

Implementado em `src/quiz.js` + `src/data/content.js`:

- Estrutura por niveis:
  - Basico
  - Intermediario
  - Avancado
- Banco de questoes:
  - 18 questoes no total (6 por nivel)
- Sessao de diagnostico:
  - 5 perguntas sorteadas por nivel
  - 15 perguntas totais por tentativa
- Regra de progressao:
  - Minimo de 75% para sair do Basico
  - Minimo de 75% para sair do Intermediario
  - Avancado encerra no resultado final
- Fluxo de resposta:
  - Seleciona alternativa
  - Clica em `Confirmar resposta`
  - Recebe feedback imediato
- Antes do resultado:
  - Mostra animacao de processamento
- Resultado exibe:
  - Acertos e erros totais
  - Desempenho por nivel
  - Mapa por area
  - Prioridade recomendada
  - Historico por pergunta (acerto/erro)
  - Revisao dos erros

## 11) Regras dos Desafios

Implementado em `src/challenges.js`:

- Filtros por categoria
- Cada card exige selecao + clique em `Responder`
- Pontuacao acumulada em `state.challengeScore`
- Card respondido fica bloqueado para evitar pontuacao duplicada

## 12) Acessibilidade

- `lang="pt-BR"` nas paginas
- Labels e descricoes com `aria-label` nos blocos principais
- Loader do resultado com `role="status"` e `aria-live="polite"`
- Estados de foco visiveis com `:focus-visible`

## 13) Mapeamento de Arquivos

- Estilos
  - `style.css` (entrypoint)
  - `styles/base.css`
  - `styles/layout.css`
  - `styles/components.css`
  - `styles/responsive.css`
- Scripts
  - `src/app.js` (bootstrap geral, header dinamico, icones)
  - `src/state.js` (estado global)
  - `src/quiz.js` (diagnostico adaptativo)
  - `src/recommendations.js` (perfil e recomendacoes)
  - `src/challenges.js` (desafios)
  - `src/hero-preview.js` (rotacao do preview no hero)
  - `src/data/content.js` (conteudo de questoes, desafios e guias)

## 14) Checklist para Novas Alteracoes

- Manter tokens de cor/radius/sombra do `base.css`
- Garantir sidebar funcional em desktop e mobile
- Validar textos sem overflow em `900px` e `620px`
- Preservar fluxo "selecionar -> confirmar -> feedback"
- Nao quebrar regra de 5 perguntas por nivel aleatorias
- Manter coerencia entre conteudo da Home e da pagina de Diagnostico
