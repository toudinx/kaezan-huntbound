# AGENTS.md — Kaezan Huntbound

Fonte compartilhada de instruções para todo agente que escreve neste repositório: Cursor, Codex,
Claude Code ou qualquer outro. Cursor e Codex leem este arquivo diretamente; Claude Code chega aqui
por `CLAUDE.md`. Regras adicionais com escopo por diretório vivem em `.cursor/rules/*.mdc` e são
válidas para qualquer agente, mesmo os que não as carregam automaticamente.

## O projeto em uma linha

RPG single-player browser-first em **Phaser 4 + TypeScript + Vite**, top-down tile-based inspirado em
Tibia, com V0 pessoal e local-first baseado no snapshot Canary, simulação determinística isolada do
renderer e gacha exclusivamente cosmético de outfits.

## Autoridade documental

Quando houver conflito, esta ordem vence (é a de `docs/README.md`):

1. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` — produto, fontes de verdade, escopo do V0.
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md` — stack e arquitetura web.
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md` — formato de playbooks, task cards e handoffs.
4. `docs/08_POLITICA_MODELOS_AGENTES.md` — modelo, effort e revisão independente.
5. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` — ordem e Definition of Ready dos playbooks.
6. `docs/BASE_CONTEXTO_KAEZAN_HUNTBOUND(1).md` — contexto mestre.
7. `docs/01_GUIA_DE_EXECUCAO.md` — resumo de controle.

**Não são direção vigente.** `docs/00_DOSSIE_PESQUISA_E_PROMPTS(2).md`, `docs/02_SINTESE_DIRECAO_UNICA.md`,
`docs/04_PLAYBOOK_FUNDAMENTACAO_GAME_STUDIO.md`, `docs/C03`–`docs/C06` e `docs/research/**` são
evidência histórica. Vários recomendam **Godot** ou **Angular/C#**, premissas já substituídas. Seus
fatos e medições continuam úteis; suas recomendações de stack não. Nunca proponha stack, arquitetura
ou backlog com base neles.

O playbook em execução e seu estado estão em `docs/playbooks/<PB-ID>/STATE.md`.

## Toolchain

- Node **24.14.0** (`.node-version`), pnpm **11.21.0** via **corepack**.
- Sempre `corepack pnpm <script>`. Nunca `npm`, `yarn` ou `pnpm` sem corepack.
- Workspace: `apps/*` e `packages/*` (`pnpm-workspace.yaml`). `tools/*` roda direto por `node` com
  `--experimental-transform-types`.
- `save-exact=true`: versões são pinadas de propósito. Não faça bump sem pedido.
- Desenvolvimento em **Windows/PowerShell**. Comandos com pipe/glob POSIX podem falhar; prefira o
  script pnpm existente a montar a linha na mão.

## Gates

| Comando | Cobre | Quando |
|---|---|---|
| `corepack pnpm format:check` | formatação Biome | sempre antes de commitar |
| `biome check .` | formatação **e lint** | sempre antes de commitar — veja o aviso abaixo |
| `corepack pnpm typecheck` | TS de todos os pacotes | mudou tipo, contrato ou API |
| `corepack pnpm test` | Vitest + testes de fronteira + suítes de tools | mudou código |
| `corepack pnpm architecture:check` | fronteiras de pacote | mudou import ou manifesto |
| `corepack pnpm content:check` | catálogo, gerados e sidecars de conteúdo | mudou `packages/content` ou seus tools |
| `corepack pnpm assets:check` | packs, profiles e artefatos de asset | mudou `packages/assets` ou o packer |
| `corepack pnpm simulation:check` | replay golden do PB-03 | mudou o kernel |
| `corepack pnpm hunt:check` | replay golden das hunts do PB-04 | mudou kernel, hunt ou cenário |
| `corepack pnpm build` | build de produção | antes de qualquer verificação no browser |
| `corepack pnpm qa:browser` | build + Playwright | mudou `apps/game` ou comportamento observável |
| `corepack pnpm verify` | tudo acima exceto lint | fechamento de task |

**Aviso conhecido:** `verify` roda `format:check`, **não** `biome check`. Lint quebrado passa pelo
`verify` e é reprovado depois na auditoria — foi o defeito D4 do PB-04-10. Rode `biome check .`
explicitamente antes de declarar uma task concluída.

Gate é evidência, não formalidade: nenhum resultado pode ser afirmado sem a saída fresca do comando.

## Hooks de guarda

As regras que mais custaram tempo são verificadas por hook, com **uma única implementação** para os
três agentes:

| Camada | Arquivo |
|---|---|
| Regras puras e testadas | `tools/agent-hooks/rules.ts` (testes em `tests/workspace/agent-hooks.test.ts`) |
| Sonda de filesystem | `tools/agent-hooks/workspace.ts` |
| Adaptador Cursor | `tools/agent-hooks/cursor.ts` ← `.cursor/hooks.json` |
| Adaptador Claude Code e Codex | `tools/agent-hooks/claude-codex.ts` ← `.claude/settings.json`, `.codex/hooks.json` |
| Guarda no commit, independente de agente | `tools/git-hooks/pre-commit` |

O que é bloqueado: `npm`/`yarn`/`pnpm` fora do corepack; `--no-verify`; force push; `git add -f` de
asset pessoal; edição manual de artefato gerado, fixture `expected/` ou golden; `playwright test`
direto quando `dist/game` está mais velho que `apps/game/src`. O que pede confirmação: `reset --hard`,
`clean -f`, `branch -D`, `git worktree remove`.

Semântica: **silêncio significa "sem opinião"** — a permissão normal do agente decide, e o hook nunca
amplia o que você já autorizou. Só `deny` e `ask` produzem saída. Falha interna do hook sai `0`: um
guard quebrado não pode travar o agente.

Para mudar uma regra, edite `rules.ts` e seu teste. Os adaptadores só traduzem protocolo; não coloque
regra dentro deles.

Ative o hook de Git uma vez por clone ou worktree:

```bash
git config core.hooksPath tools/git-hooks
```

Limitação conhecida: o `afterFileEdit` do Cursor é observacional e não bloqueia, então lá a edição de
artefato gerado vira aviso e é barrada depois no `pre-commit`. Em Claude Code e Codex o `PreToolUse`
bloqueia antes da escrita.

## Fronteiras de pacote

`tools/architecture/dependency-policy.json` é a fonte executável; `docs/architecture/PACKAGE_BOUNDARIES.md`
explica. Resumo:

| Pacote | Pode depender de | Nunca |
|---|---|---|
| `@huntbound/contracts` | nada | qualquer pacote Huntbound |
| `@huntbound/simulation` | `contracts` | Phaser, DOM, `node:*`, **qualquer dependência externa** |
| `@huntbound/content` | `contracts` | mutar simulação, Phaser |
| `@huntbound/assets` | `contracts` (+ `zod`) | Phaser, `node:*`, estado de simulação |
| `@huntbound/save` | `contracts`, `simulation` | Phaser, importadores de conteúdo |
| `@huntbound/test-fixtures` | `contracts`, `simulation` | Phaser, DOM, estado de runtime |
| `@huntbound/game` | todos exceto fixtures | regra de jogo em scene, path de asset direto em domínio |

## Regras invioláveis

- **Artefato gerado não se edita à mão.** `packages/content/src/generated/**`,
  `packages/test-fixtures/**/expected/**` e os packs sob `apps/game/public/assets/**` são saída de
  CLI. Regenere pelo tool e valide com o `--check` correspondente.
- **Golden não se reescreve para passar.** Um replay golden diferente significa mudança de
  comportamento: prove que é intencional, documente e só então regenere.
- **Asset pessoal não entra no Git.** `apps/game/public/assets/{personal,product,test}` e
  `assets/personal/` são ignorados. O profile `product` recusa `licenseClass: "cipsoft-personal"`.
- **Simulação não conhece apresentação.** Nada de DOM, Phaser, `node:*`, `Date.now()`, `Math.random()`
  ou I/O dentro de `packages/simulation`. Tick fixo, RNG seedado, grid inteiro, eventos ordenados.
- **Asset é acessado por manifesto**, nunca por path literal dentro da simulação ou do domínio.
- **TibiaRoute não é raspado em runtime.** Ele escolhe a hunt; o Canary fornece IDs, regras e mapa.
- Retry, `skip`, timeout inflado, warning suprimido, catch vazio ou asserção enfraquecida para fechar
  um gate são defeitos. `retries: 1` mascarando teste instável já reprovou um playbook aqui.

## Fontes externas

- `references/canary` é clone parcial do Canary em `157e6f9e` e **não tem o mapa global**. Antes de
  concluir que um arquivo do snapshot não existe, procure em `C:\Kaezan\kaezan\canary-3.4.1\`,
  `C:\Kaezan\kaezan - world\canary-3.4.1\` e `C:\Users\toudi\Downloads\otservbr.otbm`. Nada precisa
  ser baixado.
- 3.4.1 e `157e6f9e` são versões diferentes: compare a região relevante antes de parear arquivos
  entre elas.
- `HUNTBOUND_CANARY_SOURCE` aponta o snapshot; `HUNTBOUND_PERSONAL_ASSET_SOURCE` aponta a origem dos
  assets pessoais. Os tools leem essas variáveis; não hardcode paths.
- `references/` é ignorado pelo Git e pelo Biome. Não indexe nem edite nada lá.

## Armadilhas que já custaram tempo

1. **Playwright serve o `dist` pré-buildado.** `playwright.config.ts` sobe `vite preview`, que serve
   `dist/game`. Nada na suíte reconstrói. Toda edição em `apps/game/src/**` é invisível para o browser
   até `corepack pnpm build`. `qa:browser` e `verify` buildam antes; `playwright test` direto, não.
   Quando o sintoma no browser contradisser o código que você está lendo, confira a idade do bundle
   antes de teorizar.
2. **Worktree nova não tem `node_modules`.** Rode `corepack pnpm install --prefer-offline` logo após
   `git worktree add`; resolve do store local em segundos e não toca o lockfile.
3. **`git worktree remove` falha com "Directory not empty"** por causa de `node_modules`. Apague o
   diretório com `rm -rf` e só então `git worktree prune` + `git branch -d`.
4. **Servidor vite preso na worktree** faz o `rm -rf` falhar com "Device or resource busy" em
   `apps/game`. Mate o listener (`Get-NetTCPConnection -LocalPort <porta> -State Listen`, depois
   `Stop-Process -Id <pid> -Force`) antes de apagar.

## Protocolo de execução

Uma task = um chat. O procedimento completo está em `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`; o
essencial:

1. Leia a task card, o `STATE.md` do playbook e **apenas** as referências que a task listar.
2. Inspecione o workspace real antes de editar. Preserve decisões congeladas.
3. Teste antes da implementação quando o comportamento for testável.
4. Rode as verificações exigidas com evidência fresca.
5. Atualize `STATE.md` e a ADR/spec quando a task exigir.
6. Commit, integração declarada (padrão `git merge --ff-only`), verificação pós-integração e limpeza
   de worktree/branch — tudo isso já está autorizado pela task, não peça confirmação de novo.
7. Não inicie a próxima task.

Pare e reporte quando: precisar mudar decisão congelada, contrato, schema ou escopo; encontrar
comportamento com mais de uma interpretação plausível; não conseguir provar determinismo, segurança
ou rollback com os gates da task; a mesma causa bloquear dois ciclos vermelho/verde. Registre o
bloqueio no `STATE.md` em vez de deixá-lo só no relatório do chat.

Branch temporária segue `<agente>/pb<NN>-<NN>-<slug>` (ex.: `codex/pb04-04-extract-region`).

## Modelos

`docs/08_POLITICA_MODELOS_AGENTES.md` é normativo. Em resumo: implementação bem especificada em
modelo econômico com effort alto; implementação complexa, especificação e auditoria em modelo
frontier (GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`); revisão prefere modelo **diferente** do
implementador. Modelo e effort efetivamente usados vão para o `STATE.md`.

## Estilo

Biome 2.5 com preset recomendado: indentação por espaço, aspas simples, ponto e vírgula sempre.
Código, identificadores e commits em inglês; documentação e task cards em português. Siga o padrão do
arquivo vizinho antes de introduzir um novo.
