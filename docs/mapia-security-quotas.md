# Segurança da MapIA e quotas por perfil

## Estado desta entrega

Esta entrega prepara a camada técnica, mas **não ativa quotas em produção**.
`MAPIA_SECURITY_MODE` usa `off` por padrão. Os modos `audit` e `enforce`
dependem de recursos externos ainda não criados nem vinculados.

Não foram alterados Cloudflare, Supabase, DNS, WAF, modelo, assinatura ou
deploy. Nenhum SQL é necessário para a arquitetura escolhida.

## Auditoria da integração atual

- O frontend chama `POST /api/sql-tutor` em mesma origem.
- Antes desta entrega, a chamada não enviava a sessão do Supabase.
- O frontend agora envia o `access_token` somente no header `Authorization`.
- A Pages Function nunca aceita identidade, plano ou saldo no payload.
- Em `audit` ou `enforce`, o backend valida o bearer token em
  `GET /auth/v1/user` com `SUPABASE_URL` e uma chave publicável. A resposta do
  Auth é a fonte do `user.id`.
- Sem token, o visitante recebe um identificador aleatório assinado em cookie
  `HttpOnly`; o IP da Cloudflare é pseudonimizado separadamente.
- Usuários autenticados são `free` por padrão. O perfil `premium` só existe
  quando o binding interno `MAPIA_ENTITLEMENTS` confirma a permissão
  `mapia.premium`. Sem esse binding, ou se ele falhar, o perfil continua `free`.

O uso de `auth.getSession()` no navegador serve apenas para obter o token. A
autorização não confia no conteúdo da sessão do cliente: o token é verificado
novamente pelo Supabase Auth no servidor.

## Armazenamento avaliado

| Opção | Atomicidade e concorrência | Adequação | Decisão |
| --- | --- | --- | --- |
| Memória do isolate | Sem persistência e sem coordenação global | Insegura para custo | Rejeitada |
| Workers KV | Consistência eventual, sem read-modify-write atômico | Cache e configuração, não contabilidade | Rejeitada para quotas |
| Rate Limiting binding | Rápido, mas permissivo, eventual e local ao datacenter | Boa defesa de rajada complementar | Não usado como livro-caixa |
| D1 | Persistente; operações SQL/batches podem ser atômicas | Viável, porém exige desenho cuidadoso para concorrência entre chamadas | Alternativa futura |
| Supabase/Postgres | Transações e funções atômicas | Viável, mas exigiria SQL, RLS/privilegios e acesso seguro do Worker | Não escolhido nesta fase |
| Durable Object com SQLite | Estado persistente, forte consistência e serialização por objeto | Compatível com Free e adequado a reservas/concorrência | Escolhido |

A Pages Function não pode declarar a classe Durable Object dentro do próprio
projeto Pages. Por isso, `workers/mapia-quota/src/index.mjs` é um Worker separado
e a Pages Function depende do binding `MAPIA_QUOTA`. Criar o Worker, namespace,
migration/tag e binding exige aprovação e configuração externa.

## Fluxo de segurança

1. Rejeitar método, origem web cruzada, tipo de conteúdo, corpo maior que 32 KiB,
   JSON inválido, campos desconhecidos e estruturas fora dos limites.
2. Em `audit`/`enforce`, validar o bearer token no Supabase Auth; token informado
   e inválido nunca é rebaixado silenciosamente para visitante.
3. Resolver o perfil no backend. O navegador não envia perfil.
4. Gerar chaves HMAC para usuário, dispositivo visitante e IP. IP, e-mail,
   pergunta, query, token e UUID do Supabase não são gravados nos contadores ou
   logs operacionais.
5. Reservar atomicamente, antes da inferência:
   - janela de rajada por ator e por IP;
   - concorrência por ator e global;
   - quota diária do perfil por ator;
   - quota diária adicional por IP para visitantes;
   - teto diário global.
6. Executar o mesmo modelo e os mesmos prompts pedagógicos.
7. Liquidar a reserva como `success`, `error` ou `timeout`.

Uma reserva incrementa o consumo antes da chamada ao Workers AI. Depois que a
inferência começa, sucesso, erro e timeout permanecem cobrados, pois o provedor
pode ter consumido recursos mesmo sem resposta. Apenas uma falha local
comprovadamente anterior à inferência usa `release`. Se a Pages Function morrer
antes da liquidação, a reserva expira para liberar concorrência, mas o consumo
permanece contabilizado. Isso evita uso ilimitado induzindo falhas ou timeouts.

## Configuração externa necessária

Não preencher valores sem homologação. Os números exploratórios 5/20/100 não
estão no código nem são defaults.

### Pages Function

- `MAPIA_SECURITY_MODE`: `off`, `audit` ou `enforce`.
- `MAPIA_ID_HASH_SECRET`: segredo forte para HMAC e assinatura do cookie.
- `SUPABASE_URL`: URL do projeto.
- `SUPABASE_PUBLISHABLE_KEY`: chave publicável; não usar `service_role`.
- `MAPIA_QUOTA`: binding para o Durable Object ou Worker interno de quotas.
- `MAPIA_ENTITLEMENTS`: binding futuro e opcional; não configurar antes de
  existir uma fonte real de assinatura/permissão.
- `MAPIA_ANALYTICS`: binding opcional do Analytics Engine.
- `MAPIA_INFERENCE_TIMEOUT_MS`: timeout opcional da chamada ao modelo.

### Worker de quotas

- `MAPIA_QUOTA_COORDINATOR`: binding do próprio Worker para a classe
  `MapiaQuota` quando a Pages Function usar um Service binding. Em ligação
  direta da Pages Function ao Durable Object, esse roteador HTTP não é usado.
- `MAPIA_VISITOR_DAILY_LIMIT`
- `MAPIA_VISITOR_IP_DAILY_LIMIT`
- `MAPIA_FREE_DAILY_LIMIT`
- `MAPIA_PREMIUM_DAILY_LIMIT`
- `MAPIA_GLOBAL_DAILY_LIMIT`
- `MAPIA_ACTOR_RATE_LIMIT`
- `MAPIA_IP_RATE_LIMIT`
- `MAPIA_RATE_WINDOW_SECONDS`
- `MAPIA_ACTOR_CONCURRENCY_LIMIT`
- `MAPIA_GLOBAL_CONCURRENCY_LIMIT`
- `MAPIA_RESERVATION_TTL_SECONDS`

O Worker recusa reservas com HTTP 503 se qualquer limite necessário estiver
ausente ou inválido. Não há fallback em memória.

## Respostas e observabilidade

- Bloqueios de quota, rajada e concorrência retornam HTTP 429, código estável,
  mensagem pedagógica neutra e `Retry-After`.
- Indisponibilidade da quota em `enforce` retorna HTTP 503 e falha fechada.
- São emitidos eventos estruturados para requisição recebida, inferência,
  bloqueio, erro, timeout e falha de liquidação.
- Os eventos contêm perfil, resultado, motivo, modelo, latência e tokens de
  entrada/saída quando o Workers AI os fornece.
- O `requestId` aleatório permite correlação sem guardar pergunta, query, IP,
  e-mail, token ou ID bruto de usuário.

## Ativação progressiva proposta

1. Revisar código e testes desta branch sem deploy e sem inferências reais.
2. Aprovar limites e criar o Worker/Durable Object em ambiente isolado.
3. Configurar bindings e variáveis somente em Preview.
4. Usar `audit` em Preview, verificar métricas e mensagens.
5. Homologar concorrência, expiração, falhas e perfis com contas de teste.
6. Ativar `enforce` somente em Preview.
7. Solicitar aprovação separada antes de configurar Production.

## Riscos restantes

- Um bearer token roubado representa o usuário até expirar ou ser revogado; o
  endpoint não consegue distinguir o titular legítimo de quem possui o token.
- Visitantes podem trocar rede/dispositivo. A combinação de cookie assinado,
  quota de IP e rajada reduz o contorno simples, mas não substitui Turnstile ou
  detecção de bots em uma fase futura.
- IPs compartilhados podem atingir a proteção coletiva de visitante; o limite
  por IP deve ser maior que o limite por dispositivo e homologado com tráfego.
- O único Durable Object global simplifica consistência e teto financeiro, mas
  centraliza throughput. É suficiente para a fase atual; sharding exigiria um
  coordenador separado para preservar o teto global exato.
- Métricas no console têm retenção e consulta limitadas. Analytics Engine é
  opcional e ainda precisa de binding para agregação histórica.
