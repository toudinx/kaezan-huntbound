# PB-08-01 — A caverna cabe num box

**Status inicial:** pending

**Classe da tarefa:** re-extração de mapa por parâmetro de selection; sem código de regra

**Modelo sugerido:** modelo econômico com effort alto

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`, `hunt-content-pipeline`.

**Paralelismo:** **primeira e sozinha.** PB-08-02 e PB-08-03 só se julgam depois de jogar com o
resultado desta. PB-08-05 pode rodar em paralelo.

## Objetivo

Dar à hunt um lugar onde caibam 4–8 rotworms juntos. Hoje não existe — e essa ausência sozinha
produz três das cinco reclamações do jogador.

## Por que esta task vem primeiro

Medindo o cenário composto, o kit do Knight **não está quebrado**: `exori` já é área de raio 1, bate
48–129 por alvo e mata rotworm de 65 HP num golpe em ~79% dos casos. O jogador anda a 0,55 s por
passo contra 1,05 s do rotworm, então puxar funciona.

O que falta é **em quem bater**. Num box de quatro, um `exori` limpa o box e devolve ~26 HP e
~26 mana de leech; da pool de 185 saem dois boxes, e recarregar leva ~46 s fora de combate. Esse é
exatamente o ritmo que o PB-07-04 desenhou e que nunca teve onde acontecer.

Por isso: **não recuste magia, não mexa em leech e não toque no kit nesta task.** A hipótese a testar
é que a densidade resolve os três sintomas sozinha. Se depois de jogar ela não resolver, aí sim se
escreve a task de economia — com evidência, não com suposição.

## O defeito, com evidência

`packages/content/src/generated/hunts/venore-rotworm-cave/spawns.json`, medido:

- **8 grupos, 12 slots, `maxLiveActors: 12`**, `respawnTicks: 1800` (90 s);
- grupos de **1 ou 2 slots**, raio 2–3, espalhados por dois andares;
- região de **24×24**.

O máximo teórico de criaturas num mesmo grupo é **dois**. Puxar um box de quatro exige atravessar a
caverna juntando de grupos diferentes, contra um respawn de 90 s. Não é questão de habilidade: é
geometria.

E a própria selection já autoriza o conserto —
`packages/content/src/selections/hunts/venore-rotworm-cave.json` declara
`budget: { maxFloors: 3, maxWidth: 96, maxHeight: 96 }` e pede uma janela de 29×33. **Estamos usando
um sexto da área que o orçamento permite.** O PB-07 já havia apontado isso na observação 6.

## Resultado esperado

Uma região extraída da mesma caverna, com área maior, em que existe pelo menos um grupo com **quatro
ou mais slots** dentro de raio 3 — um spot de box de verdade, vindo do mapa real do Canary.

## Dependências

Nenhuma. Roda sobre a `main` atual.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-08/README.md`, decisão congelada 5;
3. `.cursor/rules/20-content.mdc` e `.cursor/rules/50-tests.mdc`;
4. skill `hunt-content-pipeline`;
5. `packages/content/src/selections/hunts/venore-rotworm-cave.json`;
6. `packages/content/src/layouts/hunts/venore-rotworm-cave.json`;
7. `tools/map-extractor/**` — `build-all`, `sources` e `sidecar-check`;
8. `packages/content/src/generated/hunts/venore-rotworm-cave/**` — saída de CLI, **nunca editada à
   mão**.

## Decisões congeladas

- **Nenhum spawn é inventado.** A densidade vem de `otservbr-monster.xml`, pela área maior. Se o
  mapa real não tiver um grupo de quatro, a resposta é ampliar mais ou escolher outro trecho da
  caverna — nunca somar slots à mão.
- **O budget de 96×96 é teto, não meta.** Cresça até achar o spot de box e pare. Região maior custa
  memória, tempo de boot e orçamento de asset, e existe `qa:budgets` para cobrar isso.
- **`expectedSpawnGroups`, `expectedSpawnSlots` e `maxLiveActors` são atualizados para o que o mapa
  devolver**, não para o que gostaríamos.
- **Artefato gerado não se edita.** Rode `corepack pnpm hunt:extract` e valide com
  `hunt:extract:check` e `hunt:extract:sidecar`.

## Ambiguidade conhecida — e a saída

Área maior traz criaturas além do rotworm — a caverna de Venore tem vizinhança. A selection tem
`creatures` e `excludedCreatures` para decidir.

**Default: manter a variedade** via `creatures`, porque mais espécies servem ao objetivo do
playbook. Se alguma não estiver no catálogo, o `content:check` vai reprovar com `HUNT_UNKNOWN_CREATURE`;
nesse caso ponha a espécie em `excludedCreatures`, registre a escolha em uma linha no commit e abra
uma task de importação no backlog. **Não pare o ciclo por isso.**

## Passos

1. **Teste primeiro.** Um teste que lê o `spawns.json` gerado e afirma: existe ao menos um grupo com
   `slots.length >= 4` e `radius <= 3`. Ele falha hoje — é o vermelho que autoriza a mudança.
2. Rode `corepack pnpm hunt:sources:check` para confirmar que a fonte do mapa resolve antes de
   ampliar.
3. Amplie `region.minX/maxX/minY/maxY` na selection, dentro do budget.
4. `corepack pnpm hunt:extract`; inspecione o `spawns.json` gerado; itere na janela até o teste
   passar.
5. Atualize `expectedSpawnGroups`, `expectedSpawnSlots` e `maxLiveActors`.
6. Confira o layout: `packages/content/src/layouts/hunts/venore-rotworm-cave.json` pode precisar de
   `playerStart` coerente com a região nova.
7. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm test`
- `corepack pnpm hunt:extract:check`
- `corepack pnpm hunt:extract:sidecar`
- `corepack pnpm content:check`
- `corepack pnpm hunt:check` — golden do PB-04 **inalterado**; ele usa fixture própria, não a hunt
  gerada. Se quebrar, pare e registre bloqueio.
- `corepack pnpm assets:pb04:hunt:check` — o pack de asset é validado **contra o `region.json`**.
  Região nova provavelmente exige regenerar o pack; se exigir, faça pelo CLI, nunca à mão.
- `corepack pnpm qa:browser` — a região maior muda boot e câmera.
- `corepack pnpm verify` no fechamento.

## Risco conhecido

Região maior é o caminho mais provável para estourar `boot-budget.spec.ts` ou `hunt-budget.spec.ts`.
Lembre: **`qa:budgets` é camada informativa**. Meça, registre o número no `STATE.md`, e abra task de
performance se vermelho. **Não bloqueie merge por orçamento.**

## Definition of Done

- [ ] Existe grupo com ≥4 slots em raio ≤3, provado por teste sobre o artefato gerado.
- [ ] Artefatos regenerados por CLI; `hunt:extract:check` e sidecar verdes.
- [ ] Pack de asset coerente com a região nova.
- [ ] `verify` verde; `qa:budgets` medido e registrado.
- [ ] `STATE.md` atualizado só na linha da task.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.
