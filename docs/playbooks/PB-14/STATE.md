# PB-14 — Estado

**Estado:** PB-14-03 implementada e reimportada do snapshot pela FIX-01; 04 a 07 pendentes.
**Próxima:** PB-14-03.

| ID | Status | Modelo previsto | Modelo / effort usado | Commit |
|---|---|---|---|---|
| PB-14-01 | done | Claude Opus 5 `xhigh` | Claude Opus 5 (effort alto) | `7e2f807` |
| PB-14-02 | done | Grok 4.6 `xhigh` | Cursor Grok 4.6 (effort alto) | `1b7efc7` |
| PB-14-03 | done | GPT-5.6 Luna `xhigh` | Codex GPT-5 (effort alto) | `74cfa53` |
| PB-14-03-FIX-01 | done | — | Claude Opus 5 (effort alto) | `7bdafce` |
| PB-14-04 | pending | GPT-5.6 Luna `xhigh` | — | — |
| PB-14-05 | pending | Grok 4.6 `xhigh` | — | — |
| PB-14-06 | pending | GPT-5.6 Sol `xhigh` | — | — |
| PB-14-07 | pending | Claude Opus 5 `xhigh` | — | — |

## Escopo recebido em 2026-09-09

A revisão dos playbooks 15, 17 e 18 trouxe a antiga `PB-17-05` para cá como **PB-14-07**, o log de
combate. Ela era dada como absorvida pelo roteiro, mas não era: a PB-13-09 entregou o feed do
*helper*, que narra o que o helper fez, não dano, cura, leech, regen, loot, morte nem recusa de
comando. Com três vocações no mesmo encontro, é ela que torna a diferença entre elas legível. Passa
a ser a task de fechamento e roda `build`.

## Decisões pendentes

**Fechadas pela PB-14-01** em `docs/superpowers/specs/2026-09-09-pb-14-01-kits-design.md`: a conta
guarda **três personagens independentes**, um por vocação, com bestiary e conquistas promovidos à
raiz do save; e o set de uma faixa é **armadura compartilhada, arma filtrada por `weaponType` da
vocação**, com arma inata por vocação e sem economia de munição. O mesmo documento traz os kits
curados, os três papéis de monstro e o inventário de lacunas de contrato que as cards 02 e 05
consomem.

**PB-14-02 fechou as lacunas 1, 2, 5, 7, 8 e 10.** Schema de simulação não subiu: formas novas são
aditivas e o Knight continua `attackRangeTiles` 1 / `skills.sword`. `distanceWeaponDamage` reusa o
coeficiente melee 0.085 até o import provar `distDamage` diferente. Helper de hunt ainda só conhece
`target`/`area` — a 03 liga cone e target-area ao kit.

## Bloqueios

**B29 — aberto. Fecha rodando `import-canary` numa máquina com o snapshot.** Metade de itens do B27
do PB-13 continua aberta: `packages/content/src/generated/pb-01-contract-coverage.json` tem 87 itens
e **nenhum** com `slotType`, `weaponType`, `attack`, `armor` ou `defense`. O schema aceita os campos
desde a PB-13-04 e `parseItemsXml` os lê (agora também `range` → `rangeTiles`), mas eles só entram
pelo import. Enquanto isso nenhum set resolve, para nenhuma vocação, e o painel de equipamento conta
`0 / 0` — o que torna a decisão B da PB-14-01 inobservável no jogo. A PB-14-01 correu num checkout
macOS sem snapshot (`HUNTBOUND_CANARY_SOURCE` indefinida, `references/` vazia), e por isso nenhum
número de Canary foi congelado: identidade de spell sim, mana/cooldown/fórmula não. As cards 03 e 04
precisam do import antes de autorar as fichas.

Contrato, schema e golden estão autorizados por card; nenhuma migração foi feita por este
planejamento. Modelos/effort efetivos são registrados por task.

## PB-14-03-FIX-01 — os números do Sorcerer vinham de lugar nenhum

A primeira integração da 03 rodou num host **sem** `references/canary`: o source lock aponta 20
arquivos do snapshot e nenhum existia. A curadoria da 01 tinha deixado escrito que nada de número
seria congelado ali e que tudo entraria pelo import da 03 (§ "Nada de mana, cooldown, coeficiente de
fórmula…"), então a 03 inventou `baseSpeed` 105, os sete `skillMultipliers` em 1.1, `level` 1 nas
oito magias, e mana, cooldown e coeficiente de fórmula de todas elas. As cargas das duas runas
saíram 3 e 2 contra os 4 e 3 do `rune:charges()`.

O desenho não mudou — as oito ações, formas, papéis, os dois toggles no mesmo grupo de exclusividade
e a stance como `damageDealtPermille` estavam fiéis à curadoria. Só os números foram reimportados,
com proveniência em `docs/content/PB-14-SELECTION.md` e nove arquivos novos no lock.

**Uma ambiguidade resolvida sem parar:** as duas runas ficaram com `mana` 0. A mana de 530 e 985 nos
scripts de `conjuring` compra o item, e a ADR-05 trocou fabricação por recarga fora de combate — o
custo é a carga. Reverter é trocar dois zeros.

## Pendências que a FIX-01 não abriu nem fechou

- O lock guarda hashes de um checkout **CRLF**. Em host Unix o clone vem LF e os quinze arquivos de
  texto batem errado; a correção é `git config core.autocrlf true` no clone de referência, nunca
  reescrever o lock. Merece uma linha no `AGENTS.md § Fontes externas`.
- `AREA_WAVE4` e `AREA_CIRCLE3X3` do Canary não têm tradução direta no grid do V0. A forma e o raio
  das três magias de área continuam sendo a escolha da curadoria, não import.
