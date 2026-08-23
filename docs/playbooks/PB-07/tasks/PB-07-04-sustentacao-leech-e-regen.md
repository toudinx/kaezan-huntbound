# PB-07-04 — Sustentação: leech e regen sensível a combate

**Status inicial:** pending

**Classe da tarefa:** regra de simulação e emenda de ADR

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** serial. Depende de PB-07-03 integrada e muda regra que todas as tasks seguintes
assumem.

## Objetivo

Fazer o jogador escolher *quando* recuar. Duas regras: o regen escolhe a taxa pelo tempo desde o
último dano recebido, e o dano causado devolve vida e mana à fonte.

## Resultado esperado

Jogando, a barra sobe visivelmente alguns segundos depois de sair da briga e para de subir quando
uma criatura acerta. Bater devolve recurso, então lutar bem é uma forma de se sustentar. Nenhuma
poção entrou no jogo.

## Dependências

- PB-07-03 integrada. Os campos existem e estão em default neutro; esta task os liga.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, decisões 1 e 2, e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md`, seção "o que Huntbound adota e o que recusa" — **é o texto que
   vai para a ADR**, e a seção "quando a mana acaba", que a justifica;
4. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, decisões vinculantes e "Extensões Huntbound
   permitidas";
5. `packages/simulation/src/kernel/combat.ts`, `applyUpkeep` e `applyDamage`;
6. `packages/simulation/src/kernel/combat.test.ts`, para o padrão de teste de regen já existente;
7. `packages/content/src/hunts/combatConversion.ts`, as constantes `KNIGHT_*_REGEN_*`.

## Decisões congeladas

- **Sem poção.** Não introduza item usável, nem comando de usar item, nem carga de poção. Isso é
  PB-07-11, e mesmo lá é habilidade com carga, não inventário.
- **Só o jogador regenera fora de combate.** Criatura ferida continua ferida. Isso é o que mantém
  lurar e mobar lucrativo, e não é ajuste de número: é regra.
- **"Em combate" é medido por dano recebido**, não por ter alvo, nem por proximidade, nem por estar
  atacando. Recuar de um bicho que não te acerta **já conta** como sair de combate. É a leitura mais
  simples e a mais fácil de reverter.
- **Leech é por milhar do dano efetivamente aplicado**, depois de clamp. Dano que não tirou vida
  porque o alvo já estava em zero não gera leech.
- **Leech nunca ultrapassa o máximo** de vida ou de mana, e nunca é negativo.
- **Nada de ponto flutuante no kernel.** Percentual é inteiro por milhar, e a divisão é truncada de
  forma determinística. Duas máquinas precisam produzir o mesmo inteiro.
- **A emenda à ADR-05 é obrigatória nesta task.** Leech e regen sensível a combate são extensões
  Huntbound; sem estarem listadas, violam a decisão vinculante 1.

## Escopo permitido

```text
packages/simulation/src/kernel/combat.ts
packages/simulation/src/kernel/combat.test.ts
packages/content/src/hunts/combatConversion.ts
packages/content/src/hunts/buildHuntScenario.ts
packages/content/src/selections/pb-05-knight-combat.json
packages/test-fixtures/**                (regeneração por CLI, se e somente se necessária)
docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- condição com duração, stance, haste — PB-07-05;
- elemento e resistência — PB-07-09;
- `apps/game`: a HUD já mostra vida e mana e não precisa mudar para esta task ser visível.

## A regra, em prosa

`applyUpkeep` hoje tem uma taxa por ator. Passa a ter duas, e escolhe pela distância entre o tick
atual e o tick do último dano recebido:

- dentro da janela → taxa **em combate**, que é a atual do Canary;
- fora da janela → taxa **fora de combate**, que é a nova.

`applyDamage` hoje só tira vida do alvo. Passa a, quando a fonte tiver leech configurado, devolver à
fonte uma fração do dano aplicado. A ordem importa para o determinismo: aplique o dano, emita
`combat/damaged`, e **só então** o leech, com evento próprio — não reaproveite `combat/healed` sem
distinguir a causa, porque a apresentação vai querer diferenciar.

Os números saem de `PB-07-ROTATIONS.md`. Se o documento não fixar um valor, escolha o mais simples,
registre em uma linha no commit e siga: número de balanceamento é barato de reverter e o jogo mostra
se ficou errado.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-04-sustain -b codex/pb07-04-sustain main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-04-sustain install --prefer-offline
```

- [ ] **2. RED do regen sensível a combate.**

Prove: ator sem dano recebido nunca regenera pela taxa de combate; um `combat/damaged` recebido
marca o tick e muda a taxa; exatamente na borda da janela a taxa vira a de fora de combate — teste o
tick anterior e o posterior, porque off-by-one aqui é invisível jogando e fatal no replay; dano
recebido **durante** a regeneração fora de combate volta a taxa para a de combate; ator com janela
`0` se comporta exatamente como hoje.

E o que separa esta task de um ajuste de número: **criatura nunca usa a taxa fora de combate**, mesmo
com os campos preenchidos.

- [ ] **3. RED do leech.**

Prove: dano causado devolve vida e mana à fonte na proporção configurada; leech `0` não emite nada;
leech não passa do máximo; dano aplicado em alvo já em zero não gera leech; leech de dano em área
soma por alvo atingido, na ordem canônica; leech de ataque de criatura contra o jogador funciona
igual — a regra é do blueprint, não do lado.

- [ ] **4. GREEN.** Implemente nas duas funções que já são o ponto único de regen e dano. Não crie
      uma terceira.

- [ ] **5. Preencher os números no conteúdo.**

`combatConversion.ts` e a seleção do PB-05. Os `KNIGHT_*_REGEN_*` existentes continuam sendo a taxa
**em combate** — não os apague; ganhe vizinhos para a taxa fora de combate.

- [ ] **6. Emendar a ADR-05.**

Na seção "Extensões Huntbound permitidas", acrescente os itens com o texto que `PB-07-ROTATIONS.md`
produziu: leech de vida e mana; regen sensível a combate; e, já que a lista está aberta, habilidade
com cargas, que PB-07-11 vai usar. Não reescreva a seção nem as decisões vinculantes.

- [ ] **7. Goldens.**

Esta task **muda comportamento**, então os goldens de PB-05 vão mudar de verdade — eventos inclusive.
Isso é esperado e é diferente do que a PB-07-03 provou. Regenere pelo CLI, e no relatório explique
**qual** diferença de evento apareceu e por quê. Um `combat/regenerated` a mais em tick esperado é
prova de que a regra funciona; um `actor/moved` diferente não é, e significa que você mexeu em algo
que não devia.

- [ ] **8. Reconferir o B4 do PB-06.**

O bloqueio B4 do PB-06 é o jogador morrendo (`Health: 0/590`) durante `hunt-play.spec.ts:427`. Esta
task provavelmente o resolve por consequência. Rode `qa:browser` e registre se B4 caiu. Se caiu,
diga no `STATE.md` do **PB-06**, uma linha.

- [ ] **9. Executar gates, commitar, integrar e limpar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-04-sustain verify
git -C C:\Kaezan\kaezan-huntbound-pb07-04-sustain add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb07-04-sustain commit -m "feat: sustain the hunt with leech and out-of-combat regeneration"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-04-sustain
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-04-sustain
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-04-sustain
```

- [ ] **10. Jogar.** `corepack pnpm dev`. Bata num rotworm, recue, veja a barra subir; volte, veja
      parar. Descreva no relatório se o ritmo pareceu certo — este é o único juiz que importa.

## Verificação

`verify` verde na worktree e no integrado. Testes de `@huntbound/simulation` com a contagem
registrada. Diff de golden explicado evento a evento. `qa:browser` rodado e o estado de B4 registrado.

## Critérios de aceite

- [ ] Regen escolhe a taxa pelo tick do último dano recebido, com teste nas duas bordas da janela.
- [ ] Criatura nunca usa a taxa fora de combate, provado por teste.
- [ ] Leech devolve vida e mana proporcionais ao dano aplicado, com clamp e sem negativo.
- [ ] Leech de área soma por alvo, na ordem canônica.
- [ ] Nenhum ponto flutuante entrou no kernel; percentual é inteiro por milhar.
- [ ] Nenhum item usável, comando de usar item ou poção foi introduzido.
- [ ] A ADR-05 lista leech, regen sensível a combate e cargas nas extensões permitidas.
- [ ] Golden regenerado pelo CLI, com a diferença de evento explicada.
- [ ] O estado de B4 do PB-06 foi reconferido e registrado.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: a taxa fora de combate exigir campo que a PB-07-03 não publicou; o leech exigir mudar a
ordem de resolução de combate; o diff de golden mostrar evento **não relacionado** a regen ou leech;
ou se a emenda da ADR exigir alterar uma decisão vinculante em vez de acrescentar um item à lista.

## Persistência do handoff

`STATE.md` do PB-07: status, branch, commit, contagem de testes, números escolhidos, modelo e effort,
próxima task. `STATE.md` do PB-06: uma linha sobre B4, se mudou.

## Commit

`feat: sustain the hunt with leech and out-of-combat regeneration`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-04-sustain`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-04-sustain`; integração por `--ff-only`; verificação pós-integração
por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Regras implementadas, números escolhidos e de onde vieram, contagem de testes, diff de golden
explicado, estado de B4, como o ritmo pareceu ao jogar, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-04-sustentacao-leech-e-regen.md

Leia AGENTS.md, docs/playbooks/PB-07/README.md (decisoes 1 e 2), o STATE.md,
docs/content/PB-07-ROTATIONS.md e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-04-sustain com a branch codex/pb07-04-sustain e
rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED.

(1) applyUpkeep passa a ter DUAS taxas e escolhe pela distancia entre o tick atual e o tick do ultimo
dano RECEBIDO. Dentro da janela: taxa em combate, a atual do Canary. Fora: taxa nova, mais forte.
"Em combate" e medido SO por dano recebido — nao por ter alvo, nao por proximidade, nao por atacar.
Teste as DUAS BORDAS da janela, tick anterior e posterior: off-by-one aqui e invisivel jogando e
fatal no replay. CRIATURA NUNCA usa a taxa fora de combate, e isso precisa de teste.

(2) applyDamage passa a devolver vida e mana a FONTE, por milhar do dano efetivamente aplicado depois
do clamp. Dano em alvo ja em zero nao gera leech. Leech nao passa do maximo e nunca e negativo. Em
area, soma por alvo na ordem canonica. Emita evento PROPRIO para leech; nao reaproveite
combat/healed sem distinguir a causa.

NADA DE PONTO FLUTUANTE no kernel: percentual e inteiro por milhar, divisao truncada deterministica.

NAO introduza pocao, item usavel nem comando de usar item.

Preencha os numeros em combatConversion.ts e na selecao pb-05-knight-combat.json. As constantes
KNIGHT_*_REGEN_* continuam sendo a taxa EM COMBATE: nao apague, de vizinhos.

EMENDE docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md, secao "Extensoes Huntbound permitidas",
acrescentando leech, regen sensivel a combate e habilidade com cargas, usando o texto que
PB-07-ROTATIONS.md produziu. Nao reescreva a secao nem as decisoes vinculantes.

Esta task MUDA COMPORTAMENTO, entao o golden do PB-05 muda de verdade, eventos inclusive. Regenere
pelo CLI e EXPLIQUE no relatorio qual diferenca apareceu e por que. combat/regenerated a mais e
prova de que funciona; actor/moved diferente NAO e, e significa que voce mexeu no que nao devia.

Rode qa:browser e registre se o bloqueio B4 do PB-06 caiu; se caiu, uma linha no STATE.md do PB-06.

Rode verify. Commite, integre por fast-forward, reverifique e limpe worktree e branch removendo o
diretorio antes do prune. Depois suba corepack pnpm dev, bata num rotworm, recue e diga se o ritmo
pareceu certo.

Se o documento nao fixar um numero, escolha o mais simples, registre em uma linha no commit e siga.
Pare se o diff de golden mostrar evento nao relacionado a regen ou leech. Nao inicie a proxima task.
```
