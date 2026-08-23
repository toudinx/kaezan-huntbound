# PB-07-06 — Skills genéricas e alcance real de magia

**Status inicial:** pending

**Classe da tarefa:** contrato de conteúdo e conversão; destrava as duas vocações novas

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial. PB-07-07 e PB-07-08 dependem dela e podem ser paralelas entre si depois.

## Objetivo

Tirar do contrato de conteúdo as três premissas de "só existe Knight" que impedem qualquer segunda
vocação: skills fixas em `{ sword, magic }`, fórmula que só lê `skills.sword`, e alcance de magia
fixado em melee.

## Resultado esperado

O catálogo consegue descrever um Paladin que escala por `distance` e um Sorcerer cujo `exori vis`
acerta a cinco tiles. Nenhuma vocação nova entra ainda: esta task só abre a porta, e prova que
abriu com Knight saindo idêntico.

## Dependências

- PB-07-01 integrada: a tabela de slots diz quais skills e quais alcances precisam existir.
- PB-07-05 integrada: `SpellDefinition` precisa poder apontar a condição que a stance aplica.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, decisões 4 e 5, e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md`, tabela de slots e a seção "o que o catálogo não representa";
4. `.cursor/rules/20-content.mdc`;
5. `packages/contracts/src/content/schemas.ts` — `CharacterDefinitionSchema`,
   `VocationDefinitionSchema` (que **já** tem `skillMultipliers` como record — siga esse padrão),
   `SpellDefinitionSchema`;
6. `packages/content/src/hunts/combatConversion.ts` — `resolveSpellPower`, `abilityShapeFromSpell`,
   `knightMeleeDamage`;
7. `packages/content/src/hunts/buildHuntScenario.ts` — `composePlayer` e `composeAbilities`;
8. `packages/content/src/selections/pb-05-knight-combat.json`;
9. `packages/content/src/importers/canary/xml/parseVocationsXml.ts`.

## Decisões congeladas

- **`CharacterDefinition.skills` vira record**, com o mesmo formato que `VocationDefinition.skillMultipliers`
  já usa. Não invente um segundo jeito de representar skill no mesmo pacote.
- **A fórmula escolhe a skill, não o conversor.** `resolveSpellPower` hoje passa `skills.sword` para
  `skillAttack` porque só existia espada. Passa a ler qual skill a fórmula declara. Uma fórmula que
  não declara skill é erro de validação, não um default silencioso para `sword`.
- **`abilityShapeFromSpell` para de fixar `MELEE_RANGE_TILES`.** O alcance vem da magia. Magia sem
  alcance declarado é erro; não herde melee por omissão.
- **`knightMeleeDamage` é do Knight e continua sendo.** Não a generalize em uma função de dano
  universal nesta task. Paladin traz a sua em PB-07-07, e só se as duas ficarem realmente iguais é
  que se funde uma na outra — com teste provando.
- **Knight sai idêntico.** É o teste que prova que a generalização não mudou nada: os poderes
  resolvidos da seleção do PB-05 continuam `berserk 48–129`, `brutalStrike 35–63`,
  `woundCleansing 32–58`, `melee 7–78`. Um número diferente reprova a task.
- **Nenhuma vocação nova entra aqui.**

## Escopo permitido

```text
packages/contracts/src/content/schemas.ts
packages/contracts/src/content/schemas.test.ts
packages/content/src/hunts/combatConversion.ts
packages/content/src/hunts/buildHuntScenario.ts
packages/content/src/hunts/*.test.ts
packages/content/src/selections/pb-05-knight-combat.json
packages/content/src/importers/canary/xml/parseVocationsXml.ts
packages/content/src/generated/**            (regeneração por CLI, nunca à mão)
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- Paladin — PB-07-07; Sorcerer — PB-07-08;
- `packages/simulation`: o kernel já aceita `rangeTiles` e `attackRangeTiles`; nada muda lá;
- `apps/game`.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-06-skills -b codex/pb07-06-generic-skills main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-06-skills install --prefer-offline
```

- [ ] **2. RED do teste de invariância — escreva este primeiro.**

Antes de mudar o schema: um teste que constrói o cenário a partir de
`pb-05-knight-combat.json` e afirma os quatro pares de poder acima, mais o `stepCooldownTicks` e o
`attackCooldownTicks` do jogador. Ele passa hoje. Se passar no fim, a generalização foi neutra.

- [ ] **3. RED do record de skills.**

Skill desconhecida usada por uma fórmula é recusa com caminho de diagnóstico; skill negativa é
recusa; record vazio é recusa quando alguma fórmula precisa de skill; a ordem das chaves não afeta o
resultado da conversão.

- [ ] **4. RED da escolha de skill pela fórmula.**

Uma `skillAttack` que declara `distance` lê `skills.distance`; uma que declara `sword` lê
`skills.sword`; uma que não declara nada é **recusa**, nunca `sword` por default.

- [ ] **5. RED do alcance real.**

Magia com alcance declarado produz `rangeTiles` igual ao declarado; magia de área continua com o
shape `area` e o raio da área; magia de cura continua `self`; magia sem alcance declarado é recusa.

- [ ] **6. RED da condição na magia.**

`SpellDefinition` aponta a condição que aplica, e `composeAbilities` a converte para o índice do
cenário. Magia que aponta condição inexistente é recusa.

- [ ] **7. GREEN**, migrando `pb-05-knight-combat.json` para o formato novo — `sword` e `magic`
      viram chaves do record, e as três magias do Knight passam a declarar skill e alcance
      explicitamente.

- [ ] **8. Regenerar o conteúdo e conferir a invariância.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-06-skills content:check
```

O teste do passo 2 tem que continuar verde. Se um número mudou, a generalização não foi neutra:
ache a causa antes de seguir.

- [ ] **9. Gates, integração e limpeza.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-06-skills verify
git -C C:\Kaezan\kaezan-huntbound-pb07-06-skills add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb07-06-skills commit -m "feat: let a character have any skill and a spell any range"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-06-generic-skills
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-06-skills
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-06-generic-skills
```

## Verificação

`verify` verde na worktree e no integrado. `content:check` verde. Teste de invariância verde **antes
e depois**. Contagem de testes de `@huntbound/contracts` e `@huntbound/content` registrada.

## Critérios de aceite

- [ ] `CharacterDefinition.skills` é record no mesmo formato de `skillMultipliers`.
- [ ] A fórmula declara a skill; ausência é recusa, nunca default para `sword`.
- [ ] O alcance vem da magia; ausência é recusa, nunca melee por omissão.
- [ ] `SpellDefinition` aponta condição, convertida para índice do cenário.
- [ ] Toda recusa tem teste e diagnóstico com caminho correto.
- [ ] Os quatro pares de poder do Knight e seus cooldowns saem idênticos.
- [ ] `knightMeleeDamage` não foi generalizada.
- [ ] Nenhuma vocação nova entrou.
- [ ] Artefato gerado regenerado por CLI; `content:check` verde.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: o teste de invariância falhar por causa que não seja bug seu; a fórmula do Canary não
declarar qual skill usa de forma derivável do snapshot; ou se `SpellDefinitionSchema` precisar de um
campo que PB-07-03 e PB-07-05 não previram.

## Persistência do handoff

`STATE.md`: status, branch, commit, contagem de testes, confirmação da invariância do Knight, modelo
e effort, próxima task elegível.

## Commit

`feat: let a character have any skill and a spell any range`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-06-generic-skills`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-06-skills`; integração por `--ff-only`; verificação pós-integração
por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

O que foi generalizado, as recusas cobertas, a prova de invariância do Knight com os números, desvios
e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-06-skills-genericas-e-alcance-de-magia.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, docs/playbooks/PB-07/README.md (decisoes 4 e 5), o
STATE.md, docs/content/PB-07-ROTATIONS.md e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-06-skills com a branch
codex/pb07-06-generic-skills e rode "corepack pnpm install --prefer-offline" dentro dela.

ESCREVA PRIMEIRO O TESTE DE INVARIANCIA, antes de mudar o schema: construa o cenario a partir de
pb-05-knight-combat.json e afirme berserk 48-129, brutalStrike 35-63, woundCleansing 32-58,
melee 7-78, mais stepCooldownTicks e attackCooldownTicks do jogador. Ele passa hoje. Se passar no
fim, a generalizacao foi neutra. Se um numero mudar, a task esta errada.

Depois, por RED:

(1) CharacterDefinition.skills vira RECORD, no mesmo formato que VocationDefinition.skillMultipliers
ja usa. Nao invente um segundo jeito de representar skill no mesmo pacote.

(2) resolveSpellPower para de assumir skills.sword: a FORMULA declara qual skill usa. Formula sem
skill declarada e RECUSA com diagnostico, NUNCA default para sword.

(3) abilityShapeFromSpell para de fixar MELEE_RANGE_TILES: o alcance vem da magia. Magia sem alcance
declarado e RECUSA, nunca melee por omissao. Area continua shape area com raio; cura continua self.

(4) SpellDefinition passa a apontar a condicao que aplica, convertida por composeAbilities para o
INDICE do cenario. Apontar condicao inexistente e recusa.

NAO generalize knightMeleeDamage. NAO adicione vocacao nova. NAO toque packages/simulation nem
apps/game.

Migre pb-05-knight-combat.json para o formato novo: sword e magic viram chaves do record, e as tres
magias declaram skill e alcance explicitamente.

Rode content:check e confira o teste de invariancia. Rode verify. Atualize STATE.md, commite, integre
por fast-forward, reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Pare se a invariancia falhar por causa que nao seja bug seu, ou se a formula do Canary nao permitir
derivar qual skill usa. Nao inicie a proxima task.
```
