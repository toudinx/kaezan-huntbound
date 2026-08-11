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
- terminar com um gate objetivo de aceite.

Uma task pode modificar muitos arquivos quando eles compõem uma única mudança coesa. O motivo para
dividi-la é a existência de problemas, decisões, contextos ou verificações independentes — não a
contagem de arquivos, linhas ou minutos.

## Sequência prevista

| Ordem | Playbook | Resultado independente |
|---:|---|---|
| [PB-00](playbooks/PB-00/README.md) | Workspace e shell browser | monorepo, Phaser/DOM shell, testes e CI local |
| [PB-00R](playbooks/PB-00R/README.md) | Correções do gate de fundação | resize real, boot reproduzível, descoberta de testes e output limpo |
| PB-01 | Contratos e snapshot Canary | schemas internos, versão de fonte e importer fixture |
| PB-02 | Manifesto e asset pack pessoal | subset visual carregável por chaves estáveis |
| PB-03 | Kernel determinístico | fixed tick, RNG, grid, comandos, eventos e replay |
| PB-04 | Primeira hunt ponta a ponta | região de mapa, spawn, câmera, colisão e transições |
| PB-05 | Vocação e combate Canary | Knight, ataque, spells selecionadas, morte e loot |
| PB-06 | Save local e inventário | IndexedDB versionado, transações e import/export |
| PB-07 | Catálogo e compositor de outfits | famílias, `lookType`, addons, cores e troca visual |
| PB-08 | Gacha cosmético | banner, pulls, garantia, duplicatas e tokens |
| PB-09 | Helper mínimo | cura, alvo, ações e loot como módulos desligáveis |
| PB-10 | Playtest e performance | browser QA, screenshots, métricas e orçamento de assets |

PB-00R está ativo e bloqueia PB-01. Depois de seu fechamento, PB-00, PB-01 e PB-02 formam a primeira
leva. Nenhum playbook de gameplay deve começar antes de eles fecharem os contratos que impedem paths,
IDs e regras de vazarem entre camadas.

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
e compatíveis com todas as vocações na página 17 do catálogo na data desta decisão. São exemplos,
não escolhas obrigatórias.

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
