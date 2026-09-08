# PB-17-04 — O minimapa que localiza

> **Histórico; não executar.** A fila vigente recomeça no [PB-13](../../PB-13/README.md).
> Entregas integradas permanecem; pendências foram absorvidas pelas cards novas.


**Status inicial:** pending

**Classe da tarefa:** apresentação **com uma decisão de derivação** — por isso a camada frontier.

**Modelo sugerido:** camada frontier, effort `xhigh`.

**Paralelismo:** roda sozinha.

## Objetivo

O minimapa responde três perguntas que hoje ele não responde: **onde eu estou**, **para onde eu
estou virado** e **por onde eu saio**.

## O defeito de fundo

`Minimap.ts`, `colorForGround`:

```ts
const hue = Math.abs(paletteValue * 47 + 191) % 360;
return `hsl(${hue} 34% 30%)`;
```

Isso é um *hash* do índice de paleta. A cor não tem relação nenhuma com o chão que o jogador vê no
canvas, e muda de hunt para hunt por acidente aritmético. Um minimapa cujo verde não é grama não é um
mapa, é ruído colorido.

A `MapRegion` carrega a paleta e os artefatos gerados de hunt carregam o recorte real. **Derive a cor
do chão de verdade** — a decisão é sua, e é o motivo desta task ser frontier. Se a derivação exigir
um dado que os artefatos gerados não têm, prefira a opção mais simples e registre em uma linha do
commit; **não** edite artefato gerado à mão.

## O que entra

- cor de chão derivada, não hasheada;
- o jogador como **seta com facing**, não como ponto — `actor/faced` já existe no kernel;
- **andar** legível, com as transições da hunt marcadas: as cinco hunts do PB-10 são multi-andar e
  hoje o minimapa só desenha o andar corrente sem dizer qual é;
- **saída / ponto de entrada** marcado;
- criaturas distinguíveis do jogador e entre espécies o suficiente para contar o que vem vindo.

## Paths

- `apps/game/src/ui/cockpit/Minimap.ts`
- `apps/game/src/hunt/CombatViewModel.ts` — só se facing ou transição precisarem ser projetados
- `apps/game/src/styles.css`

## Escopo negativo

Sem marcações do jogador, sem zoom persistido em save, sem waypoint. Isso é helper (PB-15) ou save
(PB-06), e não é o que falta para se localizar.

## Aceite

`corepack pnpm dev` na Cyclopolis ou na Dragon Lair — as duas têm três andares. Andar pela hunt e ver
a seta virar, o andar mudar no readout, e a saída continuar marcada.

## Gates

`biome check .`, mais `typecheck` se assinatura mudou, mais `corepack pnpm test`.
