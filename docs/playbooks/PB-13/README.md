# PB-13 — Uma run que vale repetir

**Status:** planejado. PB-13-01 elegível.

## Objetivo e escopo

Fechar o loop de caça do Knight: set, rares, gold, level, bestiary, conquistas e helper. Uma hunt de referência; sem vocações novas ou dungeon.

## Decisões congeladas

Roteiro 06 e ADR-05 regem produto; ADR-03 rege arquitetura. A task 01 registra decisões
pendentes, fontes, mudanças de contrato e rollback num design curto em `docs/superpowers/specs/`.
Cards seguintes leem esse design. Escolhas reversíveis seguem o protocolo; destruição de dado,
contrato/schema/golden integrado seguem as condições de parada de `AGENTS.md`. Não tratar uma
hipótese de RNG, consumível ou modulação como autorização implícita.

## Tasks e dependências

Execução **serial**, uma task por chat. Cada linha depende da anterior; a primeira depende da base
indicada acima. Não há tasks paralelas, branches ou worktrees previstas. Todas as cards existem;
a existência da card não elimina sua dependência. As recomendações abaixo aplicam a política 08; o `STATE.md` registra o modelo/effort usado.

| ID | Task | Modelo sugerido | Effort | Motivo |
|---|---|---|---|---|
| PB-13-01 | [Decisões de progressão e economia](tasks/PB-13-01-loop.md) | Claude Opus 5 | `xhigh` | Decisão de progressão, economia e contratos ainda abertos. |
| PB-13-02 | [Escolher, concluir e voltar à hunt](tasks/PB-13-02-saida.md) | GPT-5.6 Sol | `xhigh` | Saída, retomada e consolidação atravessam UI e persistência. |
| PB-13-03 | [Equipamento e coleção de rares](tasks/PB-13-03-equipamento.md) | Claude Opus 5 | `xhigh` | Gear altera conteúdo, combate e save; risco transversal. |
| PB-13-04 | [Level e XP persistentes](tasks/PB-13-04-level.md) | GPT-5.6 Sol | `xhigh` | Troca da ficha por hunt por personagem persistente. |
| PB-13-05 | [Vender loot a NPC](tasks/PB-13-05-venda.md) | GPT-5.6 Luna | `xhigh` | Venda delimitada sobre transação e preços definidos na 01. |
| PB-13-06 | [Comprar preparação com gold](tasks/PB-13-06-preparacao.md) | GPT-5.6 Sol | `xhigh` | Compra, duração e efeito precisam permanecer consistentes no combate/save. |
| PB-13-07 | [Bestiary por espécie](tasks/PB-13-07-bestiary.md) | GPT-5.6 Luna | `xhigh` | Contadores e metas definidos, usando persistência existente. |
| PB-13-08 | [Conquistas do primeiro loop](tasks/PB-13-08-conquistas.md) | GPT-5.6 Luna | `xhigh` | Objetivos e recompensa única sobre mecanismos já integrados. |
| PB-13-09 | [Helper mínimo e feedback](tasks/PB-13-09-helper.md) | Claude Opus 5 | `xhigh` | Novo helper integra comando, prioridade manual, consumo e feedback. |

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
