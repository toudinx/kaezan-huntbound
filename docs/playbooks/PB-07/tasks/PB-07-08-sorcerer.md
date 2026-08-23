# PB-07-08 — Sorcerer

**Status inicial:** pending

**Classe da tarefa:** conteúdo, conversão e apresentação de área

**Modelo sugerido:** Luna `max` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; a validação humana é o usuário jogando

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** possível com PB-07-07 se PB-07-06 estiver integrada; na dúvida, depois do Paladin.

## Objetivo

A terceira vocação, cuja fantasia é **limpar um grupo**. Sorcerer com magia elemental, AoE centrada
no conjurador, Magic Shield como regime próprio de sustentação, e as três stances elementais
adaptadas.

## Resultado esperado

Escolhendo Sorcerer, o jogador junta três rotworms e mata os três com uma magia. Magic Shield faz a
mana virar vida efetiva, o que dá a ele uma relação com o recurso diferente da do Knight. Trocar
entre Master of Flames, Thunder e Decay muda qual elemento ele está jogando.

## Dependências

- PB-07-05 integrada: condição, stance e escudo de mana existem.
- PB-07-06 integrada: alcance real de magia existe.
- PB-07-01: a adaptação das três stances, com números, já proposta.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, decisões 5, 6, 7 e 8, e `STATE.md`;
3. `docs/content/PB-07-ROTATIONS.md`, seção Sorcerer, a tabela de slots e **a adaptação das stances
   sem crítico**;
4. `.cursor/rules/20-content.mdc` e `.cursor/rules/40-game.mdc`;
5. `packages/simulation/src/kernel/combat.ts`, `resolveCast`, ramo `area` — ele já filtra alvos por
   `ability.radius` em torno do conjurador;
6. `packages/content/src/hunts/combatConversion.ts`, `abilityShapeFromSpell`;
7. `apps/game/src/hunt/CombatDecorations.ts` e `CombatFxTable.ts`, incluindo `BERSERK_STAGGER_MS` —
   o escalonamento de efeito de área já existe e é para ser reusado.

## Decisões congeladas

- **AoE centrada no conjurador não precisa de kernel novo.** O shape `area` já faz exatamente isso.
  Magia de área **alvejada no chão** exigiria `targetPosition` no comando de cast; ela **não entra
  nesta task** — se a tabela de slots pedir uma, registre como bullet no README e siga com as
  centradas.
- **Sem crítico.** As três stances usam a adaptação de `PB-07-ROTATIONS.md`. Não introduza chance de
  crítico nem dano extra de crítico.
- **As três stances compartilham chave de slot** entre si — uma elemental por vez, como no sistema
  2026. A stance *crippling* do Sorcerer, que no Tibia pode coexistir, **fica fora**: é nível 175 e
  não cabe no personagem do V0. Registre a ausência.
- **Magic Shield vem do snapshot** (`utamo vita`, nível 14, 50 mana) e usa o escudo de mana do
  PB-07-05. Não é extensão: está na fonte canônica.
- **A conversão de elemento da stance** — "próxima magia não-fogo vira fogo" — é comportamento de
  condição, não de conteúdo. Se PB-07-05 não a suportar, **ela sai** e a stance fica só com o bônus
  de dano; registre o corte. Não estenda o sistema de condições aqui.
- **Knight e Paladin continuam idênticos.**

## Escopo permitido

```text
packages/content/src/selections/pb-07-sorcerer-combat.json
packages/content/catalog/**                     (operação versionada, pelo CLI)
packages/content/src/generated/**               (regeneração por CLI)
packages/content/src/hunts/**
packages/assets/catalog/selections/**
apps/game/src/hunt/CombatFxTable.ts
apps/game/src/hunt/CombatDecorations.ts
apps/game/src/ui/CombatHud.ts
tests/e2e/**
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- resistência e imunidade da criatura ao elemento — PB-07-09. Aqui o elemento é **declarado**; lá ele
  passa a **importar**;
- runa — PB-07-11;
- magia de área alvejada no chão;
- stance *crippling*.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer -b codex/pb07-08-sorcerer main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer install --prefer-offline
```

- [ ] **2. RED da conversão.**

A seleção nova produz: `skills.magic` alimentando as fórmulas `levelMagic`; alcance real nas magias
de alvo; shape `area` com o raio certo nas de área; elemento declarado em cada uma; as três stances
com chave de slot compartilhada.

- [ ] **3. RED do AoE em cenário — sem tocar no kernel.**

Três criaturas dentro do raio recebem dano no mesmo tick, **na ordem canônica de `entityId`**; uma
fora do raio não recebe; o conjurador não se acerta; uma criatura em outro andar não é atingida.
A ordem importa porque é o que mantém o replay determinístico.

- [ ] **4. RED do Magic Shield.**

Com a stance ligada, dano recebido come mana primeiro; quando a mana acaba, o excedente vai para a
vida; com mana em zero o comportamento é o normal. De novo: você prova a **ligação**, o sistema é do
PB-07-05.

- [ ] **5. RED da troca de stance elemental.**

Ligar Flames desliga Thunder; o bônus muda o número do dano do elemento correspondente e não mexe nos
outros.

- [ ] **6. GREEN de conteúdo**, regenerando pelo CLI e validando com `content:check`.

- [ ] **7. Apresentação de área.**

Reuse o escalonamento que `BERSERK_STAGGER_MS` já implementa: os impactos de uma magia de área não
aparecem todos no mesmo frame. Não crie um segundo mecanismo de stagger.

- [ ] **8. Spec de browser no projeto `correctness`.**

Com a seleção do Sorcerer: uma magia de área causa dano a mais de um alvo no mesmo tick; Magic Shield
ligado faz a mana cair antes da vida; a stance ativa aparece na HUD.

- [ ] **9. Gates, jogar, integrar e limpar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer verify
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer dev
git -C C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer add packages apps tests docs
git -C C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer commit -m "feat: make the sorcerer playable with elemental area magic"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-08-sorcerer
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-08-sorcerer
```

## Verificação

`verify` verde na worktree e no integrado. `content:check` e `assets:check` verdes. Specs de browser
estáveis **sem `retries`**. Inspeção do passo 9 descrita: junte três rotworms e mate com uma magia.

## Critérios de aceite

- [ ] Existe `pb-07-sorcerer-combat.json`, com proveniência correta em cada número.
- [ ] AoE atinge múltiplos alvos no mesmo tick, na ordem canônica, sem acertar o conjurador nem
      outro andar.
- [ ] `packages/simulation` **não** foi alterado.
- [ ] Magic Shield consome mana antes de vida, com o excedente indo para a vida.
- [ ] As três stances elementais compartilham slot e se expulsam.
- [ ] Nenhuma chance de crítico entrou.
- [ ] A ausência da stance *crippling* está registrada, com o motivo.
- [ ] O escalonamento de impacto reusa `BERSERK_STAGGER_MS`; não há segundo mecanismo.
- [ ] Knight e Paladin continuam idênticos.
- [ ] `corepack pnpm verify` sai `0` depois da integração.

## Condições de parada

**Pare** se: a tabela de slots exigir magia de área alvejada no chão como slot obrigatório; a
conversão de elemento da stance exigir estender o sistema de condições; ou se o AoE exigir mudar
`resolveCast`.

## Persistência do handoff

`STATE.md`: status, branch, commit, contagem de testes, poderes resolvidos, o que foi cortado e por
quê, modelo e effort, próxima task elegível.

## Commit

`feat: make the sorcerer playable with elemental area magic`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-08-sorcerer`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer`; integração por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Kit do Sorcerer, poderes resolvidos, o que foi cortado e o motivo, o que a inspeção mostrou, desvios
e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Luna max ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-08-sorcerer.md

Leia AGENTS.md, .cursor/rules/20-content.mdc, .cursor/rules/40-game.mdc,
docs/playbooks/PB-07/README.md, o STATE.md, docs/content/PB-07-ROTATIONS.md secao Sorcerer e a
adaptacao das stances sem critico, e apenas os arquivos indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-08-sorcerer com a branch codex/pb07-08-sorcerer
e rode "corepack pnpm install --prefer-offline" dentro dela.

O KERNEL NAO MUDA. O shape "area" de resolveCast ja filtra alvos por ability.radius em torno do
conjurador: AoE centrada no conjurador ja funciona. Magia de area ALVEJADA NO CHAO exigiria
targetPosition no comando de cast e NAO ENTRA nesta task — se a tabela de slots pedir uma, registre
como bullet no README e siga com as centradas.

Crie packages/content/src/selections/pb-07-sorcerer-combat.json com proveniencia correta: sha256 para
o que vem do snapshot, marca de fonte e versao para as stances 2026.

Comece por RED: conversao (skills.magic nas formulas levelMagic, alcance real nas de alvo, shape area
com raio nas de area, elemento declarado, tres stances com chave de slot compartilhada); AoE em
cenario (tres criaturas no raio recebem dano no MESMO TICK na ORDEM CANONICA de entityId, uma fora
nao recebe, o conjurador nao se acerta, outro andar nao e atingido); Magic Shield (dano come mana
primeiro, excedente vai para a vida, mana zero volta ao normal); troca de stance elemental (ligar
Flames desliga Thunder).

SEM CRITICO. Use a adaptacao de PB-07-ROTATIONS.md. A stance crippling fica FORA — e nivel 175 e nao
cabe no personagem do V0; registre a ausencia com o motivo. Se a conversao de elemento da stance
("proxima magia nao-fogo vira fogo") nao for suportada pelo sistema do PB-07-05, CORTE e registre;
nao estenda o sistema de condicoes aqui.

Magic Shield vem do snapshot (utamo vita, nivel 14, 50 mana): nao e extensao.

Na apresentacao, REUSE o escalonamento que BERSERK_STAGGER_MS ja implementa. Nao crie um segundo
mecanismo de stagger.

Escreva spec no projeto correctness afirmando estado: dano em mais de um alvo no mesmo tick, mana
caindo antes da vida com Magic Shield, stance visivel na HUD. Sem retries.

Knight e Paladin continuam identicos.

Rode content:check, assets:check e verify. NUNCA rode playwright test direto. Suba corepack pnpm dev,
junte tres rotworms e mate com uma magia antes de integrar. Commite, integre por fast-forward,
reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Pare se o AoE exigir mudar resolveCast. Nao inicie a proxima task.
```
