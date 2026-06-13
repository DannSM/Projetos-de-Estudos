# PoC da IA Tutora SQL com Cloudflare

## Objetivo

Validar uma tutora curta e contextual na Central SQL antes de investir em
streaming, histórico, persistência, cobrança ou liberação ampla.

## Endpoint

`POST /api/sql-tutor`, implementado em `functions/api/sql-tutor.js`.

A Pages Function valida e limita o payload, monta um prompt pedagógico e chama
o binding `env.AI`. Nenhuma chave é enviada ao navegador e nenhum dado é
gravado no Supabase.

O modelo padrão é `@cf/meta/llama-3.1-8b-instruct-fp8`. Ele pode ser trocado pela
variável de ambiente `SQL_TUTOR_AI_MODEL`.

## Configuração no Cloudflare Pages

1. Publique o repositório como um projeto Cloudflare Pages com suporte a
   Pages Functions.
2. No projeto, abra **Settings > Bindings > Add > Workers AI**.
3. Use `AI` como nome do binding.
4. Opcionalmente, crie `SQL_TUTOR_AI_MODEL` com outro identificador de modelo.
5. Faça um novo deploy para aplicar o binding.

Também é possível configurar o binding com Wrangler:

```toml
[ai]
binding = "AI"
```

Para desenvolvimento via Wrangler, use `wrangler pages dev . --ai=AI`.
Chamadas locais ao Workers AI acessam a conta Cloudflare e podem gerar uso
faturável.

## Payload

```json
{
  "practiceSlug": "sql-essencial-count-nulos-distintos",
  "practiceTitle": "COUNT, nulos e distintos",
  "practicePrompt": "Enunciado atual",
  "practiceObjective": "Objetivo pedagógico atual",
  "prompt": "Dúvida do aluno",
  "quickAction": "hint",
  "studentQuery": "SELECT ...",
  "lastResultPreview": [],
  "lastError": "",
  "validationStatus": "idle",
  "attemptCount": 0,
  "schema": {
    "table": "pedidos",
    "columns": []
  }
}
```

Limites do MVP: pergunta com 800 caracteres, query com 4.000 caracteres e
prévia com 5 linhas. E-mail, token e identidade do usuário não fazem parte do
contrato.

O card usa ações rápidas adaptadas ao estado da prática, mantém o foco na
mensagem mais recente e permite recolher o schema durante a sessão para ampliar
a conversa. O nome exibido no balão do aluno usa o primeiro nome presente nos
metadados da sessão; quando indisponível, usa `Você`.

## Testes

```powershell
npm.cmd run test:sql-ai-tutor
```

No servidor estático, `/api/sql-tutor` não existe e o card informa que a IA
depende do ambiente Cloudflare configurado. Com Wrangler e binding ativo, o
endpoint pode ser testado com uma requisição `POST`.

## Limitações

O domínio atual é publicado via GitHub Pages. Cloudflare DNS ou proxy, sozinho,
não executa Pages Functions. A IA real exige publicar esta versão também no
Cloudflare Pages, migrar a publicação ou rotear `/api/sql-tutor` para um Worker.

Não há streaming, histórico longo, autenticação obrigatória, rate limit,
persistência de logs nem proteção por Turnstile neste ciclo.

## Próximos passos

- Medir latência real e taxa de erro.
- Avaliar qualidade pedagógica das respostas.
- Comparar Workers AI com Groq e NVIDIA.
- Adicionar logs mínimos e limite diário.
- Decidir se o recurso será liberado para usuários anônimos.
