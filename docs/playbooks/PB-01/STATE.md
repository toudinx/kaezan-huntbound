# PB-01 — Estado operacional

> **Fila encerrada em 2026-09-07:** registro histórico. Implementações e commits abaixo
> permanecem válidos; pendências não são executáveis por esta fila. Destino no
> [roteiro vigente](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md). Status antigos abaixo são históricos.


**Playbook:** `docs/playbooks/PB-01/README.md`

**Estado geral:** done

**Última atualização:** 2026-08-13

**Próxima task elegível:** nenhuma — PB-01 fechado; `PB-02` é o próximo playbook elegível

## Tasks

| ID | Status | Branch | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-01-01 | done | `codex/pb01-01-content-contracts` | `0b465e4c0f2631bf37c1144a2fd7b2de34781a9b` | 22 testes; typecheck; architecture; Biome; format; diff check |
| PB-01-02 | done | `codex/pb01-02-sqlite-catalog` | `429d98a2cfef393918d2e7a1efc8c05565acdf83` | 39 testes; migration/schema; round-trip; constraints; multi-slice; lifecycle; architecture; typecheck; Biome; format; diff check |
| PB-01-03 | done | `codex/pb01-03-curated-slice` | `1ee75ca4ab43dc1d2ec1b3e8564e8f0d488e222a` | 46 testes de tooling; 7 testes de seleção; source lock real; typecheck; architecture; Biome; format; diff check |
| PB-01-04 | done | `codex/pb01-04-xml-importers` | `530cc31d7d132428346cece9c42b562d7829e219` | 27 testes XML; typecheck; architecture; Biome; format; diff check |
| PB-01-05 | done | `codex/pb01-05-lua-importers` | `348dcd8` | 49 testes Lua; typecheck; architecture; Biome; format; diff check; prova negativa |
| PB-01-06 | done | `codex/pb01-06-materialize-slice` | `e70603d` | 53 testes content; 53 testes tooling; content check; rebuild/validate/export determinísticos; typecheck; build; architecture; Biome; format; diff check |
| PB-01-07 | done | `codex/pb01-07-integrated-gate` | commit `docs: close PB-01 curated content gate` (o próprio commit desta linha, integrado por fast-forward na `main`) | `verify` exit 0; 10/10 provas controladas; 12/12 checagens de catálogo; determinismo byte a byte; rebuild sem Canary; licença e boundaries |

## Baseline congelado

- Branch-base: `main`.
- Commit de autoria do design: `0565f71`.
- Snapshot Canary: `157e6f9e21318bd3033eea553fe9275b429faf72` em
  `C:\Kaezan\kaezan-huntbound\references\canary`.
- Node/pnpm: 24.14.0 / 11.21.0 via Corepack.
- PB-00R: `done`; PB-00R-FIX-01 integrado e W1/W2 resolvidos.
- Baseline conhecido: `corepack pnpm check` reprova fora do PB-01 por `noExportsInTest` em
  `tests/e2e/shell.spec.ts`; gates PB-01 usam Biome restrito e `verify` integrado.
- Working tree esperada ao iniciar PB-01-01: limpa e na `main`.

## Decisões operacionais

- PB-01-01 a PB-01-06 usam GPT-5.6 Luna `xhigh` por padrão. Sol/Claude só entram após gatilho
  objetivo de escalonamento registrado neste arquivo; PB-01-07 é auditoria frontier independente.
- Tasks são seriais por padrão.
- PB-01-04/05 podem formar uma onda paralela somente quando ambas partirem da `main` já contendo
  PB-01-03. Nesse modo, executores preservam branches e PB-01-06 integra ambos serialmente.
- Nenhuma task instala software global ou servidor. Dependências entram com versão exata no lockfile.
- O arquivo SQLite materializado e temporários de importação não são versionados; migrations,
  operações curadas, JSON, docs e hashes são.
- Mudança de fonte, schema ou identidade não coberta pela task bloqueia; não ampliar a migração.

## Handoffs

PB-01-01 foi concluída em `codex/pb01-01-content-contracts`. `@huntbound/contracts` agora exporta
identidade UUIDv5, stable keys, famílias de vocação, proveniência, aliases, projeções, definições
de vocação/criatura/item/spell, condições, summons, loot, fórmulas declarativas, bundles de catálogo
e runtime e diagnósticos Zod estruturados. O runtime rejeita proveniência, aliases, audits de projeção
e paths/snapshots do slice.

Evidência fresca do commit `0b465e4c0f2631bf37c1144a2fd7b2de34781a9b`:

```text
corepack pnpm --filter @huntbound/contracts test  -> 22 passed
corepack pnpm --filter @huntbound/contracts typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/contracts -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
```

Modelo/effort efetivos: GPT-5.6 Luna `xhigh`. Validador efetivo: gates automatizados; não houve
gatilho objetivo para escalonamento a Sol/Claude.

PB-01-02 foi concluída no branch `codex/pb01-02-sqlite-catalog`; PB-01-03 foi concluída no branch
`codex/pb01-03-curated-slice`. O source lock, a seleção e as fixtures estão prontos para PB-01-04 e
PB-01-05; nenhuma delas foi iniciada.

Evidência fresca de PB-01-02 no commit `429d98a2cfef393918d2e7a1efc8c05565acdf83`:

```text
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts -> 39 passed
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check ... -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
git ls-files '*.sqlite' '*.sqlite-wal' '*.sqlite-shm' -> sem saída
```

O validador efetivo nesta sessão foi a suíte automatizada e os gates locais; nenhuma auditoria Sol
adicional foi executada.

PB-01-03 congelou o manifesto `fixture:pb-01-contract-coverage`, cinco raízes (Knight, Berserk,
Rotworm, Amazon e Orc Shaman), Snake como dependência alcançável, e a política que projeta `knight` e
`elite knight` para `vocation-family:huntbound:knight` sem criar alias de entidade. O source lock real
confirmou os sete paths e hashes esperados no commit Canary `157e6f9e21318bd3033eea553fe9275b429faf72`,
incluindo a licença GPL-2.0-only. As fixtures são sintéticas e nenhum arquivo em `references/` foi
copiado ou versionado.

Evidência fresca de PB-01-03 no commit `1ee75ca4ab43dc1d2ec1b3e8564e8f0d488e222a`:

```text
node tools/content-catalog/source/verifySourceLock.ts ... -> ok: true; files: 7
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts -> 46 passed
corepack pnpm --filter @huntbound/content test -> 7 passed
corepack pnpm --filter @huntbound/content typecheck -> exit 0
corepack pnpm --filter @huntbound/test-fixtures typecheck -> exit 0
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json --noEmit -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check ... -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
git check-ignore references/canary/data/XML/vocations.xml -> ignored
```

PB-01-04 implementou adapters XML puros e seletivos para vocações e itens. Knight é resolvido
exclusivamente pelo source ID `4`; itens aceitam seleção por ID, nome normalizado e um ID concreto
dentro de range sem expandir o catálogo. Diagnósticos bloqueantes cobrem XML malformado, raiz
inválida, ausência, duplicidade, número/range inválido, ambiguidade e atributos/campos fora da
allowlist. O mapping está em `docs/content/CANARY_XML_MAPPING.md`; os adapters não são exportados
pelo entrypoint runtime, não leem filesystem e não mantêm cache global. Fixtures sintéticas foram
mantidas inline nos testes; nenhum XML Canary real foi copiado ou lido pelo adapter.

Evidência fresca de PB-01-04 no commit `530cc31d7d132428346cece9c42b562d7829e219`:

```text
corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml -> 27 passed
corepack pnpm --filter @huntbound/content typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/content docs/content/CANARY_XML_MAPPING.md -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
```

O ciclo RED/GREEN observou falha por adapter ausente antes de cada implementação e terminou com 27
testes passando. O validador efetivo foi a suíte automatizada e os gates locais; não houve gatilho
objetivo para escalonamento a Sol/Claude. PB-01-06 é a próxima task elegível e depende de PB-01-04 e
PB-01-05.

PB-01-05 implementou importadores Lua puros e estritos para Rotworm, Amazon, Orc Shaman, Snake e
Berserk. O limite compartilhado usa `luaparse` com localização, valores estáticos e constantes
allowlisted; os mappers rejeitam statements, chamadas, campos, operadores, funções e índices fora da
whitelist. Dano é normalizado para magnitude positiva, chances de ações viram basis points, loot é
validado na escala Canary, poison permanece declarativo, e a fórmula de Berserk vira coeficientes sem
executar callback. Bestiary e parâmetros de combate sem consumidor são validados e ignorados somente
por allowlist documentada em `docs/content/CANARY_LUA_MAPPING.md`.

Evidência fresca do commit funcional `348dcd8`:

```text
corepack pnpm --filter @huntbound/content test -- src/importers/canary/lua -> 49 passed
corepack pnpm --filter @huntbound/content typecheck -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/content docs/content/CANARY_LUA_MAPPING.md -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
negative production scan -> NO FORBIDDEN PRODUCTION TOKENS
real source-lock smoke test (temporary, not versioned) -> 5 sources accepted; 51 tests passed
```

O ciclo RED/GREEN observou adapters ausentes antes de cada slice, depois cobriu AST, quatro formas
de criatura, poison, summon, loot, elementos, imunidades, Berserk, fórmula e rejeições. A revisão
real também exigiu os constantes Bestiary e os parâmetros `COMBAT_PARAM_BLOCKARMOR`/`USECHARGES`, que
foram adicionados à whitelist sem ampliar o DTO. Nenhum gatilho objetivo para escalonamento a
Sol/Claude ocorreu; o validador efetivo foi a suíte automatizada, o smoke test do source lock e os
gates locais. PB-01-06 é elegível agora.

PB-01-06 materializou o slice curado real por `ImportCanarySlice` e reconstrói o SQLite somente a
partir da operação versionada. A closure final contém as cinco raízes congeladas, Snake como única
dependência de criatura e 27 itens de loot justificados por Rotworm, Amazon e Orc Shaman. Snake tem
facets `identity/stats/appearance/combat/conditions` e loot vazio. Berserk preserva `knight` e
`elite knight` como duas auditorias cruas, projetadas somente para
`vocation-family:huntbound:knight`; Elite Knight não foi materializada.

O catálogo materializado tem 33 entidades, 33 vínculos de slice, 5 raízes, 78 projeções de facet,
29 entradas de loot e 7 arquivos de origem. O runtime não contém provenance, aliases, snapshot,
paths, hashes, auditorias ou referências cruas. O export determinístico tem SHA-256
`d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`. Duas passagens completas dos
comandos de import check, rebuild, validate e generate produziram os mesmos artefatos; reimportação
é no-op por bundle/row counts e falhas de validação preservam rollback.

Evidência fresca de PB-01-06:

```text
corepack pnpm --filter @huntbound/content test -> 53 passed
corepack pnpm exec vitest run --config tools/content-catalog/vitest.config.ts -> 53 passed
corepack pnpm typecheck -> exit 0
corepack pnpm exec tsc --project tools/content-catalog/tsconfig.json --noEmit -> exit 0
corepack pnpm build -> exit 0
corepack pnpm content:check -> exit 0
corepack pnpm architecture:check -> exit 0
corepack pnpm exec biome check packages/content tools/content-catalog tools/architecture package.json -> exit 0
corepack pnpm format:check -> exit 0
git diff --check -> exit 0
node --test tools/architecture/check-boundaries.test.ts tools/architecture/content-boundaries.test.ts -> 13 passed
```

O validador efetivo foi a suíte automatizada e os gates locais; nenhum gatilho objetivo para
escalonamento ocorreu. PB-01-07 é a próxima task elegível.

PB-01-07 auditou o PB-01 integrado em `codex/pb01-07-integrated-gate` com evidência fresca e fechou o
gate como `APPROVED_WITH_WARNINGS`. A auditoria não alterou código, schema, conteúdo ou tooling, e
nenhuma task `PB-01-FIX-01` foi necessária. O relatório completo está em
`artifacts/acceptance-report.md`.

Evidência fresca de PB-01-07:

```text
corepack pnpm install --frozen-lockfile -> exit 0
corepack pnpm content:canary:check -> exit 0
corepack pnpm content:catalog:rebuild -> exit 0
corepack pnpm content:catalog:validate -> exit 0
corepack pnpm content:generate:check -> exit 0
determinismo: JSON/sha256/docs byte-idênticos após rebuild sem cache; golden d9df3338...f3
rebuild/validate/generate sem references/ -> exit 0; content:canary:check sem references/ -> exit 1
provas controladas -> 10/10 (source lock, sexta raiz, loot sem item, rollback, FK, órfão, Lua linha/coluna, idempotência)
auditoria de catálogo -> 12/12 (33 entidades, 5 raízes, 78 facets, 29 loot, 0 órfãos, 0 aliases)
git ls-files references -> sem saída; git check-ignore references/... -> ignored
9 fixtures Lua/XML rastreadas, todas sintéticas; 0 coincidem byte a byte com as 7 fontes do lock
licença GPL-2.0-only, hash 189b1af9...7b confere
corepack pnpm architecture:check -> exit 0 (regra de writer reprova writer extra e volta a 0 após reverter)
corepack pnpm verify -> exit 0
git diff --check -> exit 0; git status --short -> vazio
biome check (paths PB-01, 81 arquivos) -> exit 0; baseline conhecido segue em 1 erro fora do PB-01
```

Modelo/effort efetivos: Claude Code / Opus 5, reasoning alto. Validador independente indisponível
nesta sessão e registrado como warning W1; a skill de rota `game-studio:web-game-foundations` não
está instalada e também foi registrada. PB-01 está `done` e PB-02 é elegível.

## Bloqueios

Nenhum bloqueio conhecido. Warnings não bloqueantes de PB-01-07 (W1 validador independente, W2
lacuna `import("…").Tipo` na regra de writer, W3 `format:check` varre `.cache/`) estão priorizados em
`artifacts/acceptance-report.md`.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos e resultados frescos;
3. registrar decisões duráveis na spec/arquitetura apropriada e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort e validador efetivos;
6. não apagar histórico de falhas ou desvios.
