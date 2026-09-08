# PB-19 — Uma run que vale repetir

**Status:** planejado em 2026-09-07.

## Objetivo

Knight completa o ciclo escolher → combater → sair → guardar → melhorar → repetir numa hunt de referência.

## Escopo

Base: Knight e cockpit integrados; PB-06 fornece persistência. Absorve PB-09/11/18 e feedback pendente do PB-17. Não implementar novas vocações, dungeons, navegação autônoma ou gacha aqui.

Decisões de produto no [roteiro](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md); fontes na ADR-05.
Os itens de design devem registrar decisões antes de tasks que mudem contrato/schema/golden.
Uma proposta de mecânica no roteiro não autoriza migração destrutiva de dados.

## Sequência

| ID | Resultado | Dependência e limite |
|---|---|---|
| PB-19-01 | Fechar as decisões do loop | Elegível. Definir progressão curta, recompensa, morte e alterações necessárias de contrato/save; separar decisões aprovadas de propostas. |
| PB-19-02 | Entrar, concluir e voltar | Depende de 01. Seleção com preview, conclusão explícita, recompensa consolidada uma vez e retorno ao atlas; preservar retomada e backup. |
| PB-19-03 | Loot que equipa | Depende de 02. Subconjunto de equipamento Canary com efeito real na ficha, comparação legível e persistência; sem catálogo massivo. |
| PB-19-04 | Progressão curta | Depende de 03. Personagem persistente com avanço e objetivo final definidos na 01; remover preset de hunt como substituto de progressão. |
| PB-19-05 | Helper mínimo e leitura da run | Depende de 04. Cura, alvo, ações e loot desligáveis, controle manual prioritário e feedback; uma run completa acompanhável. |

Sem paralelismo. Itens sem card são planejamento, não prompts executáveis. Ao detalhar, dividir
por fronteira de problema se necessário; manter os limites de produto. Uma card por chat.

## Aceite e gates

O usuário joga e acompanha o helper conforme os critérios do roteiro. Gate pelo raio do diff em
`AGENTS.md`; última task de implementação roda build. Browser QA e `verify` são do usuário.
