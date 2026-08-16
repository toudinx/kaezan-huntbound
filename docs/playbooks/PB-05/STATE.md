# PB-05 — Estado operacional

**Playbook:** `docs/playbooks/PB-05/README.md`

**Estado geral:** autoria concluída, execução **não iniciada**. B4 está resolvido. B3 continua
aberto até a nova rodada de PB-04-10.

**Última atualização:** 2026-08-16

**Atualização vigente:** `claude/agent-instructions-shared` entrou em `main` no merge `5aeb8bb`
(`AGENTS.md`, skills, hooks). FIX-03 e FIX-04 do PB-04 também estão em `main`. PB-05-01 continua
inelegível até a auditoria do PB-04 aprovar.

**Próxima etapa:** nova rodada de **PB-04-10**. Com veredito aprovado, PB-05-01 é a primeira task
elegível.

## Tasks

| ID | Status | Branch prevista | Commit integrado | Evidência principal |
|---|---|---|---|---|
| PB-05-01 | pending | `<agente>/pb05-01-vocation-spell-selection` | — | `docs/content/PB-05-SELECTION.md` + CLI de verificação exit 0 no snapshot |
| PB-05-02 | pending | `<agente>/pb05-02-import-spells-character` | — | bundle regenerado com três spells + ficha congelada; `content:check` exit 0 |
| PB-05-03 | pending | `<agente>/pb05-03-combat-contracts` | — | `packages/contracts/src/simulation/**` v4 + `KERNEL_CONTRACT.md` |
| PB-05-04 | pending | `<agente>/pb05-04-kernel-combat` | — | kernel v4; journals golden de PB-03 e PB-04 byte-idênticos |
| PB-05-05 | pending | `<agente>/pb05-05-hunter-ai` | — | comportamento `hunter` com varredura de retomada verde |
| PB-05-06 | pending | `<agente>/pb05-06-loot-autoloot` | — | `loot/granted` determinístico + projeção da bolsa fora do kernel |
| PB-05-07 | pending | `<agente>/pb05-07-content-to-combat` | — | `buildHuntScenario` com combate; quatro artefatos da hunt inalterados |
| PB-05-08 | pending | `<agente>/pb05-08-combat-fixture` | — | `packages/test-fixtures/hunt/pb05/**` + `combat:check` + registro no contrato de replay |
| PB-05-09 | pending | `<agente>/pb05-09-combat-assets` | — | pack com efeitos, corpo e sangue; `assets:check` exit 0 |
| PB-05-10 | pending | `<agente>/pb05-10-combat-hud` | — | HUD, input, números de dano, autoloot e overlay de morte |
| PB-05-11 | pending | `<agente>/pb05-11-combat-browser-qa` | — | `artifacts/browser-qa.md` + 4 screenshots + specs estáveis sem `retries` |
| PB-05-12 | pending | `<agente>/pb05-12-integrated-gate` | — | `artifacts/acceptance-report.md` |

## Última task concluída

Nenhuma. A autoria do playbook não é task de PB-05.

## Próxima task elegível

**Nenhuma até B3 ser resolvido.** B4 está fechado. Depois da nova rodada de PB-04-10: **PB-05-01**.

## Verificações executadas

Nenhuma verificação de código foi executada por este playbook. Os fatos de baseline citados na spec e
no README foram lidos do repositório em 2026-08-15, no commit `420b6fb`:

| Fato | Fonte lida |
|---|---|
| Knight, Berserk, Rotworm e itens no catálogo curado | `packages/content/src/generated/pb-01-contract-coverage.json` |
| Blueprints atuais `player` inert `10` e `rotworm` wander `20` | `packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json` |
| `runOnHealth` não é capturado pelo importer | `packages/content/src/importers/canary/lua/parseMonsterLua.ts` |
| Dívida de cooldown por estatística pertence a PB-05 | `docs/content/MAP_REGION_CONTRACT.md` |
| Streams e fases atuais do kernel | `docs/simulation/KERNEL_CONTRACT.md` |

Nenhum SHA-256 novo foi publicado por esta autoria: os hashes de baseline são lidos de
`docs/simulation/REPLAY_CONTRACT.md` no momento da execução de cada task. Isso é deliberado — hash
publicado sem artefato correspondente foi o defeito D2 da auditoria do PB-04.

## Decisões descobertas durante a autoria

| Decisão | Onde está documentada |
|---|---|
| Fórmula float é resolvida no conteúdo; o kernel só recebe `min`/`max` inteiros | spec, "Direção escolhida" §1 |
| `itemKey` e `spellKey` entram na proibição executável do kernel | spec, §2 |
| A região **não** é reextraída; o combate é composto em `buildHuntScenario` | spec, §3 |
| Autoloot sem comando de coleta; bolsa é projeção de eventos fora do kernel | spec, §4 |
| Corpo e sangue são apresentação pura, sem estado no kernel | spec, §4 |
| Fuga em vida baixa fica fora por ausência de fonte no importer | spec, §5 |
| Ficha congelada em level 35 trivializa a hunt; risco aceito, alternativa registrada | spec, §6 |
| Mitigação zero porque todas as resistências do Rotworm são `0` | spec, "Parâmetros congelados" |
| Sete sistemas por tick, com `upkeep` antes de `combat` e morte antes de `ai` | spec, "Fases do tick" |

## Bloqueios

- **B3 (bloqueante, externo ao PB-05):** PB-04 está aberto. A auditoria PB-04-10 sobre `307a3f0`
  permanece `REJECTED` no histórico. FIX-02/03/04 estão em `main` (`6cd63c6`, `911ce2f`/`695b6a7`,
  `96c7628`/`6aeefec`). Uma nova rodada de PB-04-10 precisa aprovar. **PB-05-01 não abre antes
  desse veredito.**

- ~~**B4 (bloqueante, pré-requisito de instrução):** `AGENTS.md` vivia só em
  `claude/agent-instructions-shared`.~~ **Resolvido em 2026-08-16** pelo merge `5aeb8bb`. Fast-forward
  era impossível (a branch tinha divergido); o merge commit integrou `AGENTS.md`, `CLAUDE.md`,
  `.cursor/rules`, `.cursor/skills` e o motor de hooks. `docs/08_POLITICA_MODELOS_AGENTES.md` com
  Grok 4.6 está em `main`.

## Regra de atualização

Ao concluir ou bloquear uma task:

1. atualizar status, branch, commit e evidência na tabela;
2. registrar comandos, exit codes, contagens e hashes frescos — gerados do artefato real;
3. registrar decisões duráveis na spec/arquitetura e apenas referenciá-las aqui;
4. indicar a próxima task realmente elegível;
5. registrar modelo, effort, skills e validador efetivos;
6. preservar histórico de falhas, desvios e gatilhos de escalonamento;
7. em modo paralelo, deixar a task dependente consolidar o handoff compartilhado.
