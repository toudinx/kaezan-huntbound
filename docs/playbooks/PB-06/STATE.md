# PB-06 — Estado operacional

**Playbook:** `docs/playbooks/PB-06/README.md`

**Estado geral:** **elegível**. Nenhuma task foi executada ainda. PB-06-01 pode começar.

**Última atualização:** 2026-08-18

**Atualização vigente:** playbook versionado em `8a77c6d` e desbloqueado em 2026-08-18. B1 caiu
junto com a auditoria bloqueante; a base do PB-05 exigida pelo gate `save:check` é o commit
integrado `d4490e9`, com `verify` verde e goldens de combate estáveis.

**Próxima etapa:** executar PB-06-01.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-06-01 | pending | `<agente>/pb06-01-save-contracts` | — | `packages/contracts/src/save/**` + schema Zod verde; `RunBagEntry` reimportada por `content` |
| PB-06-02 | pending | `<agente>/pb06-02-save-repository` | — | `SaveRepository` sobre `MemorySaveDriver`; rollback e serialização provados |
| PB-06-03 | pending | `<agente>/pb06-03-save-migrations` | — | migração de documento sem versão para v1; recusa de versão futura |
| PB-06-04 | pending | `<agente>/pb06-04-save-export-import` | — | export canônico estável em duas chamadas; import atômico e validado |
| PB-06-05 | pending | `<agente>/pb06-05-indexeddb-driver` | — | `IndexedDbSaveDriver` provado no browser; códigos de erro mapeados |
| PB-06-06 | pending | `<agente>/pb06-06-run-persistence` | — | checkpoint, retomada, consolidação idempotente e descarte que preserva a bolsa |
| PB-06-07 | pending | `<agente>/pb06-07-save-gate` | — | `packages/test-fixtures/save/pb06/**` + `save:check` em `check`/`verify` + `REPLAY_CONTRACT.md` |
| PB-06-08 | pending | `<agente>/pb06-08-save-ui` | — | autosave, retomada no boot, painel de bolsa e estoque, export/import |
| PB-06-09 | pending | `<agente>/pb06-09-save-browser-qa` | — | specs estáveis sem `retries`; entrega jogável para o aceite do usuário |
| PB-06-10 | **opcional** | `<agente>/pb06-10-audit` | — | auditoria pós-aceite; gera tasks de correção, não veredito |

## Última task concluída

Nenhuma. O playbook nunca entrou em execução.

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

**Desvio declarado, pendente de registro na ADR:** `transact` recebe `SaveDraft`, o espelho mutável
de `GameSave`, em vez de `GameSave`. A forma, os quatro métodos e a semântica do `SaveRepository`
continuam sendo os da ADR-05. PB-06-01 registra a nota em
`docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`.

## Bloqueios

Nenhum bloqueio aberto.

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
