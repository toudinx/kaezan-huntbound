# ME-01 — Contrato autoral, compilador e primeira seed

**Status inicial:** pending

**Classe da tarefa:** implementação complexa; congela schema e atravessa conteúdo, assets e tools

**Modelo sugerido:** GPT-5.6 Sol, `xhigh`

**Validador sugerido:** outro modelo frontier, preferencialmente Claude Opus 5 ou Grok 4.6

**Rota:** `superpowers:using-git-worktrees` → `superpowers:test-driven-development` →
`superpowers:verification-before-completion`

**Paralelismo:** não. ME-02 depende do contrato e da seed integrados.

## Objetivo

Criar o formato canônico editável de mapas do Huntbound e o compilador determinístico que o
transforma nos contratos runtime existentes. Materializar a Venore Rotworm Cave nesse formato sem
alterar seu comportamento ou seus artefatos gerados.

Esta é também a prova da fronteira pedida pelo produto: a primeira seed é decidida e produzida pelo
agente de IA; o código automatiza somente validação, compilação e publicação posterior.

## Resultado esperado

- `@huntbound/map-authoring`, puro e browser-safe, contém schema, tipos, diagnósticos, normalização e
  compilação.
- `packages/content/src/layouts/hunts/venore-rotworm-cave.json` passa do recipe v1 para o documento
  autorado v2 com stacks completos por SQM.
- O build da hunt deixa de precisar remontar a geometria a partir do OTBM depois que a seed foi
  criada.
- `region.json`, `transitions.json`, `spawns.json` e `hunt.json` permanecem byte-idênticos aos
  artefatos aprovados na base da task.
- `corepack pnpm map:check -- --map venore-rotworm-cave` valida sem escrever.

## Dependências e pré-condições

1. `main` limpa e com `corepack pnpm verify` verde.
2. A mudança pendente da PB-08-01 sobre a Venore cave foi integrada ou encerrada. A seed deve
   representar o layout vigente, não uma versão arbitrária.
3. `HUNTBOUND_CANARY_SOURCE` resolve para o snapshot local apenas durante a investigação da seed.

Se uma pré-condição falhar, registre o bloqueio em `docs/projects/map-editor/STATE.md` e pare. Não
conserte PB-08, save ou golden dentro desta task.

## Leitura mínima

1. `AGENTS.md`;
2. `docs/projects/map-editor/PLAN.md` e `STATE.md`;
3. `.cursor/rules/10-boundaries.mdc`, `.cursor/rules/20-content.mdc`,
   `.cursor/rules/30-assets.mdc` e `.cursor/rules/50-tests.mdc`;
4. `docs/architecture/PACKAGE_BOUNDARIES.md` e `tools/architecture/dependency-policy.json`;
5. `tools/map-extractor/{layout,extract,region,spawns,transitions,cli}.ts` e testes próximos;
6. `packages/contracts/src/hunt/**`;
7. `packages/assets/src/manifest/{identity,schemas}.ts` e a seleção de assets da hunt;
8. a selection, o layout e os quatro artefatos gerados da Venore Rotworm Cave.

Não carregue ADRs históricos do RME/Godot; eles não dirigem esta implementação.

## Contrato congelado

O schema v2 representa o que o editor realmente altera:

```ts
interface AuthoredMapDocument {
  readonly schemaVersion: 2;
  readonly mapId: string;
  readonly regionId: string;
  readonly regionRevision: number;
  readonly width: number;
  readonly height: number;
  readonly provenance: {
    readonly kind: 'canary-agent-seed';
    readonly selectionId: string;
    readonly canaryRevision: string;
    readonly sourceHashes: Readonly<Record<string, string>>;
  };
  readonly floors: readonly {
    readonly z: number;
    readonly cells: readonly {
      readonly x: number;
      readonly y: number;
      readonly stack: readonly number[]; // clientIds, de baixo para cima
    }[];
  }[];
  readonly playerStart: GridPosition;
  readonly transitions: readonly TransitionEntry[];
  readonly spawnGroups: readonly AuthoredSpawnGroup[];
}
```

Regras:

- coordenadas do documento são locais, inteiras, `0 <= x < width` e `0 <= y < height`;
- `floors`, `cells`, transições e spawns têm ordem canônica explícita;
- um SQM ausente é void; um SQM presente tem stack não vazio e sem `clientId` inválido;
- ground, `objectsBelow`, `objectsAbove`, palette e collision são derivados de `tile-flags.json`;
- player start, origem de transição e spawn precisam cair em SQM caminhável;
- a proveniência guarda IDs/hashes reproduzíveis, nunca path absoluto local;
- validação retorna diagnósticos ordenados com `code`, `severity`, `path` e `message`;
- `compileAuthoredMap(document, tileFlags)` é função pura e não lê filesystem;
- serialização canônica é estável; duas compilações iguais produzem os mesmos bytes.

O executor pode ajustar nomes internos para seguir o padrão do repositório, mas não pode mudar a
semântica acima sem registrar bloqueio.

## Materialização por agente de IA

O agente deve investigar o layout vigente e a evidência Canary, escolher conscientemente cada área,
conexão, borda e ponto funcional e então produzir o documento v2. É permitido usar CLIs read-only e
um serializer task-scoped para evitar transcrição mecânica de milhares de números.

É proibido entregar como produto:

- importador genérico Canary → mapa autorado;
- algoritmo que escolha sozinho o recorte, conectores, paredes ou preenchimento;
- botão/wizard de primeira extração;
- serviço de IA embutido no editor.

O serializer pode escrever a seed aprovada pelo agente; ele não pode sobreviver como caminho
automático para futuros mapas. O commit deve registrar em uma linha quais evidências o agente usou.

## Escopo permitido

- `packages/map-authoring/**`;
- `packages/content/src/layouts/hunts/venore-rotworm-cave.json`;
- `tools/map-extractor/**` e `tools/map-authoring/**` apenas para integrar/compilar o schema v2;
- `tools/architecture/dependency-policy.json` e seus testes;
- `package.json`, `pnpm-lock.yaml` e configs estritamente necessários;
- testes/fixtures novos da task;
- `docs/projects/map-editor/STATE.md` somente para handoff.

Artefatos em `packages/content/src/generated/**` só podem mudar por CLI e, nesta task, o diff final
deles deve ser vazio. Não toque em save, simulação, golden, UI ou `apps/game`.

## Red-green obrigatório

Antes do código de produção, prove pelo menos estes vermelhos:

1. parser rejeita coordenada duplicada, stack vazio, `clientId` desconhecido e ponto funcional em
   SQM bloqueado, com diagnóstico estável;
2. compilador de fixture falha porque ainda não existe e depois produz `MapRegion`, transições e
   spawns esperados;
3. o pipeline atual não aceita um documento v2;
4. um gate de determinismo compara duas serializações independentes.

Não enfraqueça os testes existentes nem regrave golden para fechar a task.

## Passos de implementação

1. Capture hashes dos quatro artefatos gerados vigentes.
2. Crie o package puro, declare sua fronteira e implemente schema/diagnósticos por testes.
3. Implemente normalização, compilação e serialização canônica por testes.
4. Materialize a seed v2 da Venore cave conforme a seção anterior.
5. Faça o map extractor aceitar v2 como fonte canônica e mantenha v1 somente em fixtures se necessário
   para testar erro/migração; não mantenha duas fontes da hunt.
6. Adicione `map:check` read-only e conecte o check ao `content:check`.
7. Regenere pelo CLI, compare hashes e confirme diff vazio nos gerados.
8. Rode todos os gates e faça o ciclo Git completo.

## Verificações exigidas

Com saída fresca:

- testes direcionados de `packages/map-authoring` e `tools/map-extractor`;
- `corepack pnpm map:check -- --map venore-rotworm-cave`;
- `corepack pnpm hunt:extract:check` e `corepack pnpm hunt:extract:sidecar`;
- `corepack pnpm content:check`;
- `corepack pnpm architecture:check`;
- `corepack pnpm assets:pb04:hunt:check`;
- `corepack pnpm hunt:check`;
- `corepack pnpm verify`.

Antes e depois, compute SHA-256 de `region.json`, `transitions.json`, `spawns.json` e `hunt.json`. Os
quatro hashes devem permanecer iguais. Se o layout base mudou legitimamente antes da task, use como
baseline a `main` no início do trabalho e registre os hashes no commit, não em `STATE.md`.

## Critérios de aceite

- [ ] Schema v2 e API pública possuem testes de tipo e runtime.
- [ ] Package não importa Phaser, DOM, Node, filesystem nem dependência externa.
- [ ] Seed v2 foi materializada pelo agente com proveniência reproduzível.
- [ ] Não existe caminho automático de primeira extração.
- [ ] Compilação é determinística e os quatro artefatos permanecem byte-idênticos.
- [ ] `map:check` é read-only e participa de `content:check`.
- [ ] `verify` verde no commit integrado.
- [ ] `STATE.md`, integração fast-forward e limpeza concluídos.

## Condições de parada

Pare após dois ciclos RED/GREEN com a mesma causa ou se for necessário mudar contratos runtime,
save/golden, identidade de asset ou a decisão de extração por agente. Preserve branch/worktree e
registre evidência objetiva em `STATE.md`.

## Handoff, commit e integração

- Branch: `codex/map-editor-01-authoring-contract`
- Worktree: `C:\Kaezan\kaezan-huntbound-map-editor-01-authoring-contract`
- Commit: `feat: define the authored Huntbound map format`
- Base e destino: `main`
- Integração: `git merge --ff-only codex/map-editor-01-authoring-contract`
- Pós-integração: `corepack pnpm verify`
- Limpeza: remover a worktree validada, `git worktree prune` e
  `git branch -d codex/map-editor-01-authoring-contract`.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound usando GPT-5.6 Sol com effort xhigh.

Execute integralmente e somente a task:
docs/projects/map-editor/tasks/ME-01-authoring-contract-and-compiler.md

Use, nesta ordem, as skills superpowers:using-git-worktrees,
superpowers:test-driven-development e superpowers:verification-before-completion. Leia o AGENTS.md,
o PLAN/STATE do projeto Map Editor e somente a leitura adicional indicada na task. Inspecione o
estado real, prove a linha de base e não comece se a main estiver vermelha. Confirme que o layout
integrado em `c23c819` continua sendo a base da seed.

A primeira seed da Venore cave deve ser materializada por você como agente de IA após investigar o
Canary e o layout vigente. Não crie importador automático, wizard ou botão Canary → mapa. Implemente
somente o contrato autoral, compilador, map:check e a seed previstos; preserve byte a byte os quatro
artefatos runtime.

Faça red-green, rode todas as verificações da task, atualize somente a linha/bloco necessário do
STATE.md e crie o commit `feat: define the authored Huntbound map format`. Integre por fast-forward
na main, repita `corepack pnpm verify`, remova a worktree e a branch integradas. Não inicie ME-02.
Se uma condição de parada ocorrer, preserve o trabalho, registre o bloqueio e relate a evidência.
```
