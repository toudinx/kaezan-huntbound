# PB-08 — Estado operacional

**Playbook:** `docs/playbooks/PB-08/README.md`

**Estado geral:** em execução. PB-08-01 integrada.
Próxima elegível: **PB-08-02**, depois de jogar a 01.

**Última atualização:** 2026-08-23

**Base:** PB-07 congelado na 05 (`e4c1028` em `main`). A máquina de condições, leech e regen
sensível a combate está integrada e sem conteúdo que a use.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-08-01 | done | `claude/pb08-01-cave-density` | `c23c819` | puxão máximo 4 → 11; tiles com ≥4 pulláveis 3 → 125; 29 slots (12 rotworm + 17 snake); goldens PB-04 e PB-05 inalterados |
| PB-08-02 | pending | `<agente>/pb08-02-knight-actions` | — | — |
| PB-08-03 | não escrita | — | — | só se jogar a 01 e a 02 mostrar que faz falta |
| PB-08-04 | pending | `<agente>/pb08-04-selection-gate` | — | — |
| PB-08-05 | pending | `<agente>/pb08-05-run-ends` | — | — |
| PB-08-06 | pending | `<agente>/pb08-06-experience` | — | — |
| PB-08-07 | pending | `<agente>/pb08-07-skill-by-use` | — | — |
| PB-08-08 | pending | `<agente>/pb08-08-level-feeds-character` | — | — |
| PB-08-09 | pending | `<agente>/pb08-09-item-stats` | — | — |
| PB-08-10 | pending | `<agente>/pb08-10-equipment-slots` | — | — |
| PB-08-11 | pending | `<agente>/pb08-11-armor` | — | — |
| PB-08-12 | pending | `<agente>/pb08-12-equipment-loot` | — | — |
| PB-08-13 | pending | `<agente>/pb08-13-acceptance` | — | — |

## Bloqueios

**B1 — fechado em 2026-08-23.** O WIP do PB-05-FIX foi commitado na `main` em seis commits,
`4fb17f6..1fef759`. Árvore limpa.

**B2 — fechado em 2026-08-23.** `verify` verde, 73 specs. Eram três defeitos independentes:
`errorText` descartava o `code` do `SaveError`; `save-persistence.spec.ts:616` apontava para
`[data-testid="game-root"]`, que não existe no app; e os cinco baselines de `shell` eram de
`db04d9d` (2026-08-19), anteriores ao painel de save de `ce2d10f` (2026-08-20). `8d698bd` e
`a749c2b`.

**B5 — resolvido em 2026-08-23, sem regenerar golden.** Densidade de spawn fazia
`expectScenarioMatchesHunt` reprovar, porque ele exigia que `spawnGroups` da fixture PB-04 fosse
igual ao composto de `hunt.json`. Investigado: `hunt-play`, `hunt-world-edge` e `combatDriver` leem
`hunt.json` direto e **já testam a hunt nova**; só `hunt-replay.spec.ts` usa a fixture, e para provar
que Chromium replica o mesmo SHA-256 que o Node — determinismo, que precisa de mundo estável, não
atual. A fixture também nunca foi espelho: não tem abilities, loot tables nem `conditions`. O guarda
foi estreitado para geometria de mapa (floors, transitions, tamanho, `initialActors`), deixando a
tabela de spawn congelada de propósito. Nenhum golden regenerado; a decisão 9 do README continua
valendo sem emenda.

**B3 — informativo.** Hipótese descartada em 2026-08-23: `exori` **não** é single-target. O bundle
de runtime já traz `area: { radiusTiles: 1 }`. A task que ia consertar isso foi retirada; sobrou
apenas o gate de proveniência, rebaixado para PB-08-04.

**B4 — aberto.** Onze worktrees antigas em `git worktree list`, de PB-02 a PB-08, e **quatro branches
fora da `main`** com trabalho real: `claude/render-resolution-cap` (2 commits),
`codex/fix-dead-run-resume`, `codex/pb00r-01-resize` e `codex/pb00r-03-package-tests`. Nenhuma foi
verificada contra a `main` atual; as três últimas podem ter sido superadas por commits posteriores.
Triagem pendente, decisão do usuário.

**B8 — fechado em 2026-08-23.** `verify` **vermelho** na `main` com a PB-08-01
integrada (`c23c819`): 8 falhas em `save-persistence.spec.ts`, testes `:503` e `:620` nos quatro
viewports, todas com a mesma causa — `Unable to restore hunt snapshot: Snapshot holds spawn slot
(4, 1) that the scenario does not declare`. O fixture desses testes é o export golden do PB-06, cujo
snapshot referencia spawn slot por `(índice de grupo, índice de slot)`; a PB-08-01 reordenou os
grupos de 8 para 13 e o par (4,1) deixou de existir. O jogo se comporta corretamente — recusa o
resume e começa fresh —, mas o teste afirma `Run resumed`.

Consertado recompondo a fixture PB-05 pelos geradores existentes e regerando a de save a partir
dela; o snapshot passou a referenciar 20 slots, todos declarados pelo cenário. A decisão congelada 9
do README foi emendada para registrar que isto não é exceção pontual: **enquanto o snapshot
referenciar spawn por índice, toda mudança de conteúdo na hunt vai exigir regeneração.**

Achado colateral que vale task própria: o snapshot de save referenciar spawn por índice significa
que **toda mudança de conteúdo na hunt invalida todo save existente**. Isso é acoplamento frágil e
vai doer a cada task de conteúdo, não só nesta.

**B7 — informativo, resolvido em 2026-08-23.** Um `qa:browser` da sessão abandonada da PB-08-01 —
`corepack pnpm qa`, `playwright test` e `vite preview` — continuava vivo na worktree antiga por
horas. Ele reprovou `tools/replay` por **timeout**, não por divergência: o arquivo levou 642 s sob
essa carga e leva **73 s** com a máquina livre, e a cobertura sobre o cenário composto passa em
1,47 s isolada. Processo órfão de sessão abandonada é a mesma família do B1: sessão que termina sem
limpar o que subiu. Derrubados.

**B6 — fechado em 2026-08-23, com a premissa corrigida.** `claude/pb05-fixture-drift` (`6fc0efb`) traz duas coisas
empacotadas, achadas soltas na worktree da PB-08-01. **(1)** A fixture PB-05 estava desatualizada:
`rotworm.aggroRadius` 1 em vez de 11, jogador com 185 de HP em vez de 590, `berserk` 14–41 em vez de
48–129, e sem os campos do contrato PB-07. `combat:check` compara bytes contra hashes publicados e
nunca recompõe, então o desvio era invisível — é buraco de gate real. **(2)** A varredura de
convergência do replay deixou de checar os 2701 boundaries e passa a checar 117 amostrados, com a
forma exaustiva atrás de `HUNTBOUND_EXHAUSTIVE_REPLAY=1`, por causa de ~17 min de wall time. Isso é
asserção enfraquecida no sentido do AGENTS.md. A ressalva de `4bbdccb` estava certa no essencial e errada num ponto. **Certa:** a premissa de wall
time que a branch usava vinha de uma medição contaminada por processos órfãos da própria sessão
(ver B7), e o enquadramento correto é "amostrar é o preço de recompor a fixture", não "de adensar a
caverna". **Errada:** ela afirma que a aprovação do usuário não tem registro em lugar nenhum — tem,
na conversa em que foi pedida e dada explicitamente.

Com a premissa corrigida, a decisão foi refeita sobre número novo. **Medido em máquina ociosa, com a
fixture recomposta, a varredura exaustiva passa de 600 s** contra teto de 360 s; com a fixture antiga
eram 73 s. Ou seja, recompor — que o B8 tornou obrigatório — realmente inviabiliza a forma exaustiva.
Adotado: varredura dirigida por padrão (117 boundaries: toda morte e todo spawn com vizinhos ±1,
stride de 150, extremos) e exaustiva atrás de `HUNTBOUND_EXHAUSTIVE_REPLAY=1`. O raciocínio, com os
dois números, está em `convergenceBoundaries`. `tools/replay` roda em 56 s.

**B5 — obsoleto, fechado em 2026-08-23.** Descrevia a PB-08-01 como não integrada; ela foi
integrada em `c23c819`. Texto original mantido abaixo por rastreabilidade.

**B5 (histórico).** PB-08-01 estava **implementada e não integrada** em `1270526`:
janela ampliada para 64×96, oito placements novos, `analyzeBoxDensity`, max pull 4→7 e tiles com
≥4 de 3 para 62. A `main` andou oito commits desde então, então `--ff-only` não passa mais e a
integração exige rebase + gates. **Isso muda o layout da caverna**, logo qualquer trabalho sobre
`layouts/hunts/venore-rotworm-cave.json` deve esperar esta integração.

## Decisões congeladas

Vivem no `README.md`, seção "Decisões congeladas". Task serial ou paralela sempre faz
`git merge --ff-only` na `main`.

## Métricas

`corepack pnpm qa:budgets` ainda não medido. Vermelho vira task de performance, nunca bloqueio.

## Regra de atualização

Só status/branch/commit na tabela; bloqueio e próxima elegível; narrativa no commit, não aqui.
