# PB-01 — Estado operacional

**Playbook:** `docs/playbooks/PB-01/README.md`

**Estado geral:** ready

**Última atualização:** 2026-08-12

**Próxima task elegível:** `PB-01-05`

## Tasks

| ID | Status | Branch | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-01-01 | done | `codex/pb01-01-content-contracts` | `0b465e4c0f2631bf37c1144a2fd7b2de34781a9b` | 22 testes; typecheck; architecture; Biome; format; diff check |
| PB-01-02 | done | `codex/pb01-02-sqlite-catalog` | `429d98a2cfef393918d2e7a1efc8c05565acdf83` | 39 testes; migration/schema; round-trip; constraints; multi-slice; lifecycle; architecture; typecheck; Biome; format; diff check |
| PB-01-03 | done | `codex/pb01-03-curated-slice` | `1ee75ca4ab43dc1d2ec1b3e8564e8f0d488e222a` | 46 testes de tooling; 7 testes de seleção; source lock real; typecheck; architecture; Biome; format; diff check |
| PB-01-04 | done | `codex/pb01-04-xml-importers` | `f1154b5ef52989ed9c3029ab1f57ddcefaef43ad` | 27 testes XML; typecheck; architecture; Biome; format; diff check |
| PB-01-05 | pending | `codex/pb01-05-lua-importers` | — | — |
| PB-01-06 | pending | `codex/pb01-06-materialize-slice` | — | — |
| PB-01-07 | pending | `codex/pb01-07-integrated-gate` | — | — |

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

Evidência fresca de PB-01-04 no commit `f1154b5ef52989ed9c3029ab1f57ddcefaef43ad`:

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
objetivo para escalonamento a Sol/Claude. PB-01-05 é a próxima task elegível; PB-01-06 continua
dependente de PB-01-04 e PB-01-05.

## Bloqueios

Nenhum bloqueio conhecido.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos e resultados frescos;
3. registrar decisões duráveis na spec/arquitetura apropriada e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort e validador efetivos;
6. não apagar histórico de falhas ou desvios.
