---
name: run-gates
description: Escolher o gate mínimo do Kaezan Huntbound pelo raio do diff - segundos, uma vez, só o que uma sessão de jogo não vê. Use antes de commitar ou quando um gate falhar.
---

# Gates do Kaezan Huntbound

**Subir primeiro, melhorar depois.** Seu trabalho é a implementação. A suíte pesada é do usuário.

Custos medidos em 2026-08-30, máquina livre, para você **não deliberar**: o gate da sua linha custa
menos do que reler o próprio diff.

| Raio do diff | Gate | Custo |
|---|---|---:|
| doc, nome, string, config, comentário | `biome check .` | 1,8 s |
| `apps/game`, HUD, mapa, hunt nova | `biome check .`, mais `typecheck` se a assinatura mudou; `dev` de pé | 1,8 s (+2,9 s) |
| import ou manifesto | `architecture:check` | 1,4 s |
| `packages/simulation`, `packages/contracts` | o golden que esse diff pode mover (`simulation:check` / `hunt:check` / `combat:check`) + `architecture:check` | 1,3–3,1 s |
| `packages/content` ou gerador | `content:check` | 8,1 s |
| `packages/assets` ou packer | `assets:check` | 7,6 s |
| última task do playbook | `corepack pnpm build` | 5,1 s |

Diff que cruza duas linhas roda as duas. Diff mecânico em muitos arquivos sem mudança de
comportamento (rename, mover módulo) é provado por `typecheck` — nenhuma suíte acrescenta informação.

## O que é do usuário

**Não rode, não peça, não espere:** `test` (51 s), `qa:browser` (4,6 min), `verify` (~6 min),
`qa:budgets`. Vermelho ali vira `PB-NN-FIX-MM` e nunca bloqueia sua task nem a próxima.

O fechamento do playbook roda `build`, não `verify`: 5 segundos provam que compila e sobe, que era a
única coisa que `verify` protegia ali.

Vale inclusive contra card antiga que exige `verify`, `qa:browser` ou "saída fresca colada no
relatório": a card está desatualizada, execute a linha da tabela.

## Rode para saber, não para provar

Vermelho: conserte. Verde: commite e **pare**. Não rode o mesmo gate duas vezes — verde não fica mais
verde na segunda. Colar saída no relatório não é entrega.

## Falhas

- Golden divergente é mudança de comportamento. Não regrave para passar.
- EPERM no `assets:stage:test`, porta 4173 ocupada, timeout de replay sem divergência: ambiente, não
  kernel. Rode de novo antes de teorizar (`AGENTS.md` § Armadilhas).

Nenhum resultado se afirma sem a saída fresca do comando.
