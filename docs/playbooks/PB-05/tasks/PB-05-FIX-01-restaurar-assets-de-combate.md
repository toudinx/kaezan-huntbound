# PB-05-FIX-01 — Restaurar os assets de combate e acabar com a falha silenciosa

**Status inicial:** pending

**Classe da tarefa:** correção de defeito, bem especificada

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o aceite do PB-05

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** não. Toda a trilha FIX depende desta.

## Objetivo

Fazer os assets de combate voltarem a existir no perfil que o usuário joga, e garantir que a
ausência de um asset declarado nunca mais desapareça sem ruído.

## Resultado esperado

Com o pack pessoal regenerado, cadáver, sangue e o arco de autoloot — já implementados em
PB-05-10 — voltam a aparecer no jogo sem uma linha nova de renderer. E qualquer chave declarada que
não resolva passa a ser observável por diagnóstico e pelo `HuntProbe`.

## Dependências

- PB-05-10 e PB-05-11 `done` e integradas (`d4490e9`).
- `HUNTBOUND_PERSONAL_ASSET_SOURCE` apontando para a origem autorizada dos assets pessoais. **A
  variável não está definida em nenhum escopo desta máquina** — confirme com o usuário antes de
  começar. O valor nunca entra em arquivo versionado, conforme `docs/assets/ASSET_PROFILES.md`.

## Leitura mínima

1. esta task;
2. `docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md`, seções "Diagnóstico" e
   "Direção escolhida" §1;
3. `docs/playbooks/PB-05/STATE.md`;
4. `docs/assets/ASSET_PROFILES.md` e `docs/assets/PB-04-SELECTION.md`;
5. `packages/assets/src/hunt/HuntPack.ts`, em especial `HUNT_PACK_COMBAT_KEYS` e `validateHuntPack`;
6. `apps/game/src/phaser/scenes/HuntScene.ts`, `createDecorationObject` e
   `renderCombatDecorations`;
7. `apps/game/src/hunt/HuntProbe.ts` e `apps/game/src/hunt/HuntPresentation.ts` (`onDiagnostic`);
8. `apps/game/src/assets/AssetRuntimeProbe.ts`;
9. `.cursor/rules/30-assets.mdc` e `.cursor/rules/40-game.mdc`.

## Decisões congeladas

- **Chave ausente não derruba a cena.** O perfil `test` é legítimo e continuará sem arte de verdade.
  A ausência vira diagnóstico observável, nunca exceção.
- **Um diagnóstico por chave**, não um por frame. O laço de render roda a 20 Hz; repetir por frame
  transformaria o sinal em ruído.
- O caminho absoluto da origem pessoal **não entra** em nenhum arquivo versionado: nem selection,
  nem source lock, nem doc, nem diagnóstico.
- `assets:pb04:personal:check` **não** entra em `check` nem em `verify`. Ele depende de arte que não
  está no Git e quebraria o gate em qualquer clone limpo. Ele é documentado como passo do fluxo
  pessoal.
- Nenhuma alteração no seletor de assets: a seleção já declara as seis chaves. O defeito é o pack
  gerado estar velho, não a seleção estar errada.

## Escopo permitido

```text
apps/game/src/phaser/scenes/HuntScene.ts
apps/game/src/hunt/HuntProbe.ts
apps/game/src/hunt/HuntProbe.test.ts
apps/game/public/assets/personal/**   (gerado; não versionado)
docs/assets/ASSET_PROFILES.md
docs/playbooks/PB-05/STATE.md
package.json                          (somente se o fluxo pessoal precisar de script novo)
```

## Fora de escopo

- Animar efeito — PB-05-FIX-02.
- Tabela de FX, ataque, conjuração, impulsos — PB-05-FIX-03 em diante.
- `packages/simulation`, `packages/contracts`, `packages/content`.
- Empacotar chave nova ou mexer na seleção.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets -b codex/pb-05-fix-01-restore-combat-assets main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets install --prefer-offline
```

- [ ] **2. Confirmar o defeito antes de corrigir.**

Prove, com saída fresca, que o pack pessoal em disco tem 134 entradas e que nenhuma das seis chaves
de `HUNT_PACK_COMBAT_KEYS` está presente. Registre a contagem no relatório. Corrigir sem antes
reproduzir é como este defeito passou por PB-05-10 e PB-05-11.

- [ ] **3. Escrever o teste RED do diagnóstico de asset ausente.**

Prove: uma decoração cuja chave não resolve produz **um** diagnóstico contendo a chave; a mesma
chave ausente em frames seguintes **não** produz um segundo diagnóstico; a cena continua renderizando
o resto sem lançar; `HuntProbe` expõe a lista de chaves de combate não resolvidas, ordenada e
estável.

Esse teste roda no perfil `test`, onde os placeholders existem — então construa o caso com uma chave
deliberadamente ausente do mapa de assets, não removendo arquivo do disco.

- [ ] **4. Implementar o diagnóstico e a exposição no probe; obter GREEN.**

- [ ] **5. Regenerar o pack pessoal.**

```powershell
$env:HUNTBOUND_PERSONAL_ASSET_SOURCE = '<origem autorizada, fornecida pelo usuario>'
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets assets:pb04:personal:generate
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets assets:pb04:personal:check
```

Prove pela saída de `assets:pb04:personal:check` — que roda `checkHuntPack` sobre o pack pessoal —
que as 140 chaves resolvem e que não há `HUNT_ASSET_KEY_MISSING`. Registre no relatório quantos
frames cada efeito trouxe (`atlasFrameCount` e `frameCount` de `animations[0]` para `draw-blood`,
`hit-area` e `magic-blue`): **PB-05-FIX-02 depende desse número** e ele não é conhecido hoje.

- [ ] **6. Documentar o fluxo pessoal.**

Em `docs/assets/ASSET_PROFILES.md`, deixe explícito que `assets:pb04:personal:check` é o passo que
detecta pack pessoal defasado, e que ele não pertence a `verify` por depender de arte fora do Git.
Sem caminho absoluto.

- [ ] **7. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets --filter @huntbound/game test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets verify
```

`build` antes de qualquer conclusão sobre o browser: o Playwright serve o `dist` pré-buildado.
`EPERM` em `assets:stage:test` é flake de Windows — confirme que não há `vite preview` vivo na 4173 e
rode de novo.

- [ ] **8. Confirmar o efeito na tela.**

Suba `corepack pnpm dev:personal`, mate um rotworm e confirme com os próprios olhos que cadáver,
sangue e o arco de autoloot aparecem. Se não aparecerem com o pack íntegro, **pare**: a hipótese
D1+D2 estava incompleta e isso é um bloqueio para registrar, não para contornar.

- [ ] **9. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets add apps docs package.json
git -C C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets commit -m "fix: surface unresolved combat asset keys instead of dropping decorations"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-fix-01-restore-combat-assets
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-fix-01-restore-combat-assets
```

Se o `Remove-Item` falhar com recurso ocupado, mate o listener do vite antes de apagar, conforme
`AGENTS.md`.

## Verificação

Testes de `@huntbound/game`, `typecheck`, `build` e `verify` verdes; `biome check .` em `0`;
`assets:pb04:personal:check` em `0`.

## Critérios de aceite

- [ ] O defeito foi reproduzido e registrado antes da correção, com a contagem de entradas.
- [ ] Chave declarada e não resolvida produz exatamente um diagnóstico, com a chave no texto.
- [ ] `HuntProbe` expõe as chaves de combate não resolvidas.
- [ ] Asset ausente não lança nem interrompe o render do resto da cena.
- [ ] O pack pessoal resolve as 140 chaves; `assets:pb04:personal:check` sai `0`.
- [ ] Os frames reais de `draw-blood`, `hit-area` e `magic-blue` estão registrados no relatório.
- [ ] Cadáver, sangue e arco de autoloot foram vistos na tela com `dev:personal`.
- [ ] Nenhum caminho absoluto de origem pessoal entrou em arquivo versionado.
- [ ] `assets:pb04:personal:check` **não** foi acrescentado a `check` nem a `verify`.
- [ ] Nenhuma dependência externa nova entrou.

## Condições de parada

**Pare** se: o usuário não puder fornecer `HUNTBOUND_PERSONAL_ASSET_SOURCE`; a regeneração produzir
pack que ainda reprova em `checkHuntPack`; ou as decorações continuarem invisíveis mesmo com o pack
íntegro. Registre o bloqueio no `STATE.md`, não só no relatório do chat.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, testes, comandos e exit codes, modelo e effort
usados, os frames medidos dos três efeitos, e a próxima task elegível.

## Commit

`fix: surface unresolved combat asset keys instead of dropping decorations`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-fix-01-restore-combat-assets`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Contagem de entradas antes e depois, frames medidos por efeito, mudanças, contagem de testes,
comandos com exit code, o que foi visto na tela, integração, limpeza, desvios e próxima task
elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-FIX-01-restaurar-assets-de-combate.md

Leia AGENTS.md, o STATE.md do PB-05, a spec
docs/superpowers/specs/2026-08-18-pb-05-fix-combat-fx-design.md e apenas os arquivos indicados pela
task.

Antes de qualquer coisa, peca ao usuario o valor de HUNTBOUND_PERSONAL_ASSET_SOURCE. Ele nao esta
definido em nenhum escopo desta maquina e sem ele a task nao roda. O caminho nunca entra em arquivo
versionado.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-fix-01-assets com a branch
codex/pb-05-fix-01-restore-combat-assets e rode "corepack pnpm install --prefer-offline" dentro dela.

Primeiro REPRODUZA: prove que o pack pessoal tem 134 entradas e que nenhuma das seis chaves de
HUNT_PACK_COMBAT_KEYS esta la. So depois corrija.

Comece por RED no diagnostico: chave declarada que nao resolve produz UM diagnostico com a chave no
texto, nao um por frame, sem lancar excecao, e o HuntProbe expoe a lista de chaves de combate nao
resolvidas. Construa o caso com chave ausente do mapa de assets, nao removendo arquivo do disco.

Depois regenere o pack pessoal com assets:pb04:personal:generate e prove com
assets:pb04:personal:check que as 140 chaves resolvem. Registre no relatorio o atlasFrameCount e o
frameCount de animations[0] para draw-blood, hit-area e magic-blue: PB-05-FIX-02 depende desses
numeros e eles nao sao conhecidos hoje.

Nao acrescente assets:pb04:personal:check a check nem a verify: ele depende de arte fora do Git.

Rode biome check ., testes de @huntbound/game, typecheck, build e verify. Sempre builde antes de
concluir qualquer coisa sobre o browser. EPERM em assets:stage:test e flake de Windows: confirme que
nao ha vite preview vivo na 4173 e rode de novo.

Suba dev:personal, mate um rotworm e confirme com os olhos que cadaver, sangue e arco de autoloot
aparecem. Se nao aparecerem com o pack integro, PARE e registre bloqueio no STATE.md.

Atualize o handoff, commite, integre por fast-forward na main, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Nao anime efeito, nao crie tabela de FX, nao toque em packages/**. Isso e PB-05-FIX-02 em diante.
Nao inicie a proxima task.
```
