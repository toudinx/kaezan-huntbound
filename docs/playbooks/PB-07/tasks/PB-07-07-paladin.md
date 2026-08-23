# PB-07-07 — Paladin

**Status inicial:** pending

**Classe da tarefa:** conteúdo, conversão e apresentação de projétil

**Modelo sugerido:** Luna `max` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o usuário jogando

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** possível com PB-07-08 se PB-07-06 estiver integrada. As duas tocam
`selections/**` e a apresentação de efeito — na dúvida, serial, com Paladin primeiro.

## Objetivo

Uma segunda vocação jogável cuja fantasia é **acertar de longe**. Paladin com skill `distance`,
auto-attack ranged, projétil visível, e o par de stances Sharpshooter e Divine Defiance.

## Resultado esperado

Escolhendo Paladin, o jogador mata rotworm sem encostar nele, vê a flecha sair, e sente a diferença
ao ligar Sharpshooter — mais dano, e a escolha de ficar parado atirando.

## Dependências

- PB-07-05 integrada: stance existe.
- PB-07-06 integrada: `skills` é record e magia tem alcance real.
- PB-07-01: a tabela de slots diz qual magia ocupa cada slot do Paladin.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, decisões 4, 5, 6 e 7, e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md`, seção Paladin e a tabela de slots;
4. `.cursor/rules/20-content.mdc`, `.cursor/rules/30-assets.mdc` e `.cursor/rules/40-game.mdc`;
5. `packages/content/src/selections/pb-05-knight-combat.json` — o formato de seleção a espelhar;
6. `packages/content/src/hunts/buildHuntScenario.ts`, `composePlayer`;
7. `packages/simulation/src/kernel/combat.ts`, `resolveAttack` — em especial `inRange` e
   `isSightClear`, que já implementam ataque à distância;
8. `apps/game/src/hunt/CombatFxTable.ts` e `CombatDecorations.ts` — como um efeito vira imagem;
9. `packages/assets/catalog/selections/**` — como um asset novo entra no pack.

## Decisões congeladas

- **O kernel não muda.** `attackRangeTiles` e `isSightClear` já existem e já resolvem ataque à
  distância. Se você sentir vontade de mexer em `resolveAttack`, pare e releia: a necessidade quase
  certamente é de conteúdo.
- **Uma seleção nova, não uma edição da do Knight.** `pb-07-paladin-combat.json`, no mesmo formato,
  com a mesma disciplina de `sourceFile` + `sha256`.
- **Stances do Paladin são as 2026:** Sharpshooter `utori con` e Divine Defiance `utori hur`, sob a
  exceção de proveniência da decisão 7. As do snapshot (`utito tempo san`, `utamo tempo san`) **não**
  são usadas — mas o delta já está tabelado em `PB-07-ROTATIONS.md` e não se re-decide aqui.
- **Projétil é apresentação.** A simulação emite o evento; a cena desenha o trajeto. Nada de posição
  interpolada de projétil dentro de `packages/simulation`.
- **Asset pessoal não entra no Git.** O projétil vem por manifesto, pelo profile correspondente.
- **O Knight continua jogável e idêntico.** Uma segunda vocação não pode alterar a primeira.

## Escopo permitido

```text
packages/content/src/selections/pb-07-paladin-combat.json
packages/content/catalog/**                     (operação versionada, pelo CLI)
packages/content/src/generated/**               (regeneração por CLI)
packages/content/src/hunts/**
packages/contracts/src/content/schemas.ts       (só se faltar campo)
packages/assets/catalog/selections/**
apps/game/src/hunt/CombatFxTable.ts
apps/game/src/hunt/CombatDecorations.ts
apps/game/src/ui/CombatHud.ts                   (mostrar a stance ativa)
tests/e2e/**
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- Sorcerer — PB-07-08;
- elemento e resistência — PB-07-09; o dano holy do Paladin entra como está e ganha elemento lá;
- cargas de runa — PB-07-11;
- escolha de vocação como tela de menu. Trocar a vocação por configuração da seleção já basta para
  esta task; UI de seleção é bullet novo se fizer falta.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-07-paladin -b codex/pb07-07-paladin main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-07-paladin install --prefer-offline
```

- [ ] **2. RED da conversão do Paladin.**

Construir o cenário a partir da seleção nova produz: `factionId` de jogador; `attackRangeTiles` maior
que 1; `skills.distance` alimentando a fórmula das magias de ataque; os poderes resolvidos batendo
com os valores de `PB-07-ROTATIONS.md`; e as duas stances presentes como habilidades com marca de
toggle e chave de slot compartilhada.

- [ ] **3. RED do alcance no kernel — sem tocar no kernel.**

Um teste de cenário: Paladin a quatro tiles de um rotworm acerta; com parede no meio, `isSightClear`
recusa; a criatura melee precisa chegar perto para revidar. Se algum desses falhar, o problema é a
conversão, não o kernel.

- [ ] **4. RED da stance do Paladin.**

Ligar Sharpshooter aumenta o dano de distância; ligar Divine Defiance desliga Sharpshooter; relançar
a ativa desliga. Tudo isso já é PB-07-05 — aqui você prova que **o conteúdo do Paladin está ligado
ao sistema**, não reimplementa o sistema.

- [ ] **5. GREEN de conteúdo**, regenerando pelo CLI e validando com `content:check`.

- [ ] **6. Projétil e HUD.**

O evento de ataque à distância vira um trajeto desenhado entre atacante e alvo, com TTL em ms, na
mesma lista de decorações que já existe. A HUD passa a mostrar qual stance está ativa — sem isso o
jogador não tem como saber, e a decisão fica invisível.

- [ ] **7. Spec de browser no projeto `correctness`.**

Afirmando estado: com a seleção do Paladin, o jogador causa dano a um alvo não adjacente; ligar a
stance muda o valor reportado; a stance ativa aparece na HUD.

- [ ] **8. Gates, jogar, integrar e limpar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-07-paladin verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-07-paladin dev
git -C C:\Kaezan\kaezan-huntbound-pb07-07-paladin add packages apps tests docs
git -C C:\Kaezan\kaezan-huntbound-pb07-07-paladin commit -m "feat: make the paladin playable at range"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-07-paladin
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-07-paladin
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-07-paladin
```

## Verificação

`verify` verde na worktree e no integrado. `content:check` e `assets:check` verdes. Specs de browser
estáveis **sem `retries`**. Inspeção do passo 8 descrita.

## Critérios de aceite

- [ ] Existe `pb-07-paladin-combat.json`, com `sourceFile` + `sha256` em cada número do snapshot e
      marca de fonte nas stances 2026.
- [ ] O Paladin acerta a mais de um tile e respeita linha de visão.
- [ ] `packages/simulation` **não** foi alterado.
- [ ] As duas stances compartilham chave de slot e se expulsam.
- [ ] A HUD mostra a stance ativa.
- [ ] O projétil é desenhado pela cena, com TTL em ms, reaproveitando a lista de decorações.
- [ ] Nenhuma posição de projétil vive na simulação.
- [ ] O Knight continua idêntico — teste de invariância da PB-07-06 verde.
- [ ] Nenhum asset pessoal entrou no Git.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: o ataque à distância exigir mudança em `packages/simulation`; a fórmula do Paladin no
snapshot precisar de uma skill que PB-07-06 não previu; ou se o asset do projétil não existir no
pack e não puder ser adicionado pelo fluxo de manifesto.

## Persistência do handoff

`STATE.md`: status, branch, commit, contagem de testes, poderes resolvidos do Paladin, modelo e
effort, próxima task elegível.

## Commit

`feat: make the paladin playable at range`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-07-paladin`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-07-paladin`; integração por `--ff-only`; verificação pós-integração
por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Kit do Paladin, poderes resolvidos, o que foi provado sem tocar no kernel, o que a inspeção mostrou,
desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Luna max ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-07-paladin.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/30-assets.mdc, .cursor/rules/40-game.mdc,
docs/playbooks/PB-07/README.md, o STATE.md, docs/content/PB-07-ROTATIONS.md secao Paladin, e apenas
os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-07-paladin com a branch codex/pb07-07-paladin e
rode "corepack pnpm install --prefer-offline" dentro dela.

O KERNEL NAO MUDA. attackRangeTiles e isSightClear ja resolvem ataque a distancia. Se der vontade de
mexer em resolveAttack, PARE e releia: a necessidade e de conteudo.

Crie packages/content/src/selections/pb-07-paladin-combat.json no mesmo formato de
pb-05-knight-combat.json, com sourceFile + sha256 em cada numero do snapshot. As stances sao as 2026
— Sharpshooter "utori con" e Divine Defiance "utori hur" — sob a excecao de proveniencia da decisao 7
do README, marcadas com fonte e versao. As do snapshot NAO sao usadas.

Comece por RED: conversao do Paladin (attackRangeTiles > 1, skills.distance alimentando a formula,
poderes batendo com PB-07-ROTATIONS.md, duas stances com marca de toggle e chave de slot
compartilhada); alcance em cenario (acerta a quatro tiles, parede recusa por isSightClear, criatura
melee precisa chegar perto); e stance ligada ao sistema do PB-07-05 — prove a ligacao, nao
reimplemente o sistema.

Depois: projetil desenhado PELA CENA, com TTL em ms, na lista de decoracoes que ja existe. Nenhuma
posicao de projetil dentro de packages/simulation. E a HUD passando a mostrar a stance ativa, senao a
decisao fica invisivel para o jogador.

Escreva spec no projeto correctness afirmando ESTADO: dano em alvo nao adjacente, stance mudando o
valor, stance visivel na HUD. Sem retries.

O Knight continua identico: o teste de invariancia da PB-07-06 tem que seguir verde.

Rode content:check, assets:check e verify. NUNCA rode playwright test direto. Suba corepack pnpm dev
e confira antes de integrar. Commite, integre por fast-forward, reverifique e limpe worktree e branch
removendo o diretorio antes do prune.

Pare se o ataque a distancia exigir mudar packages/simulation. Nao inicie a proxima task.
```
