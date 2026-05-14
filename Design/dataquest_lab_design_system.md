# DataQuest Lab — Guia de Layout, Estilo e Identidade Visual

## 1. Conceito da plataforma

**Nome:** DataQuest Lab  
**Slogan:** Aprenda dados na prática, um desafio por vez.

A DataQuest Lab é uma plataforma educacional voltada para pessoas que desejam aprender **SQL, Estatística, BI, Indicadores, KPIs e Análise de Dados** por meio de desafios práticos, explicações claras e trilhas de estudo personalizadas.

A proposta visual deve transmitir:

- Clareza
- Confiança
- Aprendizado prático
- Tecnologia acessível
- Profissionalismo
- Evolução contínua
- Simplicidade visual

O produto deve parecer uma plataforma SaaS educacional moderna, com visual limpo, organizado e fácil de navegar.

---

## 2. Direção visual

### Tema principal

**Clean Data Learning**

A identidade visual deve seguir um padrão **clean, moderno, educacional e profissional**.

Evitar aparência:

- Gamer
- Hacker
- Neon excessivo
- Dark pesado
- Visual poluído
- Elementos muito chamativos
- Sombras fortes
- Gradientes exagerados

Priorizar:

- Fundo claro
- Cards brancos
- Bordas suaves
- Espaçamento generoso
- Tipografia moderna
- Contraste confortável
- Ícones simples
- Elementos visuais com propósito

---

## 3. Nome da marca

### Nome oficial

**DataQuest Lab**

### Interpretação do nome

- **Data:** dados, análise, informação e inteligência.
- **Quest:** jornada, desafio, investigação e aprendizado ativo.
- **Lab:** ambiente de prática, teste, descoberta e evolução.

### Variações permitidas

- DataQuest Lab
- DataQuest
- DQLab

### Uso recomendado

Usar **DataQuest Lab** em materiais institucionais, cabeçalho da plataforma e tela inicial.

Usar **DataQuest** em espaços menores ou elementos visuais compactos.

---

## 4. Logo

### Conceito da logo

A logo deve combinar elementos visuais ligados a:

- Banco de dados
- Lupa ou bússola
- Gráfico de crescimento
- Jornada de aprendizado
- Raciocínio analítico

### Elementos visuais sugeridos

1. **Banco de dados / cilindro**  
   Representa armazenamento, SQL, bases e estrutura de dados.

2. **Lupa ou bússola**  
   Representa descoberta, investigação, diagnóstico e direção de estudo.

3. **Gráfico de barras ou crescimento**  
   Representa evolução, indicadores, BI e progresso.

4. **Linha curva ou seta sutil**  
   Representa jornada, trilha e avanço contínuo.

### Estilo da logo

A logo deve ser:

- Clean
- Simples
- Escalável
- Profissional
- Legível em tamanhos pequenos
- Funcional em fundo claro
- Adaptável para favicon e ícone de aplicativo

### Cores da logo

- Azul como cor principal
- Verde como cor de apoio
- Amarelo como detalhe sutil
- Texto principal em azul escuro ou quase preto

### Aplicação textual sugerida

**Data** em cor escura  
**Quest** em azul  
**Lab** em verde

Exemplo:

```txt
DataQuest Lab
```

---

## 5. Tipografia

### Fonte principal

**Satoshi**

A fonte Satoshi é recomendada por transmitir uma sensação moderna, limpa, sofisticada e adequada para produtos digitais.

Ela combina bem com a proposta da DataQuest Lab porque comunica:

- Tecnologia
- Educação digital
- Clareza
- Produto moderno
- Profissionalismo
- Interface premium

### Fallback recomendado

```css
font-family: 'Satoshi', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

### Uso dos pesos

| Uso | Peso recomendado |
|---|---|
| Logo | Satoshi Black / 900 |
| Títulos principais | Satoshi Bold / 700 |
| Subtítulos | Satoshi Medium ou Bold / 500-700 |
| Textos comuns | Satoshi Regular / 400 |
| Botões | Satoshi Medium ou Bold / 500-700 |
| Labels e badges | Satoshi Medium / 500 |
| Números e KPIs | Satoshi Bold / 700 |

### Hierarquia tipográfica sugerida

```css
h1 {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.1;
}

h2 {
  font-size: 36px;
  font-weight: 700;
  line-height: 1.2;
}

h3 {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
}

h4 {
  font-size: 20px;
  font-weight: 600;
  line-height: 1.4;
}

body {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.6;
}

small {
  font-size: 14px;
  line-height: 1.5;
}
```

---

## 6. Paleta de cores

### Paleta principal clean

| Função | Cor | Hex |
|---|---:|---|
| Fundo principal | Cinza muito claro | `#F8FAFC` |
| Fundo secundário | Cinza claro | `#F1F5F9` |
| Cards | Branco | `#FFFFFF` |
| Texto principal | Azul escuro | `#0F172A` |
| Texto secundário | Cinza azulado | `#64748B` |
| Texto terciário | Cinza suave | `#94A3B8` |
| Borda | Cinza claro | `#E2E8F0` |
| Azul principal | Azul educacional | `#2563EB` |
| Azul claro | Fundo de apoio | `#DBEAFE` |
| Ciano destaque | Destaque analítico | `#06B6D4` |
| Verde sucesso | Acerto/evolução | `#16A34A` |
| Verde claro | Fundo de sucesso | `#DCFCE7` |
| Amarelo atenção | Destaque/alerta | `#F59E0B` |
| Amarelo claro | Fundo de alerta | `#FEF3C7` |
| Vermelho erro | Erro/incorreto | `#DC2626` |
| Vermelho claro | Fundo de erro | `#FEE2E2` |

---

## 7. Tokens CSS recomendados

```css
:root {
  --font-primary: 'Satoshi', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

  --color-bg-primary: #F8FAFC;
  --color-bg-secondary: #F1F5F9;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F8FAFC;

  --color-text-primary: #0F172A;
  --color-text-secondary: #64748B;
  --color-text-muted: #94A3B8;

  --color-border: #E2E8F0;
  --color-border-soft: #EEF2F7;

  --color-primary: #2563EB;
  --color-primary-light: #DBEAFE;
  --color-primary-hover: #1D4ED8;

  --color-accent: #06B6D4;
  --color-success: #16A34A;
  --color-success-light: #DCFCE7;
  --color-warning: #F59E0B;
  --color-warning-light: #FEF3C7;
  --color-error: #DC2626;
  --color-error-light: #FEE2E2;

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  --shadow-soft: 0 4px 16px rgba(15, 23, 42, 0.06);
  --shadow-card: 0 8px 24px rgba(15, 23, 42, 0.08);
}
```

---

## 8. Layout geral da plataforma

### Estrutura recomendada

A plataforma deve conter:

1. Header com logo e navegação
2. Hero section com chamada principal
3. Área de diagnóstico de perfil
4. Cards de trilhas de estudo
5. Cards de desafios
6. Área de resultado e recomendações
7. Footer simples

### Grid

Usar grid responsivo com boa distribuição visual.

Recomendação:

```css
.container {
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

@media (max-width: 900px) {
  .grid-3 {
    grid-template-columns: 1fr;
  }
}
```

### Espaçamento

Usar bastante respiro visual.

| Elemento | Espaçamento sugerido |
|---|---:|
| Padding lateral mobile | 16px |
| Padding lateral desktop | 32px |
| Espaço entre seções | 72px a 96px |
| Espaço entre cards | 20px a 24px |
| Padding interno dos cards | 24px |
| Radius dos cards | 16px a 24px |

---

## 9. Componentes visuais

### Header

O header deve ser simples e limpo.

Características:

- Fundo branco ou levemente translúcido
- Borda inferior discreta
- Logo à esquerda
- Links de navegação no centro ou à direita
- Botão principal à direita
- Altura confortável

Sugestão:

```css
.header {
  height: 72px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid var(--color-border);
  backdrop-filter: blur(12px);
}
```

### Hero section

Deve comunicar rapidamente o valor da plataforma.

Conteúdos recomendados:

- Badge pequeno: Plataforma de desafios em dados
- Título forte
- Descrição curta
- Botão principal: Começar diagnóstico
- Botão secundário: Ver trilhas
- Visual lateral com card de desafio SQL

Texto sugerido:

```txt
Aprenda SQL, Estatística e Dados com desafios práticos.
```

Descrição:

```txt
Descubra seu nível, responda desafios e receba uma trilha personalizada para evoluir em análise de dados.
```

---

## 10. Cards

### Card padrão

Os cards devem ser brancos, com bordas suaves e sombra leve.

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  padding: 24px;
}
```

### Card de desafio

Deve conter:

- Categoria
- Nível
- Pergunta
- Bloco de código, quando aplicável
- Alternativas
- Botão de responder
- Feedback
- Explicação didática

Estados:

- Neutro
- Respondido corretamente
- Respondido incorretamente
- Em revisão

---

## 11. Botões

### Botão primário

```css
.button-primary {
  background: var(--color-primary);
  color: #FFFFFF;
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}

.button-primary:hover {
  background: var(--color-primary-hover);
}
```

### Botão secundário

```css
.button-secondary {
  background: #FFFFFF;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 12px 20px;
  font-weight: 600;
  cursor: pointer;
}

.button-secondary:hover {
  background: var(--color-bg-secondary);
}
```

---

## 12. Badges e labels

### Categorias

| Categoria | Cor sugerida |
|---|---|
| SQL | Azul |
| Estatística | Ciano |
| BI | Verde |
| KPIs | Amarelo |
| Lógica de dados | Azul escuro |

### Exemplo CSS

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.badge-sql {
  background: var(--color-primary-light);
  color: var(--color-primary);
}

.badge-success {
  background: var(--color-success-light);
  color: var(--color-success);
}

.badge-warning {
  background: var(--color-warning-light);
  color: var(--color-warning);
}
```

---

## 13. Blocos de código

Como a plataforma terá desafios SQL, os blocos de código devem ser muito legíveis.

### Estilo recomendado

- Fundo claro levemente azulado
- Borda discreta
- Fonte monoespaçada
- Alto contraste
- Sem aparência hacker/neon

```css
.code-block {
  background: #F8FAFC;
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 18px;
  font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-primary);
  overflow-x: auto;
}
```

### Fonte para código

Recomendadas:

- JetBrains Mono
- Fira Code
- IBM Plex Mono
- Consolas

---

## 14. Estados de resposta

### Resposta correta

```css
.answer-correct {
  background: var(--color-success-light);
  border-color: var(--color-success);
  color: var(--color-success);
}
```

### Resposta incorreta

```css
.answer-wrong {
  background: var(--color-error-light);
  border-color: var(--color-error);
  color: var(--color-error);
}
```

### Resposta selecionada

```css
.answer-selected {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
```

---

## 15. Diagnóstico de perfil

### Objetivo

O diagnóstico deve mapear o nível do usuário em áreas importantes para dados.

### Áreas avaliadas

- SQL
- Estatística
- Excel / BI
- Lógica de dados
- Interpretação de indicadores

### Formato das perguntas

Cada pergunta deve conter:

- Enunciado claro
- 4 alternativas
- Apenas uma correta
- Feedback após resposta
- Explicação didática
- Conceito avaliado
- Nível da questão

### Perfis possíveis

| Perfil | Descrição |
|---|---|
| Iniciante em Dados | Está começando e precisa construir a base. |
| Aprendiz de SQL | Já entende alguns conceitos, mas precisa consolidar consultas e lógica. |
| Analista em Formação | Tem boa base inicial e pode avançar para análises mais estruturadas. |
| Analista Intermediário | Já domina fundamentos e pode praticar problemas reais. |
| Pronto para Projetos Reais | Tem boa maturidade para aplicar dados em cenários práticos. |

---

## 16. Recomendações de estudo

Após o diagnóstico, a plataforma deve recomendar o que estudar com base nos erros e acertos.

### Exemplo de regra

Se o usuário errar questões sobre `JOIN` e `COUNT`, recomendar:

```txt
Revise JOINs, cardinalidade, COUNT(*), COUNT(coluna) e COUNT(DISTINCT). Esses conceitos são essenciais para evitar erros de contagem em bases relacionais.
```

### Estrutura da recomendação

Cada recomendação deve conter:

- Tema principal
- Por que estudar esse tema
- Conceitos relacionados
- Próximo desafio sugerido
- Nível recomendado

---

## 17. Trilhas de estudo

### Trilhas iniciais sugeridas

1. **Fundamentos de Dados**
   - O que são dados
   - Tipos de dados
   - Tabelas
   - Linhas e colunas
   - Indicadores básicos

2. **SQL Essencial**
   - SELECT
   - WHERE
   - ORDER BY
   - GROUP BY
   - COUNT
   - SUM
   - AVG

3. **SQL Intermediário**
   - JOIN
   - LEFT JOIN
   - Cardinalidade
   - COUNT DISTINCT
   - Subqueries
   - CTEs

4. **Estatística para Dados**
   - Média
   - Mediana
   - Moda
   - Desvio padrão
   - Distribuição
   - Correlação

5. **Indicadores e KPIs**
   - O que é KPI
   - Meta
   - Gap
   - Variação percentual
   - Evolução histórica
   - Ranking

6. **Projetos Práticos**
   - Análise de vendas
   - Análise de NPS
   - Dashboard operacional
   - Diagnóstico de performance
   - Geração de insights

---

## 18. Exemplo obrigatório de desafio SQL

### Pergunta

Qual o resultado da query abaixo?

```sql
SELECT COUNT(*)
FROM cliente c
LEFT JOIN compra cp
ON c.ID_CLIENTE = cp.ID_CLIENTE;
```

### Informações

- Existem 5 clientes
- Apenas 3 fizeram compra
- Um deles fez 2 compras

### Alternativas

A) 3  
B) 5  
C) 6  
D) 7

### Resposta correta

**C) 6**

### Explicação didática

O `LEFT JOIN` mantém todos os clientes da tabela da esquerda. Clientes sem compra aparecem uma vez, com valores `NULL` na tabela de compras. O cliente que fez 2 compras aparece em 2 linhas, porque existe uma linha para cada compra relacionada.

Portanto, o resultado final tem:

- 2 clientes com 1 compra = 2 linhas
- 1 cliente com 2 compras = 2 linhas
- 2 clientes sem compra = 2 linhas

Total: **6 linhas**.

Como `COUNT(*)` conta linhas, a query retorna **6**.

### Conceitos avaliados

- LEFT JOIN
- Cardinalidade
- Multiplicação de linhas
- COUNT(*)
- Diferença entre contar linhas e contar entidades únicas

### Nível da questão

**Intermediário**

---

## 19. Tom de voz da plataforma

A linguagem deve ser:

- Didática
- Clara
- Direta
- Incentivadora
- Profissional
- Sem excesso de jargões
- Com exemplos práticos

### Evitar

```txt
Você errou porque não sabe JOIN.
```

### Preferir

```txt
Quase! Essa questão envolve um detalhe importante: o LEFT JOIN pode multiplicar linhas quando existe mais de um registro relacionado.
```

---

## 20. Microcopy sugerida

### Botões

- Começar diagnóstico
- Ver trilhas
- Responder
- Próxima pergunta
- Ver explicação
- Revisar conceito
- Refazer diagnóstico
- Continuar estudando

### Feedback positivo

```txt
Boa! Você identificou corretamente o comportamento do JOIN.
```

```txt
Excelente! Esse conceito é muito usado em análises reais.
```

### Feedback de erro

```txt
Quase! O ponto principal aqui é lembrar que COUNT(*) conta linhas, não clientes únicos.
```

```txt
Boa tentativa. Vamos olhar o resultado linha por linha para entender melhor.
```

---

## 21. Acessibilidade

A plataforma deve considerar:

- Contraste adequado entre texto e fundo
- Estados visuais claros para correto e incorreto
- Botões com tamanho confortável
- Texto legível
- Navegação responsiva
- Não depender apenas de cor para indicar status
- Usar ícones e texto juntos nos feedbacks

---

## 22. Responsividade

### Desktop

- Layout com duas colunas no hero
- Cards em grid de 3 colunas
- Diagnóstico centralizado

### Tablet

- Cards em 2 colunas
- Header simplificado
- Espaçamentos reduzidos

### Mobile

- Layout em coluna única
- Cards ocupando 100% da largura
- Botões em largura total
- Navegação simplificada
- Código com scroll horizontal

---

## 23. Prompt base para Codex / VS Code

```txt
Crie uma aplicação web em HTML, CSS e JavaScript puro chamada "DataQuest Lab".

Objetivo:
A plataforma deve ajudar pessoas interessadas em aprender SQL, Estatística, BI, Indicadores e Análise de Dados por meio de desafios interativos, diagnóstico de perfil, explicações didáticas e recomendações personalizadas de estudo.

Direção visual:
A identidade visual deve seguir um tema CLEAN, moderno, educacional e profissional.
Não utilizar aparência gamer, hacker, neon ou dark como padrão principal.
A interface deve parecer uma plataforma SaaS educacional premium, com bastante espaço em branco, hierarquia visual clara, boa legibilidade e cards suaves.

Nome da plataforma:
DataQuest Lab

Slogan:
Aprenda dados na prática, um desafio por vez.

Fonte:
Utilizar Satoshi como fonte principal.
Fallback: Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif.

Aplicação da fonte:
- Logo: Satoshi Black
- Títulos: Satoshi Bold
- Subtítulos: Satoshi Medium ou Bold
- Textos: Satoshi Regular
- Botões e labels: Satoshi Medium

Paleta oficial:
- Fundo principal: #F8FAFC
- Fundo secundário: #F1F5F9
- Cards: #FFFFFF
- Texto principal: #0F172A
- Texto secundário: #64748B
- Texto terciário: #94A3B8
- Azul principal: #2563EB
- Azul claro: #DBEAFE
- Ciano destaque: #06B6D4
- Verde sucesso: #16A34A
- Verde claro: #DCFCE7
- Amarelo atenção: #F59E0B
- Amarelo claro: #FEF3C7
- Vermelho erro: #DC2626
- Vermelho claro: #FEE2E2
- Bordas: #E2E8F0

Logo:
Criar uma logo clean para "DataQuest Lab".
A logo deve combinar banco de dados, lupa ou bússola e gráfico de crescimento.
A logo deve ser simples, escalável e funcionar bem em fundo claro.
Evitar efeitos neon, brilhos intensos ou sombras pesadas.
Usar azul como cor principal, verde como apoio e amarelo apenas como detalhe sutil.

Estrutura da aplicação:
1. Header com logo e navegação.
2. Hero section com chamada principal, descrição e botões.
3. Diagnóstico de perfil com perguntas de múltipla escolha.
4. Resultado do diagnóstico com classificação do usuário.
5. Recomendações personalizadas de estudo.
6. Tela de desafios por categoria.
7. Cards de trilhas de estudo.
8. Footer simples.

Funcionalidades:
- O usuário deve conseguir responder perguntas.
- O sistema deve calcular acertos.
- O sistema deve gerar perfil ao final.
- O sistema deve mostrar recomendações de estudo.
- O sistema deve permitir reiniciar o diagnóstico.
- Não usar backend neste primeiro momento.
- Armazenar progresso temporariamente em JavaScript.
- Separar os arquivos em index.html, style.css e script.js.

Áreas avaliadas no diagnóstico:
- SQL
- Estatística
- Excel/BI
- Lógica de dados
- Interpretação de indicadores

Perfis possíveis:
- Iniciante em Dados
- Aprendiz de SQL
- Analista em Formação
- Analista Intermediário
- Pronto para Projetos Reais

Exemplo obrigatório de desafio SQL:
Pergunta:
Qual o resultado da query abaixo?

Código:
SELECT COUNT(*)
FROM cliente c
LEFT JOIN compra cp
ON c.ID_CLIENTE = cp.ID_CLIENTE;

Informações:
- Existem 5 clientes
- Apenas 3 fizeram compra
- Um deles fez 2 compras

Alternativas:
A) 3
B) 5
C) 6
D) 7

Resposta correta:
C) 6

Explicação:
O LEFT JOIN mantém todos os clientes da tabela da esquerda. Clientes sem compra aparecem uma vez com valores NULL da tabela de compras. O cliente que fez 2 compras aparece em 2 linhas. Portanto, o resultado final tem 6 linhas. Como COUNT(*) conta linhas, o resultado é 6.

Qualidade esperada:
O código deve ser limpo, comentado e fácil de evoluir.
A interface deve parecer uma primeira versão real de produto, não apenas uma página simples.
Priorize boa experiência do usuário, clareza didática e visual moderno.
```

---

## 24. Recomendações finais

Para o MVP inicial, priorizar:

1. Homepage limpa e forte
2. Diagnóstico funcional
3. 10 a 15 perguntas iniciais
4. Resultado de perfil
5. Recomendações de estudo
6. Visual consistente com a identidade clean

Depois, evoluir para:

- Login
- Banco de questões
- Ranking
- Histórico de evolução
- Dashboard do usuário
- Certificados
- Trilhas completas
- Comunidade
- Modo desafio diário
