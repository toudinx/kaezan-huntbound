# PB-03-02 — RNG determinístico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (recommended) to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Entregar PRNG xoshiro128**, streams nomeados, serialização/restauração e amostragem sem viés em \`@huntbound/simulation\`.

**Architecture:** Operações aritméticas puras ficam em \`random/prng.ts\`; \`random/source.ts\` encapsula estado e semântica de draws; \`random/streams.ts\` agrega os três labels congelados. A API pública é reexportada pelo pacote, usando apenas os tipos de \`@huntbound/contracts\`.

**Tech Stack:** TypeScript strict ES2022 sem DOM, Vitest 4, Biome 2, pnpm/Corepack.

## Global Constraints

- Algoritmo: xoshiro128** com aritmética \`Uint32\` (\`>>>\`, \`Math.imul\`, rotações explícitas).
- Seeding: seed lowercase hexadecimal de 16 caracteres, expandida sem \`BigInt\`, \`crypto\`, relógio ou aleatoriedade global.
- Derivação: FNV-1a 32 + SplitMix32, sem avançar o pai.
- \`nextBelow(bound)\` usa rejeição e conta draws descartados.
- Streams públicos fechados: \`movement\`, \`ai\`, \`scenario\`.
- \`packages/simulation\` não importa Node, DOM ou pacote externo além de \`@huntbound/contracts\`.
- Escopo funcional: \`packages/simulation/src/random/**\`, \`packages/simulation/src/index.ts\`, documentação de contrato e manifesto/lockfile necessários.

---

### Task 1: Criar a suíte RED do RNG

**Files:**
- Create: \`packages/simulation/src/random/random.test.ts\`
- Modify: \`packages/simulation/src/index.ts\` (somente quando a API for implementada; o teste importa do submódulo inicialmente)

**Interfaces:**
- Consumes: \`Seed\`, \`StreamLabel\`, \`RandomStreamState\` de \`@huntbound/contracts\`.
- Produces: comportamentos que a implementação deve satisfazer.

- [ ] **Step 1: Escrever testes de reprodução, domínio, contagem e restore**

Criar testes Vitest que chamem \`createSeededRandom(seed, label)\`, comparem duas execuções da mesma seed/label, verifiquem que todos os valores de uma amostra são inteiros em \`[0, 0x1_0000_0000)\`, comparem seeds diferentes em no máximo 10 posições coincidentes e validem continuidade após \`serialize()\` + \`restoreSeededRandom()\`.

- [ ] **Step 2: Escrever testes de derive e isolamento**

Cobrir: labels \`movement\`/\`ai\` divergem; derivar o mesmo label duas vezes do mesmo estado dá estados iguais; derivar não altera \`drawCount\` nem a sequência do pai; consumir uma stream não altera as outras.

- [ ] **Step 3: Escrever testes de nextBelow e inputs inválidos**

Cobrir \`nextBelow(1) === 0\`, limites não inteiros/negativos/zero/maiores que \`2^32\` lançam, bound 6 produz todas as faces e contagens próximas após 60.000 amostras, e o caso de rejeição incrementa \`drawCount\` além do número de resultados retornados.

- [ ] **Step 4: Escrever testes de agregador e vetores golden**

Cobrir criação/restauração de exatamente os três streams, ordem canônica dos estados, rejeição de labels ausentes/extras/duplicados, e oito valores literais por stream para a seed \`0f1e2d3c4b5a6978\`.

- [ ] **Step 5: Rodar a suíte e confirmar RED**

Run: \`corepack pnpm --filter @huntbound/simulation test\`

Expected: FAIL porque \`packages/simulation/src/random/index.ts\` e as factories ainda não existem.

### Task 2: Implementar operações puras do PRNG

**Files:**
- Create: \`packages/simulation/src/random/prng.ts\`

**Interfaces:**
- Consumes: seed e label validados pela camada source.
- Produces: estado inicial, estado derivado e próximo estado xoshiro para a camada source.

- [ ] **Step 1: Implementar helpers unsigned**

Implementar \`rotateLeft(value, shift)\`, \`splitMix32Next(state)\` com incremento \`0x9e3779b9\`, FNV-1a 32 e parse de dois halves hexadecimais para palavras unsigned. Toda operação deve terminar com \`>>> 0\`; multiplicações devem usar \`Math.imul\`.

- [ ] **Step 2: Implementar expansão e derivação**

Produzir quatro palavras não nulas em estado por dois mixers independentes sobre as metades de 32 bits da seed. Para derivação, misturar hash do label com \`s0..s3\` sem mutar o pai e substituir o estado zero se necessário.

- [ ] **Step 3: Implementar xoshiro128\*\***

Implementar a transição oficial:

~~~
result = rotl(Math.imul(s1, 5), 7) * 9
t = s1 << 9
s2 ^= s0
s3 ^= s1
s1 ^= s2
s0 ^= s3
s2 ^= t
s3 = rotl(s3, 11)
~~~

Retornar o resultado unsigned e o novo estado.

- [ ] **Step 4: Rodar typecheck focal**

Run: \`corepack pnpm --filter @huntbound/simulation typecheck\`

Expected: ainda pode falhar nos imports da API até a Task 3; nenhum erro deve existir em \`prng.ts\`.

### Task 3: Implementar source, streams e exportações

**Files:**
- Create: \`packages/simulation/src/random/source.ts\`
- Create: \`packages/simulation/src/random/streams.ts\`
- Create: \`packages/simulation/src/random/index.ts\`
- Modify: \`packages/simulation/src/index.ts\`
- Modify: \`packages/simulation/package.json\`
- Modify: \`pnpm-lock.yaml\`

**Interfaces:**
- Produces:

~~~
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
export interface KernelRandomStreams {
  readonly movement: RandomSource;
  readonly ai: RandomSource;
  readonly scenario: RandomSource;
  serialize(): readonly RandomStreamState[];
}
export function createKernelRandomStreams(seed: Seed): KernelRandomStreams;
export function restoreKernelRandomStreams(states: readonly RandomStreamState[]): KernelRandomStreams;
~~~

- [ ] **Step 1: Implementar validação local**

Validar seed com regex lowercase 16 hex, label kebab-case, cada estado entre 0 e \`0xffffffff\`, contador inteiro não negativo e estado não zero. Lançar \`TypeError\` para shape/tipo e \`RangeError\` para faixa.

- [ ] **Step 2: Implementar RandomSource**

Manter \`s0..s3\` e \`drawCount\` privados no closure. \`nextUint32\` chama a transição e incrementa exatamente uma vez; \`serialize\` retorna novo objeto; \`derive\` usa snapshot atual e preserva o pai.

- [ ] **Step 3: Implementar rejeição de nextBelow**

Para \`bound <= 0x1_0000_0000\`, calcular \`limit = floor(2^32 / bound) * bound\`; puxar uint32 até valor menor que limit e retornar \`value % bound\`. Tratar \`bound = 2^32\` como retorno direto sem perda de precisão.

- [ ] **Step 4: Implementar KernelRandomStreams**

Criar os labels congelados, serializar em ordem \`ai\`, \`movement\`, \`scenario\`, e restaurar rejeitando duplicatas, labels extras e estados ausentes.

- [ ] **Step 5: Exportar e declarar dependência interna**

Reexportar \`random/index.ts\` no entrypoint e declarar \`"@huntbound/contracts": "workspace:*"\` no manifesto. Atualizar somente o importante entry correspondente no lockfile via Corepack/pnpm.

- [ ] **Step 6: Rodar testes GREEN**

Run: \`corepack pnpm --filter @huntbound/simulation test\`

Expected: PASS, incluindo os vetores golden e os testes de rejeição.

### Task 4: Atualizar contrato e executar gates

**Files:**
- Modify: \`docs/simulation/KERNEL_CONTRACT.md\`

- [ ] **Step 1: Documentar RNG**

Adicionar seção após Snapshot com algoritmo xoshiro128**, SplitMix32, FNV-1a, seeding sem BigInt, deriva sem consumo do pai, estado serializado, drawCount e rejeição de bound. Registrar que trocar a sequência exige bump de \`SIMULATION_RULES_VERSION\`.

- [ ] **Step 2: Rodar todos os gates da task**

Run:

~~~
corepack pnpm --filter @huntbound/simulation test
corepack pnpm --filter @huntbound/simulation typecheck
corepack pnpm architecture:check
corepack pnpm exec biome check packages/simulation
corepack pnpm format:check
git diff --check
~~~

Expected: todos os comandos terminam com exit code 0.

- [ ] **Step 3: Revisar diff e escopo**

Confirmar que não há \`Math.random\`, \`BigInt\`, \`Date\`, \`performance\`, timers, \`crypto\), imports Node/DOM ou arquivos fora do escopo funcional.

- [ ] **Step 4: Commit**

~~~
git add packages/simulation pnpm-lock.yaml docs/simulation/KERNEL_CONTRACT.md
git commit -m "feat: seed deterministic kernel randomness"
~~~
