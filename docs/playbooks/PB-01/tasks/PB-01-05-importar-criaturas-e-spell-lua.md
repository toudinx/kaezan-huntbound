# PB-01-05 — Importar criaturas e spell por AST Lua estática

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — AST com whitelist congelada

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; GPT-5.6 Sol `xhigh` ou Claude Code/Opus 5 somente se a
AST real exigir forma fora da whitelist ou após outro gatilho de escalonamento

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** pode formar onda com PB-01-04 após PB-01-03. O prompt usa fluxo serial padrão.

## Objetivo

Analisar estaticamente o subconjunto declarativo Lua necessário para Rotworm, Amazon, Orc Shaman,
Snake e Berserk. Transformar AST allowlisted em DTOs próprios, com diagnósticos por localização,
sem executar código, callbacks ou expressões arbitrárias.

## Resultado esperado

Fixtures sintéticas cobrem melee, ranged, area, heal, summon, loot por nome/ID, elementos,
imunidades, poison condition e fórmula skill-attack. Nós AST fora da whitelist falham de forma acionável; não há
`eval`, `Function`, VM Lua ou subprocesso Canary.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md`;
2. contracts e `sourceTypes.ts`;
3. fixtures Lua sintéticas de PB-01-03;
4. source lock de PB-01-03;
5. somente os cinco Lua reais listados na task/source lock para confirmar formas;
6. documentação do AST `luaparse` já fixado em `0.3.1`.

## Decisões congeladas

- `luaparse` usa `locations: true`, `ranges: true`, `comments: false`, `luaVersion: '5.3'`.
- O adapter aceita assignments/tables/literais, constantes simbólicas allowlisted, chamadas de
  configuração allowlisted e a expressão aritmética específica de fórmula declarativa.
- Funções não são executadas. `onGetFormulaValues` é reconhecida por forma AST e convertida em
  coeficientes; qualquer statement inesperado bloqueia.
- Damage Canary negativo vira magnitude positiva com min/max ordenados.
- Chance percentual Canary vira basis points multiplicando por 100; loot preserva escala 100000.
- Voices, locations textuais, sounds e callbacks sem consumidor são ignorados por allowlist
  documentada. Nada entra em metadata genérico.
- Poison melee de Snake é convertido para condition declarativa; não pode ser ignorado.
- `vocationNames` preserva `knight` e `elite knight` como referências cruas. A projeção explícita
  para `vocation-family:huntbound:knight` ocorre somente em PB-01-06; os nomes não são aliases de
  entidade.

## Escopo permitido

```text
packages/content/src/importers/canary/lua/**
packages/content/src/importers/canary/lua/**/*.test.ts
docs/content/CANARY_LUA_MAPPING.md
docs/playbooks/PB-01/STATE.md
```

## Fora de escopo

- filesystem, SQLite, source lock, CLI, dependency resolution e JSON;
- outros monsters/spells;
- execução Lua, emulação de APIs Canary ou transcrição de callbacks;
- regras de combate/IA/loot.

## Interfaces produzidas

```ts
export interface CanaryCreatureDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly stats: { readonly health: number; readonly experience: number; readonly speed: number };
  readonly lookType: number;
  readonly attacks: readonly CanaryAttackDto[];
  readonly defenses: readonly CanaryDefenseDto[];
  readonly conditions: readonly CanaryConditionDto[];
  readonly summons: readonly CanarySummonDto[];
  readonly lootRefs: readonly ({ readonly sourceId: string } | { readonly sourceName: string })[];
  readonly elements: Readonly<Record<string, number>>;
  readonly immunities: readonly string[];
}

export interface CanarySpellDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly words: string;
  readonly level: number;
  readonly mana: number;
  readonly cooldownMs: number;
  readonly groupCooldownMs: number;
  readonly vocationNames: readonly string[];
  readonly damageType: string;
  readonly area: { readonly shape: 'square'; readonly radius: number };
  readonly formula: {
    readonly kind: 'skillAttack';
    readonly levelFactor: number;
    readonly minSkillAttackFactor: number;
    readonly maxSkillAttackFactor: number;
    readonly finalMultiplier: number;
  };
}

export function parseCanaryMonsterLua(lua: string): CanaryParseResult<CanaryCreatureDto>;
export function parseCanarySpellLua(lua: string): CanaryParseResult<CanarySpellDto>;
```

## Execução RED/GREEN

- [ ] **1. Criar branch `codex/pb01-05-lua-importers` e worktree
  `C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers` a partir da `main` elegível.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --short
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers -b codex/pb01-05-lua-importers main
```
- [ ] **2. Escrever testes do AST guard e confirmar RED.** Rejeite `dofile`, `require`, chamada não
  allowlisted, loop, mutation dinâmica, índice calculado e função inesperada. Diagnóstico inclui
  linha/coluna.
- [ ] **3. Implementar parser/visitor mínimo.** Separe parse AST, extração de tabela, resolução de
  constantes simbólicas e mapping; nenhum arquivo monolítico concentra tudo.
- [ ] **4. Escrever testes de criaturas e confirmar RED.** Use as quatro formas sintéticas para
  melee, ranged, area/heal/summon e dependência. Cubra normalização de dano/chance, poison com
  `totalDamage`/`intervalMs`, loot misto, elementos/imunidades, ausência de raceId e campo sem
  whitelist.
- [ ] **5. Implementar mapping de creatures e obter GREEN.** Ordene ataques, summons e loot pela
  ordem de origem somente quando semanticamente relevante; export canônico ordenará por identidade.
- [ ] **6. Escrever teste de spell/fórmula e confirmar RED.** Cubra ID/nome/words/custos/cooldowns,
  vocation list, área e coeficientes. Troque um operador na fixture inválida e exija rejeição.
- [ ] **7. Implementar mapping de Berserk.** Extraia dados, não código executável. A fórmula
  resultante deve ser declarativa e validada pelo schema de PB-01-01.
- [ ] **8. Documentar mapping e whitelist.** `CANARY_LUA_MAPPING.md` lista cada nó/campo suportado,
  normalização e campos ignorados. Inclua seção explícita “Lua nunca é executado”.
- [ ] **9. Prova negativa automatizada.** Busque no escopo por `eval(`, `new Function`, VM Lua,
  `child_process` e imports de filesystem; zero ocorrências no adapter.
- [ ] **10. Rodar gates.**

```powershell
corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua
corepack pnpm --filter @huntbound/content typecheck
corepack pnpm architecture:check
corepack pnpm exec biome check packages/content docs/content/CANARY_LUA_MAPPING.md
corepack pnpm format:check
git diff --check
```

- [ ] **11. Atualizar STATE, commitar, integrar e limpar.** Commit
  `feat: parse curated Canary Lua content`. No serial, fast-forward na `main`, reverifique e remova
  worktree/branch; indique PB-01-06. Em onda paralela autorizada, preserve branch para PB-01-06.

Fluxo serial — execute somente este bloco quando PB-01-05 integrar diretamente na `main`:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers add packages/content docs/content/CANARY_LUA_MAPPING.md docs/playbooks/PB-01/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers commit -m "feat: parse curated Canary Lua content"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb01-05-lua-importers
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/content test -- src/importers/canary/lua
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/content typecheck
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb01-05-lua-importers
```

Fluxo paralelo — execute este bloco no lugar do serial; não faça merge nem apague a branch:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers add packages/content docs/content/CANARY_LUA_MAPPING.md docs/playbooks/PB-01/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers commit -m "feat: parse curated Canary Lua content"
git -C C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers status --short
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb01-05-lua-importers
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch --list codex/pb01-05-lua-importers
```

O `status --short` deve ficar vazio e o último comando deve listar a branch preservada para PB-01-06.

## Critérios de aceite

- [ ] Nenhum Lua é executado; AST/whitelist bloqueia formas desconhecidas.
- [ ] Quatro criaturas e Berserk são representáveis pelas fixtures.
- [ ] Dano, chances, poison, intervalos, área e fórmula são normalizados com unidades explícitas.
- [ ] Diagnósticos incluem localização e contexto.
- [ ] Mapping/allowlist documentados e testes RED/GREEN.
- [ ] Adapter não depende de Node/SQLite/Phaser.

## Condições de parada

Pare se o único caminho for executar Lua, aceitar AST genérica, copiar callback Canary, esconder
campo desconhecido ou decidir semântica de combate não congelada.

## Relatório final

Liste AST suportada/rejeitada, formas cobertas, normalizações, prova negativa, testes, commit e ciclo
de integração/limpeza. Não materialize banco nem exporte JSON.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh.
Use superpowers:test-driven-development e superpowers:verification-before-completion.
Não escale por cautela genérica; use Sol/Claude somente se a AST real sair da whitelist ou após
outro gatilho objetivo registrado no STATE.
Execute somente C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-05-importar-criaturas-e-spell-lua.md.
Use AST luaparse estrita e nunca execute Lua. Faça RED/GREEN, mapping, prova negativa, gates, STATE,
commit, integração serial por fast-forward e limpeza. Não acesse SQLite/filesystem no adapter, não
importe outros conteúdos e não inicie PB-01-06.
```
