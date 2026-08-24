# PB-08-05 — Postura: design

**Status:** aprovado em conversa em 2026-08-24; pronto para revisão escrita

## Objetivo

Entregar a célula 7 do kit do Knight como duas formas de uma postura permanente:
Blood Rage (`utito tempo`) e Protector (`utamo tempo`). As duas são abilities de
toggle, exclusivas entre si, com ganho e perda explícitos, estado inicial sem postura,
persistência pelo `ActorState` existente e indicação visual permanente no personagem.

A mudança também corrige o caminho que hoje calcula `skillModifierPermille` mas não o
consome para dano. O contrato de condição já possui o modificador; a extensão necessária
é declarar no ator qual canal de skill alimenta seu dano físico atual.

## Decisões de arquitetura

### 1. Contrato aditivo de skill

Adicionar `attackSkillIndex?: number` a `ActorBlueprint` e permitir o campo opcional no
`ActorBlueprintSchema` como inteiro não negativo. Ausência do campo significa que o ator
não recebe escalonamento por skill. O campo será definido como `2` no blueprint do Knight
do PB-05, pois o catálogo e a documentação vigente identificam `skill:2` como sword.

Essa é uma extensão compatível com os cenários atuais: documentos antigos continuam
válidos e preservam exatamente o comportamento anterior quando o campo é omitido. Não
haverá bump de `SIMULATION_SCHEMA_VERSION` nem de `SIMULATION_RULES_VERSION`: o schema
continua v5 e as regras continuam v4 porque a nova semântica só é ativada por conteúdo
que declara o campo, sem alterar fixtures que não o possuem.

O contrato não ganhará ainda um índice por ability. No V0 atual, as abilities de dano
físico do Knight usam o mesmo canal de arma que seu ataque básico; abilities de cura não
usam esse canal. O PB-08-09 permanece responsável por separar sword, axe e club no
personagem e, se necessário, por introduzir canais de skill específicos por ability.

### 2. Consumo no kernel

Criar uma função interna de cálculo do modificador de dano causado que:

1. consulta `damageDealtPermille` nas condições ativas;
2. se o ator tem `attackSkillIndex` e o dano é físico, soma
   `skillModifierPermille(attackSkillIndex)`;
3. aplica a soma uma única vez com a aritmética inteira de permille existente.

`resolveAttack` usará o canal quando `attackElement` for `physical`. `resolveCast` usará
o canal apenas para abilities com `effect: 'damage'` e `element: 'physical'`; a branch de
cura permanece inalterada. Assim Blood Rage aumenta ataques e dano físico do Knight,
Protector reduz dano causado, e nenhum bônus de sword altera uma cura ou um dano mágico.

O dano recebido continuará usando `damageReceivedPermille` já aplicado por
`applyDamage`. A semântica da condição permanece genérica; o kernel não conhecerá nomes
de posturas, Knight ou Tibia.

### 3. Conteúdo da postura

`pb-05-knight-combat.json` receberá uma seção `postures` com duas entradas. Cada entrada
declarará a fonte externa `TibiaWiki`, a versão `15.25.3a4a52`, os valores de level e
mana, e a divergência em relação ao snapshot Canary. A fonte externa não será adicionada
a `sourceFiles`, porque não é um arquivo do snapshot local.

Os valores congelados são:

| Ability | Condition | `skillIndex` | Skill | Dano recebido | Dano causado |
|---|---|---:|---:|---:|---:|
| `blood-rage` | `blood-rage` | `2` | `250` | `150` | `0` |
| `protector` | `protector` | — | `0` | `-150` | `-150` |

As duas conditions terão `exclusivityGroup: 1` e `durationTicks: 0`. As duas abilities
terão `resourceCost: 20`, `toggle: true`, `shape: 'self'`, poder zero e referência à
condition correspondente. O grupo primário será o canal de suporte `1`, com cooldown de
grupo de 40 ticks, e o canal secundário próprio de postura será `2`, também com 40 ticks;
o cooldown individual será zero. A recast da ability ativa desliga a condition sem cobrar
mana, e a aplicação da rival substitui a ocupante do grupo no mesmo tick, conforme o
contrato PB-07-05.

O builder de cenário receberá uma extensão opcional de postura. A composição continuará
determinística: as cinco abilities existentes permanecem nos índices `0..4`, Blood Rage
será `5`, Protector será `6`, e o player receberá `[0, 1, 2, 3, 4, 5, 6]`. A extensão
será aplicada tanto pelo gerador do replay quanto pelo boot do jogo, evitando uma cópia
de regras entre ferramenta e runtime.

O `+30% shielding` do Protector não será convertido em dano, armor, mana shield ou outro
efeito. Será registrado na Seção 5 de `docs/content/KNIGHT_BANDS.md` como pendência com
destino PB-11.

### 4. Persistência e estado de apresentação

Nenhum campo novo será adicionado ao save. A condição ativa permanece em
`ActorState.activeConditions`, que já é serializado no snapshot do PB-06.

O `CombatViewModel` consumirá as abilities do cenário, acrescentará o estado
`active` às duas views de postura e exporá `playerPosture: null | { abilityId, label }`.
O estado será derivado do snapshot inicial/restaurado e atualizado pelos eventos de
`ability/cast`; ao ligar uma rival, a anterior ficará inativa; ao recastar a ativa,
voltará a `null`. O HUD mostrará um elemento persistente de status com o nome da postura,
sem exigir leitura do botão, e os botões usarão `aria-pressed` para refletir o estado.

O boot passará a construir o cenário antes de criar o view model e a cena, para que as
três camadas consumam a mesma tabela de abilities e conditions. A hidratação F5 usará o
snapshot já restaurado pelo driver e não criará um caminho paralelo de persistência.

### 5. Aura e FX

`CombatFxTable.ts` terá receitas específicas para `blood-rage` e `protector`, além de uma
tabela de postura que declara:

- Blood Rage: aura vermelha, aberta, permanente;
- Protector: aura azul, fechada, permanente.

`HuntScene` receberá as conditions do cenário e desenhará a aura como objeto gráfico
persistente ancorado ao sprite do player. O objeto será reposicionado ao andar, mantido
durante o flash branco de dano e removido quando não houver condition de postura ativa.
O estado será lido do snapshot do driver, por isso a aura reaparecerá depois do F5 sem
depender do histórico de eventos da sessão anterior.

As teclas `Digit6`/`Numpad6` e `Digit7`/`Numpad7` serão adicionadas ao mapa de input para
tornar as duas formas jogáveis pelo teclado, em paralelo aos botões do HUD.

## Fluxo de dados

```text
selection.postures
        |
        v
buildHuntScenario -> abilities[5..6] + conditions[0..1] + player.attackSkillIndex=2
        |                         |
        |                         +--> Simulation kernel
        |                                skill modifier + damage modifier
        |
        +--> CombatViewModel ---> HUD posture status/buttons
        |
        +--> HuntScene ----------> permanent red/blue aura
        |
        +--> replay fixture ----> scenario golden + hash sidecars
```

O `+30% shielding` sai da seleção visual/documental, mas não entra nesse fluxo até o
PB-11 fornecer o contrato de armor/escudo.

## Testes e evidências

O ciclo de implementação começará em RED, sem alterar o golden para fazer um teste passar.

### Contrato e kernel

- campo `attackSkillIndex` aceita inteiro não negativo e continua opcional;
- cenário sem o campo mantém dano anterior;
- Blood Rage ativo aumenta dano físico pelo skill de sword e aumenta dano recebido em
  15%;
- Protector ativo reduz dano causado e recebido em 15%;
- skill modifier não altera cura nem dano não físico;
- exclusividade, toggle sem mana na recast, troca de rival e estado inicial sem postura;
- snapshot restaurado preserva `activeConditions` e os modificadores observáveis.

### Conteúdo e runtime

- composição do PB-05 produz sete abilities, duas conditions e índices ordenados;
- a seleção valida a proveniência/divergência sem fingir que TibiaWiki é `sourceFile` do
  snapshot;
- view model marca a posture ativa, limpa na recast e troca na rival;
- HUD mostra o nome fora do botão e reflete `aria-pressed`;
- `CombatFxTable` possui receita distinta para cada postura;
- teste de browser liga uma postura, observa a mudança de dano/vida, confirma a aura/status,
  recarrega com F5 e confirma que a mesma postura continua ativa.

### Fixtures e gates

O gerador oficial será executado antes do replay CLI. O `scenario.json` deverá mostrar
somente as alterações intencionais: o campo `attackSkillIndex: 2` no player, as duas
abilities novas e as duas conditions novas. Nenhum mapa, criatura, loot ou ability
existente poderá mudar. O command log continuará com a agenda determinística existente;
testes específicos cobrirão o uso das posturas, sem inserir casts artificiais no replay
de longa duração.

Serão executados `typecheck`, `test`, `content:check`, `combat:check`,
`hunt:check`, `simulation:check`, `qa:browser` e, no fechamento, `verify`.

## Fora de escopo

- shielding, armor, bloqueio ou mitigação nova;
- terceira postura;
- skill por axe/club ou skill específica por ability;
- persistência nova, migração de save ou alteração do formato de `ActorState`;
- mudança no mapa, criaturas, loot ou kit existente além da célula 7;
- asset raster novo: a aura será desenhada pela apresentação existente.
