# PB-10 — Catálogo de hunts

> **Para agentes executores:** **nenhuma skill externa é obrigatória.** Teste primeiro e nada
> afirmado sem saída fresca são regra do `AGENTS.md` e de cada card, não de um plugin. Procedimento
> operacional nas skills do repositório: `playbook-task`, `run-gates`, `worktree-cycle` e
> `hunt-content-pipeline`. Execute uma task card por chat. O formato, o handoff e o ciclo automático
> de integração e limpeza seguem `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** reescrito em 2026-08-26 e **elegível**. As tasks 01 a 10 fecharam e estão integradas; a
próxima é **PB-10-11**.

**Goal:** o jogo deixa de ter *uma* hunt compilada e passa a ter um **catálogo navegável**: você abre
o jogo, olha as hunts disponíveis com faixa de nível, criaturas, exp e loot, escolhe uma e entra.
Cinco faixas no fim do playbook, e uma escada declarada que vai até os selos de Ferumbras.

**Architecture:** metade da máquina já é genérica e não deve ser reescrita — a extração já roda sobre
o diretório inteiro de selections, e a seleção de asset já é derivada da região. O que falta é
metadado de apresentação, um índice gerado, e o jogo saber que existe mais de uma hunt.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Phaser 4, Playwright 1.62.1, Node 24.14.0. **Nenhuma biblioteca nova.**

**Spec congelada:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`.

## Por que este playbook foi reescrito

O PB-10 era "Novas criaturas": dar à caverna de rotworm um trash de massa, um ranged e um caster. O
diagnóstico continua certo — `spawns.json` tem **20 slots, 100% rotworm**, e contra uma espécie melee
metade do kit do Knight é botão morto.

O que mudou é o enquadramento, pedido pelo usuário em 2026-08-26 com o *Hunting Places* do TibiaRoute
na mão: o problema não é a caverna ter uma espécie, é **o jogo ter uma caverna**. E as criaturas que
o PB-10 antigo queria importar — orc, orc spearman, orc shaman — não são um remendo na rotworm: são
**o conteúdo da segunda hunt**, Orc Fortress.

Nada do diagnóstico antigo se perde. Ele virou a faixa 2.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `AGENTS.md`;
2. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
3. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
4. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
5. `docs/08_POLITICA_MODELOS_AGENTES.md`;
6. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
7. `docs/architecture/PACKAGE_BOUNDARIES.md`;
8. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
9. `docs/content/MAP_REGION_CONTRACT.md` e `docs/content/IDENTITY_POLICY.md`;
10. **a spec congelada** deste playbook;
11. `docs/content/HUNT_BANDS.md` — **entregue pela PB-10-02**; a partir dali é a fonte da escada de
    hunts, e vence a tabela "As cinco faixas do MVP" abaixo, que é a proposta e não o resultado;
12. este README;
13. a task card em execução;
14. `STATE.md` apenas para estado operacional.

## As cinco faixas do MVP

Proposta de 2026-08-26. **Congelada pela PB-10-02, contra o snapshot — não antes.**

| Faixa | Nível | Hunt | O que ela acrescenta que nenhuma anterior tem |
|---|---|---|---|
| 1 | 8 | Venore Rotworm Cave | já existe |
| 2 | ~25 | Orc Fortress | **ranged** (orc spearman, 0-30 de dano a 7 tiles) e **caster** (orc shaman, com autocura) |
| 3 | ~45 | Cyclopolis | melee que **não morre em dois golpes**; obriga postura e cura a existirem |
| 4 | ~70 | Dragon Lair | ataque **de longe com área**, e fogo |
| 5 | ~130 | Hero Cave | o teto do que o kit atual aguenta |

Cada faixa entra porque acrescenta um **comportamento** que nenhuma anterior tem. Uma hunt que seja
"a anterior com números maiores" não entra — é o princípio de design do PB-08 aplicado a hunt.

## A escada completa

Foi inteira para o `HUNT_BANDS.md` na PB-10-02, com o **portão** de cada degrau escrito ao lado. Da
faixa 6 em diante o portão quase nunca é arte: é kernel que ainda não existe. A tabela abaixo é o
resumo; o documento é a fonte.

| Degrau | Hunts | Portão |
|---|---|---|
| 1-5 | rotworm, orc fortress, cyclopolis, dragon lair, hero cave | **este playbook** |
| 6-7 | começo de Oramond, Asura Palace | mitigação elemental — **PB-11** |
| 8-9 | Medusa Tower, Deeper Banuta | condição que trava o jogador, e onda de área com forma |
| 10-11 | Roshamuul, livrarias | criatura que invoca criatura |
| 12-14 | War Zones 1 a 3, Cobra Bastion, Falcon | boss com fase, e fim de run — **PB-11** |
| 15 | selos de Ferumbras | tudo acima junto |

Nenhum desses degraus é escrito antes do portão abrir. Escrever a hunt antes da peça produz conteúdo
que o jogo não sabe rodar.

## Decisões congeladas

Detalhe e justificativa na spec. Aqui só o que uma task não pode redecidir sozinha:

1. **Os números do card são derivados do snapshot Canary**, num artefato gerado com `--check`.
   TibiaRoute escolhe *qual* hunt; ele não é fonte de dado.
2. **A hunt resolve o personagem**, até o PB-09 existir. Escolher a hunt escolhe a faixa. É
   temporário e está escrito para ser revogado.
3. **Um pack de asset por hunt**, carregado depois da escolha.
4. **A tela vive no boot.** O cockpit da PB-08 não é tocado, e não há troca de hunt no meio da run.
5. **Nenhum spawn é inventado.** Toda criatura sai do catálogo; todo spawn tem origem real em
   `otservbr-monster.xml`, declarada em `spawnPlacements`.
6. **Dano elemental entra cheio, mitigação não.** Fogo de dragão e de hero é registrado e aplicado;
   resistência liga no PB-11, junto do equipamento que responde a ela.
7. **Espécie e hunt não são escada.** Cada uma entra por um comportamento visível que nenhuma outra
   tem.

## Ordem das tasks

Decomposta por **fronteira de pipeline**, não por contagem de arquivos.

| # | Task | Fronteira |
|---|---|---|
| 01 | Spawn por identidade estável | contrato e kernel — **o B9** |
| 02 | A escada de hunts | curadoria, com evidência local |
| 03 | O pipeline deixa de ser de uma hunt só | tools e scripts, sem conteúdo novo |
| 04 | Índice de hunts como artefato gerado | contrato e gerador |
| 05 | A tela de hunting places | `apps/game`, DOM fora do canvas |
| 06 | Criatura conjura | kernel e IA |
| 07-10 | Uma task por hunt, faixas 2 a 5 | conteúdo — **sobretudo mapa** |
| 11 | A `main` volta a ficar verde | investigação — **o B19** |
| 12 | O corpo é da espécie que morreu | importador, contrato, packer e `apps/game` — **o B20** |

**Fechadas: 01 a 10 — a máquina do catálogo está inteira e as cinco hunts estão na `main`. Escritas e
elegíveis: 11 e 12.**

As duas últimas nasceram do **aceite**: o usuário jogou em 2026-08-30, aprovou as cavernas e apontou o
corpo errado. Elas fecham o playbook, e a **12 é a task de fechamento** — é ela que roda o `verify`
completo, conforme a revisão de processo de 2026-08-30 no `docs/06`.

O que ele apontou junto e **não** virou task daqui: as faixas 2 a 5 não são concluíveis, porque
`finish('completed')` não é chamado em lugar nenhum e a mitigação está desligada pela decisão
congelada 6. Isso é o **PB-11** inteiro, e está registrado como B21 no `STATE.md`.

As quatro de conteúdo foram escritas juntas, o que é exceção à regra do `AGENTS.md` de congelar só as
duas próximas. A exceção se justifica porque o motivo da regra não morde aqui: as quatro têm a mesma
forma, a máquina que elas consomem está fechada e não muda mais, e **todos os dados já estão
congelados com `sha256`** pela PB-10-02 desde 2026-08-26. Não há contra o que envelhecer.

### As tasks de hunt são, principalmente, mapa

Decisão do usuário em 2026-08-26. As faixas 2 a 5 já têm caixa, espécies, números, loot e `lookType`
congelados com `sha256` pela PB-10-02 — a curadoria acabou. O que resta em cada uma é **a receita de
layout autorada**, e ela domina o trabalho: a da rotworm tem 3087 linhas para um 24 × 24 de dois
andares. Os mobs são o elenco de apoio; o recorte jogável é a entrega.

As quatro, e o risco de design de cada uma — que é o que muda entre elas:

- **07 — Orc Fortress**, faixa 2. Consome a PB-10-06. Orc e Orc Spearman entram no catálogo; o Shaman
  já está. Snake **não** entra: `summons` é o portão das faixas 10–11.
- **08 — Cyclopolis**, faixa 3. Só Cyclops. Nenhum portão de kernel. O `armor` 17 fica inerte até o
  PB-11.
- **09 — Dragon Lair (Ankrahmun)**, faixa 4. **A hunt entra inteira.** Dos dois ataques de fogo do
  Lua, o de `range` 7 + `radius` 4 é o degrau e **entra**; o de `length` 8 / `spread` 3 é onda,
  `AbilityShape` não tem `'wave'`, e ele simplesmente **não é adicionado** — isso remove um ataque,
  não a hunt nem a criatura. Risco: **a faixa virar parede**, porque sem mitigação dois blocos
  sobrepostos tiram 280 de 1 115 HP. Recorte em câmaras.
- **10 — Hero Cave**, faixa 5. O heal é o teto do kit. **O Hero não traz fogo** — a spec dizia que
  sim, o Lua disse que não, e o arquivo venceu. Risco: **filtragem**, 24 Heroes entre 184 slots (13 %),
  contra 43–67 % nas outras três.

### A 05 e a 06 rodam em paralelo

A 05 vive em `apps/game` e a 06 no kernel e em `buildHuntScenario`; não compartilham arquivo. Depois
das duas, a máquina do catálogo está inteira e o que resta são as hunts — uma task por faixa.

### Por que a 06 provavelmente não regenera golden

O quadro "Ordem das tasks" previa que sim. Conferido nos fixtures: em `pb04` e `pb05` o rotworm tem
`abilityIndices: []` e o único ator com habilidades é o jogador, que é `inert`. Nenhum ator dirigido
por IA tem habilidade em golden nenhum, então um gatilho guardado em `abilityIndices.length > 0`
deixa `streams.ai` intacto e os goldens verdes. O card trata isso como critério de aceite.

### Por que a 01 vem primeiro

O bloqueio B9: o snapshot de save referencia spawn por `(groupIndex, slotIndex)`
(`SpawnSlotStateSchema` em `packages/contracts/src/simulation/schemas.ts:1268`), então **toda mudança
de conteúdo de hunt invalida todo save existente**. Custou 8 testes vermelhos e um ciclo de conserto
na PB-08-01, com **uma** mudança de conteúdo.

Este playbook mexe em conteúdo de hunt **cinco vezes**. É a única task que fica mais cara a cada hunt
adicionada, então é a única que não pode esperar.

### Por que a 02 vem em segundo

Porque ela impede as duas descobertas caras: **faltar sprite na quarta hunt**, e **escrever uma hunt
cujo comportamento o kernel não sabe executar**. As duas custam um ciclo inteiro se aparecerem no
meio de uma task de conteúdo, e nenhuma delas aparece se a escada for levantada antes.

### Por que a 03 vem antes da 04

A 03 generaliza o `sidecar-check` para iterar os subdiretórios de
`packages/content/src/generated/hunts/`, e é exatamente ele que passa a cobrir o `index.json` que a
04 cria naquele diretório. Na ordem inversa o índice nasceria sem sidecar conferido, e as duas tasks
brigariam pelo mesmo bloco de `package.json`. **São seriais.**

## Modelo e effort por task

`docs/08_POLITICA_MODELOS_AGENTES.md` é normativo. Alocação prevista:

| Task      | Classe                                                                                 | Modelo previsto                                      |
| --------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| PB-10-01  | implementação complexa — contrato integrado, kernel, migração de save, regenera golden | frontier `xhigh`                                     |
| PB-10-02  | especificação e curadoria                                                              | frontier `xhigh`                                     |
| PB-10-03  | implementação bem especificada — refactor sem conteúdo novo                            | econômico `xhigh`                                    |
| PB-10-04  | implementação bem especificada — gerador com `--check`                                 | econômico `xhigh`                                    |
| PB-10-05  | apresentação em `apps/game`                                                            | econômico `xhigh`, **validado pelo usuário jogando** |
| PB-10-06  | implementação complexa — IA e kernel, regenera golden                                  | frontier `xhigh`                                     |
| PB-10-07+ | conteúdo, uma hunt por task                                                            | econômico `xhigh`                                    |

Revisão prefere modelo **diferente** do implementador. Modelo e effort efetivamente usados vão para o
`STATE.md`.

## O aceite

O playbook não fecha por veredito de auditoria. Fecha quando o usuário abre o jogo, vê o catálogo,
escolhe uma hunt de cada faixa e joga. O que cada task entrega para isso: `corepack pnpm verify`
verde, `corepack pnpm dev` de pé, e uma frase dizendo **o que olhar** e **como reproduzir**.

## Dependências

**PB-08 integrado** — está, em `80be90b`. A 08-10 foi cancelada.

Este playbook **roda antes do PB-09**, que hoje é esqueleto e começa por design doc. A regra do
`06_ROTEIRO` permite: nenhum playbook espera o fechamento formal de outro; o que se exige do anterior
é código integrado na `main` e verde, verificável por `git log` e `verify`.
