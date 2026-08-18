# PB-06 — Save local e inventário

> **Para agentes executores:** skill obrigatória por task:
> `superpowers:test-driven-development` e `superpowers:verification-before-completion`. Procedimento
> operacional nas skills `playbook-task`, `run-gates` e `worktree-cycle`. Execute uma task card por
> chat. O formato, o handoff e o ciclo automático de integração/limpeza seguem
> `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** escrito e **bloqueado**. A execução só começa depois que PB-05-12 emitir o aceite do
PB-05. A primeira task elegível será PB-06-01.

**Goal:** fazer o progresso sobreviver ao `F5`. A run em andamento é persistida e retomada no mesmo
tick, o loot vira uma bolsa persistente entre runs, e o save é versionado, migrável e exportável —
sem que uma única casa do snapshot mude por causa disso.

**Architecture:** `@huntbound/contracts` publica `GameSave` v1, `ActiveRunState` e o schema Zod, e
recebe `RunBagEntry`, que sai de `@huntbound/content`. `@huntbound/save` deixa de ser esqueleto e
implementa `SaveRepository` sobre a porta `SaveDriver`, com migrações, export/import canônico, driver
em memória para Node e driver IndexedDB para o browser. `@huntbound/game` grava checkpoints em
fronteira de tick, retoma a sessão no boot, mostra a bolsa e o estoque no DOM e expõe o `SaveProbe`.
`packages/simulation` **não muda**.

**Tech Stack:** TypeScript 7.0.2 strict, Zod 4.4.3 (somente em `@huntbound/contracts`),
Vitest 4.1.10, Vite 8.2.1, Phaser 4, Playwright 1.62.1, Node 24.14.0. **Nenhuma biblioteca nova**
entra no PB-06 — nem wrapper de IndexedDB, nem `fake-indexeddb`, nem ORM de browser.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `AGENTS.md`;
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
3. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
4. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
5. `docs/08_POLITICA_MODELOS_AGENTES.md`;
6. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
7. `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`;
8. `docs/architecture/PACKAGE_BOUNDARIES.md`;
9. `docs/simulation/KERNEL_CONTRACT.md` e `docs/simulation/REPLAY_CONTRACT.md`;
10. este README;
11. a task card em execução;
12. `STATE.md` apenas para estado operacional.

## Restrições globais

Toda task herda esta seção; ela não se repete nos cards.

- Node `24.14.0` e pnpm `11.21.0` via Corepack; zero instalação global; sempre `corepack pnpm`.
- Nenhuma dependência externa nova em qualquer pacote.
- **`packages/simulation` não é alterado.** PB-06 lê o kernel; não o modifica. `SIMULATION_SCHEMA_VERSION`
  continua `4` e `SIMULATION_RULES_VERSION` continua `3`.
- `@huntbound/save` depende somente de `@huntbound/contracts` e `@huntbound/simulation`. Nunca de
  `@huntbound/content`, de `@huntbound/assets` ou de Phaser.
- Zod vive só em `@huntbound/contracts`. `@huntbound/save` não declara nem importa Zod.
- O estado serializado do kernel continua só com inteiros seguros, booleanos e strings.
- Todo artefato canônico é escrito por `encodeCanonicalJson`; PB-06 não introduz um segundo
  codificador.
- Artefato gerado não se edita à mão; regenere pelo CLI e valide pelo `--check` correspondente.
- Golden não se reescreve para passar.
- Nenhum golden de PB-03, PB-04 ou PB-05 pode mudar. Nenhum artefato gerado de conteúdo pode mudar.
- Mídia `cipsoft-personal` continua fora do repositório; o profile `product` a recusa.

## Resultado independente

Jogar, fechar a aba, reabrir e continuar de onde parou — com o loot no lugar. Concluir a run e ver o
que ela rendeu somar ao estoque, uma única vez. Exportar o save para um arquivo, importar noutro
perfil de browser e obter exatamente o mesmo estado.

| Prova | Verificação |
|---|---|
| Atomicidade | operação que lança não deixa escrita parcial; transações concorrentes não interleavam |
| Idempotência | consolidar a bolsa duas vezes soma uma vez só |
| Neutralidade | retomar do save importado reproduz o snapshot final golden do PB-05, byte a byte |
| Migração | documento sem versão vira v1 byte-idêntico ao golden; versão futura é recusada |
| Estabilidade | duas exportações do mesmo documento são a mesma string |
| Paridade | export no browser é igual ao export em Node |
| Regressão | goldens de PB-03, PB-04 e PB-05 e artefatos de conteúdo permanecem byte-idênticos |
| Isolamento | `packages/simulation` não teve uma linha alterada |
| Jogabilidade | reload retoma nos quatro viewports, sem erro de console, specs estáveis sem `retries` |

## Parâmetros congelados

| Parâmetro | Valor |
|---|---|
| `SAVE_SCHEMA_VERSION` | `1` |
| Banco IndexedDB | `huntbound-save`, versão `1` |
| Object store / chave | `save` / `'default'` |
| `SIMULATION_SCHEMA_VERSION` | `4` — inalterado |
| `SIMULATION_RULES_VERSION` | `3` — inalterado |
| Cadência de checkpoint | a cada `200` ticks |
| Checkpoints extras | fim de run, abandono e `pagehide` |
| Fixture do gate | `pb-06-save-session`, derivada de `pb-05-hunt-combat` |
| Tick do checkpoint congelado | `1400` |
| Tick final da retomada | `2700` |
| Codificação do export | `encodeCanonicalJson` mais um LF final |
| Ordenação de `stash` e `bag` | por `itemKey`, code unit UTF-16 crescente |
| Escopo do inventário | bolsa persistente e estoque; **sem** equipar, usar, capacidade ou peso |

## Arquitetura alvo

```text
kernel PB-05 (inalterado)
        │  SimulationSnapshot v4 · eventos loot/granted
        ▼
projectRunBag (@huntbound/content)  ──► bolsa da run
        │
        ▼
@huntbound/save
  SaveRepository  ──►  migrações  ──►  schema (@huntbound/contracts)
        │
        └── porta SaveDriver ──┬── MemorySaveDriver     (Node, tools, testes)
                               └── IndexedDbSaveDriver  (browser)
        │
        ▼
apps/game — checkpoint em fronteira de tick, retomada no boot,
            painel DOM de bolsa e estoque, export/import, SaveProbe
```

### Fronteiras futuras

```text
packages/contracts/src/save/                 GameSave v1, ActiveRunState, RunBagEntry, schema Zod
packages/content/src/runtime/runBag.ts       reimporta o tipo; a projeção continua aqui
packages/save/src/repository/                SaveRepository, fila serial, semântica de transação
packages/save/src/drivers/                   MemorySaveDriver, IndexedDbSaveDriver
packages/save/src/migrations/                registro de migrações e política de versão
packages/save/src/serialization/             export e import canônicos
packages/save/src/session/                   checkpoint, retomada e consolidação da bolsa
packages/test-fixtures/save/pb06/            fixture pb-06-save-session e goldens
tools/save/                                  CLI do gate save:check
apps/game/src/save/                          autosave, retomada, SaveProbe
apps/game/src/ui/                            painel de bolsa e estoque
tests/e2e/save-persistence.spec.ts           gate de browser
docs/simulation/REPLAY_CONTRACT.md           fixture e hashes do PB-06
docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md  nota do rascunho mutável de transact
```

## Ordem das tasks

| ID | Problema coeso | Dependência | Modelo/effort | Status |
|---|---|---|---|---|
| [PB-06-01](tasks/PB-06-01-definir-contratos-do-save.md) | `GameSave` v1, `ActiveRunState`, `SaveDraft`, schema Zod, migração de `RunBagEntry` para contracts | PB-05 fechado | Sol / Opus 5 / Grok 4.6 `xhigh` | pending |
| [PB-06-02](tasks/PB-06-02-implementar-repositorio-e-driver-memoria.md) | `SaveRepository` sobre a porta `SaveDriver`, driver em memória, fila serial, rollback | PB-06-01 | Luna `xhigh` | pending |
| [PB-06-03](tasks/PB-06-03-implementar-migracoes-do-save.md) | registro de migrações, documento sem versão → v1, recusa de versão futura | PB-06-01 | Luna `xhigh` | pending |
| [PB-06-04](tasks/PB-06-04-implementar-export-e-import.md) | export canônico estável, import validado, substituição atômica | PB-06-02, PB-06-03 | Luna `xhigh` | pending |
| [PB-06-05](tasks/PB-06-05-implementar-driver-indexeddb.md) | `IndexedDbSaveDriver`, `onupgradeneeded`, transação atômica, mapeamento de erros | PB-06-02 | Luna `xhigh` / Grok 4.6 `high` | pending |
| [PB-06-06](tasks/PB-06-06-persistir-e-retomar-a-run.md) | checkpoint em fronteira de tick, retomada, consolidação, descarte que preserva a bolsa | PB-06-02, PB-06-04 | Sol / Opus 5 / Grok 4.6 `xhigh` | pending |
| [PB-06-07](tasks/PB-06-07-fixture-e-gate-de-save.md) | fixture `pb-06-save-session`, CLI, `save:check` em `check`/`verify`, contrato de replay | PB-06-03, PB-06-06 | Sol / Opus 5 / Grok 4.6 `xhigh` | pending |
| [PB-06-08](tasks/PB-06-08-integrar-save-e-inventario-no-jogo.md) | autosave, retomada no boot, painel de bolsa e estoque, export/import, erro visível | PB-06-05, PB-06-06 | Luna `xhigh` / Grok 4.6 `high` | pending |
| [PB-06-09](tasks/PB-06-09-validar-persistencia-no-browser.md) | reload retoma, paridade de export, quatro viewports, estabilidade sem `retries` | PB-06-07, PB-06-08 | Luna `xhigh` / Grok 4.6 `high` | pending |
| [PB-06-10](tasks/PB-06-10-auditar-e-fechar-playbook.md) | auditoria integrada e aceite; decide a elegibilidade de PB-07 | PB-06-09 | Opus 5 / Sol / Grok 4.6 `xhigh` | pending |

**Paralelismo.** PB-06-03, PB-06-04 e PB-06-05 tocam diretórios disjuntos dentro de `packages/save`
e podem executar em paralelo depois de PB-06-02 — com a ressalva de que PB-06-04 depende do registro
de migrações de PB-06-03 e, em modo paralelo, precisa integrá-lo antes de fechar. O restante é
serial. Em modo paralelo, os executores removem worktrees limpas, preservam branches e não disputam
`STATE.md`; a task dependente integra, atualiza o handoff e apaga as branches após os gates
integrados.

## Política de modelos

`docs/08_POLITICA_MODELOS_AGENTES.md` é normativo. PB-06 é majoritariamente implementação bem
especificada, então o padrão é **Luna-first**. Vão para a camada frontier as três tasks de maior
risco residual: PB-06-01 (schema novo que PB-07 e PB-08 vão herdar), PB-06-06 (composição sutil entre
laço de tick, transação e retomada) e PB-06-07 (o gate que amarra persistência a determinismo). A
auditoria PB-06-10 usa modelo **diferente** do implementador majoritário do playbook.

## Baseline de qualidade

- Branch-base: `main`. Branch temporária: `<agente>/pb06-NN-<slug>`.
- Spec aprovada: `docs/superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md`.
- PB-01 a PB-04: fechados. PB-05: o veredito e o commit auditado são lidos de
  `docs/playbooks/PB-05/STATE.md` no momento da execução — este README **não** os copia, para não
  repetir o defeito D2 do PB-04.
- Os hashes de baseline das fixtures de replay são lidos de `docs/simulation/REPLAY_CONTRACT.md` no
  momento da execução, nunca transcritos aqui.
- Gate raiz: `corepack pnpm verify`, que deve continuar verde e idempotente, **mais** `biome check .`,
  que o `verify` não cobre.

## Obrigações herdadas das auditorias anteriores

Estas são critério de aceite em todas as tasks aplicáveis, não recomendação:

- **D1 — estabilidade real.** `playwright.config.ts` tem `retries: 0`. Spec nova é provada com
  `--retries=0 --repeat-each=10`; reintroduzir `retries` para mascarar instabilidade é defeito.
- **D2 — hash existe ou não se publica.** Todo SHA-256 citado em card, spec, relatório ou `STATE.md`
  é gerado do artefato real e verificável na árvore.
- **D3 — fixture entra no contrato.** `pb-06-save-session` é registrada em
  `docs/simulation/REPLAY_CONTRACT.md` no mesmo commit que a cria.
- **D4 — lint é gate.** `biome check .` roda explicitamente antes de declarar qualquer task
  concluída.
- **B5 — hunt-budget.** Bloqueio herdado do PB-05, historicamente instável. PB-06 não o mascara com
  retry, não o contorna e não o declara fechado sem evidência fresca. Se `qa:browser` falhar por B5 e
  só por B5, registre no `STATE.md` com a saída real em vez de ajustar o teto.

## Armadilhas conhecidas

Detalhe em `AGENTS.md`; resumo do que já custou tempo neste repositório:

1. Worktree nova não tem `node_modules`. Rode `corepack pnpm install --prefer-offline` dentro dela
   antes de qualquer gate.
2. `git worktree remove` falha com "Directory not empty" por causa de `node_modules`. Apague o
   diretório e só então rode `git worktree prune` e `git branch -d`.
3. Playwright serve o `dist` pré-buildado. Toda edição em `apps/game/src/**` é invisível para o
   browser até `corepack pnpm build`.
4. Servidor vite preso na worktree impede a remoção do diretório. Mate o listener antes de apagar.
5. Específico deste playbook: IndexedDB **persiste entre specs de Playwright**. Toda spec de save
   limpa o banco antes e depois, ou os testes passam a depender da ordem de execução.

## Critérios finais de aceite

- [ ] `GameSave` v1 é validado por schema, com ordenação e unicidade exigidas, não corrigidas em
      silêncio.
- [ ] `transact` é atômico: operação que lança não escreve nada.
- [ ] Duas `transact` concorrentes não interleavam leitura e escrita.
- [ ] A bolsa da run é consolidada exatamente uma vez, provado por dupla consolidação.
- [ ] Sessão incompatível com o cenário é descartada com a bolsa preservada em `stash`.
- [ ] O documento sem `schemaVersion` migra para v1 byte-idêntico ao golden.
- [ ] `schemaVersion` maior que o corrente é recusado com código próprio, nunca rebaixado.
- [ ] Duas exportações do mesmo documento produzem a mesma string.
- [ ] Import é substituição validada e atômica; documento inválido e versão futura têm códigos
      distintos.
- [ ] Retomar do save importado reproduz o snapshot final golden do PB-05, byte a byte.
- [ ] `packages/simulation` não teve uma linha alterada, provado por diff.
- [ ] Todos os goldens de PB-03, PB-04 e PB-05 e os artefatos gerados de conteúdo permanecem
      byte-idênticos.
- [ ] `save:check` entra em `check` e `verify` e está registrado em `REPLAY_CONTRACT.md`.
- [ ] Recarregar a página retoma a run no mesmo tick com a bolsa intacta, nos quatro viewports, com
      specs estáveis sem `retries`.
- [ ] Falha de persistência é observável na UI; o jogo nunca finge ter salvo.
- [ ] `corepack pnpm verify` passa duas vezes seguidas e `biome check .` sai `0`.
- [ ] O relatório de aceite decide a elegibilidade de PB-07.

## Fora de escopo

- equipar item, trocar arma, usar consumível, capacidade e peso;
- XP, level e progressão de skill — a ficha continua conteúdo congelado do PB-05;
- coleção de outfits, `outfitTokens` e moeda — PB-07 e PB-08;
- helper — PB-09; spike de performance e orçamento completo — PB-10;
- segunda hunt, seleção de hunt em runtime e menu de mundo;
- backend, conta, sincronização remota e resolução de conflito entre dispositivos;
- criptografia, assinatura ou anti-tamper do save;
- fusão de dois saves no import;
- alterar PB-01 a PB-05 sem defeito bloqueante reproduzido.

## Como executar

Abra um chat novo e envie o bloco copiável da próxima task indicada em `STATE.md`. Execute somente
uma task. A task cria branch/worktree, instala dependências, segue RED/GREEN, verifica, atualiza o
handoff, commita, integra por `--ff-only` no fluxo serial e remove seus recursos temporários. Não
antecipe a seguinte.
