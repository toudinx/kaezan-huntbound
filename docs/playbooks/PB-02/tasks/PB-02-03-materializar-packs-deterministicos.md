# PB-02-03 — Materializar packs determinísticos

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — pipeline local reconstruível

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; Sol/Opus somente após gatilho registrado

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** pode executar em paralelo com PB-02-04 após PB-02-02. O fluxo padrão é serial.

## Objetivo

Implementar o packer Node que transforma selection + source lock + export validado em um pack
Huntbound canônico, content-addressed e promovido transacionalmente. Gerar o golden pack sintético e
o pack pessoal ignorado.

## Resultado esperado

O mesmo input produz a mesma árvore byte a byte. Ausência/corrupção aparece de forma agregada antes
da escrita; falha durante staging/promoção preserva o último output válido.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. spec PB-02 e `docs/assets/MANIFEST_CONTRACT.md`;
3. selection/source locks e fixture PB-02;
4. `tools/asset-packer/source/**`;
5. schemas públicos de `@huntbound/assets`.

PB-02-02 deve estar integrada. Não depende de PB-02-04.

## Decisões congeladas

- CLI: `node tools/asset-packer/cli.ts <command>`.
- Commands: `build`, `build --check`, `verify-pack` e `source verify`.
- Media output: `media/<source-media-sha256>.png`; bytes nunca são reencodados.
- `pack.json` usa JSON canônico UTF-8/LF/newline, entries por key e groups por groupId.
- `pack.sha256` contém o SHA-256 lowercase de `pack.json` seguido por newline.
- Presentation vem explicitamente da selection; packer não cria pivô/filtering por heurística.
- Source metadata histórica é normalizada, não reinterpretada.
- `atlasFrameCount` é o maior `startFrame + frameCount` dos grupos normalizados; nenhum grupo pode
  exceder esse limite lógico e o packer não tenta inferir frames lendo pixels.
- Staging nasce como sibling do destino, com nome `.staging-<packId>-<pid>` validado.
- Promoção usa rename no mesmo volume; output anterior só sai depois de staging revalidado e volta
  em rollback se a promoção falhar.
- Nenhuma dependência de imagem é adicionada.

## Escopo permitido

```text
tools/asset-packer/cli.ts
tools/asset-packer/application/**
tools/asset-packer/pack/**
tools/asset-packer/filesystem/**
tools/asset-packer/**/*.test.ts
packages/test-fixtures/assets/pb02/expected/**
apps/game/public/assets/personal/packs/pb-02-contract-coverage/**  # gerado/ignorado
.gitignore
docs/assets/ASSET_PACKER.md
docs/playbooks/PB-02/STATE.md
```

## Fora de escopo

- provider, fetch, Web Crypto, Blob URL ou adapters runtime;
- catálogo de perfil e build guard;
- Vite, app, Playwright ou Phaser;
- decodificar ou modificar PNG;
- ampliar selection;
- versionar pack pessoal.

## Interfaces produzidas

```ts
export interface BuildAssetPackInput {
  readonly selection: AssetSelectionManifest;
  readonly sourceLock: AssetSourceLock;
  readonly sourceManifest: ArenaFableSourceManifest;
}

export function buildAssetPackManifest(
  input: BuildAssetPackInput,
): AssetValidationResult<AssetPackManifest>;

export function canonicalAssetJson(value: unknown): string;

export async function materializeAssetPack(input: {
  readonly sourceRoot: string;
  readonly destination: string;
  readonly manifest: AssetPackManifest;
}): Promise<AssetValidationResult<MaterializedAssetPack>>;

export async function verifyMaterializedAssetPack(input: {
  readonly packRoot: string;
}): Promise<AssetValidationResult<VerifiedAssetPack>>;

export async function compareAssetPackTrees(
  expectedRoot: string,
  actualRoot: string,
): Promise<AssetTreeComparison>;
```

`MaterializedAssetPack` retorna `packId`, `packSha256`, media count, byte count e paths relativos.
Nenhum retorno público inclui source root absoluto.

Normalização de `ArenaFableAnimationGroup`:

```text
kind -> kind
patternX/Y/Z -> patternX/Y/Z
layers -> layers
start -> startFrame
count -> frameCount
phases [[min,max], ...] -> phaseDurationsMs [[min,max], ...]
```

`groups` vazio é inválido. Se source lock, selection e source manifest discordarem em key/category/
ID/path/hash, retorne todos os diagnostics e não crie staging.

## Execução RED/GREEN

- [ ] **1. Criar branch/worktree.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer -b codex/pb02-03-deterministic-packer main
```

- [ ] **2. Escrever RED da transformação pura.**

Cubra cinco entries, ordenação, group propagation, presentation explícita, metadata de animação e
deduplicação de media hash. Mutação com dois IDs ausentes e uma category errada retorna três
diagnostics ordenados.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer exec vitest run --config tools/asset-packer/vitest.config.ts tools/asset-packer/application/buildAssetPack.test.ts
```

Esperado: RED por função ausente.

- [ ] **3. Implementar transformação mínima e canonical JSON.**

Canonicalize objetos por key Unicode ordinal, preserve ordem semântica apenas onde schema a define e
termine JSON com `\n`. Não use `JSON.stringify(value, null, 2)` sobre maps não ordenados.

- [ ] **4. Escrever RED de materialização.**

Em `node:os.tmpdir()`, prove:

- source com cinco paths gera pack validado;
- media idêntica é copiada uma vez;
- source adulterada falha antes de staging;
- write failure injetada preserva output anterior sentinela;
- promoção falha faz rollback;
- verify detecta media removida, byte length e hash divergentes.

- [ ] **5. Implementar filesystem ports e staging seguro.**

Injete operações no teste. Antes de rename/remove, use `realpath`/`resolve`, confirme que staging,
backup e destination são children do parent esperado e nunca aceite workspace root, drive root,
`$HOME`, glob ou symlink externo como alvo destrutivo.

- [ ] **6. Escrever CLI com exit codes determinísticos.**

```text
0 = sucesso
1 = validation/build/check mismatch
2 = uso inválido do CLI
```

JSON de summary vai para stdout; diagnostics vão para stderr. `build --check` gera em temp externo,
compara com o destino esperado e não o modifica.

- [ ] **7. Gerar golden sintético e comprovar duas passagens.**

```powershell
node C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\tools\asset-packer\cli.ts build --selection C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\selection.json --source-lock C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\source-lock.json --source-root C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\source --output C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\expected\test\packs\pb-02-contract-coverage
node C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\tools\asset-packer\cli.ts build --check --selection C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\selection.json --source-lock C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\source-lock.json --source-root C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\source --output C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\test-fixtures\assets\pb02\expected\test\packs\pb-02-contract-coverage
```

- [ ] **8. Gerar e verificar pack pessoal ignorado.**

Acrescente ignore explícito para `apps/game/public/assets/personal/`. Depois:

```powershell
$env:HUNTBOUND_PERSONAL_ASSET_SOURCE = (Resolve-Path C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\..\kaezan-arena-fable\frontend\public\assets\tibia).Path
node C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\tools\asset-packer\cli.ts build --selection C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\assets\catalog\selections\pb-02-contract-coverage.json --source-lock C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\packages\assets\catalog\sources\arena-fable-tibia-1b14dee.json --source-root $env:HUNTBOUND_PERSONAL_ASSET_SOURCE --output C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\apps\game\public\assets\personal\packs\pb-02-contract-coverage
node C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\tools\asset-packer\cli.ts verify-pack --pack-root C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer\apps\game\public\assets\personal\packs\pb-02-contract-coverage
git -C C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer status --short --ignored -- apps/game/public/assets/personal
```

O output aparece `!!`, nunca `??` ou staged.

- [ ] **9. Documentar e executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer exec vitest run --config tools/asset-packer/vitest.config.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer exec tsc --project tools/asset-packer/tsconfig.json --noEmit
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer exec biome check tools/asset-packer packages/test-fixtures/assets/pb02/selection.json
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer format:check
git -C C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer diff --check
git -C C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer ls-files apps/game/public/assets/personal
```

Último comando não produz saída.

- [ ] **10. Concluir no modo serial padrão.**

Atualize `STATE.md`, marque PB-02-03 `done`, indique PB-02-04 e faça:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer add tools/asset-packer packages/test-fixtures/assets/pb02/expected .gitignore docs/assets/ASSET_PACKER.md docs/playbooks/PB-02/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer commit -m "feat: materialize deterministic asset packs"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb02-03-deterministic-packer
node C:\Kaezan\kaezan-huntbound\tools\asset-packer\cli.ts build --check --selection C:\Kaezan\kaezan-huntbound\packages\test-fixtures\assets\pb02\selection.json --source-lock C:\Kaezan\kaezan-huntbound\packages\test-fixtures\assets\pb02\source-lock.json --source-root C:\Kaezan\kaezan-huntbound\packages\test-fixtures\assets\pb02\source --output C:\Kaezan\kaezan-huntbound\packages\test-fixtures\assets\pb02\expected\test\packs\pb-02-contract-coverage
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb02-03-deterministic-packer
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb02-03-deterministic-packer
```

- [ ] **11. Alternativa somente se o supervisor ativou onda paralela.**

Não edite `STATE.md` no commit funcional. Commit os demais paths, confirme worktree limpa, remova a
worktree e preserve `codex/pb02-03-deterministic-packer`. PB-02-05 integrará e apagará a branch.

## Critérios de aceite

- [ ] Transformação e canonicalização são puras e testadas.
- [ ] Cinco entries produzem pack válido e mídia deduplicada por hash.
- [ ] Ausências/corrupções são agregadas antes de escrita.
- [ ] Staging e rollback preservam output anterior em falha.
- [ ] Duas passagens sintéticas são byte-idênticas.
- [ ] Pack real passa source lock/verify e permanece ignorado.
- [ ] Nenhuma biblioteca de imagem/codec foi adicionada.
- [ ] Modo de conclusão usado foi registrado e limpo corretamente.

## Condições de parada

Pare se precisar reencodar PNG, inventar metadata, aceitar source lock divergente, remover path não
validado, mudar manifest contract ou se o destino não estiver no parent esperado.

## Persistência e relatório final

Registre golden hash, files/bytes, testes de rollback, pack pessoal ignorado, commit, modo
serial/paralelo, limpeza e próxima task elegível. Não implemente runtime.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh. Use
game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-02\tasks\PB-02-03-materializar-packs-deterministicos.md

Use fluxo serial salvo instrução explícita do supervisor ativando PB-02-03/04 em paralelo. Implemente
packer por RED/GREEN, gere golden sintético, verifique pack pessoal ignorado, rode gates, atualize
STATE no modo serial, commite, integre por fast-forward e limpe. No modo paralelo, não dispute STATE,
remova worktree e preserve branch para PB-02-05. Não implemente provider, perfis ou app. Não inicie a
próxima task.
```
