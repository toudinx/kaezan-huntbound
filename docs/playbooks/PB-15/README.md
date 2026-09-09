# PB-15 — Dungeon, modulação e fechamento

**Status:** planejado. Depende do código integrado de PB-14.

## Objetivo e escopo

Entregar uma dungeon modulada e completar os mapas existentes. Sem multiplayer, monetização, ranking
ou conteúdo procedural.

**A coleção cosmética saiu do V0 em 2026-09-09.** As antigas PB-15-06 (famílias de outfit) e
PB-15-07 (gacha) foram arquivadas em `docs/archive/2026-09-09/playbooks/PB-15/tasks/` e viraram
reserva de ideias no roteiro. Dois motivos: o gacha concede somente outfit por contrato, então não
toca o eixo de progressão do V0, que é o set da faixa mais a modulação; e era a task mais
cara em risco — migração de save e transação atômica de moeda, prêmio, garantia e duplicata por uma
feature cosmética, na última posição do playbook, onde um bug custa o save. O acervo pessoal já está
nesta máquina, então falta de arte não é o motivo; mas o B18, o cisalhamento de outfits 32 × 32 no
export pessoal, continua aberto e atinge as famílias que o gacha premiaria. O contrato do gacha
continua na ADR-05 — declarado não é agendado, e não implementá-lo agora não reabre a ADR.

## Decisões congeladas

Roteiro 06 e ADR-05 regem produto; ADR-03 rege arquitetura. **Herda inteiras as decisões congeladas
do `README.md` do PB-13** — morte, personagem persistente nascendo no nível 1 com o kit completo, o
set da faixa como eixo de progressão, curva comprimida, buff de próxima hunt. Elas não se reabrem
aqui.

**A modulação deixou de ser opcional.** Com o level barato e o set da faixa como eixo, o jogador
chega ao topo com coleções antigas por fechar, e voltar a uma faixa superada não tem tensão nenhuma:
a hunt vira trivial e o farm de coleção, vazio. É o B26 no `STATE.md` do PB-13, e é este playbook que
o resolve. A modulação é o que devolve risco ao conteúdo antigo — não é um modo alternativo simpático,
é o que faz o eixo de progressão do V0 fechar. Trate a PB-15-05 como entrega central, e agora também como task de
fechamento do playbook.

A task 01 registra decisões pendentes, fontes, mudanças de contrato e rollback num design curto em
`docs/superpowers/specs/`; cards seguintes leem esse design. **Contrato, schema e golden estão
autorizados task a task pelo texto de cada card**: onde a card autoriza, o executor bumpa e regenera
em vez de parar, e as condições de parada de `AGENTS.md` seguem valendo para tudo que a card não
nomear. Escolhas reversíveis seguem o protocolo. Não tratar hipótese de RNG ou reroll como
autorização implícita.

## Tasks e dependências

Execução **serial**, uma task por chat. Cada linha depende da anterior; a primeira depende da base
indicada acima. Não há tasks paralelas, branches ou worktrees previstas. Todas as cards existem;
a existência da card não elimina sua dependência. As recomendações abaixo aplicam a política 08; o `STATE.md` registra o modelo/effort usado.

| ID | Task | Modelo sugerido | Effort | Motivo |
|---|---|---|---|---|
| PB-15-01 | [Dungeon e modulação da build](tasks/PB-15-01-design.md) | Claude Opus 5 | `xhigh` | Design de dungeon, recompensa e modulação da build. |
| PB-15-02 | [Renderizar as hunts grandes](tasks/PB-15-02-render.md) | GPT-5.6 Sol | `xhigh` | Investigação e implementação de performance no renderer. |
| PB-15-03 | [Completar as caixas das hunts](tasks/PB-15-03-mapas.md) | GPT-5.6 Luna | `xhigh` | Pipeline e caixas já definidos; reextração com checks objetivos. |
| PB-15-04 | [Dungeon com começo e fim](tasks/PB-15-04-dungeon.md) | Claude Opus 5 | `xhigh` | Novo fluxo de encontros/boss com kernel, conteúdo e persistência. |
| PB-15-05 | [Modo modulado](tasks/PB-15-05-modulacao.md) | Claude Opus 5 | `xhigh` | Transformação reversível de poder/gear e compatibilidade de sessão. **Fecha o playbook e o V0: roda `build`.** |

## Como escolher o executor

GPT roda no Codex; Opus 5 no Claude Code; Grok 4.6 no Cursor, conforme os ambientes informados
pelo usuário. `xhigh` segue a política local; se a interface não expuser esse nome, usar a opção
alta equivalente disponível e registrar o valor real no STATE, sem inventar um parâmetro.

Luna pressupõe decisões e contratos congelados pelas tasks anteriores. Se houver decisão nova,
risco não coberto ou dois ciclos bloqueados pela mesma causa, escalar conforme a política 08.
Tasks já classificadas como complexas começam diretamente no modelo indicado. Sol, Opus e Grok
podem substituir uns aos outros conforme disponibilidade; a alocação não é um benchmark de superioridade.
Revisão por outro modelo continua opcional, pós-aceite. Não executar a mesma task em três agentes.

## Aceite e validação

Cada implementação entrega o comportamento da card com `corepack pnpm dev` de pé e uma indicação
do que olhar. O usuário valida gameplay e diversão. Rodar só as linhas aplicáveis da tabela de
`AGENTS.md`, uma vez; teste focado e suíte transversal são alternativas salvo mudança do runner.
A última implementação roda build. Browser correctness e `verify` são do usuário. Revisão externa
é opcional pós-aceite; não bloqueia integração. Não executar a próxima card no mesmo chat.
