# Worker de quotas da MapIA

Componente isolado que hospeda o Durable Object SQLite `MapiaQuota`. Nenhum
recurso foi criado, configurado ou publicado na Cloudflare por esta entrega.

## Isolamento

A Pages Function deve receber um **binding direto de Durable Object** chamado
`MAPIA_QUOTA`, apontando para a classe `MapiaQuota` deste Worker. Não usar
Service Binding nem chamar a URL HTTP do Worker para operações de quota.

Na configuração futura do projeto Pages, o binding externo deve incluir
`script_name` (obrigatório para Durable Objects externos em Pages):

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "MAPIA_QUOTA",
        "class_name": "MapiaQuota",
        "script_name": "mapia-quota"
      }
    ]
  }
}
```

Esse trecho é documentação de implantação; não foi aplicado a Preview ou
Production.

O handler HTTP padrão retorna `403 access_denied` para todas as chamadas,
inclusive `inspect`, `reserve`, `settle` e `release`. Essa negação é defesa em
profundidade caso uma URL seja exposta por configuração divergente.

O arquivo `wrangler.jsonc` deixa explicitamente:

- `workers_dev: false`;
- `preview_urls: false`, abrangendo Version URLs e previews em `workers.dev`;
- nenhuma `route` ou domínio customizado.

Antes de qualquer implantação futura, conferir no painel que não existem
Custom Domains, Routes ou Previews habilitados. A configuração não deve ser
publicada enquanto o binding direto, a migration e os limites não forem
aprovados.

## Configuração

`wrangler.jsonc` contém apenas a topologia revisável, sem limites comerciais.
Os valores abaixo continuam obrigatórios e devem ser definidos separadamente
por ambiente somente após homologação:

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

`wrangler.test.jsonc` é exclusivo do runtime local e contém números pequenos
para tornar cenários limítrofes determinísticos. Eles não representam produto,
preço ou cotas aprovadas e não devem ser usados em Preview ou Production.

## Testes locais

```powershell
npm run test:mapia-quota-runtime
```

A suíte roda no runtime Workers/Miniflare, sem rede, inferência ou recursos
Cloudflare. Ela cobre concorrência pela última quota, teto global, controles por
usuário/IP, liquidação idempotente, expiração, liberação, rollback transacional,
persistência após eviction, transição audit/enforce e rejeição HTTP externa.

No ambiente Codex para Windows, o runtime pode precisar ser executado fora do
sandbox apenas para criar os logs locais do Wrangler no perfil do usuário.
