# PB-17 — O cockpit

> **Para agentes executores:** **nenhuma skill externa é obrigatória.** Skills operacionais do
> repositório: `playbook-task`, `run-gates`, `hunt-content-pipeline`. Uma task card por chat. O
> formato e o handoff seguem `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** **elegível**. Roda depois da PB-10-12 e **antes do PB-09**. Não espera fechamento formal
de ninguém: a dependência real é código integrado na `main`.

**Goal:** o cockpit deixa de ser legível para quem o escreveu e passa a ser legível para quem joga.
Nove ícones do Tibia no deck com cooldown que se lê de relance, uma mochila que parece uma mochila,
um minimapa que diz onde você está, e uma linha de texto que diz o que acabou de acontecer com você.

**Architecture:** o chassi já existe e **não se reescreve**. `CockpitLayout` publica as bandas,
`playfieldViewport` é a única fonte de medida, `CombatViewModel` é a fronteira de projeção e a
simulação continua sem saber que DOM existe. Este playbook enche as superfícies que o PB-08-08/09
deixou de pé — mais uma categoria de asset, que é a única peça fora de `apps/game`.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`), Vitest
4.1.10, Vite 8.2.1, Phaser 4, Node 24.14.0. **Nenhuma biblioteca nova.**

## Por que este playbook existe

O PB-08 e o PB-10 entregaram sistema: nove ações que se distinguem, cinco hunts, IA que conjura,
leech e regen no kernel. O que eles **não** entregaram foi a leitura disso na tela.

Hoje, jogando, o jogador não sabe:

- **qual botão é qual.** O deck desenha um glifo de área de efeito 5×5 e a tecla. Os nove ícones do
  Tibia estão a um recorte de distância desde 2026-08-25 e o usuário já autorizou a categoria;
- **quanto falta do cooldown**, a não ser lendo um número em segundos que troca uma vez por segundo;
- **por que a vida subiu.** `combat/leeched` e `combat/regenerated` existem no kernel e **nada na
  tela os menciona** — a sustentação do Knight, que foi o PB-07 inteiro, é invisível;
- **por que o comando não saiu.** `command/rejected` é emitido e descartado;
- **onde ele está.** O minimapa colore o chão por *hash* HSL do valor de paleta: cada hunt sai com
  uma cor arbitrária que não tem relação com o que se vê no chão;
- **o que caiu.** `loot/granted` só aparece se o jogador olhar a mochila e notar um número mudar.

Nada disso é feature nova. É o sistema que já roda, dito na tela.

## Fronteira com os outros playbooks

Este playbook é de **apresentação**. Ele não inventa regra, não toca no kernel e não muda golden.

| Não é deste playbook | É de quem |
|---|---|
| stats de item, slots equipáveis, `armor` no kernel | PB-11 |
| level, XP, skills, Códex | PB-09 |
| barra de atalhos configurável, alvo automático, loot automático | PB-15 (helper) |
| troca de outfit e cores | PB-13 |
| condições novas, stances novas | PB-07, congelado |

Se uma task aqui precisar de um dado que a simulação não projeta, o caminho é **projetar no
`CombatViewModel`**, nunca decidir regra na view.

## Fontes normativas

Em conflito, nesta ordem:

1. `AGENTS.md`;
2. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
3. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
4. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
5. `docs/architecture/PACKAGE_BOUNDARIES.md`;
6. `docs/assets/MANIFEST_CONTRACT.md`, `docs/assets/ASSET_PACKER.md`, `docs/assets/ASSET_PROFILES.md`;
7. **`docs/assets/SPELL_ICON_INDEX.md`** — medido, é a fonte do par ability → `clientId`;
8. `.cursor/rules/40-game.mdc` e `.cursor/rules/30-assets.mdc`;
9. este README;
10. a task card em execução;
11. `STATE.md` apenas para estado operacional.

## Tasks

| ID | Entrega | Depende de |
|---|---|---|
| PB-17-01 | a categoria `spell`, o recorte do atlas e os nove PNGs no pack pessoal — fecha o B13 | — |
| PB-17-02 | o deck desenha o ícone e o cooldown vira varredura, não só um número | 01 |
| PB-17-03 | a mochila: sprite, empilhamento, nome no hover e o loot chegando visível | — |
| PB-17-04 | o minimapa localiza: cor de chão real, seta com facing, andar, saídas | — |
| PB-17-05 | o log de combate: dano, cura, leech, regen, loot, morte e recusa de comando. **Task de fechamento — roda `build`.** | — |
| PB-17-FIX-02 | os painéis do HUD desenham um frame do atlas, não a folha inteira — bug do playtest de 2026-08-31 | 02, 03 |

**Serial na `main`, sem worktree.** As cinco tocam `apps/game/src/styles.css`, então elas não são
genuinamente paralelas no sentido do `AGENTS.md`, mesmo com os componentes disjuntos. Uma task por
chat, em sequência.

## Modelo e effort por task

`docs/08_POLITICA_MODELOS_AGENTES.md` é normativo.

| ID | Camada | Effort | Por quê |
|---|---|---|---|
| PB-17-01 | econômico | `xhigh` | especificada até o `clientId`; o custo é pipeline, não decisão |
| PB-17-02 | econômico | `xhigh` | superfície pequena, comportamento já projetado pelo view model |
| PB-17-03 | econômico | `xhigh` | idem, com cuidado de não entrar no PB-11 |
| PB-17-04 | **frontier** | `xhigh` | cor de chão real exige ler a paleta da região e decidir a derivação |
| PB-17-05 | **frontier** | `xhigh` | desenha uma superfície que não existe e escolhe o que **não** entra nela |
| PB-17-FIX-02 | econômico | `xhigh` | defeito e causa já localizados; o custo é recorte, não decisão |

## Definition of Done do playbook

O usuário abre o jogo no perfil `personal`, entra numa hunt e, sem ler documentação:

- reconhece as nove ações pelo ícone;
- vê o cooldown andar;
- vê o loot cair, com sprite, e a linha de texto que diz o que caiu;
- sabe em que andar está e para onde é a saída;
- entende por que a vida subiu sozinha.

**A armadilha de aceite:** o perfil `test` fabrica um PNG 1 × 1 para qualquer id pedido. `verify` e
`qa:browser` fecham verdes com **zero arte na tela**. A prova de arte é sempre o perfil `personal`,
e ela é do usuário jogando — não de um gate.
