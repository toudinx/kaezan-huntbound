# PB-02-FIX-01 — Emitir somente o perfil ativo no build

**Status inicial:** pending

**Classe da tarefa:** correção de defeito de produto, bem especificada

**Modelo sugerido:** GPT-5.6 Sol `xhigh`; fallback Claude Code/Opus 5

**Validador sugerido:** modelo diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion` +
`superpowers:using-git-worktrees`

**Branch-base:** `main`

**Branch temporária:** `codex/pb02-fix-01-profile-emission`

**Worktree temporária:** `C:\Kaezan\kaezan-huntbound-pb02-fix-01-profile-emission`

**Integração:** `git merge --ff-only`; verificação completa em `main`; remoção da worktree e da branch
após sucesso.

**Paralelismo:** não com PB-02-FIX-02. As duas tasks disputam `STATE.md` e o
`acceptance-report.md`. Execute esta primeiro.

**Origem:** BLOCKER-1 da auditoria PB-02-07, registrado em
`docs/playbooks/PB-02/artifacts/acceptance-report.md`.

## Objetivo

Garantir, por construção, que o artefato de um perfil contenha exclusivamente os assets daquele
perfil — de modo que um build `product` nunca emita mídia `cipsoft-personal`.

## Contexto medido em 2026-08-13

`apps/game/vite.config.ts` passa `publicDir` apenas como argumento do `assetProfileGuardPlugin`, que
o usa para **validar** o perfil pedido. O `publicDir` do próprio Vite continua sendo o default
`apps/game/public`, então a árvore inteira é copiada para `dist/`.

Prova fresca, com `dist/` apagado antes e somente `build:product` executado:

```text
build:product                                -> exit 0
dist/game/assets/                            -> personal, product, test
dist/game/assets/personal                    -> 8 arquivos, 242324 bytes
mídias reais congeladas presentes            -> 5 de 5
pack.json com licenseClass cipsoft-personal  -> presente
```

Só se manifesta depois que `assets:personal:generate` rodou na máquina — que é exatamente o fluxo
local-first previsto. Um checkout novo de CI não reproduz.

O guard **já** recusa um catálogo `product` que referencie `cipsoft-personal`
(`ASSET_PROFILE_FORBIDDEN` + `ASSET_LICENSE_FORBIDDEN`, `0 modules transformed`). O defeito não está
na validação do catálogo, e sim no fato de os bytes de outros perfis serem emitidos mesmo assim.

`apps/game/public/` não contém nada além de `assets/`. Não há favicon, `robots.txt` ou qualquer outro
arquivo público a preservar.

## Decisão congelada

O build passa a usar `publicDir: false`, e o `assetProfileGuardPlugin` — que já valida a árvore em
`buildStart` — passa a **emitir** essa mesma árvore validada.

A abordagem foi escolhida contra duas alternativas: podar o `dist` depois de emitir (garantia por
limpeza, não por construção — os bytes pessoais chegam a ser copiados) e mover o staging para uma
raiz `public` por perfil (também por construção, mas espalha a mudança por `package.json`,
`.gitignore`, `biome.json` e o CLI de profile).

**O contrato de URL não muda.** `getAssetCatalogUrl` em `apps/game/src/assets/AssetProfile.ts`
continua retornando `/assets/<profile>/catalog.json`, e os arquivos emitidos preservam exatamente o
layout `assets/<profile>/…` que o `publicDir` produzia. Consumidores, catálogo, provider, packer e
schemas ficam inalterados.

O dev server entra no escopo. `publicDir: false` também desliga o serving em `vite dev`; o plugin
passa a servir apenas o perfil ativo por `configureServer`, para que dev e build tenham a mesma
garantia. Deixar o dev servindo os três perfis manteria a invariante pela metade.

## Resultado esperado

`dist/game/assets` contém somente o diretório do perfil construído, com bytes idênticos aos da árvore
validada. `build:product` com `apps/game/public/assets/personal` presente emite zero arquivo pessoal.
Os cenários de browser e o boot budget continuam verdes.

## Escopo permitido

```text
apps/game/vite.config.ts
tools/asset-packer/vite/assetProfileGuardPlugin.ts
tools/asset-packer/vite/assetProfileGuardPlugin.test.ts
docs/playbooks/PB-02/STATE.md
docs/playbooks/PB-02/artifacts/acceptance-report.md
```

## Fora de escopo

- alterar `AssetProfile.ts`, o contrato de URL ou qualquer consumidor;
- alterar packer, provider, registry, schemas, catálogos ou fixtures versionadas;
- alterar `biome.json` — isso é PB-02-FIX-02;
- alterar budget, retry, workers, throttling ou `playwright.config.ts`;
- regenerar ou commitar golden;
- copiar assets reais para dentro do repositório;
- fechar PB-02 ou declarar PB-03 elegível.

## Passos

- [ ] **0. Criar a worktree isolada.** A raiz principal deve estar limpa e em `main`.

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-fix-01-profile-emission -b codex/pb02-fix-01-profile-emission main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-fix-01-profile-emission install --frozen-lockfile
```

- [ ] **1. Preparar a condição do defeito.** Gerar a saída pessoal local, sem persistir o path:

```powershell
$env:HUNTBOUND_PERSONAL_ASSET_SOURCE = '<raiz do export, somente em memória>'
corepack pnpm --dir <worktree> assets:personal:generate
corepack pnpm --dir <worktree> assets:stage:product
```

- [ ] **2. RED.** Escrever o teste que falha hoje, em
  `tools/asset-packer/vite/assetProfileGuardPlugin.test.ts`: construir um `outDir` temporário a
  partir de uma raiz de perfil que contenha `product` **e** `personal`, rodar o plugin no perfil
  `product` e afirmar que a saída contém somente `assets/product/…`. Registrar a falha.

  Complementarmente, registrar a prova ponta a ponta com `dist/` limpo:

```powershell
corepack pnpm --dir <worktree> --filter @huntbound/game build:product
# afirmar: dist/game/assets contém somente "product"
```

- [ ] **3. GREEN — build.** Em `apps/game/vite.config.ts`, passar `publicDir: false`. No
  `assetProfileGuardPlugin`, após a validação de `buildStart`, emitir todos os arquivos da árvore
  validada preservando os caminhos relativos sob `assets/<profile>/`. Percorra a raiz do perfil e
  emita cada arquivo, inclusive as mídias binárias — não confie na lista `paths` do resultado da
  validação, que não enumera mídia.

- [ ] **4. GREEN — dev.** Adicionar `configureServer` ao plugin, servindo a árvore validada do perfil
  ativo sob `/assets/<profile>/`. Cobrir com teste que uma requisição a outro perfil não resolve.

- [ ] **5. Provar o layout emitido.** Comparar `dist/game/assets/<profile>/` byte a byte com a árvore
  de origem validada: mesmos arquivos relativos, mesmos hashes, nenhum arquivo a mais.

- [ ] **6. Provar que a regressão morreu.** Com a saída pessoal presente e `dist/` limpo:

```text
build:product  -> exit 0
dist/game/assets                    -> somente "product"
arquivos sob dist/game/assets/personal -> 0
mídias reais congeladas no dist     -> 0 de 5
```

  Repetir para `build:personal` e `build` (`test`), confirmando que cada um emite apenas o seu.

- [ ] **7. Provar que o browser continua verde.** O preview do Playwright serve `dist/game`; com
  `publicDir: false` os assets passam a vir do que o plugin emitiu.

```powershell
corepack pnpm --dir <worktree> build
corepack pnpm --dir <worktree> exec playwright test tests/e2e/asset-pack.spec.ts tests/e2e/boot-budget.spec.ts
```

  Exigir preload 5 keys, unload 0, reload 5, zero erro de console/página/rede e boot ≤ 5000 ms.

- [ ] **8. Gate completo.** `corepack pnpm verify` em exit 0.

  `verify` ainda falha na **segunda** execução consecutiva por causa do BLOCKER-2, que é escopo de
  PB-02-FIX-02. Nesta task, rode `verify` uma vez sobre saídas staged limpas e registre o exit 0. Não
  toque em `biome.json` para contornar isso.

- [ ] **9. Provar que nada vazou para o Git.**

```powershell
git -C <worktree> ls-files apps/game/public/assets
git -C <worktree> status --short
git -C <worktree> diff --check
```

  O primeiro deve sair vazio; o segundo, somente os arquivos do escopo permitido.

- [ ] **10. Atualizar `STATE.md`** e a seção de blockers do `acceptance-report.md`, marcando
  BLOCKER-1 como resolvido com evidência fresca. Não altere a decisão `REJECTED` do relatório: ela é
  o registro histórico daquela auditoria. PB-02 continua aberto.

- [ ] **11. Commit.**

```powershell
git -C <worktree> add apps/game/vite.config.ts tools/asset-packer/vite/assetProfileGuardPlugin.ts tools/asset-packer/vite/assetProfileGuardPlugin.test.ts docs/playbooks/PB-02/STATE.md docs/playbooks/PB-02/artifacts/acceptance-report.md
git -C <worktree> diff --cached --check
git -C <worktree> commit -m "fix: emit only the active asset profile"
```

- [ ] **12. Integrar, verificar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb02-fix-01-profile-emission
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
git -C C:\Kaezan\kaezan-huntbound merge-base --is-ancestor codex/pb02-fix-01-profile-emission main
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb02-fix-01-profile-emission
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb02-fix-01-profile-emission
```

## Critérios de aceite

- [ ] Existe teste que falha sem a correção e passa com ela.
- [ ] `dist/game/assets` contém somente o diretório do perfil construído, nos três modos.
- [ ] `build:product` com saída pessoal presente emite zero arquivo pessoal e zero das cinco mídias
      reais congeladas.
- [ ] A árvore emitida bate byte a byte com a árvore validada de origem.
- [ ] O dev server serve somente o perfil ativo.
- [ ] `getAssetCatalogUrl` e todos os consumidores permanecem inalterados.
- [ ] Browser verde: preload 5, unload 0, reload 5, sem erro, boot ≤ 5000 ms.
- [ ] `corepack pnpm verify` em exit 0.
- [ ] Nenhum asset pessoal ou pack gerado rastreado.
- [ ] O diff contém somente o escopo permitido.
- [ ] Integrado em `main` por fast-forward, com `verify` verde no resultado integrado.

## Condições de parada

Se `publicDir: false` quebrar o preview do Playwright ou o dev server de um modo que exija tocar
`AssetProfile.ts` ou o contrato de URL, pare e reporte: a decisão congelada assumiu que o layout
emitido preserva a URL, e essa premissa precisa ser revista antes de seguir. Se a correção exigir
mudar packer, provider ou schemas, o achado é outro e merece task própria. Não afrouxe o guard, não
altere `biome.json` e não feche o playbook.

## Handoff

Ao concluir, PB-02-FIX-02 é a próxima task elegível. PB-02 continua **aberto** e PB-03 **não**
elegível: o fechamento só pode ser reconsiderado por uma reexecução completa da matriz PB-02-07.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Sol com effort xhigh; se indisponível, Claude Code/Opus 5, e registre o desvio. Use
obrigatoriamente superpowers:test-driven-development, superpowers:using-git-worktrees e
superpowers:verification-before-completion.

Execute integralmente e somente a task:
docs/playbooks/PB-02/tasks/PB-02-FIX-01-emitir-somente-o-perfil-ativo.md

Contexto: um build de perfil emite os assets de TODOS os perfis. apps/game/vite.config.ts passa
publicDir apenas ao assetProfileGuardPlugin, que o usa para validar; o publicDir do Vite continua
sendo apps/game/public. Com dist/ limpo e só build:product executado, dist/game/assets contém
personal, product e test, e dist/game/assets/personal traz as cinco mídias reais cipsoft-personal
(8 arquivos, 242324 bytes) mesmo com o build em exit 0.

Decisão já congelada: usar publicDir: false e fazer o assetProfileGuardPlugin emitir a árvore que
ele já valida, preservando o layout assets/<profile>/ para não mudar o contrato de URL
/assets/<profile>/catalog.json. O dev server entra no escopo por configureServer.

Comece pelo RED: gere a saída pessoal local (HUNTBOUND_PERSONAL_ASSET_SOURCE somente em memória,
nunca persistido), faça o stage do product, e escreva o teste que afirma que a saída do perfil
product contém somente assets/product. Só então implemente.

Não altere AssetProfile.ts, packer, provider, registry, schemas, fixtures versionadas nem
biome.json. Não feche PB-02 nem declare PB-03 elegível.

Termine com verify em exit 0, os cenários asset-pack e boot-budget verdes, STATE.md e a seção de
blockers do acceptance-report.md atualizados marcando BLOCKER-1 resolvido, e o commit
"fix: emit only the active asset profile". Depois integre por git merge --ff-only, reexecute verify
em main e só então remova worktree e branch. Não inicie PB-02-FIX-02.
```
