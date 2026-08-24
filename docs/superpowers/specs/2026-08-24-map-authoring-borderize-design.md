# MB-02 — desenho de `map-authoring` e `borderize`

**Status:** aprovado em conversa em 2026-08-24

## Objetivo

Criar `@huntbound/map-authoring`, um package TypeScript puro e browser-safe que transforma uma
grade autoral em uma nova grade com vazios preenchidos e bordas de massa escolhidas pela tabela
medida do MB-01. A mesma função será consumida por uma CLI futura e pelo editor local, sem depender
de filesystem, OTBM, Phaser ou estado global.

## Contrato público

O package expõe `borderize(grid, tables, seed)` e os tipos da entrada:

```ts
export interface AuthoringCell {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ground: number | null;
}

export interface AuthoringGrid {
  readonly layoutId: string;
  readonly cells: readonly AuthoringCell[];
}

export interface WeightedGround {
  readonly serverId: number;
  readonly weight: number;
}

export interface MaterialBorderCase {
  readonly count: number;
  readonly serverId: number;
  readonly signature: number;
}

export interface MaterialTable {
  readonly key: string;
  readonly serverIds: readonly number[];
  readonly cases: readonly MaterialBorderCase[];
}

export interface BorderizeTables {
  readonly materials: readonly MaterialTable[];
  readonly floorMaterialKeys: readonly string[];
  readonly massMaterialKey: string;
  readonly borderMaterialKey: string;
  readonly massDominantServerId: number;
  readonly massVariants: readonly WeightedGround[];
}

export type BorderizeSeed = string | number;

export function borderize(
  grid: AuthoringGrid,
  tables: BorderizeTables,
  seed: BorderizeSeed,
): AuthoringGrid;
```

`material-borders.json` continua sendo o artefato do MB-01. O descritor explícito em
`BorderizeTables` liga as quatro tabelas medidas aos papéis de authoring e carrega os pesos que o
artefato de mineração não precisa persistir. `massVariants` deve incluir a massa dominante e os
demais ids com pesos inteiros positivos; a seleção usa soma cumulativa. Uma tabela inválida é erro
de contrato de chamada. Uma assinatura não observada é um caso válido e usa
`massDominantServerId`.

## Regras de transformação

1. `ground === 0` ou `ground === null` significa célula vazia e recebe um id de `massVariants`.
2. Um piso é qualquer id pertencente a uma tabela cuja chave está em `floorMaterialKeys`. Pisos
   nunca são alterados.
3. Uma massa é qualquer id pertencente à tabela `massMaterialKey`. Massa sem piso vizinho permanece
   igual.
4. Massa com pelo menos um piso nos oito vizinhos recebe `borderMaterialKey.cases[signature]`.
   Quando a assinatura não está na tabela, recebe `massDominantServerId`.
5. A assinatura usa os bits baixos na ordem N, NE, E, SE, S, SW, W, NW. O bit é `1` quando o
   vizinho pertence à mesma massa do centro; posições fora da grade contam como diferentes.
6. Todas as classificações e assinaturas usam a grade original. O resultado nunca influencia uma
   célula posterior.
7. A variação de massa usa um hash inteiro de `seed`, `layoutId`, `x`, `y` e `z`. O mesmo ponto
   produz o mesmo id em qualquer ordem de iteração. O resultado é retornado em ordem canônica
   `z`, depois `y`, depois `x`, para tornar a independência de ordem observável por comparação
   direta.
8. A entrada não é mutada; campos de identidade da grade são preservados.

## Organização e fronteiras

- `packages/map-authoring/package.json`: manifesto, dependência única em
  `@huntbound/contracts` e scripts de teste/typecheck/build.
- `packages/map-authoring/tsconfig.json`: herda a base e fixa `lib: ["ES2022"]` para manter a
  implementação sem DOM.
- `packages/map-authoring/src/types.ts`: tipos públicos e constantes do contrato.
- `packages/map-authoring/src/hash.ts`: hash de coordenada e seleção ponderada, sem APIs globais
  de tempo ou aleatoriedade.
- `packages/map-authoring/src/signature.ts`: vizinhança e assinatura de oito bits.
- `packages/map-authoring/src/borderize.ts`: normalização, classificação, transformação pura e
  ordenação canônica.
- `packages/map-authoring/src/index.ts`: superfície pública.
- `packages/map-authoring/src/borderize.test.ts`: grids sintéticos e provas de comportamento.
- `tools/architecture/dependency-policy.json`: entrada de `@huntbound/map-authoring` permitindo
  somente `@huntbound/contracts`.

O package não importa tipos de `tools/map-materials`, pois aquele tool é Node e não pode vazar para
o browser. Os tipos serializáveis são deliberadamente equivalentes apenas ao subconjunto da tabela
necessário ao algoritmo.

## Erros e invariantes

O algoritmo rejeita apenas contrato estrutural impossível: material referenciado ausente, ids
duplicados entre materiais, peso não inteiro positivo, assinatura fora de `0..255`, coordenada
duplicada ou campo numérico inseguro. Não rejeita assinatura ausente: fallback para massa dominante é
parte do contrato.

O teste de fronteira arquitetural cria um workspace temporário com um import `node:fs` no novo
package e prova que `architecture:check` o reprova; o código real não contém Node, DOM, Phaser,
`Math.random()` ou `Date.now()`.

## Verificação

O ciclo TDD cobre, em testes pequenos e legíveis:

- preenchimento de vazio;
- seleção da peça para piso ao norte;
- fallback de assinatura ausente;
- preservação de piso;
- repetição da mesma coordenada e distribuição de pesos em várias coordenadas;
- independência da ordem da entrada;
- não mutação da grade;
- package novo incluído na policy e `architecture:check` verde.

Os gates exigidos pela task são os testes direcionados, `corepack pnpm typecheck`,
`corepack pnpm architecture:check`, `corepack pnpm test` e `corepack pnpm verify`.
