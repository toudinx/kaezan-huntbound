# PB-01-03 — Congelar slice curado, source lock e fixtures sintéticas

**Status inicial:** pending

**Classe da tarefa:** especificação executável e ferramental de proveniência

**Modelo sugerido:** GPT-5.6 Sol `xhigh`

**Validador sugerido:** Claude Opus 5

**Rota:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` +
`superpowers:verification-before-completion`.

**Paralelismo:** não. Habilita a possível onda PB-01-04/05.

## Objetivo

Versionar a seleção mínima do PB-01, a identidade exata das fontes reais e fixtures sintéticas que
permitam testar parsers sem copiar Canary. Provar que source lock detecta commit/path/hash divergente
e que o slice não aceita raízes extras.

## Resultado esperado

O repositório contém um manifesto curado, um source lock com sete arquivos reais e fixtures
sintéticas equivalentes apenas em forma. Uma ferramenta pura valida seleção; a borda Node confirma o
snapshot local sem alterar ou copiar suas fontes.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md` do PB-01;
2. contracts de PB-01-01;
3. repository/tooling de PB-01-02;
4. `.gitignore`;
5. somente estes arquivos reais para inspeção, nunca cópia:
   - `references/canary/data/XML/vocations.xml`;
   - `references/canary/data/items/items.xml`;
   - `references/canary/data/scripts/spells/attack/berserk.lua`;
   - os quatro monsters listados no source lock abaixo.

## Decisões congeladas

- Slice: `fixture:pb-01-contract-coverage`.
- Raízes: vocation ID `4`, spell ID `80`, creature race IDs `26`, `77` e `6`.
- Snake race ID é dependência da criatura `6`, não raiz.
- Projeções: Knight `identity/progression`; Berserk `identity/spell`; três creatures raiz
  `identity/stats/appearance/combat/loot`; Snake `identity/stats/appearance/combat/conditions` sem
  loot; itens alcançados `identity/item`.
- Todo facet possui `consumer` e `rationale`; campo sem facet aprovado falha.
- Fixtures usam entidades fictícias e valores inventados; não reproduzem texto/código Canary.
- Source lock real fixa commit, path e os SHA-256 abaixo.
- Source lock registra `license: "GPL-2.0-only"`, `licensePath: "LICENSE"` e
  `licenseSha256: "189b1af95d661151e054cea10c91b3d754e4de4d3fecfb074c1fb29476f7167b"`; nenhum conteúdo da
  licença ou fonte é copiado para a fixture.
- A política de projeção mapeia as referências cruas `knight` e `elite knight` de Berserk para
  `vocation-family:huntbound:knight`; não declara Elite Knight como alias de Knight.
- Dependências de parser são instaladas nesta task para permitir PB-01-04/05 paralelas:
  `fast-xml-parser@5.10.1`, `luaparse@0.3.1`, `@types/luaparse@0.2.13`.

## Source lock obrigatório

| Path relativo a `references/canary` | SHA-256 |
|---|---|
| `data/XML/vocations.xml` | `693a179048d5d5c5af519459c8e542cd01013212af1cec88f7c8eb72634f4350` |
| `data/items/items.xml` | `b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8` |
| `data/scripts/spells/attack/berserk.lua` | `819b628608268aebea355be46a1d86e73c24bdf26d1299aa7d3e9af71d10f89f` |
| `data-otservbr-global/monster/vermins/rotworm.lua` | `f75ed297cd851013cde4e991113bf2d67ab9930852f20fb0c4e8d0937ddb176b` |
| `data-otservbr-global/monster/humans/amazon.lua` | `9792a709311c8281217bffa343e2c9579a8ae631bd69f9c0a8665a6d469cca7b` |
| `data-otservbr-global/monster/humanoids/orc_shaman.lua` | `cf3fee52b211b9f4b18dc7da2bfbf257e816542a320491b3817a883cfbe17864` |
| `data-otservbr-global/monster/reptiles/snake.lua` | `e626dc3591330481f37e1e3703afe67bf89a93771c42ccbd46ad59f0690ca48b` |

## Escopo permitido

```text
packages/content/src/selections/**
packages/content/src/sources/**
packages/content/src/importers/canary/sourceTypes.ts
packages/content/package.json
packages/test-fixtures/canary/pb01/**
packages/test-fixtures/src/index.ts
tools/content-catalog/source/**
tools/content-catalog/**/*.test.ts
pnpm-lock.yaml
docs/content/PB-01-SELECTION.md
docs/playbooks/PB-01/STATE.md
```

## Fora de escopo

- parsing XML/Lua e materialização de conteúdo real;
- copiar código, comentários ou dados literais Canary para fixtures;
- importar Elite Knight como entidade ou alias: os nomes crus Knight/Elite Knight serão projetados
  para uma família Huntbound distinta em PB-01-06;
- ampliar roots/facets, escolher hunt ou definir gameplay.

## Interfaces produzidas

```ts
export interface LockedSourceFile {
  readonly relativePath: string;
  readonly sha256: string;
  readonly purpose: 'vocations' | 'items' | 'spell' | 'creature';
}

export interface SourceSnapshotLock {
  readonly sourceSystem: 'canary';
  readonly commit: string;
  readonly license: 'GPL-2.0-only';
  readonly licensePath: 'LICENSE';
  readonly licenseSha256: string;
  readonly files: readonly LockedSourceFile[];
}

export function verifySourceLock(
  snapshotRoot: string,
  lock: SourceSnapshotLock,
): readonly ContentDiagnostic[];

export function validateSliceSelection(
  selection: ContentSliceDefinition,
): readonly ContentDiagnostic[];

export type CanaryParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly diagnostics: readonly ContentDiagnostic[] };
```

## Execução RED/GREEN

- [ ] **1. Criar branch/worktree exatas.**

Branch `codex/pb01-03-curated-slice`; worktree
`C:\Kaezan\kaezan-huntbound-pb01-03-curated-slice`; base `main` com PB-01-02 integrada.

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb01-03-curated-slice main
git worktree add C:\Kaezan\kaezan-huntbound-pb01-03-curated-slice codex/pb01-03-curated-slice
```

- [ ] **2. Fixar parser dependencies sem criar parsers.**

```powershell
corepack pnpm --filter @huntbound/content add fast-xml-parser@5.10.1 luaparse@0.3.1
corepack pnpm --filter @huntbound/content add -D @types/luaparse@0.2.13
```

- [ ] **3. Escrever testes do source lock e confirmar RED.**

Use diretório temporário sintético para provar: tudo correto passa; hash, path ou commit divergente
gera código específico; arquivo ausente lista todos os ausentes numa execução; path absoluto, `..`,
duplicata após normalização, symlink/junction escapando do root e arquivo não regular são rejeitados;
`realpath` de todo arquivo permanece sob o `realpath` do snapshot root; verificação nunca escreve na
origem. Aplique os mesmos checks ao `licensePath` e rejeite `licenseSha256` divergente.

- [ ] **4. Implementar verificador e validar o snapshot real.**

O adaptador Git/FS fica em `tools/`. Não chame shell com paths montados; use APIs Node e normalize
relative paths com `/`. Rode:

```powershell
node tools/content-catalog/source/verifySourceLock.ts references/canary packages/content/src/sources/canary-157e6f9e.json
```

- [ ] **5. Escrever manifesto do slice e testes de seleção.**

O JSON declara apenas cinco raízes (Knight, Berserk e três criaturas), facets/consumer/rationale de
cada uma e a política `dependencyMode: "reachable-only"`. Testes rejeitam raiz extra, GUID manual,
source ID duplicado, facet sem consumidor/razão, campo fora do facet e item declarado como raiz sem
justificativa. A policy também fixa `vocation-family:huntbound:knight` e rejeita mapear a referência
crua `elite knight` como alias da entidade Knight.

- [ ] **6. Criar o tipo de resultado compartilhado e fixtures sintéticas mínimas.**

Crie `sourceTypes.ts` somente com `CanaryParseResult` e tipos de localização, sem parser. Crie XML
sintético de duas vocações e itens por ID/nome; Lua sintético para melee, ranged, area,
heal, summon e spell. Use nomes `Fixture ...`, IDs fora do catálogo real e números inventados. Inclua
um arquivo inválido por formato para diagnóstico. Não copie comentários, strings descritivas ou
blocos reais do Canary.

- [ ] **7. Documentar a curadoria.**

`docs/content/PB-01-SELECTION.md` registra raízes, dependências esperadas, por que cada forma existe,
regra de órfãos e proibição de importar tudo. Não liste antecipadamente todos os loot items: essa
lista será produzida pela materialização real em PB-01-06.

- [ ] **8. Rodar gates.**

```powershell
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
corepack pnpm --filter @huntbound/content test
corepack pnpm architecture:check
corepack pnpm exec biome check packages/content/src/selections packages/content/src/sources packages/content/src/importers/canary/sourceTypes.ts packages/test-fixtures/canary tools/content-catalog/source
corepack pnpm format:check
git diff --check
git check-ignore references/canary/data/XML/vocations.xml
```

- [ ] **9. Atualizar STATE, commitar, integrar e limpar.**

Commit `docs: freeze curated Canary content slice`. Na raiz, confirme ambas as árvores limpas e rode:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb01-03-curated-slice add packages/content packages/test-fixtures tools/content-catalog/source package.json pnpm-lock.yaml docs/content/PB-01-SELECTION.md docs/playbooks/PB-01/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb01-03-curated-slice commit -m "docs: freeze curated Canary content slice"
git switch main
git merge --ff-only codex/pb01-03-curated-slice
node tools/content-catalog/source/verifySourceLock.ts references/canary packages/content/src/sources/canary-157e6f9e.json
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts
git worktree remove C:\Kaezan\kaezan-huntbound-pb01-03-curated-slice
git worktree prune
git branch -d codex/pb01-03-curated-slice
```

Indique PB-01-04 como próxima task; PB-01-05 também fica elegível.

## Critérios de aceite

- [ ] Source lock real contém exatamente sete paths/hashes e commit congelado.
- [ ] Verificador detecta todas as classes de divergência sem escrever na origem.
- [ ] Slice possui cinco raízes e `reachable-only`.
- [ ] Facets/consumer/rationale tornam a curadoria verificável por campo.
- [ ] Paths reais/licença estão confinados por `realpath`; `licenseSha256` é verificado.
- [ ] Fixtures são sintéticas, pequenas e cobrem todas as formas necessárias.
- [ ] Nenhum Lua/XML Canary foi adicionado ao Git.
- [ ] Dependências exatas e lockfile estão prontos para PB-01-04/05.
- [ ] Commit integrado e recursos temporários limpos.

## Condições de parada

Pare se o snapshot real não estiver no commit/hash esperado, se uma dependência necessária ampliar
materialmente o slice, se a fixture exigir copiar código real ou se a seleção antecipar uma hunt.

## Relatório final

Liste raízes, hashes confirmados, fixtures, testes, dependências, commit/integração/limpeza e declare
PB-01-04 e PB-01-05 elegíveis sem iniciar nenhuma.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol xhigh.
Use game-studio:web-game-foundations, superpowers:test-driven-development e
superpowers:verification-before-completion.
Execute somente C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-03-congelar-slice-e-proveniencia.md.
Crie a branch/worktree declaradas, fixe o source lock e o slice, crie somente fixtures sintéticas,
prove os hashes do snapshot real, rode gates, atualize STATE, commite, integre por fast-forward e
limpe worktree/branch. Não implemente parsers nem copie Lua/XML Canary. Não inicie PB-01-04/05.
```
