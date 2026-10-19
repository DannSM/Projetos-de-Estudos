# Build seguro para publicação

## Objetivo

O build público gera `dist/` a partir de uma allowlist explícita de 55 arquivos. Nenhum arquivo é transformado: o conteúdo copiado para `dist/` permanece byte a byte igual à origem.

O diretório `functions/` permanece na raiz do projeto e não é copiado para `dist/`. Assim, o Cloudflare Pages pode compilar `functions/api/sql-tutor.js` como Pages Function, enquanto `dist/` contém somente assets estáticos.

## Comandos locais

```bash
npm run build
npm run check:dist
npm run test:public-build
```

O build:

- remove e recria exclusivamente `dist/`;
- rejeita links simbólicos nas origens e no pacote;
- falha se faltar qualquer item da allowlist;
- falha se houver arquivo adicional ou proibido;
- valida referências locais em HTML, CSS e JavaScript;
- procura formatos de credenciais de alto risco;
- preserva os bytes dos arquivos públicos.

## Manutenção da allowlist

A constante `PUBLIC_FILES`, em `scripts/build-public.js`, é a fonte explícita dos arquivos que podem entrar em `dist/`. O deployment HML `718a9f8d-9c2a-4b44-80a1-f131a61af16a` foi homologado com 54 arquivos. A landing comercial adicionou `styles/landing.css`, elevando a contagem para 55; esse pacote exige sua própria conferência antes da publicação. A contagem não deve ser atualizada automaticamente: qualquer evolução do produto precisa de uma revisão consciente da lista.

Para adicionar uma página ou recurso público:

1. Criar o arquivo funcional na localização apropriada do repositório.
2. Confirmar que ele é necessário no navegador e não contém configuração interna, credencial, teste ou documentação operacional.
3. Adicionar seu caminho relativo exato a `PUBLIC_FILES`; não autorizar um diretório inteiro nem usar glob.
4. Confirmar que HTML, CSS ou JavaScript fazem referência ao recurso por um caminho local válido.
5. Executar `npm run build`, `npm run check:dist` e `npm run test:public-build`.
6. Revisar o inventário e o manifesto SHA-256 do novo pacote antes de homologá-lo.

Se o recurso for removido do produto, retirar sua entrada da allowlist na mesma alteração. Um arquivo ausente, adicional, proibido ou referenciado incorretamente faz a validação falhar. Os testes negativos também confirmam a rejeição de padrões de segredo, links simbólicos, arquivos obrigatórios ausentes e arquivos inesperados.

`dist/` é um artefato reproduzível e está ignorado pelo Git; não deve ser versionado. O código-fonte e a allowlist são a origem auditável do pacote. `functions/` permanece separado porque o Cloudflare Pages o compila como código de servidor, enquanto `dist/` deve conter somente arquivos estáticos públicos.

Arquivos de infraestrutura, SQL, migrations, testes, documentação interna, relatórios, backups, temporários, pacotes de desenvolvimento, configurações Wrangler e qualquer material com credenciais não pertencem à allowlist. Quando houver dúvida sobre a exposição de um arquivo, ele deve permanecer fora do pacote até revisão explícita.

## Inventário publicado

- 13 arquivos públicos na raiz: nove páginas HTML, `style.css` e três ícones.
- 2 imagens em `assets/`.
- 34 módulos JavaScript em `src/`.
- 6 folhas de estilo em `styles/`.

Não são publicados: `.git`, `.codex`, `docs`, `scripts`, `supabase`, `workers`, `functions`, `node_modules`, arquivos SQL, testes, configurações Wrangler, dependências de desenvolvimento ou relatórios internos.

## Comparação com a HML

Depois do build, gere um manifesto ordenado com caminho relativo, tamanho e SHA-256 para cada arquivo de `dist/`. Compare-o com o manifesto do deployment ativo e explique cada diferença esperada, sem copiar bindings, tokens ou configurações. A comparação anterior de 54/54 arquivos com a HML `718a9f8d-9c2a-4b44-80a1-f131a61af16a` não se aplica ao pacote de 55 arquivos da landing.

Antes de uma publicação futura:

1. Executar os três comandos locais do build e todas as regressões de autenticação, privacidade, segurança, SQL e progresso.
2. Executar `node --check` nos JavaScript relevantes e `git diff --check`.
3. Confirmar a contagem e o manifesto SHA-256 do pacote.
4. Confirmar que nenhum arquivo proibido ou segredo foi identificado.
5. Compilar `functions/` localmente com o Wrangler e verificar a rota `/api/sql-tutor`.
6. Validar as páginas principais em desktop e mobile.
7. Auditar o diff e confirmar bindings no ambiente de destino antes de autorizar qualquer publicação.

## Configuração futura do Cloudflare Pages

Configuração proposta para `trilha-de-dados` e, se adotado o build Git, para `trilha-de-dados-mapia-hml`:

- Root directory: raiz do repositório (`/`, campo vazio no painel).
- Build command: `npm run build`.
- Build output directory: `dist`.
- Production branch oficial: `main`.
- Pages Functions: manter `functions/` na raiz do projeto; não copiar para `dist/`.
- Preview branches do projeto oficial: `None`, ou allowlist que exclua branches de homologação.
- Automatic Production deployments: manter desativado para a publicação controlada; não reativar sem autorização separada.

Antes de salvar essa configuração no painel, confirmar que os bindings de Production continuam presentes. O build não deve criar um Wrangler de Pages nem substituir a configuração remota.

## Publicação controlada da landing — executar somente após nova autorização

1. Registrar o ID do deployment Production ativo, a branch de produção, o estado do deploy automático e os nomes/escopos dos bindings e secrets, sem copiar valores sensíveis. Confirmar que push em `main` não dispara deploy automático; se disparar, interromper o procedimento antes do push.
2. Integrar o commit homologado à `main` por fast-forward, se a história permitir. Se `main` avançou, resolver a divergência na feature branch e repetir as validações antes de integrar. Confirmar que o push contém somente a entrega aprovada.
3. Na revisão exata de `main` que será publicada, executar `npm run build`, `npm run check:dist` e `npm run test:public-build`. Confirmar 55 assets, ausência de arquivos proibidos e a presença de `functions/api/sql-tutor.js` na raiz do projeto, fora de `dist/`.
4. Com acesso autorizado ao projeto `trilha-de-dados`, publicar pelo Wrangler a partir da raiz do repositório: `npx wrangler pages deploy dist --project-name trilha-de-dados --branch main`. Conferir antes a configuração remota de Production e a versão do Wrangler. Não usar upload pelo painel, pois ele não inclui Pages Functions.
5. Conferir o novo deployment e o domínio oficial: páginas principais, assets, navegação anônima, login e acesso admin com contas autorizadas. Confirmar que `/api/sql-tutor` foi implantada por GET e payload inválido, sem inferência real. Confirmar que bindings, modo de segurança e deployment anterior continuam intactos.

Referências: [Git integration e deploy manual](https://developers.cloudflare.com/pages/configuration/git-integration/), [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/) e [controle de branches](https://developers.cloudflare.com/pages/configuration/branch-build-controls/).

Verificação de cada deployment:

1. Confirmar que o build executou `npm run build` com saída zero.
2. Confirmar 55 assets estáticos e rota `/api/sql-tutor`.
3. Verificar que `docs/`, `scripts/`, `workers/`, `supabase/`, `package.json`, `package-lock.json` e `functions/api/sql-tutor.js` não são servidos como assets.
4. Executar GET `/api/sql-tutor` e payloads inválidos, sem inferência real.
5. Validar páginas principais em desktop e mobile.

Rollback: antes de selecionar qualquer deployment Production anterior, conferir sua compatibilidade com os controles atuais de autenticação, MapIA, bindings e quotas. A troca dos assets/Function não deve alterar dados Supabase nem o estado do Durable Object. Mudanças futuras no Worker de quotas exigem avaliação separada.

## Proposta para GitHub Pages — não implementada

GitHub Pages publica somente conteúdo estático. Ele pode reutilizar `dist/`, mas não executa `functions/api/sql-tutor.js`; portanto, a MapIA não possui paridade funcional nessa superfície. O domínio oficial deve continuar no Cloudflare Pages. Antes de ativar o workflow abaixo, decidir se o GitHub Pages continuará como espelho estático ou será desativado.

Workflow proposto para revisão, sem criação de `.github/workflows` nesta etapa:

```yaml
name: Publicar pacote estático seguro

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm run build
      - run: npm run check:dist
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Como todos os links locais do frontend são relativos, as páginas e assets funcionam tanto no domínio raiz quanto no subcaminho `/Projetos-de-Estudos/`. URLs canônicas continuam apontando para `https://trilhadedados.com.br`.
