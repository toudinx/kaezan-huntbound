# PB-00-01 — Inicializar repositório, toolchain e workspace

**Status inicial:** pending  
**Rota Codex:** `game-studio:web-game-foundations` + `superpowers:test-driven-development` quando
houver comportamento testável + `superpowers:verification-before-completion`  
**Effort sugerido:** high

## Objetivo

Transformar a raiz documental em um repositório Git e pnpm workspace reproduzível, com toda a
estrutura de packages do V0, TypeScript strict e comandos raiz funcionais. Esta é uma única mudança
coesa e pode criar muitos arquivos.

## Resultado esperado

Um clone contendo apenas os arquivos rastreados pode instalar a toolchain congelada e executar os
checks raiz sem depender dos repositórios de `references/` nem de instalação global de pnpm.

## Dependências

Nenhuma task anterior. O estado esperado é a raiz sem `.git` e sem `package.json`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00/STATE.md`;
3. `docs/playbooks/PB-00/README.md`;
4. `docs/03_ADR_PHASER4_BROWSER_FIRST.md` — Decisão, Arquitetura e Performance inicial;
5. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

Não é necessário ler relatórios históricos nem código dentro de `references/`.

## Decisões congeladas

- pnpm é o package manager.
- Biome é a ferramenta de lint e formatação; Vitest é o runner unitário.
- TypeScript usa `strict: true` e `noEmit: true` nos checks.
- Dependências são exatas; `.npmrc` deve conter `save-exact=true`.
- Os packages usam o namespace `@huntbound/*`.
- `references/` e `.obsidian/` são acervos locais, não conteúdo do Git raiz.
- Não existe `apps/server` no V0.

## Escopo permitido

Criar e versionar:

```text
.editorconfig
.gitignore
.npmrc
.node-version
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
tsconfig.base.json
biome.json
vitest.config.ts
apps/game/package.json
apps/game/tsconfig.json
apps/game/src/index.ts
packages/{contracts,simulation,content,assets,save,test-fixtures}/package.json
packages/{contracts,simulation,content,assets,save,test-fixtures}/tsconfig.json
packages/{contracts,simulation,content,assets,save,test-fixtures}/src/index.ts
tests/workspace/workspace-config.test.ts
docs/playbooks/PB-00/artifacts/toolchain-baseline.md
docs/playbooks/PB-00/STATE.md
```

Também é permitido ajustar paths se uma versão oficial da ferramenta exigir uma convenção
diferente, desde que a decisão e a razão sejam registradas no baseline.

## Fora de escopo

- Phaser game config, scenes, DOM overlay ou CSS;
- contratos de gameplay, kernel, conteúdo, assets e save;
- lint arquitetural;
- Playwright browser tests;
- PWA, service worker, backend ou CI remoto;
- modificar qualquer arquivo dentro de `references/`.

## Instruções de execução

1. Confirme o estado real com `Get-ChildItem -Force`, `git status`, `node --version`,
   `corepack --version` e `pnpm --version`. `git status` deve inicialmente informar que a raiz não é
   um repositório; se já existir Git, pare e compare o estado com esta task antes de continuar.
2. Consulte metadata oficial/registry das versões estáveis atuais de Node LTS, pnpm, Phaser 4,
   TypeScript, Vite, Biome, Vitest e Playwright. Se o Node instalado não satisfizer simultaneamente
   as ferramentas, bloqueie a task informando a versão necessária; não altere o Node global em
   silêncio.
3. Registre versões, data, comandos consultados e compatibilidade em
   `docs/playbooks/PB-00/artifacts/toolchain-baseline.md`.
4. Execute `git init -b main` na raiz. Configure `.gitignore` para excluir no mínimo
   `references/`, `.obsidian/`, `node_modules/`, `dist/`, `coverage/`, `test-results/`,
   `playwright-report/`, arquivos `.env*` exceto `.env.example`, logs, caches e assets pessoais.
5. Configure Biome e Vitest. Escreva primeiro `workspace-config.test.ts` para validar nomes
   `@huntbound/*`, `private: true`, herança do tsconfig base, scripts reais e ausência de ranges nas
   dependências diretas; execute e confirme que falha porque o workspace ainda não existe.
6. Crie o pnpm workspace e os sete packages listados no escopo. Cada package deve ter
   `private: true`, scripts locais coerentes e entrypoint TypeScript mínimo, sem comportamento de
   jogo. `apps/game` pode permanecer um entrypoint vazio compilável nesta task.
7. Fixe `packageManager`, `engines.node`, `.node-version` e versões exatas. Use Corepack; não dependa
   de `npm install -g pnpm`.
8. Configure `tsconfig.base.json` com pelo menos `strict`, `noUncheckedIndexedAccess`,
   `exactOptionalPropertyTypes`, `useUnknownInCatchVariables`, `verbatimModuleSyntax`,
   `isolatedModules`, `noEmit` e target moderno suportado pelos browsers do projeto.
9. Configure scripts raiz `format`, `format:check`, `typecheck`, `test`, `build`, `check` e `verify`.
   Nesta task, `check` e `verify` podem executar apenas gates já existentes, mas não podem mascarar
   falhas com `|| true`, `exit 0` artificial ou scripts vazios.
10. Gere `pnpm-lock.yaml` com instalação bem-sucedida. Não use ranges `^`, `~`, `latest` ou `*` nas
   dependências diretas.
11. Faça o teste de workspace passar, execute as verificações abaixo, inspecione
    `git status --short` e confirme que nenhum arquivo de `references/`, `.obsidian/`, asset pessoal,
    secret ou build output será rastreado.
12. Atualize `STATE.md` e crie o primeiro commit.

## Verificação obrigatória

```text
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm check
git status --short --ignored
git ls-files
```

Resultados esperados:

- todos os comandos pnpm terminam com exit code 0;
- o lockfile não muda na instalação congelada;
- `git ls-files` não lista `references/`, `.obsidian/`, `.env`, assets pessoais ou outputs;
- todos os packages participam do workspace e compilam sob TypeScript strict;
- não existe código de gameplay.

## Critérios de aceite

- [ ] Git raiz inicializado em `main`.
- [ ] Toolchain e razões registradas no baseline.
- [ ] Node/pnpm e dependências diretas estão fixados.
- [ ] Workspace contém todos os packages previstos pela ADR, sem `apps/server`.
- [ ] TypeScript strict é herdado por todos os packages.
- [ ] Instalação congelada e comandos raiz passam.
- [ ] Referências e arquivos locais sensíveis permanecem fora do Git.

## Condições de parada

Pare e marque `blocked` se já houver Git/package manager incompatível, se o Node disponível não for
suportado, se a rede impedir confirmar/instalar versões ou se algum arquivo atualmente presente
parecer segredo ou asset que não possa ser classificado com segurança.

## Handoff e commit

Atualize `STATE.md` com versões, comandos canônicos, resultado das verificações, commit e
`PB-00-02` como próxima task. Commit esperado:

```text
chore: initialize Phaser TypeScript workspace
```

## Relatório final

Informe versões fixadas, packages criados, checks executados, itens ignorados pelo Git, commit e
qualquer desvio documentado. Não inicie PB-00-02.
