---
name: run-gates
description: Escolher o gate mínimo do Kaezan Huntbound pelo raio do diff - só o que uma sessão de jogo não vê. Use antes de commitar ou quando um gate falhar.
---

# Gates do Kaezan Huntbound

O custo é proporcional ao raio do diff. Pare no primeiro vermelho. Não empilhe.

| Raio do diff | Gate |
|---|---|
| doc, nome, string, config, comentário | `biome check .` |
| `apps/game`, HUD, mapa, hunt nova | `biome check .` + `typecheck` se a assinatura mudou; `dev` de pé. **Sem Playwright.** |
| import ou manifesto | `architecture:check` |
| `packages/simulation`, `packages/contracts` | o golden que esse diff pode mover (`simulation:check` / `hunt:check` / `combat:check`) + `architecture:check` |
| `packages/content` ou gerador | `content:check` |
| `packages/assets` ou packer | `assets:check` |
| última task do playbook | `corepack pnpm verify` **uma vez** |

Diff que cruza duas linhas roda as duas. Diff mecânico em muitos arquivos sem mudança de
comportamento (rename, mover módulo) é provado por `typecheck` — nenhuma suíte acrescenta informação.

`verify` **já é** `biome` + `check` + `qa:browser`. Nunca liste `verify` junto de um subconjunto
dele, nunca rode um subconjunto depois dele, nunca o repita no mesmo commit.

## Rode para saber, não para provar

Vermelho: conserte. Verde: commite. Colar saída fresca no relatório não é entrega.

Card antiga que exige `verify` + `qa:browser` + os `--check` numa task de HUD ou conteúdo: execute a
linha da tabela acima, não a card.

## Não são gate

- `qa:budgets` é informativo: número no `STATE.md`, vermelho vira task de backlog, nunca bloqueio.
- Auditoria independente roda depois do aceite do usuário e gera task, não veredito.

## Falhas

- Golden divergente é mudança de comportamento. Não regrave para passar.
- EPERM no `assets:stage:test`, porta 4173 ocupada, timeout de replay sem divergência: ambiente, não
  kernel. Confira listener e processo órfão antes de teorizar (`AGENTS.md` § Armadilhas).
- Um Playwright por host. Porta ocupada por outra sessão: `PLAYWRIGHT_PREVIEW_PORT`.

Nenhum resultado se afirma sem a saída fresca do comando.
