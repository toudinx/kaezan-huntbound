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

- entregar software executável e jogável por conta própria;
- listar paths exatos de arquivos que cria, modifica e testa;
- no kernel e em contrato, começar pelo teste que prova o comportamento; no resto, entregar jogável
  e deixar o playtest apontar;
- preservar simulação fora de Phaser e UI densa fora do canvas;
- usar apenas conteúdo presente no snapshot local congelado;
- incluir fixture mínima ou golden hash **quando o playtest for cego** (replay de kernel);
- não antecipar sistemas de playbooks posteriores;
- **terminar jogável**: `corepack pnpm dev` de pé e o que olhar. `corepack pnpm verify` **uma vez**,
  na última task, para o usuário não sentar num crash. Aceite é o usuário jogando.

**Revisão de processo de 2026-08-30.** O V0 é piloto: implementação rápida, um ou dois bugs na
primeira integração, correção depois. `verify`/`qa:browser` em toda task e TDD de HUD/conteúdo saíram
do processo — custavam ~1 h por feature sem substituir o playtest.

**Revisão de 2026-08-18.** Três regras mudaram depois de o fluxo travar entre PB-05 e PB-06 por
motivo puramente documental:

1. **Escreva quantas cards você pretende rodar seguidas.** Revisto em 2026-08-30: a regra antiga era
   "duas à frente", e ela existia porque a card tinha 253 linhas e desenhava a implementação — dez
   dessas envelheciam contra o código. Uma card de 40 linhas que diz objetivo e path não envelhece,
   e rodar N tasks sem o usuário presente exige que as N existam antes.
2. **Nenhum playbook espera o fechamento formal de outro.** A dependência real é código integrado na
   `main`, verificável por `git log`.
3. **Orçamento de tempo não bloqueia merge.** `boot-budget` e `hunt-budget` rodam em
   `corepack pnpm qa:budgets`, são registrados e viram dívida priorizada, não portão.

Uma task pode modificar muitos arquivos quando eles compõem uma única mudança coesa. O motivo para
dividi-la é a existência de problemas, decisões, contextos ou verificações independentes — não a
contagem de arquivos, linhas ou minutos.

## Sequência prevista

|                                Ordem | Playbook                           | Resultado independente                                                                                                                  |
| -----------------------------------: | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
|   [PB-00](playbooks/PB-00/README.md) | Workspace e shell browser          | monorepo, Phaser/DOM shell, testes e CI local                                                                                           |
| [PB-00R](playbooks/PB-00R/README.md) | Correções do gate de fundação      | resize real, boot reproduzível, descoberta de testes e output limpo — **fechado**                                                       |
|   [PB-01](playbooks/PB-01/README.md) | Catálogo curado de conteúdo        | identidade estável, SQLite de authoring, operação versionada e bundle runtime — **fechado**                                             |
|   [PB-02](playbooks/PB-02/README.md) | Manifesto e asset pack pessoal     | subset visual carregável por chaves estáveis — **fechado**                                                                              |
|   [PB-03](playbooks/PB-03/README.md) | Kernel determinístico              | fixed tick, RNG, grid, comandos, eventos e replay — **fechado**                                                                         |
|   [PB-04](playbooks/PB-04/README.md) | Primeira hunt ponta a ponta        | região, spawn, câmera, colisão, transições e correções da primeira experiência — **fechado** em `9f1c14c` como `APPROVED_WITH_WARNINGS` |
|   [PB-05](playbooks/PB-05/README.md) | Vocação e combate Canary           | Knight, ataque, spells selecionadas, morte e loot — **integrado** em `d4490e9`, aguardando aceite do usuário                            |
|   [PB-06](playbooks/PB-06/README.md) | Save local e inventário            | IndexedDB versionado, transações e import/export — **integrado**; PB-06-09 segue bloqueada e não bloqueia o próximo                     |
|   [PB-07](playbooks/PB-07/README.md) | Profundidade de combate e vocações | sustentação por leech e regen, condições e stances — **CONGELADO na 05**; 09 e 10 absorvidas por PB-10 e PB-11; o resto retoma depois do PB-12 |
|   [PB-08](playbooks/PB-08/README.md) | O Knight completo                  | nove ações que se distinguem olhando, cinco delas de dano; mapa da classe congelado — **integrado**; PB-08-09 fechou em `80be90b` e a PB-08-10 foi cancelada |
|   [PB-09](playbooks/PB-09/README.md) | Progressão                         | **começa por design doc**: o que level, XP, skill e Códex significam num jogo que não é MMORPG — **roda depois do PB-10** |
|   [PB-10](playbooks/PB-10/README.md) | Catálogo de hunts                  | uma hunt deixa de ser compilada: índice gerado, tela de hunting places no boot, cinco faixas e a escada declarada — **reescrito em 2026-08-26 e elegível**, PB-10-01 é a próxima |
|   [PB-11](playbooks/PB-11/README.md) | O loot vira poder                  | fim da run, stats de item, três slots equipáveis, `armor` no kernel, elemento e resistência, loot equipável                             |
|   [PB-12](playbooks/PB-12/README.md) | Hunts moduladas e level sync       | conteúdo de faixa antiga continua relevante — **exige emenda à ADR-05**                                                                |
|                                PB-13 | Catálogo e compositor de outfits   | famílias, `lookType`, addons, cores e troca visual                                                                                      |
|                                PB-14 | Gacha cosmético                    | banner, pulls, garantia, duplicatas e tokens                                                                                            |
|                                PB-15 | Helper mínimo                      | cura, alvo, ações e loot como módulos desligáveis                                                                                       |
|                                PB-16 | Playtest e performance             | browser QA, screenshots, métricas e orçamento de assets                                                                                 |

**Renumeração de 2026-08-24.** O PB-08 original — "o loop de farm do Knight" — foi replanejado e
dissolvido em cinco playbooks: a classe ficou no PB-08, e progressão, criaturas, loot e modulação
viraram PB-09 a PB-12. Outfits, gacha, helper e playtest deslocam para PB-13 a PB-16. Bestiary e
charms deixaram de ser playbook próprio: o Códex entra no PB-09 e os charms ficam para depois do
PB-12. O motivo está em `docs/playbooks/PB-08/README.md`, seção "Por que este playbook foi
reescrito".

**Reescrita do PB-10, 2026-08-26.** "Novas criaturas" virou **"Catálogo de hunts"**, a pedido do
usuário, com o *Hunting Places* do TibiaRoute como referência de forma. O diagnóstico antigo não se
perde: orc, orc spearman e orc shaman não são um remendo na caverna de rotworm — **são o conteúdo da
segunda hunt**, e viraram a faixa 2. **Sem renumeração**: o PB-10 já era o playbook que mexe em
conteúdo de hunt, e já carregava o bloqueio B9.

O PB-10 passa a rodar **antes do PB-09**, que é esqueleto e começa por design doc. Isso não é
exceção: a regra deste documento é que nenhum playbook espera o fechamento formal de outro, e o que
se exige do anterior é código integrado na `main` e verde. O motivo está em
`docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.

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
B2 permanece não bloqueante e é pré-requisito do playbook de outfits, que é **PB-13** desde a
renumeração de 2026-08-24. O relatório de aceite do PB-04 ainda o chama de PB-07: é registro
histórico e não se reescreve.

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
- [x] O schema do save é mínimo; coleção e moeda entram por migração em PB-13 e PB-14.
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

## PB-07 — Definition of Ready

**Playbook modular:** `docs/playbooks/PB-07/README.md` — catorze tasks, das quais as duas primeiras
nascem escritas e as demais viram card quando a anterior fecha, conforme
`07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Estado:** **elegível**. As primeiras tasks são PB-07-01 e PB-07-02, que podem rodar em paralelo. A
dependência do PB-06 é código integrado em `main` e verde, não veredito: PB-06-09 segue bloqueada e
isso não bloqueia PB-07.

**Renumeração (histórico de 2026-08-21):** este playbook toma o número 7 e desloca os anteriores
planos — outfits para PB-08, gacha para PB-09, helper para PB-10 e playtest para PB-11. **Superada
pela renumeração de 2026-08-24**, registrada na tabela de sequência; mantida aqui por rastreabilidade. O motivo é de ordem, não de gosto: o
compositor de outfits é cosmético e não destrava nada, enquanto combate raso limita todo o resto.

- [x] A hunt é jogável e o save sobrevive ao `F5`: o pré-requisito de "outras vocações" e "segunda
      hunt" listado em "Trabalho deliberadamente posterior" está satisfeito.
- [x] Regen já existe e está ligado no kernel; o que muda é o regime, não o mecanismo.
- [x] Ataque à distância já é suportado por `attackRangeTiles`; Paladin não precisa de mecânica nova
      de auto-attack.
- [x] O catálogo já modela `resistances`, `immunities`, `conditions`, `summons` e `defenses`; o que
      falta é o conversor parar de descartá-los.
- [x] Sustentação é **leech mais regen sensível a combate**, nunca poção de Tibia. Só o jogador
      regenera fora de combate.
- [x] Runa e poção são habilidade com cargas por hunt. Não há item usável, nem comando
      `actor/use-item`, nem loja.
- [x] O snapshot `157e6f9e` tem **cinco** vocações base — Sorcerer, Druid, Paladin, Knight e Monk —
      e cinco promoções. PB-07 migra **Knight, Paladin e Sorcerer**; Druid e Monk ficam para outro
      playbook.
- [x] Paladin e Sorcerer entram juntos, para generalizar `CharacterDefinition.skills` e
      `abilityShapeFromSpell` numa migração só.
- [x] O kit tem **seis slots**, não quatro: auto-attack, dano single-target, dano em área, cura,
      **postura** e **mobilidade**. O que faltava não era magia de dano, era eixo de decisão.
- [x] Postura é o sistema de **Stances do Vocation Adjustments 2026** (Tibia `15.25.3a4a52`,
      16/06/2026): uma ativa por vez, toggle que desliga ao ser relançada, persiste entre sessões,
      canal de cooldown secundário próprio. É modo, não botão por segundo.
- [x] As Stances 2026 são **posteriores ao snapshot**. Adotamos o desenho novo com números da
      TibiaWiki, marcados com fonte e versão no lugar do `sha256`. É desvio de **proveniência**, não
      de fidelidade — continua sendo conteúdo Tibia existente —, vale **só** para stances, e exige
      nota na ADR-05. A alternativa era a versão do snapshot, que pede nível 60 e 290 de mana num
      personagem level 35 com pool de 185: inviável sem a poção já recusada.
- [x] As stances de Sorcerer dependem de crítico, que **não entra** no PB-07. As três são adaptadas
      para dano base por elemento, preservando a escolha entre fogo, energia e death.
- [x] Postura, mobilidade e magic shield são `Condition` com duração, assim como veneno e paralisia
      de criatura. O sistema de condições entra **uma vez**, em PB-07-05, e serve aos dois lados.
      Hoje `SpellDefinitionSchema` não tem campo de condição, `ConditionDefinitionSchema` tem um
      único membro (`poison`), `ActorState` não tem condições ativas e `groupReadyAtTick` é um
      número único onde o sistema 2026 exige canal secundário separado.
- [x] O bump de schema é **único e aditivo**: `SIMULATION_SCHEMA_VERSION` 4→5 e
      `SIMULATION_RULES_VERSION` 3→4, com defaults que reproduzem v4.
- [x] Golden é regenerado **uma única vez**, em PB-07-03, com prova de intencionalidade. Em qualquer
      outra task, regenerar golden é defeito.
- [x] Leech, regen por combate e cargas são extensões Huntbound e exigem emenda à lista de
      `05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`. Sem a emenda, violam a decisão vinculante 1.
- [x] UI de bestiary/bosstiary, Druid, Monk, item usável, XP e level ficam fora.
- [x] Nenhuma dependência externa nova entra no workspace.

O gate deve provar que recuar do combate recupera vida e mana em ritmo perceptível e que apanhar
interrompe; que dano causado devolve vida e mana por leech; que Knight, Paladin e Sorcerer são
jogáveis com fantasias distintas, que trocar de stance muda a rotação de forma perceptível e que a
stance ativa sobrevive ao `F5`; que existe criatura que conjura e um boss solo; que o alvo é
marcado por anel e não por escurecimento; que fechar um box não sacode a tela por mordida; que
nenhuma borda de mapa termina em buraco preto; e que duas hunts saem da mesma pipeline de extração.

## PB-08 — Definition of Ready

**Playbook modular:** `docs/playbooks/PB-08/README.md` — dez tasks, das quais **PB-08-02 e PB-08-03
estão escritas**; o resto é bullet, conforme a regra de congelar só duas à frente.

**Estado:** **elegível**. A próxima task é PB-08-02, que roda **primeira e sozinha**: ela produz o
mapa da classe, e as demais dependem do resultado dela. A dependência do PB-07 é código integrado em
`main` e verde — PB-07-01 a PB-07-05 estão lá.

**Replanejamento de 2026-08-24.** O PB-08 original entregava substrato — XP, level, equipamento,
`armor` — e não gameplay. Foi reescrito em torno da classe e dissolvido em cinco playbooks. PB-08-01
(densidade da caverna) permanece integrada e vale.

**Congelamento do PB-07:** decisão do dono em 2026-08-23. As tasks PB-07-06 a PB-07-14 retomam
depois que a classe e a progressão estiverem resolvidas. Elemento e resistência (PB-07-09) e criatura
com kit (PB-07-10) são absorvidos por PB-10 e PB-11.

- [x] O problema está **medido**, não suposto: o Knight tem **três ações de dano e uma cura**; o kit
      de nível ≤ 35 do snapshot tem nove ações; cinco faltam.
- [x] **Quatro das cinco ações que faltam são conteúdo sobre máquina pronta.** `rangeTiles`,
      `radius`, `speedPermille`, `damageDealtPermille`, `damageReceivedPermille`, `toggle` e
      `secondaryCooldownGroup` estão implementados e **sem consumidor**. Só o taunt pede kernel —
      alvo forçado não existe.
- [x] O princípio de design está escrito e é **regra de projeto**, não do playbook: sem escada entre
      faixas; coexistência só com **distinção visual**; orçamento de **8–9 ações com ~5 de dano**.
      Vale para magia, criatura, item e equipamento.
- [x] O critério de coexistência é de **leitura, não de mecânica**, porque o helper vai executar a
      rotação e o valor dela é ser divertida de assistir. Cooldown e mana são invisíveis.
- [x] **Level não destrava spell.** Reafirmado. Faixa é curadoria de conteúdo, nunca portão. A
      selection já declara `spellAccess: "unrestricted"`.
- [x] Uma única task regenera golden (PB-08-06, taunt), com prova escrita de intencionalidade.
- [x] Stances já estão listadas na seção "Extensões Huntbound permitidas" da ADR-05. **Taunt não é
      extensão** — `exeta res` existe no snapshot em `data/scripts/spells/support/challenge.lua`.
- [x] Seis vocações por arma estão recusadas; subclasses ficam **reservadas** e o mapa da PB-08-02 é
      obrigado a declarar os eixos por célula, para que entrem como conteúdo e não como refatoração.
- [x] O aceite é o usuário jogando: nove ações disponíveis desde o começo, cada uma com efeito
      visual próprio, nenhum par produzindo a mesma imagem, e a rotação de dano legível de assistir.

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

- ~~outras vocações~~ — condição satisfeita; entrou no PB-07;
- ~~segunda e demais hunts~~ — condição satisfeita; entrou no PB-07;
- helper avançado;
- touch completo e wrapper mobile;
- backend autoritativo;
- substituição visual Kaezan;
- monetização, conta, telemetria remota ou live service.
