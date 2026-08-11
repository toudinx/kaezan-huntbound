# PB-00R-04 — Limpar output de build

**Status inicial:** pending

**Classe da tarefa:** implementação menor e bem especificada

**Modelo sugerido:** GPT-5.6 Luna, effort `xhigh`

**Validador sugerido:** GPT-5.6 Sol `xhigh` ou Claude Opus 5

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Game Studio não se aplica porque esta task é mecânica de configuração do build.

**Paralelismo:** onda 1; pode executar em paralelo com PB-00R-01 e PB-00R-03 em worktree isolado.
PB-00R-02 depende deste commit integrado.

## Objetivo

Tornar o output Vite determinístico, limpando exclusivamente `dist/game` antes de cada build e
eliminando o aviso de `outDir` externo não esvaziado.

## Resultado esperado

`apps/game/vite.config.ts` explicita `emptyOutDir: true`. Um arquivo sentinela criado dentro de
`dist/game` é removido pelo build seguinte; arquivo sentinela irmão em `dist/` permanece intacto.

## Dependências

- PB-00R criado e commitado.
- Worktree limpa na branch `codex/pb00r-04-clean-build`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00R/STATE.md`;
3. `docs/08_POLITICA_MODELOS_AGENTES.md`;
4. `apps/game/vite.config.ts`;
5. `apps/game/package.json`;
6. `tests/workspace/workspace-config.test.ts`;
7. `.gitignore`.

## Decisões congeladas

- O output permanece `../../dist/game`.
- A limpeza é responsabilidade do Vite; não criar script próprio de deleção.
- Não usar glob, path calculado ou deleção recursiva manual.
- Não alterar bundling, chunking, minificação ou budget.
- O aviso de chunk acima de 500 kB continua aceito e fora de escopo.

## Escopo permitido

```text
apps/game/vite.config.ts
tests/workspace/vite-build-config.test.ts
docs/playbooks/PB-00R/STATE.md
docs/playbooks/PB-00R/artifacts/acceptance-report.md
```

## Fora de escopo

- code splitting, dependências ou lockfile;
- limpar `apps/game/dist` histórico ou qualquer path fora de `dist/game`;
- mudar Playwright, boot budget ou runtime;
- iniciar PB-00R-02 antes da integração deste commit.

## Execução red-green

- [ ] **1. Reproduzir o aviso e preservar a saída.**

```text
corepack pnpm --filter @huntbound/game build
```

Registre o aviso de que `dist/game` está fora da raiz e não será esvaziado.

- [ ] **2. Escrever teste de configuração antes da correção.**

Crie `tests/workspace/vite-build-config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import gameViteConfig from '../../apps/game/vite.config';

describe('game Vite output', () => {
  it('cleans the explicit game output directory before build', () => {
    expect(gameViteConfig.build?.outDir).toBe('../../dist/game');
    expect(gameViteConfig.build?.emptyOutDir).toBe(true);
  });
});
```

- [ ] **3. Executar RED.**

```text
corepack pnpm exec vitest run tests/workspace/vite-build-config.test.ts
```

Resultado esperado: falha porque `emptyOutDir` é `undefined`.

- [ ] **4. Implementar configuração mínima.**

Em `apps/game/vite.config.ts`, preserve `outDir` e adicione:

```ts
build: {
  outDir: '../../dist/game',
  emptyOutDir: true,
},
```

- [ ] **5. Executar GREEN do contrato.**

```text
corepack pnpm exec vitest run tests/workspace/vite-build-config.test.ts
```

- [ ] **6. Provar limite da limpeza com sentinelas.**

Depois de confirmar que os paths absolutos resolvem dentro de
`C:\Kaezan\kaezan-huntbound\dist`, crie:

```text
C:\Kaezan\kaezan-huntbound\dist\game\pb00r-game-sentinel.txt
C:\Kaezan\kaezan-huntbound\dist\pb00r-parent-sentinel.txt
```

Execute `corepack pnpm --filter @huntbound/game build`. Confirme:

- `dist/game/pb00r-game-sentinel.txt` não existe;
- `dist/pb00r-parent-sentinel.txt` ainda existe;
- o aviso de output não esvaziado desapareceu;
- o aviso de chunk Phaser continua apenas informativo.

Remova somente `dist/pb00r-parent-sentinel.txt` após a prova. Nenhuma sentinela entra no commit.

- [ ] **7. Executar gates relevantes.**

```text
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
git diff --check
git status --short
```

- [ ] **8. Registrar handoff e commit.**

Atualize PB-00R-04 no `STATE.md` da branch com RED/GREEN, prova das duas sentinelas, modelo/effort e
comandos. Registre que PB-00R-02 só fica elegível depois da integração serial.

```text
git add apps/game/vite.config.ts tests/workspace/vite-build-config.test.ts docs/playbooks/PB-00R/STATE.md
git commit -m "build: clean game output before Vite build"
```

## Critérios de aceite

- [ ] Teste falha antes de `emptyOutDir` e passa depois.
- [ ] Sentinela dentro de `dist/game` é removida.
- [ ] Sentinela irmã em `dist/` não é removida.
- [ ] Vite não emite mais aviso de output externo não esvaziado.
- [ ] Nenhum script próprio de deleção foi criado.
- [ ] Testes, typecheck e build passam; lockfile não muda.

## Condições de parada

Pare e reporte `BLOCKED` se Vite 8.2.1 tentar limpar fora de `dist/game`, se a prova exigir comando
de deleção genérico, ou se a configuração mudar nomes/hashes de bundle além do comportamento normal.

## Relatório final

Comece com `APPROVED` ou `BLOCKED`; informe RED/GREEN, paths absolutos das sentinelas, resultado da
limpeza, warnings restantes, modelo/effort, commit e próximo passo. Não execute PB-00R-02.

## Prompt copiável para novo chat

```text
Trabalhe no workspace C:\Kaezan\kaezan-huntbound.

Use GPT-5.6 Luna com effort xhigh. Para validação independente, prefira GPT-5.6 Sol xhigh ou Claude
Opus 5. Use obrigatoriamente as skills superpowers:test-driven-development e
superpowers:verification-before-completion. Não invoque Game Studio nesta task mecânica de build.

Execute integralmente e somente a task:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-00R\tasks\PB-00R-04-limpar-output-de-build.md

Esta task pertence à onda paralela 1. Antes de editar, confirme working tree limpa e trabalhe em
worktree/branch isolado codex/pb00r-04-clean-build. Não compartilhe o checkout com PB-00R-01 ou
PB-00R-03.

Leia o STATE.md e somente as referências listadas. Preserve paths e limites congelados. Faça
red-green no contrato Vite, adicione apenas emptyOutDir true e prove a limpeza com uma sentinela em
dist/game e outra irmã em dist. Verifique os paths absolutos antes da prova e nunca use deleção
genérica. Remova a sentinela irmã específica ao terminar.

Execute todos os gates, atualize o handoff da branch, crie o commit build: clean game output before
Vite build e encerre com APPROVED ou BLOCKED, evidências, modelo/effort e hash do commit. Não inicie
PB-00R-02 neste chat.
```
