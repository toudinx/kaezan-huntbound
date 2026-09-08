# PB-21 — Dungeon, modulação e fechamento

**Status:** planejado em 2026-09-07.

## Objetivo

Uma dungeon com boss dá propósito à build; modulação permite revisitá-la; coleção cosmética fecha o V0.

## Escopo

Absorve PB-12, previsão de PB-13/14 e mapas PB-10-14/15. O item 04 será dividido em cards coesas de cosméticos e mapas quando os paths estiverem definidos; não executar como uma implementação transversal única. Sem ranking, baú periódico, multiplayer ou dial de dificuldade obrigatório.

Decisões de produto no [roteiro](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md); fontes na ADR-05.
Os itens de design devem registrar decisões antes de tasks que mudem contrato/schema/golden.
Uma proposta de mecânica no roteiro não autoriza migração destrutiva de dados.

## Sequência

| ID | Resultado | Dependência e limite |
|---|---|---|
| PB-21-01 | Definir dungeon e modulação | Depende de PB-20. Escolher conteúdo Canary, sequência de encontros, boss, recompensa e tratamento da build/gear; reconciliar emenda 09 e ADR-05 antes de alterar contratos. |
| PB-21-02 | Dungeon completa | Depende de 01. Entrada, encontros curados, boss, derrota, saída e recompensa usando o loop existente; sem geração procedural. |
| PB-21-03 | Modo modulado | Depende de 02. Aplicar plano aprovado à build real sem mutar progresso permanente; preview honesto, recompensa útil e retorno seguro ao modo livre. |
| PB-21-04 | Coleção cosmética e fechamento | Depende de 03. Pool pequeno de outfits com garantia/tokens da ADR-05, transação de pull segura; resolver mapas pendentes que impeçam as cinco hunts e concluir aceite do V0. |

Sem paralelismo. Itens sem card são planejamento, não prompts executáveis. Ao detalhar, dividir
por fronteira de problema se necessário; manter os limites de produto. Uma card por chat.

## Aceite e gates

O usuário joga e acompanha o helper conforme os critérios do roteiro. Gate pelo raio do diff em
`AGENTS.md`; última task de implementação roda build. Browser QA e `verify` são do usuário.
