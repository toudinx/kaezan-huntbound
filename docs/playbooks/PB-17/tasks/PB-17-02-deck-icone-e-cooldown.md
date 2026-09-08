# PB-17-02 — O deck com ícone e cooldown que se lê de relance

> **Histórico; não executar.** A fila vigente recomeça no [PB-13](../../PB-13/README.md).
> Entregas integradas permanecem; pendências foram absorvidas pelas cards novas.


**Status inicial:** pending. **Depende da PB-17-01.**

**Classe da tarefa:** apresentação. Superfície pequena, estado já projetado.

**Modelo sugerido:** camada econômica, effort `xhigh`.

**Paralelismo:** roda sozinha.

## Objetivo

Olhando o deck por meio segundo o jogador sabe **qual ação é qual** e **quanto falta**.

Hoje a célula tem tecla, custo, um glifo 5×5 de área de efeito e um número em segundos que troca uma
vez por segundo. O número é a pior parte: `4s` parado por um segundo inteiro não diz se falta muito.

## O que entra

- **O ícone do Tibia na célula**, resolvido pela chave que a PB-17-01 entregou.
- **O cooldown como varredura**, não como número solto: a célula escurece e a varredura anda a cada
  frame. O número em segundos continua, menor, para quem quer o valor exato.
- **A distinção que já existe no modelo continua visível.** `cooldownScope` distingue `group` de
  `ability` porque Challenge e Haste gastam o grupo de suporte e nunca são tocados pelo grupo de
  ataque — o deck já sabe disso e não pode perder a distinção ao ganhar o ícone.
- **Indisponível por mana ≠ indisponível por cooldown.** São duas razões diferentes e hoje se parecem.
- O glifo de área **fica**. `AbilityGlyph.ts` diz por quê, e está certo: o ícone diz *qual* magia, o
  glifo diz *onde ela cai*. Quando o atlas chegasse, "ele vai **ao lado** disto, não por cima". Ache
  onde — hover, canto da célula, o que couber — sem esconder o ícone.

## Paths

- `apps/game/src/ui/cockpit/ActionDeck.ts`
- `apps/game/src/ui/cockpit/AbilityGlyph.ts`
- `apps/game/src/ui/CombatHud.ts` — só se a resolução de asset precisar descer
- `apps/game/src/styles.css`

## O custo que já foi pago uma vez — não pague de novo

`ActionDeck.ts` renderiza **a cada frame** e todo write passa por `write()`, que descarta o valor
igual ao último. Nove células × dez atributos = seiscentas invalidações de estilo por segundo se
você escrever direto. A varredura é a tentação óbvia aqui: ela muda todo frame **por desenho**, então
faça-a por uma propriedade que não invalide layout, e mantenha o resto guardado.

## Escopo negativo

Nada de barra de atalhos configurável (é PB-15), nada de reordenar as células — a ordem visual e o
mapeamento `DigitN` → índice `N-1` foram decididos em playtest e não se mexem aqui.

## Aceite

`corepack pnpm dev`, entrar numa hunt, apertar 1 e 6: o ícone certo aparece, a varredura anda, e
Challenge escurecer não escurece as magias de dano.

## Gates

`biome check .`, mais `typecheck` se assinatura mudou, mais `corepack pnpm test`. O browser é do
usuário.
