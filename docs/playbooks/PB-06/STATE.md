# PB-06 — Estado operacional

**Playbook:** `docs/playbooks/PB-06/README.md`

**Estado geral:** **em execução**. PB-06-01 a PB-06-07 integrados. PB-06-08 é a próxima task elegível.

**Última atualização:** 2026-08-20

**Atualização vigente:** playbook versionado em `8a77c6d` e desbloqueado em 2026-08-18. B1 caiu
junto com a auditoria bloqueante; a base do PB-05 exigida pelo gate `save:check` é o commit
integrado `d4490e9`, com `verify` verde e goldens de combate estáveis.

**Próxima etapa:** PB-06-09 bloqueada; corrigir os defeitos registrados antes do aceite.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-06-01 | done | `codex/pb06-01-save-contracts` | (este commit) | `packages/contracts/src/save/**` + schema Zod verde; `RunBagEntry` reimportada por `content` |
| PB-06-02 | blocked | `codex/pb06-02-save-repository` | `bcaba65` | implementação integrada por fast-forward; gates de código verdes; `verify` bloqueado por B4 no QA browser |
| PB-06-03 | done | `codex/pb06-03-save-migrations` | `baf65ff` | cadeia `null → v1`, recusa de versão futura e integração no repositório; 32 testes de save |
| PB-06-04 | done | `codex/pb06-04-save-export-import` | `e0535dd` | `encodeSaveDocument`/`decodeSaveDocument`; export estável, import atômico e substitutivo; verify verde |
| PB-06-05 | done | `codex/pb06-05-indexeddb-driver` | `247b775` | `IndexedDbSaveDriver` atômico; probe `test`; 60/60 browser sem retries; códigos de erro mapeados |
| PB-06-06 | done | `codex/pb06-06-run-persistence` | (este commit) | checkpoint/retomada/consolidação; 66 testes de save; goldens PB-03/04/05 intactos |
| PB-06-07 | done | `codex/pb06-07-save-gate` | (este commit) | `pb-06-save-session` + `save:check` em `check`/`verify` + `REPLAY_CONTRACT.md` |
| PB-06-08 | done | `codex/pb06-08-save-ui` | (este commit) | save/session + inventory; game 36/215; biome/typecheck/architecture/save/build = 0; verify = 1 somente por 5 screenshots do shell alterados pelo painel |
| PB-06-09 | blocked | `codex/pb06-09-save-browser-qa` | — | browser QA bloqueado: código de versão futura ausente na UI e instabilidade do helper de combate; relatório em `artifacts/browser-qa.md` |
| PB-06-10 | **opcional** | `<agente>/pb06-10-audit` | — | auditoria pós-aceite; gera tasks de correção, não veredito |

## Última task concluída

PB-06-08. Save/session, retomada no boot, checkpoints e painel de inventário; próxima task elegível: PB-06-09.

## Decisões já congeladas antes da execução

Todas vivem na spec
`docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`; aqui ficam apenas as
referências:

- documento único, transação única, sem ledger — spec §1;
- `session.bag` persiste desde o primeiro loot e a consolidação é idempotente por construção —
  spec §2;
- retomada por snapshot, sem command log persistido — spec §3;
- sessão incompatível é descartada **com a bolsa preservada** — spec §4;
- núcleo puro mais porta `SaveDriver`; IndexedDB é provado no browser, não mockado em Node — spec §5;
- `RunBagEntry` migra para `@huntbound/contracts`; `projectRunBag` continua em `@huntbound/content`
  — spec §6;
- **sem checksum no export**, por decisão explícita da ADR sobre save pessoal — spec §7;
- `SAVE_SCHEMA_VERSION = 1` com uma migração real de documento sem versão — spec §8.

**Desvio declarado, registrado na ADR:** `transact` recebe `SaveDraft`, o espelho mutável de
`GameSave`. A forma, os quatro métodos e a semântica do `SaveRepository` continuam os da ADR-05.

## Bloqueios

Bloqueios abertos: B5, B6 e B7.

- ~~**B3 — aberto em PB-06-02.**~~ **Recuperado nesta sessão:** `qa:browser` passou 34/34,
  incluindo `hunt-play.spec.ts:366`; nenhuma alteração foi feita em `apps/game`.

- ~~**B4 — aberto em PB-06-02.**~~ **Caiu em PB-07-04.** `qa:browser` passou
  `hunt-play.spec.ts` inclusive o passo de topologia; o jogador não morreu no teste.

- **B5 — aberto em PB-06-09.** Importar `schemaVersion: 2` preserva o save, mas a UI omite
  `SAVE_VERSION_UNSUPPORTED`; reproduzido em 4/4 viewports, exit 1.

- **B6 — aberto em PB-06-09.** Reload em `1920x1080` passou 9/10 sem retry; uma execução falhou em
  `tests/e2e/support/combatDriver.ts:373` com `Target cycling did not select a living combat target`.

- **B7 — aberto em 2026-08-25.** A fixture de save do PB-06 é uma run morta: o log de comandos do
  PB-05 mata o jogador no tick 351 e `CHECKPOINT_TICK` está em 1400, então o snapshot persistido não
  contém o jogador. A `main` mitiga o sintoma — `CombatViewModel` levanta o overlay de morte numa run
  retomada sem o jogador no roster, então o restart continua alcançável. Recusar a retomada na
  origem (`decideResume` descartando sessão cujo snapshot não tem o blueprint do jogador) fica
  pendente: derruba 8 specs de save-persistence que hoje afirmam `Run resumed` sobre essa fixture.
  Fechar exige mover `CHECKPOINT_TICK` para antes de 351 e regenerar o golden do PB-05 — decisão do
  dono, adiada por ele em 2026-08-25. Implementação e justificativa completas em `c97a22c`
  (recuperável pelo reflog; branch removida a pedido).

- ~~**B1:** PB-05 não fechou pela auditoria PB-05-12.~~ **Removido em 2026-08-18.** A auditoria
  deixou de ser gate bloqueante (`docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, "Fechamento de
  playbook"). O que o gate `save:check` precisa é uma baseline estável de `pb-05-hunt-combat`, e
  `combat:check` sai `0` de forma reproduzível sobre `d4490e9`. Baseline do PB-06: `d4490e9`.

- ~~**B2:** `hunt-budget` instável pode reprovar o fechamento.~~ **Removido em 2026-08-18.** Os
  specs de orçamento saíram do gate bloqueante para `corepack pnpm qa:budgets`. PB-06-09 não precisa
  mais distinguir falha de budget de falha de save: o budget não reprova nada. Continua proibido
  mascarar com retry ou afrouxar teto.

## Regra de atualização

Este arquivo tem teto de 60 linhas. Ao concluir ou bloquear uma task, atualize **só** a linha dela na
tabela, a próxima task elegível e os bloqueios abertos. Comandos, exit codes, hashes, tentativas e
justificativas vão na mensagem de commit da task. Decisões duráveis vão na spec e são apenas
referenciadas aqui.
