# PB-20 — Três vocações, encontros distintos

**Status:** planejado em 2026-09-07.

## Objetivo

Knight, Sorcerer e Paladin enfrentam ameaças que pedem escolhas de posição, alvo e build.

## Escopo

Absorve vocações/IA pendentes do PB-07 e helper previsto no PB-15. Começar com espécies já importadas; acrescentar apenas as necessárias para demonstrar um comportamento ausente. Não abrir sexta hunt ou segunda vocação mágica.

Decisões de produto no [roteiro](../../06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md); fontes na ADR-05.
Os itens de design devem registrar decisões antes de tasks que mudem contrato/schema/golden.
Uma proposta de mecânica no roteiro não autoriza migração destrutiva de dados.

## Sequência

| ID | Resultado | Dependência e limite |
|---|---|---|
| PB-20-01 | Curar kits e encontros | Depende de PB-19. Congelar papéis das duas vocações, equipamentos e três comportamentos de monstros; verificar lacunas reais de alcance, elemento e defesa no código. |
| PB-20-02 | Mage jogável | Depende de 01. Sorcerer completo no loop existente: kit curado, equipamento, save, seleção e helper; testar risco/área/controle legíveis. |
| PB-20-03 | Paladin jogável | Depende de 02. Paladin completo no mesmo loop, com identidade ranged e equipamento compatível; sem economia extra de munição criada por conveniência. |
| PB-20-04 | Encontros e helper das três classes | Depende de 03. Compor melee, ranged e conjurador/suporte com acervo Canary; adaptar helper aos kits; fechar com perigo, resposta e resultado visíveis. |

Sem paralelismo. Itens sem card são planejamento, não prompts executáveis. Ao detalhar, dividir
por fronteira de problema se necessário; manter os limites de produto. Uma card por chat.

## Aceite e gates

O usuário joga e acompanha o helper conforme os critérios do roteiro. Gate pelo raio do diff em
`AGENTS.md`; última task de implementação roda build. Browser QA e `verify` são do usuário.
