# PB-02-06 — Validar o contrato no browser

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — composition root e prova E2E

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; Opus 5 somente após gatilho registrado

**Rota:** `game-studio:web-game-foundations` + `game-studio:game-playtest` +
`superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** não. Depende da integração de PB-02-03, PB-02-04 e PB-02-05.

## Objetivo

Conectar o provider à composition root do app e provar em Chromium que o perfil `test` carrega,
resolve, descarrega e recarrega as cinco stable keys sem path de mídia no consumidor e sem violar o
budget de boot existente.

## Resultado esperado

O app espera o preload do catálogo antes de declarar assets prontos, expõe um probe somente no mode
`test`, inicia Phaser normalmente e passa um cenário Playwright que observa cinco assets carregados,
zero após unload e cinco após reload. Modes `personal` e `product` não expõem o probe.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. `docs/assets/ASSET_PROVIDER.md`, `docs/assets/ASSET_PROFILES.md` e contratos públicos;
3. implementação integrada de PB-02-03/04/05;
4. `apps/game/src/main.ts`, `apps/game/src/runtime/SceneBridge.ts` e testes do app;
5. `tests/e2e/boot-budget.spec.ts`, configuração Playwright e scripts raiz.

PB-02-05 deve estar integrada e todos os gates dela devem estar verdes.

## Decisões congeladas

- O único bootstrap é `/assets/<profile>/catalog.json`, composto em `AssetProfile.ts`.
- O profile deriva somente de `import.meta.env.MODE`: `test`, `personal` ou `product`.
- Nenhum módulo de scene, simulation ou UI conhece pack path, media path, atlas ou ID legado.
- `main.ts` conclui o preload antes de marcar `data-assets-ready="true"` e antes de iniciar Phaser.
- Falha de preload interrompe o boot com erro acionável; não há substituição visual ou fallback silencioso.
- O probe é instalado somente quando `import.meta.env.MODE === "test"`.
- O probe expõe snapshots serializáveis e operações `unload()`/`reload()`; não expõe registry mutável.
- `unload()` revoga URLs e zera o snapshot; `reload()` reusa o catálogo e recria cinco resoluções.
- O teste observa stable keys e estado; não faz assertions sobre blob URLs instáveis.
- O budget de boot Fast 4G continua em no máximo cinco segundos.

## Escopo permitido

```text
apps/game/src/assets/AssetProfile.ts
apps/game/src/assets/AssetProfile.test.ts
apps/game/src/assets/createAssetRuntime.ts
apps/game/src/assets/createAssetRuntime.test.ts
apps/game/src/assets/AssetRuntimeProbe.ts
apps/game/src/assets/AssetRuntimeProbe.test.ts
apps/game/src/main.ts
apps/game/src/main.test.ts
apps/game/package.json
pnpm-lock.yaml
tests/e2e/asset-pack.spec.ts
docs/assets/BROWSER_ASSET_CONTRACT.md
docs/playbooks/PB-02/STATE.md
```

## Fora de escopo

- desenhar sprites em Phaser, DOM ou canvas;
- compositor de outfit, tint, animação ou câmera;
- alterar o provider, packer, schema ou guard para acomodar o E2E;
- usar os PNGs pessoais como fixture Playwright;
- expor debug global em build `personal` ou `product`;
- relaxar o budget de boot;
- corrigir falhas não relacionadas.

## Interfaces produzidas

```ts
export type AppAssetProfile = "test" | "personal" | "product";

export function parseAppAssetProfile(mode: string): AppAssetProfile;

export function getAssetCatalogUrl(profile: AppAssetProfile): string;

export interface AssetRuntimeSnapshot {
  readonly state: "idle" | "loaded" | "unloaded";
  readonly count: number;
  readonly keys: readonly AssetKey[];
}

export interface AssetRuntime {
  preload(): Promise<readonly ResolvedAsset[]>;
  unload(): Promise<void>;
  snapshot(): AssetRuntimeSnapshot;
}

export type AssetProviderFactory = (input: {
  readonly profile: AssetBuildProfile;
  readonly catalogUrl: string;
}) => Promise<AssetProvider>;

export function createAssetRuntime(input: {
  readonly profile: AppAssetProfile;
  readonly catalogUrl: string;
  readonly providerFactory?: AssetProviderFactory;
}): AssetRuntime;

export interface HuntboundAssetProbe {
  snapshot(): AssetRuntimeSnapshot;
  unload(): Promise<AssetRuntimeSnapshot>;
  reload(): Promise<AssetRuntimeSnapshot>;
}
```

O tipo global de teste fica limitado ao próprio módulo:

```ts
declare global {
  interface Window {
    __huntboundAssetProbe?: HuntboundAssetProbe;
  }
}
```

`snapshot().keys` deve estar em ordem lexicográfica. A factory default delega para
`createFetchAssetProvider`; o runtime cria e memoriza sua promise no primeiro preload, mantendo a
mesma instância de provider. `reload()` chama novamente o preload após unload, sem recriar
composition root ou jogo. A injeção opcional existe somente para testes focais.

## Plano de execução

### 1. Preparar worktree e confirmar baseline

```powershell
git -C C:\Kaezan\kaezan-huntbound status --short
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract -b codex/pb02-06-browser-contract main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract install --frozen-lockfile
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract assets:stage:test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game typecheck
```

Registrar no `STATE.md` branch, worktree, commit base e resultado. Se o baseline falhar, registrar blocker
e parar sem editar código.

### 2. RED — congelar profile e URL de bootstrap

Criar `AssetProfile.test.ts` antes da implementação. Cobrir:

- modes `test`, `personal` e `product` aceitos;
- mode desconhecido rejeitado com mensagem acionável;
- URL exatamente `/assets/test/catalog.json`, `/assets/personal/catalog.json` ou
  `/assets/product/catalog.json`;
- nenhuma barra invertida, URL absoluta ou media path.

Executar e capturar a falha esperada:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game test -- AssetProfile.test.ts
```

### 3. GREEN — implementar `AssetProfile.ts`

Implementar allowlist exata dos três modes e composição pura da URL. Não ler variáveis fora de
`import.meta.env.MODE` na composition root e não aceitar override por query string.

Executar o teste focal até passar.

### 4. RED — congelar ciclo do runtime

Criar `createAssetRuntime.test.ts` com provider fake injetável ou mockado na fronteira pública. Provar:

- estado inicial `idle`, count zero;
- preload único resulta em `loaded`, cinco keys ordenadas;
- preload repetido é idempotente;
- unload chama `provider.unloadAll()` e resulta em `unloaded`, count zero;
- preload posterior recarrega cinco assets;
- falha não muda snapshot para `loaded` e preserva o erro tipado.

O teste inicial deve falhar pela ausência da factory.

### 5. GREEN — implementar runtime pequeno e renderer-agnostic

Criar `createAssetRuntime.ts` usando exclusivamente exports públicos de `@huntbound/assets`.
Adicionar `@huntbound/assets: workspace:*` às dependências do app. Não importar internals do provider,
Phaser, Node ou paths de pack.

Executar:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract install --lockfile-only
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game test -- createAssetRuntime.test.ts
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game typecheck
```

### 6. RED/GREEN — instalar probe exclusivamente em teste

Criar primeiro `AssetRuntimeProbe.test.ts`. Cobrir instalação em `test`, ausência nos outros dois
profiles, snapshots imutáveis, unload e reload. Então implementar `AssetRuntimeProbe.ts` sem exportar
estado mutável.

O bundler deve poder eliminar o branch dos modes não-test; o teste de `main.ts` deve garantir que a
instalação só é chamada sob a condição congelada.

### 7. RED/GREEN — integrar à composition root

Estender `main.test.ts` antes de `main.ts` para provar a ordem:

1. obter profile e URL;
2. criar runtime;
3. aguardar `preload()`;
4. publicar `data-assets-ready="true"` e `data-assets-count="5"` no root;
5. instalar probe apenas em `test`;
6. iniciar Phaser.

Em falha, marcar `data-assets-ready="false"`, preservar mensagem de erro e não iniciar Phaser.
Implementar a menor alteração em `main.ts` que satisfaça a ordem.

### 8. RED — escrever o cenário Playwright

Criar `tests/e2e/asset-pack.spec.ts` e executá-lo antes da integração final. O cenário deve:

1. abrir o app com mode `test` e rede/console monitorados;
2. esperar `data-assets-ready="true"` dentro de cinco segundos;
3. verificar count cinco e as cinco stable keys exatas pelo probe;
4. chamar `unload()`, obter `unloaded`, count zero e keys vazias;
5. chamar `reload()`, obter `loaded`, count cinco e as mesmas keys;
6. confirmar ausência de `pageerror`, console error e request 4xx/5xx;
7. confirmar que requests de mídia vieram das URLs descobertas nos manifests.

O teste deve falhar antes que o app instale o runtime/probe completo.

### 9. GREEN — fechar integração e documentação

Completar apenas o necessário para o cenário passar. Documentar em
`docs/assets/BROWSER_ASSET_CONTRACT.md` o bootstrap, ordem de boot, semântica de unload/reload e a
restrição do probe. Atualizar o `STATE.md` com evidências e próxima task `PB-02-07`.

### 10. Refatorar sem ampliar escopo

Remover duplicação observada nos testes, manter módulos pequenos e nomes públicos congelados.
Executar busca dirigida para assegurar que `media/`, `.png`, `pack.json` e IDs legados não apareceram
em consumidores do app fora dos testes/allowlists.

### 11. Verificar, revisar e commitar

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract assets:stage:test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract --filter @huntbound/game build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract exec playwright test tests/e2e/asset-pack.spec.ts tests/e2e/boot-budget.spec.ts --project=chromium
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract verify
git -C C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract diff --check
git -C C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract status --short
```

Revisar o diff contra esta task. Se todos os gates estiverem verdes:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract add apps/game/src/assets apps/game/src/main.ts apps/game/src/main.test.ts apps/game/package.json pnpm-lock.yaml tests/e2e/asset-pack.spec.ts docs/assets/BROWSER_ASSET_CONTRACT.md docs/playbooks/PB-02/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb02-06-browser-contract commit -m "feat: preload asset contract pack"
```

## Critérios de aceite

- [ ] O app usa somente o catálogo do profile como bootstrap.
- [ ] Preload antecede a declaração de assets prontos e o início do jogo.
- [ ] O browser resolve as cinco stable keys esperadas.
- [ ] Unload deixa zero assets e reload restaura exatamente cinco.
- [ ] O probe existe somente no mode `test`.
- [ ] Nenhum consumidor contém media/pack path ou ID legado.
- [ ] Falha de preload é bloqueante e acionável.
- [ ] O cenário passa sem erro de console, página ou rede.
- [ ] O boot Fast 4G permanece em até cinco segundos.
- [ ] Testes, typecheck, build, architecture e `verify` passam.
- [ ] O diff contém somente arquivos do escopo permitido.

## Handoff e integração automática

No relatório final, listar commit, gates executados, duração observada do boot e arquivos alterados. O
orquestrador deve revisar escopo, executar novamente os gates focais, integrar por fast-forward em
`main`, executar `verify`, remover worktree/branch somente após sucesso e marcar PB-02-07 elegível.
Qualquer correção fora desta task vira `PB-02-FIX-01`; não deve ser feita oportunisticamente.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh. Leia integralmente
docs/playbooks/PB-02/tasks/PB-02-06-validar-contrato-no-browser.md, o README e o STATE do PB-02,
além dos documentos e fontes listados na leitura mínima. Use game-studio:web-game-foundations,
game-studio:game-playtest, superpowers:using-git-worktrees, superpowers:test-driven-development e
superpowers:verification-before-completion. Execute somente PB-02-06 no worktree e branch exatos
codex/pb02-06-browser-contract criados a partir de main limpa. Respeite o escopo permitido, comece
cada comportamento por RED, preserve o bootstrap único por catálogo e não desenhe assets. Execute
todos os testes focais, build test, Playwright asset-pack + boot-budget, architecture:check e verify.
Faça self-review do diff, registre evidências no STATE, crie o commit
"feat: preload asset contract pack" e integre por git merge --ff-only em main somente com gates
verdes. Reexecute os gates pós-integração e remova worktree/branch apenas após sucesso. Se surgir
necessidade fora da card, registre PB-02-FIX-01 e pare. Não inicie PB-02-07.
```
