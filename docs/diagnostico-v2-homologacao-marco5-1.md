# Diagnóstico V2 — Marco 5.1: saneamento do banco candidato

**Parecer: NO-GO para iniciar o piloto fechado.** O banco de 40 candidatos sustenta os percursos simulados no PostgreSQL isolado, e as contradições documentais identificadas têm correções propostas. Ainda faltam aprovações editoriais humanas, execução funcional das fórmulas e operações de Excel e homologação visual integrada com as perguntas reais. Este parecer não altera o motor, o blueprint nem o escopo de 40 itens.

## Fonte e entregáveis privados

A fonte original confirmada pelo responsável, `docs/planejamento-local/diagnostico_v2_80_questoes.json`, continua intacta (SHA-256 `17f8bab8111faf3a34ab3e8866ac4768172b99b86ba956cdaa53aec3534d92bc`). Os arquivos seguintes estão somente em `docs/planejamento-local/`, ignorada pelo Git:

- `MARCO5_1_80_QUESTOES_REVISADAS_PRIVADO.json`: versão candidata revisada das 80, sem sobrescrever a fonte;
- `MARCO5_1_DIFERENCAS_PRIVADO.json`: dez mudanças propostas, por ID e campo, com valor anterior, novo valor e motivo;
- `MARCO5_1_MATRIZ_TECNICA_PRIVADA.json`: linha individual dos 40, nível, competência, dificuldade, tempo, justificativa da resposta e dos três distratores, método, evidência e situação editorial;
- `MARCO5_1_PARECER_CRITICOS_PRIVADO.md`: segunda análise técnica de 002 e 050, com 078 bloqueado para expansão;
- `MARCO5_1_REVISAO_PRIVADA.cjs`: provas reproduzíveis em PGlite e JavaScript, sem conexão ou escrita remota;
- `MARCO5_HOMOLOGACAO_PRIVADA.json`: nova execução dos dez perfis nos bancos de 25 e 40.

Enunciados, alternativas, gabaritos e dados de prova não são incluídos neste relatório, no frontend, no Git ou em artifacts de CI. A matriz é uma **proposta de revisão técnica**, não aprovação editorial.

## Cobertura e evidência individual

São 25 itens prioritários e 15 reservas, todos elegíveis pelas regras atuais do motor; o rótulo prioritário não impõe ordem de seleção. Cada área tem 3 itens básicos, 3 intermediários e 2 avançados. As competências distintas são SQL 7, Excel 7, Estatística 8, Indicadores 8 e Lógica de dados 8: 38 no total.

| Tipo de verificação individual | Itens | Alcance |
|---|---:|---|
| **VALIDADO TECNICAMENTE** por execução local | 22 | Oito SQL em PGlite e 14 verificações numéricas independentes; resultados e casos de borda por ID constam da matriz privada. |
| Cenário sintético executado, evidência limitada | 7 | Casos de métrica de erro, sinal persistente, conversão regional de número, grão, NULL, contrato e conciliação. Não é execução dos produtos Excel/ERP/API reais. |
| **NÃO EXECUTADO** funcionalmente: Excel/Power Query | 7 | Fórmulas, referências, localidade, tabela dinâmica e transformação foram revistos estaticamente; testar no aplicativo representativo. |
| **NÃO EXECUTADO**: revisão conceitual | 4 | Itens de amostragem, correlação, indicador antecedente e governança de metas exigem avaliação humana e evidência empírica, não uma prova de execução artificial. |

Todos os 40 continuam **PENDENTE DE REVISÃO EDITORIAL**. O teste técnico não mede discriminação psicométrica. Em 002 e 050 são necessárias duas aprovações humanas; o 078 segue bloqueado fora do pool.

### Correções propostas e achados

| IDs | Situação | Ação proposta |
|---|---|---|
| 002 | **CORREÇÃO NECESSÁRIA** na fonte | Corrigir as contagens atribuídas às letras conforme a prova privada. Explicitar que a regra trata espaços comuns, pois `BTRIM` padrão não cobre toda classe de branco. |
| 005 | **CORREÇÃO NECESSÁRIA** na anotação | Corrigir resultado dos JOINs alternativos: o produto cartesiano tem nove combinações, o anti-join retorna só o cliente sem compra, e a junção pela chave errada não tem cardinalidade fixa. |
| 009 | **CORREÇÃO NECESSÁRIA** na anotação | A consulta correta executa; a consulta com agregado em `WHERE` falha. Os demais distratores foram executados/avaliados em dados controlados. |
| 024 | **CORREÇÃO NECESSÁRIA** editorial | Retirar duplicação de palavras e alinhar a anotação ao nome da função de Excel citado na alternativa. Prova funcional no Excel pendente. |
| 060 | **CORREÇÃO NECESSÁRIA** na validação | Remover probabilidade numérica atribuída à sequência sem independência e distribuição demonstradas. |
| 003 | Fora do pool | Proposta de duração e anotação de teste ausentes; não bloqueia os 40, mas precisa de revisão para a expansão. |
| 050 | **VALIDADO TECNICAMENTE** na aritmética | A etapa discrepante foi confirmada; a alternativa correta traz o resultado numérico, possível pista. Dois revisores devem decidir sobre a qualidade dos distratores. |
| 078 | Fora do pool | Mantido bloqueado para expansão e dupla revisão. |

Uma varredura automática nas anotações dos 80 destacou 002 e 010. O 010, fora do pool, foi examinado e não apresentou divergência entre gabarito e anotação; a varredura textual não garante ausência de outros erros. A matriz privada registra premissas e justificativas de todas as alternativas dos 40 itens.

## Dez perfis e limites do motor

O teste local importou a fonte no PostgreSQL em memória, com 80 itens para integridade de schema, 25 para o cenário restrito e 40 para o cenário do piloto. Nos **nove perfis normais com 40**, não houve `pool_gap`; o décimo retirou itens básicos de SQL de propósito e produziu `insufficient_pool` e nível **Indeterminado** nessa área. Houve 9 conclusões e 1 falta provocada, 219 apresentações no total, 38 itens distintos apresentados, nenhuma repetição dentro de tentativa e até 25 perguntas por tentativa. O perfil de retomada devolveu o mesmo item e a mesma ordem de alternativas. Os resultados foram conferidos por área, nível, competência, evidência, prioridade e recomendação; `next` não expôs gabarito nem explicação.

| Perfil | Questões | Resultado sintético por SQL / Estatística / Excel / Lógica / Indicadores |
|---|---:|---|
| A: todas incorretas | 20 | Revisar fundamentos em todas. |
| B: só básicas corretas | 20 | Fundamentos demonstrados em todas. |
| C: básicas e intermediárias corretas | 25 | Intermediário demonstrado em todas. |
| D: SQL forte | 22 | Avançado provisório em SQL; fundamentos a revisar nas outras. |
| E: Excel forte | 22 | Avançado provisório em Excel; fundamentos a revisar nas outras. |
| F: Lógica forte | 22 | Avançado provisório em Lógica; fundamentos a revisar nas outras. |
| G: todas corretas | 25 | Avançado provisório em SQL/Estatística; intermediário nas outras três. |
| H: acertos alternados | 20 | Fundamentos demonstrados ou a revisar, conforme área. |
| I: falta provocada | 18 | Indeterminado em SQL; fundamentos a revisar nas outras. |
| J: retomada | 25 | Intermediário demonstrado em todas. |

O perfil G confirma o limite da evidência: acerto total não gera classificação avançada artificial nas cinco áreas. Os perfis são sintéticos e não provam validade, dificuldade ou discriminação em estudantes reais. O cenário de 25 prioritários continua insuficiente para percursos adaptativos sem reservas, conforme Marco 5.

## Duração e experiência

As fichas estimam 80–120 s por item básico (média 97 s), 110–140 s por intermediário (média 123 s) e 140–170 s por avançado (média 149 s). A soma estimada por percurso ficou entre **31,2 e 50,3 min**; nos nove percursos normais, 34,5–50,3 min. Há risco de abandono em percursos longos. Os itens 077, 006, 014, 009 e 015 concentram mais texto/código; 047 tem o maior tempo previsto (170 s). Essas cifras não incluem pausa, leitura repetida nem uso de tecnologia assistiva. Medir tempo por questão, conclusão e abandono em teste com pessoas, comunicar a duração estimada antes de iniciar e revisar legibilidade nos três tamanhos de tela. Não reduzir o banco ou o teto de 25 sem analisar efeito sobre a cobertura.

## Interface, regressão e decisão

A interface privada com questões reais **não foi homologada visualmente**. Não havia servidor em `127.0.0.1:4173` nem `localhost:4173`; o Playwright está instalado, mas o Chromium não está presente. O teste de browser existente depende de Supabase local integrado, indisponível nesta sessão. Assim, ficam pendentes desktop 1366 px, tablet 768 px, mobile 390 px, enunciados extensos, SQL/fórmulas, seleção, hero, resultado, competências, próximas práticas, Meu Progresso V1/V2, erros e console com conteúdo real. Nenhuma captura sensível foi gerada.

**GO técnico limitado para solicitar aprovação editorial:** estrutura, execução isolada do motor e 22 provas individuais estão documentadas. **NO-GO para iniciar piloto fechado:** é preciso aceitar as correções em versão controlada, obter revisão humana dos 40 (dupla em 002/050), executar Excel em ambiente representativo e homologar a interface integrada localmente. Depois, medir dificuldade, duração e discriminação com usuários reais. Não houve importação remota, alteração de banco, RLS, policies, migrations, seeds, Auth, V1, MapIA, merge ou deploy.
