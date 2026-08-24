# PB-11 — O loot vira poder

**Status:** **esqueleto**. Não elegível.

**Goal:** a run tem fim, o loot consolida, e o que caiu no chão muda o número na ficha.

## Por que a run termina aqui, e não antes

Decisão do dono em 2026-08-24: o fim da run saiu do PB-08 e veio para cá, *"pois é lá que o loot
começa a fazer sentido"*. Consolidar bag em stash sem que o conteúdo do stash sirva para nada é
cerimônia.

**O defeito, medido:** `finish('completed')` **não é chamado em lugar nenhum do código**. Só
`finish('abandoned')`, no `pagehide`. `completedRuns` é permanentemente 0 — não existe momento de
recompensa.

## Os dados existem e são descartados de propósito

Mesmo padrão do resto do projeto:

- `ItemDefinition` é só `{ stackable, maxStackSize, weight }`. `parseItemsXml` descarta `attack`,
  `defense`, `armor`, `slot` e `weaponType` **deliberadamente**.
- `resistances`, `immunities` e `attackElement` estão em `ActorBlueprint` e **não são lidos em
  nenhum arquivo** de `packages/simulation/src/kernel`. É aqui que ganham função: elemento sem
  equipamento que resista a ele é dano sem resposta.
- A espada id 3264 já declara imbuement slot de life leech e mana leech no snapshot.

## Escopo previsto

Bullets, não tasks.

- **A run termina** — sair fora de combate chama `finish('completed')`, bag → stash, incrementa a
  contagem. **Morrer perde a bag e o crédito da run, nunca XP** (decisão de 2026-08-24, seguindo
  `docs/research/tibia/01_hunts_progression.md` R7: o risco vive dentro da run, não na conta).
- `parseItemsXml` para de descartar `attack`, `defense`, `armor`, `slot` e `weaponType`.
- **Três slots equipáveis: arma, armadura, escudo.** Helmet, legs, boots, amulet e ring ficam para
  depois. Save e `InventoryPanel`; `weaponAttack` passa a vir do item.
- **`armor` no kernel** — campo aditivo, default `0`, mitigação **determinística**, sem novo draw de
  RNG para não deslocar os streams. Bump `SIMULATION_SCHEMA_VERSION` com defaults que reproduzem a
  versão anterior. Regenera golden.
- **Elemento e resistência ligados** — a matemática que o PB-10 deixou declarativa. Só faz sentido
  com equipamento que resista.
- **Loot equipável** nas tabelas, com drop legível.
- **Fecha o eixo de arma da PB-08-09** — 1 mão × 2 mãos exige o slot de escudo para significar algo,
  e a passiva por tipo de arma exige o item declarar `weaponType`.

## Invariantes herdados

- **O princípio de design do PB-08 vale para item e equipamento.** Nada convive com a própria versão
  obsoleta: não se tem cinco espadas quase idênticas em que a melhor domina. Uma forma por faixa.
- Progressão persistente e equipamento são **extensões Huntbound** e precisam de emenda à ADR-05.
- Todo campo novo de contrato é aditivo com default que reproduz o comportamento anterior.

## Dependências

- **PB-09** decide se o poder vem de level, de graus de ação, ou de conta — e equipamento tem que se
  encaixar nessa decisão, não contradizê-la.
- **PB-10** para que haja de quem dropar mais de uma coisa.
- O Códex do PB-09 precisa do fim da run **daqui** para creditar por run (`tibia/03` §9 P1). Se o
  PB-09 for executado antes, essa parte dele fica bloqueada até este playbook.
