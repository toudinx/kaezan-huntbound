# PB-03-02 — Implementar RNG determinístico

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — algoritmo e formato congelados na spec

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; escalonamento somente por gatilho objetivo registrado

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** sim, com PB-03-03 e PB-03-04 após PB-03-01, somente por ativação do supervisor.
Paths funcionais disjuntos: esta task só toca `packages/simulation/src/random/**`.

## Objetivo

Implementar em `@huntbound/simulation` a única fonte de aleatoriedade do kernel: PRNG xoshiro128\*\*
seedado por SplitMix32, streams nomeados derivados por rótulo, estado serializável e amostragem sem
viés. Não implementar grid, comandos, loop nem snapshot.

## Resultado esperado

`createSeededRandom(seed)` e `derive(label)` produzem sequências reproduzíveis e independentes,
serializáveis em inteiros de 32 bits, com `drawCount` auditável. Os primeiros valores de cada stream
ficam congelados como vetores golden no próprio teste.

## Dependências

- PB-03-01 `done` e integrado em `main`.
- Tipos `Seed`, `StreamLabel` e `RandomStreamState` disponíveis em `@huntbound/contracts`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-03/STATE.md`;
3. `docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`, seção “Aleatoriedade”;
4. `docs/simulation/KERNEL_CONTRACT.md`;
5. `packages/simulation/package.json`, `tsconfig.json` e `src/index.ts`;
6. `packages/contracts/src/simulation/**` apenas para os tipos consumidos.

## Decisões congeladas

- Algoritmo: xoshiro128\*\* com aritmética `Uint32` (`>>> 0`, `Math.imul`, rotações explícitas).
- Seeding: SplitMix32 a partir dos 64 bits da seed hex, gerando `s0..s3`; se as quatro palavras
  resultarem zero, o seeding continua avançando até obter estado não nulo.
- Derivação: `derive(label)` mistura FNV-1a 32 do rótulo com `s0..s3` do pai por SplitMix32 e **não
  avança o pai**. Mesmo rótulo sobre o mesmo estado sempre produz o mesmo stream.
- `nextUint32()` é a única primitiva; `nextBelow(bound)` usa rejeição para eliminar viés de módulo.
- `drawCount` conta chamadas a `nextUint32()`, inclusive as descartadas por rejeição.
- Streams congelados neste playbook: `movement`, `ai`, `scenario`.
- Proibido: `Math.random`, `crypto`, `BigInt`, `Date`, `performance`, timers, dependência externa.
- Nenhum float em estado ou saída. `nextBelow` retorna inteiro em `[0, bound)`.

## Escopo permitido

```text
packages/simulation/src/random/**
packages/simulation/src/index.ts
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-03/STATE.md
```

## Fora de escopo

- grid, comandos, eventos, loop de tick, snapshot, replay;
- CLI, fixtures versionadas, app, browser;
- alterar contratos de PB-03-01 sem defeito reproduzido;
- qualquer helper genérico de random compartilhado com outros pacotes.

## Interfaces produzidas

```ts
export interface RandomSource {
  readonly label: StreamLabel;
  readonly drawCount: number;
  nextUint32(): number;
  nextBelow(bound: number): number;
  derive(label: StreamLabel): RandomSource;
  serialize(): RandomStreamState;
}

export function createSeededRandom(seed: Seed, label: StreamLabel): RandomSource;
export function restoreSeededRandom(state: RandomStreamState): RandomSource;
export function createKernelRandomStreams(seed: Seed): KernelRandomStreams;
export function restoreKernelRandomStreams(
  states: readonly RandomStreamState[],
): KernelRandomStreams;

export interface KernelRandomStreams {
  readonly movement: RandomSource;
  readonly ai: RandomSource;
  readonly scenario: RandomSource;
  serialize(): readonly RandomStreamState[];
}
```

`serialize()` de `KernelRandomStreams` devolve os três estados ordenados por `label`.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree isolada.**

```powershell
git status --porcelain=v1 --untracked-files=all
git branch codex/pb03-02-kernel-random main
git worktree add C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random codex/pb03-02-kernel-random
```

- [ ] **2. Escrever testes RED de primitiva e reprodutibilidade.**

Prove: mesma seed produz a mesma sequência; seeds diferentes divergem em menos de 10 valores;
todo valor está em `[0, 2^32)` e é inteiro; `drawCount` acompanha as chamadas; restore por
`serialize()` continua a sequência exatamente do ponto salvo.

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random --filter @huntbound/simulation test
```

Esperado: RED por módulo ausente.

- [ ] **3. Implementar SplitMix32, xoshiro128\*\* e serialização; obter GREEN.**

Use `Math.imul` e `>>> 0` em toda multiplicação e soma. Não use `BigInt`.

- [ ] **4. Escrever testes RED de derivação e isolamento.**

Prove: `derive('movement')` e `derive('ai')` do mesmo pai divergem; derivar duas vezes o mesmo rótulo
do mesmo estado dá streams idênticos; derivar não altera o `drawCount` nem a sequência do pai;
consumir um stream não desloca os outros.

- [ ] **5. Implementar derivação por FNV-1a 32 + SplitMix32; obter GREEN.**

- [ ] **6. Escrever testes RED de amostragem sem viés.**

Prove: `nextBelow(1)` é sempre 0; `nextBelow(0)` e bound negativo/não inteiro lançam; para um bound
não potência de dois (por exemplo 6), a distribuição sobre um número fixo e grande de amostras tem
todas as faces presentes e desvio dentro de uma tolerância declarada no teste; a rejeição é visível
no `drawCount` em um caso construído.

- [ ] **7. Implementar `nextBelow` por rejeição; obter GREEN.**

- [ ] **8. Congelar vetores golden.**

Registre no teste os primeiros oito valores de cada stream (`movement`, `ai`, `scenario`) para a seed
`0f1e2d3c4b5a6978`, como literais. Esses vetores são contrato: mudá-los exige bump de
`SIMULATION_RULES_VERSION` e justificativa no handoff.

- [ ] **9. Documentar e exportar.**

Acrescente a `docs/simulation/KERNEL_CONTRACT.md` a seção de RNG: algoritmo, seeding, derivação,
formato serializado, semântica de `drawCount` e a regra de que trocar o algoritmo é mudança de
regras.

- [ ] **10. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random --filter @huntbound/simulation typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random exec biome check packages/simulation
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random format:check
git -C C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random diff --check
```

- [ ] **11. Atualizar handoff e commitar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random add packages/simulation docs/simulation/KERNEL_CONTRACT.md docs/playbooks/PB-03/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random commit -m "feat: seed deterministic kernel randomness"
```

Em modo paralelo, não edite `STATE.md`: registre a evidência no relatório final e deixe PB-03-05
consolidar o handoff.

- [ ] **12. Integrar e limpar.**

Modo serial:

```powershell
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb03-02-kernel-random
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb03-02-kernel-random
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb03-02-kernel-random
```

Modo paralelo: remova a worktree limpa após o commit, preserve a branch para PB-03-05 e não faça
fast-forward em `main`.

## Critérios de aceite

- [ ] Mesma seed e mesmo rótulo reproduzem a sequência exatamente, inclusive após restore.
- [ ] Streams derivados são independentes e não deslocam o pai.
- [ ] `nextBelow` é inteiro, sem viés de módulo, e rejeita bound inválido.
- [ ] `drawCount` é serializado e reflete todas as extrações, inclusive as rejeitadas.
- [ ] Vetores golden dos três streams estão congelados em teste.
- [ ] `packages/simulation` continua sem dependência externa, sem Node, DOM, `Math.random`, `Date`,
      `performance`, timers, `crypto` ou `BigInt`.
- [ ] Docs, commit, integração e limpeza no modo declarado estão completos.

## Condições de parada

Pare se o algoritmo congelado não produzir estado não nulo para alguma seed válida, se for necessário
`BigInt` para correção, ou se surgir demanda por stream fora dos três congelados.

## Persistência e relatório final

Registre vetores golden, contagem de testes, comandos/exit codes, modelo/effort, modo de conclusão e
a próxima task elegível. Não implemente grid, comandos ou loop.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna e effort xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-03\tasks\PB-03-02-implementar-rng-deterministico.md

Leia o STATE.md do playbook PB-03 e apenas os arquivos indicados pela task. Crie a branch/worktree
indicada, comece por RED e implemente apenas packages/simulation/src/random. Congele os vetores
golden dos três streams. Execute todos os gates, atualize o handoff conforme o modo declarado,
commite, integre por fast-forward na main no modo serial, reverifique e remova worktree/branch.

Não implemente grid, comandos, eventos, loop de tick, snapshot, replay, CLI ou app. Se surgir decisão
não coberta, pare e registre o bloqueio. Não inicie a próxima task.
```
