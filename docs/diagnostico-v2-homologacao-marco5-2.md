# Diagnóstico V2 — fechamento técnico para decisão editorial

## Defeito confirmado antes da correção

O motor atribui até cinco perguntas de aprofundamento após 20 posições de mapeamento/validação. Na função `private.diagnostic_v2_next`, a área elegível era ordenada por quantidade de itens avançados já apresentados, em ordem decrescente, com desempate por uma lista fixa de áreas. A primeira área recebia dois itens antes da próxima. Em 30 tentativas sintéticas com 100% de acertos e banco equilibrado de 40 itens, a distribuição foi SQL 60, Estatística 60, Excel 30, Lógica de dados 0, Indicadores 0. SQL e Estatística alcançaram “Avançado provisório” em todas as tentativas; as outras áreas nunca tiveram duas oportunidades. O resultado dependeu da ordem de desempate, e não da competência simulada.

## Regra de correção proposta

Manter o teto de 25 itens e o requisito de duas competências avançadas corretas para “Avançado provisório”. Entre áreas elegíveis, ordenar primeiro pela evidência observada de acertos distintos nos níveis básico, intermediário e avançado; depois, pela quantidade de itens avançados já apresentados para completar uma dupla quando a evidência anterior for equivalente. Sob o blueprint atual, as áreas elegíveis começam com dois acertos distintos básicos e dois intermediários, portanto o desempate inicial é inevitável. Em empate, usar um hash do identificador da tentativa e da área. O desempate é reproduzível dentro da tentativa e varia entre tentativas. A distribuição de cinco posições poderá ser 2+2+1, mas as áreas que recebem as duplas não serão sempre as primeiras da lista.

O nível demonstrado continuará dependente das respostas efetivas. O resultado deverá indicar separadamente se o nível avançado teve evidência insuficiente, foi avaliado sem demonstração ou ficou provisoriamente demonstrado. Um acerto isolado não poderá promover o aluno. Esta regra será verificada com várias tentativas de 100% de acertos e perfis forte/fraco por área.

## Verificação da correção

A nova migration local `20261024164620_diagnostico_v2_fair_deepening.sql` substitui apenas as funções internas de seleção e resultado. Não muda tabelas, RLS, policies nem grants. Em **100 tentativas sintéticas de acerto total** com 40 itens fictícios equilibrados, as 500 posições avançadas foram distribuídas entre SQL 91, Estatística 107, Excel 97, Lógica de dados 101 e Indicadores 104. Todas as cinco áreas tiveram casos de “Avançado provisório”; a diferença entre tentativas decorre do desempate por hash, sem posição fixa por área. O teste também verificou perfis fraco e forte em uma única área, teto de 25 questões e os três estados explícitos de evidência avançada: insuficiente, avaliado sem demonstração e provisoriamente demonstrado. Os resultados reais ainda dependem de respostas de usuários; esta distribuição não prova justiça psicométrica.

Com as 40 questões privadas no PGlite isolado, os dez perfis A–J voltaram a passar: nove conclusões normais sem falta de pool e uma falta provocada de itens básicos de SQL. A função pública continua sem gabarito. O frontend agora distingue “nível avançado não suficientemente avaliado” de “avaliado, mas não demonstrado” no resultado e em Meu Progresso. A introdução comunica uma estimativa editorial de 30–50 minutos e a possibilidade de retomar nesta sessão.

## Estado técnico das 40 questões

O pacote privado `MARCO5_2_ACEITE_EDITORIAL_PRIVADO.md` permite leitura e decisão por questão; o JSON correspondente mantém os mesmos campos estruturados. Ambos estão em `docs/planejamento-local/`, ignorada pelo Git. Cada ficha contém ID, área, competência, nível, enunciado, quatro alternativas, gabarito fundamentado, justificativa dos distratores, evidência, risco, parecer sugerido e campos vazios para decisão humana. Os itens 002 e 050 têm campos para dois revisores independentes. O 078 continua bloqueado fora do piloto.

| Evidência individual | Itens | Limite |
|---|---:|---|
| SQL em PostgreSQL isolado | 8 | Quatro alternativas executadas ou reproduzidas em dados controlados; no item 015, a opção destrutiva foi testada apenas numa cópia temporária. |
| Cálculo independente | 14 | Resultado central confirmado; a igualdade aritmética isolada não é prova funcional integral dos distratores. |
| Cenário sintético limitado | 7 | Verifica propriedades específicas, sem reproduzir sistema de origem. |
| Excel instalado: exemplo funcional | 5 | Referências, SOMASE, conversão MDY explícita, PROCX com chaves divergentes e tabela dinâmica com ano/mês. Ainda exige revisão humana das quatro alternativas. |
| Excel/Power Query parcial | 2 | Agrupamento semanal de 7 dias executado, sem Linha do Tempo; consulta M adicionada, sem materializar a combinação de CSVs. |
| Revisão conceitual | 4 | Não há prova funcional direta; avaliar redação, premissas e discriminação com revisores/usuários. |

As correções propostas em 002, 005, 009, 024 e 060 estão na versão privada revisada e no registro de diferenças por ID. A fonte original permanece intacta. Todos os 40 itens continuam **PENDENTE DE REVISÃO EDITORIAL**; nenhum foi aprovado por IA. O parecer crítico privado mantém dupla revisão para 002 e 050.

## Interface e duração

Chrome instalado na máquina Windows foi executado por Playwright em `http://127.0.0.1:4173`, com as questões privadas e **serviço local simulado**. A prova percorreu até 25 itens, conferiu 1366, 768 e 390 px, itens longos, SQL/fórmulas, seleção, pausa/retomada, erro e retry, hero, resultado das cinco áreas, competências, recomendação, prévia de histórico V1/V2, ausência de overflow horizontal e console sem erros. As capturas ficaram apenas em `docs/planejamento-local/`, ignorada pelo Git. O Supabase local integrado não estava disponível: o daemon Docker não foi encontrado. Portanto, persistência e histórico de uma sessão real com o banco privado ainda precisam de homologação integrada; a prova com serviço simulado não a substitui.

As estimativas por ficha continuam em aproximadamente **31–50 minutos** por percurso. Nos perfis normais, o mapeamento consumiu cerca de 26–27 minutos estimados, a validação 7,5–10,5 minutos e o aprofundamento, quando ocorreu, 4,8–12,5 minutos. Os itens extensos devem ser observados em teste com pessoas, com tempo por questão, conclusão e abandono. Não há duração real observada nem base para reduzir o teto de 25.

## Decisão e pendências

**GO técnico para encaminhar o pacote à aprovação editorial humana. NO-GO para iniciar o piloto fechado.** O defeito de seleção foi corrigido e reproduzido localmente; ainda faltam as decisões humanas sobre os 40 itens, incluindo dois pareceres independentes em 002/050, completar Linha do Tempo/Power Query quando exigidos, homologar a integração Supabase local com conteúdo privado e medir a experiência com usuários reais. Nenhuma migration foi aplicada remotamente; não houve importação, merge ou deploy. V1, Auth, RLS, policies, MapIA e dados de produção foram preservados.
