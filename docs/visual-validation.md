# Validacao visual local

O smoke visual abre as paginas principais em Chromium headless, verifica o seletor
esperado, erros de JavaScript, overflow horizontal global e gera screenshots. Ele
nao faz comparacao pixel-perfect nem usa imagens de baseline.

## Como executar

Instale as dependencias e o browser uma vez:

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

Depois execute:

```powershell
npm.cmd run test:visual
```

O script reutiliza um servidor que responda em `http://127.0.0.1:4173` ou inicia
um servidor estatico temporario nessa porta e o encerra ao final. Para usar outro
servidor, defina `VISUAL_BASE_URL`.

As evidencias ficam em `artifacts/visual/`, com um arquivo por pagina e viewport.
Screenshots, relatorios e resultados de teste estao ignorados pelo Git.

## Adicionar uma pagina

Inclua um item em `pages`, dentro de `scripts/visual-smoke.js`, com:

```js
{ name: "nome-estavel", path: "/pagina.html", waitFor: ".seletor-principal" }
```

Prefira um seletor estrutural estavel que confirme a renderizacao real da tela.
Os viewports atuais sao desktop `1440x900` e mobile `390x844`.
