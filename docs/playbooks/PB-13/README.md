# PB-13 — Uma run que vale repetir

**Status:** planejado. PB-13-01 elegível.

## Objetivo e escopo

Fechar o loop de caça do Knight: escada de poder, saída da run, set, rares, gold, level, bestiary,
conquistas e helper. Uma hunt de referência; sem vocações novas ou dungeon.

## O defeito que abre este playbook

Medido em 2026-09-07 contra `packages/content/src/selections/validateSliceSelection.ts:106`:

| Hunt | Level | HP | `sword` | `weaponAttack` | Berserk máx. |
|---|---:|---:|---:|---:|---:|
| Orc Fortress | 25 | 440 | 60 | 14 | 127,6 |
| Venore Rotworm Cave | 35 | 590 | 60 | 14 | 129,8 |
| Cyclopolis | 45 | 740 | 60 | 14 | 132,0 |
| Dragon Lair | 70 | 1115 | 60 | 14 | 137,5 |
| Hero Cave | 130 | 2015 | 90 | 30 | 226,6 |

Do Orc Fortress ao Dragon Lair a vida do jogador cresce 153% e o dano máximo cresce **8%**. As
fórmulas de `combatConversion.ts:110` são dominadas por `(skill + attack)`, congelado em 74 em quatro
das cinco fichas; só o termo `level * 0.2` se move. A criatura, essa, vai de orc a dragão. É por isso
que toda hunt além da primeira é desgaste — não é dificuldade de desenho, é a escada que não sobe.

A PB-13-01 corrige isso como conteúdo, antes da máquina de progressão, para que as cinco hunts sejam
jogáveis enquanto o resto do playbook é implementado.

## Decisões congeladas

Congeladas pelo usuário em 2026-09-07, nesta conversa. Não reabrir dentro de uma task de
implementação. Roteiro 06 e ADR-05 regem o resto do produto; ADR-03 rege arquitetura.

1. **Morte.** Perde a bag da run e o crédito da run. **Nunca perde XP nem level.** O risco vive
   dentro da run, não na conta.
2. **Personagem.** O personagem persistente **substitui** a ficha resolvida pela hunt, e **toda hunt
   continua aberta**: entrar acima da sua faixa é permitido e apenas perigoso. Não há porta de level,
   e não sobra preset como fallback — duas fontes de verdade para a ficha é o que a PB-13-03 existe
   para acabar. Isso encerra a extensão *"personagem resolvido pela hunt escolhida, temporário até o
   PB-09"* da ADR-05, que aponta para um playbook removido; a PB-13-03 edita esse bullet.
3. **A curva concede ataque, não só vida.** Subir de level move `sword` e o ataque efetivo, não
   apenas `maxHealth`. Uma curva que só engorda HP reproduz exatamente o defeito acima.
4. **Gasto de gold: buff de próxima hunt.** Comprado entre runs, dura a run seguinte, sem inventário
   e sem uso manual durante a luta. Escolhido por convivência: a ADR-05 já congelou cargas por hunt
   *"sem inventário, sem loja, sem `actor/use-item`"*, e poção comprável competiria com essa máquina
   em vez de somar. É extensão Huntbound nova e a PB-13-06 escreve o bullet na ADR-05 antes de
   implementar.
5. **Contrato, schema e golden estão autorizados**, task a task, pelo texto de cada card. Onde a card
   autoriza, o executor **bumpa e regenera em vez de parar**; as condições de parada de `AGENTS.md`
   seguem valendo para tudo que a card não nomear.

Hipótese de RNG, reroll, consumível ou modulação **não** é autorização implícita.

## Tasks e dependências

Execução **serial**, uma task por chat. Cada linha depende da anterior. Não há tasks paralelas,
branches ou worktrees previstas. As recomendações abaixo aplicam a política 08; o `STATE.md` registra
o modelo/effort usado.

| ID | Task | Modelo sugerido | Effort | Motivo |
|---|---|---|---|---|
| PB-13-01 | [A escada de poder do Knight](tasks/PB-13-01-escada.md) | GPT-5.6 Sol | `xhigh` | Números de conteúdo com golden a regenerar; escopo estreito e medido. |
| PB-13-02 | [Escolher, concluir e voltar à hunt](tasks/PB-13-02-saida.md) | GPT-5.6 Sol | `xhigh` | Saída, retomada e consolidação atravessam UI e persistência. |
| PB-13-03 | [Level e XP persistentes](tasks/PB-13-03-level.md) | Claude Opus 5 | `xhigh` | Cria o personagem persistente de que todo o resto pendura; encerra extensão da ADR-05. |
| PB-13-04 | [Equipamento e coleção de rares](tasks/PB-13-04-equipamento.md) | Claude Opus 5 | `xhigh` | Gear altera conteúdo, combate e save; risco transversal. |
| PB-13-05 | [Vender loot a NPC](tasks/PB-13-05-venda.md) | GPT-5.6 Luna | `xhigh` | Venda delimitada sobre transação e preços já decididos. |
| PB-13-06 | [Buff de próxima hunt](tasks/PB-13-06-preparacao.md) | GPT-5.6 Sol | `xhigh` | Compra, duração e efeito precisam permanecer consistentes no combate/save. |
| PB-13-07 | [Bestiary por espécie](tasks/PB-13-07-bestiary.md) | GPT-5.6 Luna | `xhigh` | Contadores e metas sobre persistência existente. |
| PB-13-08 | [Conquistas do primeiro loop](tasks/PB-13-08-conquistas.md) | GPT-5.6 Luna | `xhigh` | Objetivos e recompensa única sobre mecanismos já integrados. |
| PB-13-09 | [Helper mínimo e feedback](tasks/PB-13-09-helper.md) | Claude Opus 5 | `xhigh` | Novo helper integra comando, prioridade manual, consumo e feedback. |

**Por que 03 vem antes de 04.** Equipamento persiste *no personagem*. Fazer gear antes do personagem
persistente obriga a inventar uma casa para ele no save e a mudá-la na task seguinte — duas
migrações do mesmo dado.

## Como escolher o executor

GPT roda no Codex; Opus 5 no Claude Code; Grok 4.6 no Cursor, conforme os ambientes informados pelo
usuário. `xhigh` segue a política local; se a interface não expuser esse nome, usar a opção alta
equivalente e registrar o valor real no `STATE.md`, sem inventar um parâmetro.

Luna pressupõe decisões e contratos já congelados. Se houver decisão nova, risco não coberto ou dois
ciclos bloqueados pela mesma causa, escalar conforme a política 08. Sol, Opus e Grok podem substituir
uns aos outros conforme disponibilidade; a alocação não é benchmark de superioridade. Revisão por
outro modelo continua opcional, pós-aceite. Não executar a mesma task em três agentes.

## Aceite e validação

Cada implementação entrega o comportamento da card com `corepack pnpm dev` de pé e uma indicação do
que olhar. O usuário valida gameplay e diversão. Rodar só as linhas aplicáveis da tabela de
`AGENTS.md`, uma vez; teste focado e suíte transversal são alternativas salvo mudança do runner. A
última implementação roda `build`. Browser correctness e `verify` são do usuário. Revisão externa é
opcional pós-aceite; não bloqueia integração. Não executar a próxima card no mesmo chat.
