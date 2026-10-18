# Worker de quotas da MapIA

Componente isolado que hospeda o Durable Object `MapiaQuota`. Ele não foi
criado, configurado ou publicado na Cloudflare por esta entrega.

## Configuração proposta para revisão

O arquivo real do Wrangler deve ser criado somente na fase autorizada. Estrutura
esperada, com valores deliberadamente não preenchidos:

```jsonc
{
  "name": "<NOME-APROVADO-DO-WORKER>",
  "main": "src/index.mjs",
  "compatibility_date": "<DATA-APROVADA>",
  "durable_objects": {
    "bindings": [
      {
        "name": "MAPIA_QUOTA_COORDINATOR",
        "class_name": "MapiaQuota"
      }
    ]
  },
  "migrations": [
    {
      "tag": "<TAG-INICIAL-APROVADA>",
      "new_sqlite_classes": ["MapiaQuota"]
    }
  ],
  "vars": {
    "MAPIA_VISITOR_DAILY_LIMIT": "<APROVAR>",
    "MAPIA_VISITOR_IP_DAILY_LIMIT": "<APROVAR>",
    "MAPIA_FREE_DAILY_LIMIT": "<APROVAR>",
    "MAPIA_PREMIUM_DAILY_LIMIT": "<APROVAR>",
    "MAPIA_GLOBAL_DAILY_LIMIT": "<APROVAR>",
    "MAPIA_ACTOR_RATE_LIMIT": "<APROVAR>",
    "MAPIA_IP_RATE_LIMIT": "<APROVAR>",
    "MAPIA_RATE_WINDOW_SECONDS": "<APROVAR>",
    "MAPIA_ACTOR_CONCURRENCY_LIMIT": "<APROVAR>",
    "MAPIA_GLOBAL_CONCURRENCY_LIMIT": "<APROVAR>",
    "MAPIA_RESERVATION_TTL_SECONDS": "<APROVAR>"
  }
}
```

Na Pages Function, `MAPIA_QUOTA` pode ser um binding direto para a classe
`MapiaQuota` ou um Service binding para este Worker. Em ambos os casos, Preview
e Production precisam de configuração explícita e separada.

Não usar os valores exploratórios 5/20/100 sem homologação de produto e custo.
