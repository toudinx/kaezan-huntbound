---
name: run-gates
description: Escolher e executar os gates certos do Kaezan Huntbound para uma mudança, na ordem mais barata, e interpretar as falhas. Use antes de declarar qualquer task concluída ou quando um gate falhar.
---

# Gates do Kaezan Huntbound

## Ordem barata primeiro

Rode do mais rápido para o mais caro; pare no primeiro vermelho e conserte antes de seguir.

1. `biome check .` — formatação e lint.
2. `corepack pnpm typecheck` — TS de todos os pacotes.
3. `corepack pnpm architecture:check` — fronteiras de import e manifesto.
4. `corepack pnpm test` — Vitest, testes de fronteira e suítes dos tools.
5. Gates de domínio conforme a área tocada (tabela abaixo).
6. `corepack pnpm build`.
7. `corepack pnpm qa:browser` — builda e roda Playwright.

Fechamento de task: `corepack pnpm verify` **mais** `biome check .`.

## Qual gate para qual mudança

| Você mexeu em | Gate obrigatório |
|---|---|
| `packages/simulation`, `packages/contracts` | `architecture:check`, `simulation:check`, `hunt:check` |
| `packages/content`, tools de conteúdo | `content:check` (inclui rebuild, validate, generate --check, sidecars) |
| `packages/assets`, `tools/asset-packer` | `assets:check` |
| `apps/game` | `build` e depois `qa:browser` |
| fixtures, goldens | `simulation:check`, `hunt:check` |
| só documentação | `format:check` |

## Armadilha nº 1: verify não roda lint

`verify` executa `format:check`, não `biome check`. Lint quebrado passa pelo `verify` e é reprovado
depois na auditoria. Sempre rode `biome check .` separado.

## Armadilha nº 2: Playwright serve bundle velho

`playwright test` direto **não** builda; ele serve `dist/game`. Use `qa:browser`, ou rode
`corepack pnpm build` antes. Se o browser contradiz o código, suspeite do bundle antes da aplicação.

## Interpretando falhas

- **`architecture:check`** aponta arquivo, linha, import e regra violada. Conserte no import ou no
  manifesto que introduziu a violação — não afrouxe `dependency-policy.json` sem decisão registrada.
- **`--check` de gerador** falhando significa que o artefato versionado diverge da geração atual.
  Regenere pelo CLI; se a divergência for inesperada, investigue a entrada antes de aceitar a saída.
- **Golden de replay divergente** é mudança de comportamento. Prove que é intencional e registre;
  nunca regrave para passar.
- **`assets:*:personal:check`** falha sem `HUNTBOUND_PERSONAL_ASSET_SOURCE` configurado. Isso é
  limitação de ambiente: relate como tal, não como aprovação.

## Regra final

Nenhum resultado de gate pode ser afirmado sem a saída fresca do comando nesta sessão. Cole o
comando e o resultado no relatório da task.
