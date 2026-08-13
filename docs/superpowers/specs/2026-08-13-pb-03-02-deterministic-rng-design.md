# PB-03-02 — RNG determinístico (design)

## Objetivo

Implementar a única fonte de aleatoriedade de `@huntbound/simulation` sem depender de relógio,
estado global ou biblioteca externa. A API deve reproduzir a sequência entre Node e browser,
serializar o ponto exato de consumo e manter streams nomeados independentes.

## Decisões

- O PRNG público é `xoshiro128**`, com todas as palavras normalizadas para `Uint32` por `>>> 0` e
  multiplicações por `Math.imul`.
- A seed pública continua sendo o brand `Seed`: exatamente 16 dígitos hexadecimais minúsculos. Os
  oito dígitos superiores e inferiores são expandidos por dois mixers SplitMix32 independentes,
  produzindo quatro palavras internas (`s0` e `s2` a partir da metade superior; `s1` e `s3` a partir
  da metade inferior). Essa regra usa os 64 bits sem `BigInt` e é fixa para os vetores golden.
- SplitMix32 avança por `0x9e3779b9` e aplica os finalizadores `0x21f0aaad` e `0x735a2d97`, sempre
  com `Math.imul` e aritmética unsigned.
- `createSeededRandom(seed, label)` expande a seed para um estado raiz e aplica a mesma função de
  derivação usada por `derive(label)`. Assim, labels diferentes da mesma seed não compartilham a
  sequência inicial.
- `derive(label)` calcula FNV-1a 32 sobre o label kebab-case, mistura o hash com cada palavra do
  estado pai por SplitMix32 e cria um novo stream com `drawCount = 0`; o pai não é consumido.
- `nextUint32()` é a única operação que avança xoshiro e incrementa `drawCount`. `nextBelow(bound)`
  aceita inteiros de `1` a `2^32`, descarta a faixa excedente antes do módulo e conta também os
  valores descartados.
- Estado zero é rejeitado ao restaurar. A expansão e a derivação avançam o mixer até obter pelo
  menos uma palavra diferente de zero, evitando o estado absorvente do xoshiro.
- `createKernelRandomStreams` expõe apenas `movement`, `ai` e `scenario`. A restauração exige uma
  ocorrência de cada label e rejeita labels extras; `serialize()` ordena os três estados por label.

## Organização

| Arquivo | Responsabilidade |
| --- | --- |
| `packages/simulation/src/random/prng.ts` | operações puras de SplitMix32, FNV-1a, expansão, deriva e xoshiro |
| `packages/simulation/src/random/source.ts` | objeto `RandomSource`, validação leve, draws, rejeição e serialização |
| `packages/simulation/src/random/streams.ts` | agregador dos três streams congelados e restauração canônica |
| `packages/simulation/src/random/index.ts` | superfície pública do submódulo |
| `packages/simulation/src/random/random.test.ts` | testes comportamentais, rejeição e vetores golden |

`packages/simulation/src/index.ts` reexporta `random/index.ts`. Os brands e `RandomStreamState` são
consumidos de `@huntbound/contracts`; o manifesto declara somente essa dependência interna permitida.

## Fluxo e erros

As factories validam a forma da seed, do label, do estado uint32, do contador e do bound em runtime
com helpers locais, sem importar Zod. Entrada inválida lança `TypeError` ou `RangeError` com mensagem
estável o suficiente para diagnóstico; não há fallback silencioso. A restauração dos streams valida
labels duplicados, ausentes e desconhecidos antes de criar qualquer stream.

## Verificação

Os testes demonstram reprodutibilidade, divergência entre seeds, inteiros no domínio uint32,
continuidade após restore, isolamento de derivações, contador incluindo rejeições, rejeição de bounds
inválidos, distribuição fixa em bound 6 e oito valores golden para cada stream da seed
`0f1e2d3c4b5a6978`. Os gates da task são o teste e typecheck de `@huntbound/simulation`,
`architecture:check`, Biome, `format:check` e `git diff --check`.

Trocar qualquer constante, ordem de mistura ou regra de rejeição altera a sequência observável e
exige incremento de `SIMULATION_RULES_VERSION` junto com regeneração explícita dos goldens.
