# PB-06 — Estado operacional

**Playbook:** `docs/playbooks/PB-06/README.md`

**Estado geral:** escrito e **bloqueado**. Nenhuma task foi executada. A execução depende do aceite
do PB-05 pela auditoria PB-05-12.

**Última atualização:** 2026-08-18

**Atualização vigente:** playbook criado — spec aprovada em
`docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`, README, este `STATE.md` e
dez task cards. Nenhum código foi tocado.

**Próxima etapa:** desbloquear B1 (fechamento do PB-05) e então executar PB-06-01.

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
| PB-06-09 | pending | `<agente>/pb06-09-save-browser-qa` | — | `artifacts/browser-qa.md` + screenshots + specs estáveis sem `retries` |
| PB-06-10 | pending | `<agente>/pb06-10-integrated-gate` | — | `artifacts/acceptance-report.md` |

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

- **B1 (bloqueante, externo ao PB-06):** PB-05 ainda não fechou. PB-05-11 e PB-05-12 estão pendentes
  em `docs/playbooks/PB-05/STATE.md`. PB-06-01 só é elegível depois do veredito de PB-05-12, porque
  a fixture do gate `save:check` deriva de `pb-05-hunt-combat` e um golden ainda em disputa não pode
  virar baseline de outro playbook. **Dado necessário para remover:** veredito, commit auditado e
  hashes finais registrados no `STATE.md` do PB-05.

- **B2 (herdado, não bloqueante para escrever, potencialmente bloqueante para fechar):** `qa:browser`
  / hunt-budget é historicamente instável desde PB-05-01 e reprovou várias vezes. PB-06-09 e PB-06-10
  precisam distinguir falha por B2 de falha causada pelo save. Não mascarar com retry nem ajustar o
  teto.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos — gerados do artefato real;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
