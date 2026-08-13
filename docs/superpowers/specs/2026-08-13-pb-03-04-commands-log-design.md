# PB-03-04 — Comandos e command log

**Status:** aprovado por decisão do solicitante para implementação
**Data:** 2026-08-13
**Base normativa:** `docs/playbooks/PB-03/tasks/PB-03-04-implementar-comandos-e-log.md`,
`docs/simulation/KERNEL_CONTRACT.md` e o design geral de PB-03.

## Objetivo

Implementar a borda determinística de comandos de `@huntbound/simulation`: receber comandos
externos, validar somente regras de envelope, atribuir sequências, ordenar e drenar por tick, e
codificar/decodificar o command log JSONL. A implementação não aplica comandos ao mundo e não
implementa tick, eventos, snapshot ou replay.

## Design

`CommandBuffer` será uma estrutura em memória com um mapa de registros por tick, um contador de
próxima sequência e um índice de ações concorrentes. `enqueue` valida `SimulationCommandInputSchema`,
recusa tick passado, emissor proibido e duplicata antes de inserir; qualquer recusa deixa contador,
índice e registros inalterados. O contador começa em 1 e só é incrementado por aceitação.

`orderCommands` não modifica a entrada e ordena por `tick`, `commandPriority(command.type)` e
`sequence`. `drain` retira apenas o tick solicitado e devolve a ordem de aplicação; chamar novamente
para o mesmo tick devolve uma lista vazia. `pending` devolve uma visão ordenada por `(tick, sequence)`
para futura restauração em snapshot. `restoreCommandBuffer` reconstrói o estado a partir dos registros
pendentes, preservando o `nextSequence` fornecido e rejeitando estado inconsistente.

O command log será uma linha de header seguida de linhas de comando. O encoder local serializa cada
linha com chaves recursivamente ordenadas por code unit, sem espaços e com newline final. O decoder
exige header na primeira linha, linhas não vazias, JSON válido, `kind` correto, versões atuais,
comandos válidos, `tick` não decrescente e `sequence` estritamente crescente; ele acumula diagnósticos
e nunca retorna um log parcialmente aceito.

## Interfaces e arquivos

- `packages/simulation/src/commands/types.ts`: tipos locais para aceitação e buffer.
- `packages/simulation/src/commands/commandBuffer.ts`: entrada, validação de borda, duplicatas,
  ordenação, `drain`, `pending` e restauração.
- `packages/simulation/src/commands/commandLog.ts`: JSONL canônico e validação transacional.
- `packages/simulation/src/commands/*.test.ts`: testes RED/GREEN de entrada, ordenação, duplicata,
  drain, restauração e log.
- `packages/simulation/src/index.ts`: exportações públicas da task.
- `docs/simulation/KERNEL_CONTRACT.md`: documentação congelada da borda e do formato JSONL.

## Regras de segurança e escopo

Os módulos não usarão relógio, aleatoriedade, timers, filesystem, Node, DOM ou dependências externas.
Validação de entidade, cooldown, geometria e aplicação de comando ficam para PB-03-05. O log grava
somente registros externos recebidos pelo buffer.

## Verificação

Os testes devem provar a sequência monotônica e não consumida por rejeições, todos os diagnósticos de
borda, a ordenação determinística, a regra de duplicata, o comportamento idempotente de `drain`, a
ordenação de `pending` e ida-e-volta canônica do log. Casos malformados do decoder devem falhar sem
aceitação parcial. Depois, serão executados test, typecheck, architecture check, Biome, format check e
`git diff --check`.
