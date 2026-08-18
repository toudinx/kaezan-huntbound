# Roteiro para os playbooks de implementação

**Status:** pronto para decomposição em planos executáveis  
**Fontes normativas:** `05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` e
`07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`  
**Stack:** Phaser 4 + TypeScript strict + Vite + DOM/CSS + IndexedDB

Este documento não é um plano de implementação detalhado. Ele congela a ordem, as fronteiras e a
Definition of Ready para que cada playbook posterior seja testável e revisável de forma
independente. A decomposição em prompts/chats segue obrigatoriamente
`07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`: tasks são separadas por fronteira de problema, sem limite
artificial de arquivos.

## Regras para escrever cada playbook

Antes de criar qualquer playbook, o autor deve ler `07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md` e gerar
um índice, um estado persistente e task cards executáveis em chats independentes. Cada task pode ser
entregue a um agente ou modelo diferente.

Cada playbook deve:

- entregar software executável e verificável por conta própria;
- listar paths exatos de arquivos que cria, modifica e testa;
- começar por teste falhando, implementar o mínimo e terminar com verificação fresca;
- preservar simulação fora de Phaser e UI densa fora do canvas;
- usar apenas conteúdo presente no snapshot local congelado;
- incluir fixture mínima, golden hash ou screenshot quando aplicável;
- não antecipar sistemas de playbooks posteriores;
- **terminar jogável**: `corepack pnpm verify` verde e `corepack pnpm dev` de pé, para que o aceite
  seja o usuário jogando.

**Revisão de processo de 2026-08-18.** Três regras mudaram depois de o fluxo travar entre PB-05 e
PB-06 por motivo puramente documental:

1. **Escreva duas tasks à frente, não o playbook inteiro.** Spec congelada, `README.md` completo e as
   duas primeiras task cards. O resto fica como bullets até chegar a vez.
2. **Nenhum playbook espera o fechamento formal de outro.** A dependência real é código integrado na
   `main` com `verify` verde, verificável por `git log` e por gate fresco.
3. **Orçamento de tempo não bloqueia merge.** `boot-budget` e `hunt-budget` rodam em
   `corepack pnpm qa:budgets`, são registrados e viram dívida priorizada, não portão.

Uma task pode modificar muitos arquivos quando eles compõem uma única mudança coesa. O motivo para
dividi-la é a existência de problemas, decisões, contextos ou verificações independentes — não a
contagem de arquivos, linhas ou minutos.

## Sequência prevista

| Ordem | Playbook | Resultado independente |
|---:|---|---|
| [PB-00](playbooks/PB-00/README.md) | Workspace e shell browser | monorepo, Phaser/DOM shell, testes e CI local |
| [PB-00R](playbooks/PB-00R/README.md) | Correções do gate de fundação | resize real, boot reproduzível, descoberta de testes e output limpo — **fechado** |
| [PB-01](playbooks/PB-01/README.md) | Catálogo curado de conteúdo | identidade estável, SQLite de authoring, operação versionada e bundle runtime — **fechado** |
| [PB-02](playbooks/PB-02/README.md) | Manifesto e asset pack pessoal | subset visual carregável por chaves estáveis — **fechado** |
| [PB-03](playbooks/PB-03/README.md) | Kernel determinístico | fixed tick, RNG, grid, comandos, eventos e replay — **fechado** |
| [PB-04](playbooks/PB-04/README.md) | Primeira hunt ponta a ponta | região, spawn, câmera, colisão, transições e correções da primeira experiência — **fechado** em `9f1c14c` como `APPROVED_WITH_WARNINGS` |
| [PB-05](playbooks/PB-05/README.md) | Vocação e combate Canary | Knight, ataque, spells selecionadas, morte e loot — **integrado** em `d4490e9`, aguardando aceite do usuário |
| [PB-06](playbooks/PB-06/README.md) | Save local e inventário | IndexedDB versionado, transações e import/export — **elegível**, PB-06-01 é a próxima task |
| PB-07 | Catálogo e compositor de outfits | famílias, `lookType`, addons, cores e troca visual |
| PB-08 | Gacha cosmético | banner, pulls, garantia, duplicatas e tokens |
| PB-09 | Helper mínimo | cura, alvo, ações e loot como módulos desligáveis |
| PB-10 | Playtest e performance | browser QA, screenshots, métricas e orçamento de assets |

PB-00R foi fechado em 2026-08-11 como `APPROVED_WITH_WARNINGS` pela auditoria integrada PB-00R-05, e
**deixa de bloquear PB-01**. A PB-00R-FIX-01 foi integrada no commit `91fd968`; `format:check` e
`verify` estão verdes em checkout novo. Os warnings remanescentes são não bloqueantes e estão
priorizados em `playbooks/PB-00R/artifacts/acceptance-report.md`.

PB-01 foi fechado em 2026-08-13 como `APPROVED_WITH_WARNINGS` pela auditoria integrada PB-01-07, com
`corepack pnpm verify` em exit 0 no resultado integrado, catálogo determinístico
(`d9df3338743365710fed991c185976b9dbbd59e6d5f9d43a679550db8fa154f3`), reconstrução sem Canary e zero
fonte Canary rastreada. Os warnings remanescentes são não bloqueantes e estão priorizados em
[`playbooks/PB-01/artifacts/acceptance-report.md`](playbooks/PB-01/artifacts/acceptance-report.md).
PB-02 foi fechado em 2026-08-13 como `APPROVED_WITH_WARNINGS` pela auditoria integrada PB-02-07, no
commit `1134fc8`. A auditoria reprovou primeiro em `af31d22` por dois blockers de produto — o build
`product` distribuía mídia `cipsoft-personal` e `verify` falhava na segunda execução consecutiva — e
ambos foram corrigidos por `PB-02-FIX-01` e `PB-02-FIX-02` e reverificados. Os warnings remanescentes
são não bloqueantes e estão priorizados em
[`playbooks/PB-02/artifacts/acceptance-report.md`](playbooks/PB-02/artifacts/acceptance-report.md).

PB-03 foi fechado em 2026-08-14 como `APPROVED_WITH_WARNINGS` pela auditoria integrada PB-03-08, sobre
o commit auditado `f885535`. `corepack pnpm verify` saiu em exit 0 duas vezes seguidas com a árvore
inalterada; duas execuções independentes do replay produziram bytes idênticos e iguais ao golden; a
retomada por snapshot convergiu nas 201 fronteiras de `0` a `200`, incluindo as 44 não quiescentes; e
o Chromium reproduziu o mesmo snapshot canônico e o mesmo SHA-256
(`9d0c3a249b6e72daf0bce868824eb17a80b0cf4153ab05f6f7b7d50dae5f7260`) que o Node. Os warnings
remanescentes são não bloqueantes e estão priorizados em
[`playbooks/PB-03/artifacts/acceptance-report.md`](playbooks/PB-03/artifacts/acceptance-report.md).

**PB-04 está fechado** como `APPROVED_WITH_WARNINGS`. PB-00, PB-01, PB-02, PB-03 e PB-04 estão
fechados. A auditoria integrada PB-04-10 reprovou primeiro em `307a3f0` (2026-08-15) por D1–D4;
FIX-02, FIX-03 e FIX-04 fecharam esses defeitos; a reavaliação em 2026-08-16 sobre `9f1c14c` emitiu
o veredito vigente. Detalhe em
[`playbooks/PB-04/artifacts/acceptance-report.md`](playbooks/PB-04/artifacts/acceptance-report.md).

A hunt **é jogável** — a reavaliação andou, colidiu, desceu, subiu e viu rotworms andarem em
Chromium real, sem um único erro de runtime — e o aceite de produto do usuário está registrado em
[`playbooks/PB-04/artifacts/product-acceptance.md`](playbooks/PB-04/artifacts/product-acceptance.md).
B2 permanece não bloqueante e é pré-requisito de PB-07.

**PB-05 está liberado** e é o próximo playbook a executar. O playbook já está escrito — spec,
README, `STATE.md` e doze task cards. A primeira task elegível é PB-05-01.

## PB-00 — Definition of Ready

**Playbook modular:** `docs/playbooks/PB-00/README.md` — seis task cards, cada uma executável em um
chat independente e portável entre agentes.

Antes de escrever o plano detalhado:

- [x] Phaser 4 + TypeScript + Vite estão decididos.
- [x] Browser local é o primeiro runtime.
- [x] Simulação fica fora do renderer.
- [x] DOM/CSS é a superfície de HUD e menus.
- [x] Backend e PostgreSQL estão fora do V0 pessoal.
- [x] Os viewports e budgets da ADR-001 continuam válidos.

O plano deve escolher versão exata de Node, package manager, Phaser e runner de testes consultando o
ambiente no momento da implementação e fixá-las no lockfile. Versões não são inventadas na
documentação.

## PB-01 — Definition of Ready

- [x] Snapshot local do Canary é a fonte de regras e dados.
- [x] TibiaRoute é somente catálogo de seleção.
- [x] O runtime não lê Lua, XML, OTBM ou arquivos Canary diretamente.
- [x] IDs originais são preservados como proveniência.
- [x] O subconjunto importado deve ser validado por schema.

Entregáveis mínimos esperados do futuro plano:

```text
packages/contracts/src/content/
packages/content/src/importers/canary/
packages/content/src/generated/
packages/test-fixtures/canary/
```

O primeiro importer deve trabalhar com uma fixture pequena de vocação, criatura, item, loot e spell;
não com o snapshot inteiro.

## PB-02 — Definition of Ready

- [x] Perfil `personal` pode resolver o pacote visual local.
- [x] Perfil `product` deve recusar assets `cipsoft-personal`.
- [x] Assets são acessados apenas por manifest keys.
- [x] Pacotes são divididos por hunt e carregados sob demanda.
- [x] `lookType`, `clientId`, `effectId` e `missileId` têm adapters separados.

Entregáveis mínimos esperados do futuro plano:

```text
packages/assets/src/manifest/
packages/assets/src/providers/
tools/asset-packer/
apps/game/public/assets/personal/packs/<fixture-hunt>/
```

O gate deve carregar um cenário fixture, um outfit, uma criatura, um objeto, um efeito e um projétil
sem path literal fora do manifesto.

## PB-03 — Definition of Ready

**Estado: fechado** em 2026-08-14 como `APPROVED_WITH_WARNINGS`, commit auditado `f885535`.

**Playbook modular:** `docs/playbooks/PB-03/README.md` — oito task cards, cada uma executável em um
chat independente. Design aprovado em
`docs/superpowers/specs/2026-08-13-pb-03-deterministic-kernel-design.md`.

- [x] A simulação usa fixed tick, RNG próprio seedado, ordenação explícita e estado serializável.
- [x] `packages/simulation` não importa Phaser, DOM, Node, banco, relógio global nem pacote externo.
- [x] O kernel é agnóstico de conteúdo: nada de vocação, criatura, item, spell, hunt ou asset.
- [x] Eventos são a única saída observável; consumidores não leem o estado interno.
- [x] O command log grava somente comandos externos; a IA é reproduzida pela seed.
- [x] O estado serializado contém apenas inteiros, booleanos e strings.
- [x] SHA-256 é calculado fora do kernel, sobre o JSON canônico.

Parâmetros congelados: tick de `50 ms`, clamp de frame de `250 ms`, `SIMULATION_SCHEMA_VERSION = 2`
(subiu de `1` em PB-03-06-FIX-01, que acrescentou `pendingIntents` ao snapshot),
`SIMULATION_RULES_VERSION = 1`, RNG xoshiro128\*\* com streams `movement`, `ai` e `scenario`, e
fixture `pb-03-kernel-coverage` com seed `0f1e2d3c4b5a6978` em 200 ticks.

Entregáveis mínimos esperados do plano:

```text
packages/contracts/src/simulation/
packages/simulation/src/{random,grid,commands,events,kernel,state,replay}/
packages/test-fixtures/simulation/pb03/
tools/replay/
apps/game/src/simulation/
```

O gate deve provar que a mesma seed e o mesmo command log produzem snapshot canônico byte-idêntico em
Node e no browser, que a retomada por snapshot intermediário converge para o mesmo resultado, e que
alterar seed, comando ou versão de regras é detectado como divergência explícita.

## PB-04 — Definition of Ready

**Playbook modular:** `docs/playbooks/PB-04/README.md` — dez task cards, cada uma executável em um
chat independente. Design aprovado em
`docs/superpowers/specs/2026-08-14-pb-04-first-hunt-design.md`.

- [x] A hunt é `hunt:tibia:venore-rotworm-cave`; Rotworm já existe no catálogo PB-01 e no pack PB-02.
- [x] A região do mapa é convertida offline para JSON validado; OTBM nunca é formato de runtime.
- [x] Colisão, camadas e transições derivam de `appearances.dat` e `items.xml`, não de constantes
      escritas à mão.
- [x] O kernel continua agnóstico de conteúdo; identidade Tibia é proibida por regra executável.
- [x] Spawn e transição são sistemas do tick, não comandos: o command log segue gravando somente
      comandos externos.
- [x] Não há combate, pathfinding, click-to-move nem save; PB-04 entrega navegação, não luta.
- [x] Nenhuma dependência externa nova entra no workspace.

Parâmetros congelados: região de no máximo 3 andares e 96 × 96 tiles por andar, pack de no máximo
512 entradas e 6 MB, no máximo 64 atores vivos, `SIMULATION_SCHEMA_VERSION = 3`,
`SIMULATION_RULES_VERSION = 2`, stream RNG novo `spawn`, e fixture `pb-04-hunt-session` com seed
`1a2b3c4d5e6f7a8b` em 600 ticks, com retomada em 313.

Entregáveis mínimos esperados do plano:

```text
packages/contracts/src/hunt/
packages/content/src/{hunts,generated/hunts}/
packages/simulation/src/{grid,kernel}/
packages/test-fixtures/hunt/pb04/
tools/{tile-flags,map-extractor}/
apps/game/src/{hunt,input}/
```

O gate deve provar que materializar o recipe versionado duas vezes produz JSON byte-idêntico
(a geometria jogável é autorada e compilada deterministicamente; o envelope OTBM é fonte de spawn
e de material, não de geometria), que a sessão da hunt reproduz o mesmo
SHA-256 em Node e no browser, que a retomada converge em todas as fronteiras, que o journal golden do
PB-03 permaneceu byte-idêntico após o bump de schema, e que a hunt é jogável nos quatro viewports
obrigatórios.

## PB-05 — Definition of Ready

**Playbook modular:** `docs/playbooks/PB-05/README.md` — doze task cards, cada uma executável em um
chat independente. Design aprovado em
`docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`.

**Estado:** escrito e **elegível**. PB-04 fechou como `APPROVED_WITH_WARNINGS` em `9f1c14c`. A
execução começa em PB-05-01.

- [x] A vocação é Knight; ela já existe no catálogo PB-01, com ganhos, velocidade e multiplicadores
      de skill importados.
- [x] As spells são `exori`, `exori ico` e `exura ico`; só a primeira já está curada, e importar as
      outras duas é task própria.
- [x] Toda fórmula Canary é float e é resolvida em `@huntbound/content`; o kernel recebe apenas
      `min`/`max` inteiros e sorteia entre eles.
- [x] `itemKey` e `spellKey` entram na proibição executável do kernel, junto das cinco identidades já
      proibidas.
- [x] A região **não** é reextraída: o combate é composto ao construir o cenário, e os quatro
      artefatos gerados da hunt permanecem byte-idênticos.
- [x] O loot é automático: o kernel rola e concede por evento, e a bolsa da run é projeção fora do
      kernel. Não há comando de coleta nem campo novo no snapshot.
- [x] Corpo e sangue são apresentação pura, com TTL visual e sem estado no kernel.
- [x] Criaturas agridem e perseguem com passo guloso; não há pathfinding, line of sight nem fuga em
      vida baixa — esta última porque o importer não captura `runOnHealth`.
- [x] A ficha do personagem é conteúdo congelado, não save. PB-06 continua dono da persistência.
- [x] Nenhuma dependência externa nova entra no workspace.

Parâmetros congelados: `SIMULATION_SCHEMA_VERSION = 4`, `SIMULATION_RULES_VERSION = 3`, streams RNG
novos `combat` e `loot`, sete sistemas por tick (`lifecycle`, `movement`, `upkeep`, `combat`,
`death e loot`, `ai`, `spawn`), alcance de golpe Chebyshev 1 no mesmo andar, mitigação zero, e
fixture `pb-05-hunt-combat` com seed `2c3d4e5f60718293` em 900 ticks, com retomada varrida em todas
as fronteiras.

Entregáveis mínimos esperados do plano:

```text
packages/contracts/src/{simulation,content}/
packages/content/src/{importers,selections,generated,hunts,runtime}/
packages/simulation/src/{kernel,state}/
packages/test-fixtures/hunt/pb05/
packages/assets/catalog/selections/
apps/game/src/{hunt,ui,input}/
docs/content/PB-05-SELECTION.md
```

O gate deve provar que os journals golden de PB-03 e PB-04 sobreviveram byte-idênticos ao bump de
schema, que a sessão de combate reproduz o mesmo SHA-256 em Node e no browser, que a retomada
converge em todas as fronteiras com vida, mana, alvo e cooldowns serializados, que `combat:check`
entrou em `check` e `verify` e está registrado em `REPLAY_CONTRACT.md`, e que a caçada é jogável nos
quatro viewports com specs estáveis sem `retries`.

## PB-06 — Definition of Ready

**Playbook modular:** `docs/playbooks/PB-06/README.md` — dez task cards, cada uma executável em um
chat independente. Design aprovado em
`docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`.

**Estado:** **elegível**. A primeira task é PB-06-01. A dependência do PB-05 é o commit integrado
`d4490e9` com `verify` verde, não um veredito de auditoria — a auditoria bloqueante saiu do processo
em 2026-08-18 (`07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, "Fechamento de playbook").

- [x] `SaveRepository` já está congelado pela ADR-05 com `load`, `transact`, `export` e `import`;
      IndexedDB é a primeira implementação.
- [x] O save é um documento único, versionado, gravado em transação atômica — sem ledger.
- [x] A bolsa da run é persistida junto do snapshot desde o primeiro loot, e consolidar em estoque é
      idempotente por construção.
- [x] A retomada usa o `SimulationSnapshot`, cuja convergência PB-03, PB-04 e PB-05 já provaram; o
      command log não é persistido.
- [x] Sessão incompatível com o cenário é descartada **com a bolsa preservada**, nunca retomada à
      força nem descartada em silêncio.
- [x] O inventário do V0 é bolsa e estoque. Equipar, usar item, capacidade e peso ficam fora.
- [x] XP e level continuam fora: a ficha do personagem é conteúdo congelado do PB-05.
- [x] O schema do save é mínimo; coleção e moeda entram por migração em PB-07 e PB-08.
- [x] Não há checksum, assinatura nem anti-tamper: a ADR diz que o dono editar o próprio save não é
      ameaça no V0 pessoal.
- [x] `packages/simulation` não é alterado. `SIMULATION_SCHEMA_VERSION` continua `4` e
      `SIMULATION_RULES_VERSION` continua `3`.
- [x] Nenhuma dependência externa nova entra no workspace — nem wrapper de IndexedDB, nem
      `fake-indexeddb`.

Parâmetros congelados: `SAVE_SCHEMA_VERSION = 1`, banco `huntbound-save` versão `1`, store `save`
com chave `'default'`, checkpoint a cada `200` ticks mais fim de run, abandono e `pagehide`, e
fixture `pb-06-save-session` derivada de `pb-05-hunt-combat` com checkpoint congelado no tick `1400`
e retomada até `2700`.

Entregáveis mínimos esperados do plano:

```text
packages/contracts/src/save/
packages/save/src/{repository,drivers,migrations,serialization,session}/
packages/test-fixtures/save/pb06/
tools/save/
apps/game/src/{save,ui}/
tests/e2e/save-persistence.spec.ts
docs/simulation/REPLAY_CONTRACT.md
```

O gate deve provar que gravar, exportar, importar e retomar a sessão do PB-05 reproduz o snapshot
final golden do PB-05 byte a byte — persistir não pode alterar a simulação —, que a consolidação da
bolsa é idempotente, que o documento sem versão migra para v1 e que versão futura é recusada, que
`save:check` entrou em `check` e `verify` e está registrado em `REPLAY_CONTRACT.md`, e que recarregar
a página retoma a run no mesmo tick nos quatro viewports, com specs estáveis sem `retries`.

## Contrato para escolher a primeira hunt

A escolha acontece no início do playbook PB-04 e fica congelada na spec daquele playbook. O autor
consulta [TibiaRoute](https://tibiaroute.com/br/hunting-places), mas valida todos os IDs no snapshot
local antes de escrever tarefas.

Checklist de seleção:

- [ ] URL individual registrada.
- [ ] Nome e nível recomendado registrados.
- [ ] Compatibilidade solo com a vocação-alvo confirmada.
- [ ] Todas as criaturas existem no snapshot.
- [ ] Região do mapa é localizável e extraível.
- [ ] Tiles, objetos, outfits e efeitos necessários existem no dump local.
- [ ] Não depende de party, quest chain, world event ou serviço não implementado.
- [ ] O pacote cabe no budget de carregamento definido pela ADR-001.

Venore Rotworm Cave, Kha'labal Terramites Cave e Amazon Tower aparecem como candidatos de nível 8+
e compatíveis com todas as vocações na página 17 do catálogo na data desta decisão. Eram exemplos,
não escolhas obrigatórias; a spec do PB-04 escolheu **Venore Rotworm Cave**, porque é a única
candidata cuja criatura já existe tanto no catálogo PB-01 quanto no pack PB-02, e porque seus spawns
se distribuem em dois andares, o que exercita transições sem inventar geometria. A execução do
checklist acima pertence a PB-04-01 e fica congelada em `docs/content/PB-04-SELECTION.md`.

## Contratos transversais já fechados

### Simulação e renderer

```text
InputAction ─► SimulationCommand ─► SimulationEvent ─► SceneBridge
                                                    ├─► Phaser presentation
                                                    └─► DOM view model
```

Phaser não decide dano, loot, cooldown, unlock ou resultado de pull.

### Conteúdo e assets

```text
HuntDefinition ─► ContentRegistry ─► Simulation
        │
        └────────► AssetPackRegistry ─► AssetProvider ─► Phaser
```

Uma hunt pode trocar de pacote visual sem alterar `HuntDefinition` ou regras.

### Save

```ts
export interface SaveRepository {
  load(): Promise<GameSave>;
  transact<T>(operation: (draft: GameSave) => T): Promise<T>;
  export(): Promise<string>;
  import(serialized: string): Promise<void>;
}
```

A implementação V0 usa IndexedDB. Um futuro produto pode fornecer implementação remota sem mudar os
consumidores.

## Gates antes do primeiro playbook de gameplay

- G1: shell abre nos quatro viewports obrigatórios sem overflow crítico.
- G2: mesma fixture Canary importada duas vezes produz JSON byte-identical.
- G3: build `product` falha ao receber asset `cipsoft-personal`.
- G4: loader resolve todas as chaves da fixture e informa todas as ausentes em uma única validação.
- G5: nenhuma ocorrência de path de asset existe em `packages/simulation`.
- G6: documentação não contém decisão vigente que exija Echoing Den, Metrônomo ou gacha de
  personagem no V0.

## Trabalho deliberadamente posterior

Só criar playbooks para estes temas depois que a primeira hunt estiver jogável:

- outras vocações;
- segunda e demais hunts;
- helper avançado;
- touch completo e wrapper mobile;
- backend autoritativo;
- substituição visual Kaezan;
- monetização, conta, telemetria remota ou live service.
