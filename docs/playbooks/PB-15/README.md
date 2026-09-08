# PB-15 — Dungeon, modulação e coleção

**Status:** planejado. Depende do código integrado de PB-14.

## Objetivo e escopo

Entregar uma dungeon modulada, completar os mapas existentes e fechar a coleção cosmética. Sem multiplayer, monetização, ranking ou conteúdo procedural.

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
| PB-15-01 | [Dungeon e modulação da build](tasks/PB-15-01-design.md) | Claude Opus 5 | `xhigh` | Design de dungeon, recompensa e modulação da build. |
| PB-15-02 | [Renderizar as hunts grandes](tasks/PB-15-02-render.md) | GPT-5.6 Sol | `xhigh` | Investigação e implementação de performance no renderer. |
| PB-15-03 | [Completar as caixas das hunts](tasks/PB-15-03-mapas.md) | GPT-5.6 Luna | `xhigh` | Pipeline e caixas já definidos; reextração com checks objetivos. |
| PB-15-04 | [Dungeon com começo e fim](tasks/PB-15-04-dungeon.md) | Claude Opus 5 | `xhigh` | Novo fluxo de encontros/boss com kernel, conteúdo e persistência. |
| PB-15-05 | [Modo modulado](tasks/PB-15-05-modulacao.md) | Claude Opus 5 | `xhigh` | Transformação reversível de poder/gear e compatibilidade de sessão. |
| PB-15-06 | [Coleção visual de outfits](tasks/PB-15-06-outfits.md) | GPT-5.6 Luna | `xhigh` | Contrato de família e pipeline visual já estabelecidos. |
| PB-15-07 | [Gacha cosmético e V0 integrado](tasks/PB-15-07-gacha.md) | Claude Opus 5 | `xhigh` | Economia e transação atômica de moeda, prêmio, garantia e duplicata. |

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
