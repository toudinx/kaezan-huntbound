# PB-04-06 — Design de cenário e replay da hunt

**Data:** 2026-08-14  
**Status:** aprovado por delegação do usuário; implementação parcial até a região real ficar disponível

## Contexto

PB-04-06 precisa traduzir a `HuntDefinition` congelada em um `KernelScenario` v3, validar a
fronteira conteúdo/kernel e congelar a sessão `pb-04-hunt-session`. O checkout atual tem os
contratos v3, o kernel multi-floor/spawn e as ferramentas de replay, mas não tem a região gerada
de `venore-rotworm-cave`. O handoff de PB-04-04 registra que o mapa que cobre a seleção não está
no snapshot local. Portanto, o cenário real e o golden de 600 ticks não podem ser produzidos sem
inventar dados ou reabrir a seleção, ambos fora do escopo.

## Abordagens consideradas

1. **Tradução estrita e bloqueio do golden real (escolhida).** Implementa e testa o builder e o
   loader com uma hunt sintética; espera a região congelada para gerar o fixture real. Preserva a
   proveniência e a regra de que golden divergente nunca é ajustado para passar.
2. **Fixture sintético no lugar da hunt real.** Permitiria criar `hunt:check` imediatamente, mas
   faria o gate afirmar uma prova sobre uma geometria que não é a Venore congelada.
3. **Trocar/reselecionar o mapa.** Permitiria extrair outra região, mas alteraria a seleção aprovada
   e exigiria reabrir PB-04-01; não é uma decisão local de PB-04-06.

## Design aprovado

### Fronteira e componentes

- `packages/content/src/hunts/buildHuntScenario.ts` expõe `buildHuntScenario(hunt, seed)`.
- `packages/content/src/hunts/loadHuntDefinition.ts` expõe `loadHuntDefinition(raw)` para validar
  JSON desconhecido sem permitir que objetos de conteúdo vazem para o cenário.
- `packages/content/src/hunts/index.ts` e `packages/content/src/index.ts` reexportam as interfaces.
- O builder usa apenas tipos/validadores de `@huntbound/contracts`; não adiciona dependência ao
  kernel e não importa `@huntbound/simulation`.

### Tradução determinística

1. Validar a entrada com `validateHuntDefinition`; retornar os diagnósticos ordenados em caso de
   falha.
2. Derivar `scenarioId` como `scenario:${hunt.huntId}`. A derivação é puramente textual e
   documentada; `scenarioRevision` recebe `hunt.huntRevision`.
3. Para cada andar, converter cada índice de colisão `i` em `[i % width, floor(i / width)]`,
   preservando a ordem canônica já validada.
4. Copiar `transitions.entries`, `spawns.groups` e os blueprints para os campos v3. Cada slot de
   spawn vira `{ blueprintId, position: center + offset, respawnTicks }`; `creatureKey` não é
   copiado.
5. Criar um único `initialActor` para o jogador, com `playerBlueprintId`, `playerStart` e facing
   inicial `s`.
6. Validar o objeto resultante com `validateKernelScenario` antes de retorná-lo. Assim, qualquer
   inconsistência derivada vira diagnóstico, nunca um cenário parcialmente válido.

O parâmetro `seed` permanece explicitamente fora do cenário: seed é parte do cabeçalho do command
log e do snapshot do replay, enquanto `KernelScenario` v3 não contém seed. A função o recebe para
manter a interface de composição congelada; a saída é independente do seed.

### Loader e erros

`loadHuntDefinition` aceita `unknown`. Para texto JSON, a composição root faz `JSON.parse` antes de
chamar o loader; o loader também aceita objetos já parseados. JSON inválido ou uma entrada que falha
`validateHuntDefinition` devolve `SimulationValidationResult` com `SIM_SCHEMA_INVALID`/diagnósticos
de hunt, sem lançar erro de domínio.

### Testes

Os testes sintéticos usam uma região 4×4 com dois andares e verificam: colisão row-major,
transições e ordem, offsets/raio/slots/respawn, jogador inicial, validação v3, determinismo do
`scenarioId`, ausência textual de `palette`, `serverId`, `clientId`, `creatureKey` e `regionId`, e
blueprint ausente retornado como diagnóstico.

O replay golden, a cobertura do command log, a varredura de retomada `0..600`, os quatro hashes e o
gate `hunt:check` só serão adicionados quando o `hunt.json` real gerado por PB-04-04 estiver
presente. Nesse momento, a etapa usará `buildReplayArtifacts`/`tools/replay` inalterados e será
verificada contra a sessão congelada, sem reescrever goldens divergentes.

## Critério de transição para a etapa bloqueada

Quando existir `packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json` validado e
versionado, gerar `scenario.json`, `commands.jsonl`, `snapshot.golden.json`, `events.golden.jsonl`
e os quatro sidecars em `packages/test-fixtures/hunt/pb04/`, atualizar `REPLAY_CONTRACT.md`,
adicionar `hunt:check` depois de `simulation:check` em `check`/`verify`, e fechar o handoff em
`STATE.md`. Nenhum desses artefatos será substituído por uma versão sintética.
