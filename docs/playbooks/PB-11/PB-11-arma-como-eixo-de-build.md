# PB-11 — Arma como eixo de build

> **Movido do PB-08 em 2026-08-25.** Nasceu como `PB-08-09` e o próprio card já se declarava
> meia-task: *"fecha no PB-11, quando o equipamento existir"*. O usuário recusou meia-task na
> reescrita do PB-08, e o equipamento também veio para cá. Aqui o eixo de arma fecha inteiro, junto
> com os slots equipáveis e o stat de item. O corpo abaixo é o original; a numeração das
> dependências ainda fala em PB-08 e continua válida, porque aquelas tasks estão integradas.

**Status inicial:** pending

**Classe da tarefa:** **implementação complexa** — exige julgamento para definir o resultado correto,
e é a semente de uma decisão de produto reservada

**Modelo sugerido:** camada frontier — **GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6** —, effort `xhigh`.

**Validador sugerido:** modelo frontier **diferente** do implementador.

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **PB-08-03 integrada**, o que já é o caso. Fecha junto com os slots
equipáveis deste playbook — sem equipamento, a passiva por tipo de arma não tem onde encostar.

## Objetivo

Abrir o eixo de arma dentro do Knight: **skill separada por sword, axe e club**, e uma passiva por
tipo.

É a versão barata da ideia das seis vocações, que a **decisão congelada 4** do README recusou. E é o
que faz a **decisão congelada 5** — subclasses reservadas, não fechadas — valer na prática.

## O gancho já existe e ninguém puxa

`vocations.xml` traz `skillMultipliers` com `skill:1` club, `skill:2` sword, `skill:3` axe, e eles
**estão importados no catálogo**. O que falta é o `Character` lê-los:

- `packages/contracts/src/content/schemas.ts:550` — `CharacterDefinitionSchema.skills` é literalmente
  `{ sword, magic }`, e `.strict()`;
- `packages/content/src/hunts/combatConversion.ts:168` — `resolveSpellPower` só lê
  `character.skills.sword`.

Um Knight de machado hoje é um Knight de espada com outro nome.

## O julgamento que é seu — e é por isso que esta task é frontier

O `KNIGHT_BANDS.md` Seção 4 já mapeou **quais células são a casa natural de cada arquétipo**. Isso é
documentação de intenção, e a task tem que decidir o que vira código agora:

| Célula | Sword — balanceado | Axe — agressivo | Club — defensivo |
|---|---|---|---|
| 4 — Brutal Strike | como está | **célula mais expressiva do axe** | menos dano; converte mitigação |
| 3 — Groundshaker | como está | mais dano no bloco | **célula mais expressiva do club** |
| 5 — Whirlwind Throw | **célula mais expressiva do sword** | arremesso pesado, alcance menor | arremesso mais fraco |

**A pergunta que a task responde:** o eixo de arma entra agora como **skill separada apenas** — três
números onde havia um —, ou já com **passiva por tipo**?

**Recomendação, e é forte:** entre com a **skill separada apenas**. Motivos:

1. Passiva por tipo sem equipamento é passiva sem como trocar de arma. O `weaponItemKey` é fixo na
   ficha até o PB-11.
2. A skill separada é a mudança **estrutural** — mexe em contrato — e é ela que precisa acontecer
   antes de o equipamento chegar. A passiva é conteúdo e pode entrar depois sem refatorar nada.
3. A decisão congelada 6 do README — **club paga em ofensa, mitigação vira dano** — depende de
   `armor`, que só existe no PB-11. Desenhar a passiva do club agora é desenhar contra um campo que
   não existe.

Se você discordar, **decida com argumento escrito e registre no commit**. Mas a condição de parada
abaixo vale de qualquer forma.

## Decisões congeladas desta task

- **Não se cria vocação nova.** Decisão congelada 4: seis vocações por arma estão recusadas e
  exigiriam emenda à ADR-05. Esta task é **eixo de build dentro do Knight**.
- **Não se desenha subclasse.** Decisão congelada 5: 1 mão × 2 mãos e os arquétipos ficam
  **reservados**. Esta task abre o gancho; **não** o preenche.
- **Aditivo com default que reproduz o comportamento anterior.** `skills` ganha campos com default
  que fazem o Knight atual se comportar exatamente como hoje. `combat:check` é o juiz.
- **Números do snapshot.** Os multiplicadores saem de `vocations.xml`, não de intuição. Knight treina
  melee em 1.1 e distance em 1.4 — multiplicador **menor** significa treino **mais rápido**.

## Condição de parada

`CharacterDefinitionSchema` é contrato público em `@huntbound/contracts`, consumido por `content`,
`save` e `game`. Se abrir `skills` exigir **quebrar** um consumidor — em vez de estendê-lo com
default —, **pare e registre bloqueio no `STATE.md`**, não só no relatório. O `AGENTS.md` lista
"mudar um contrato público, schema ou golden já integrado" como um dos três casos que param o ciclo.

O mesmo vale se o save existente deixar de carregar: progressão persistente ainda não existe (é
PB-09), mas a ficha já é lida pelo `ActiveRunState`.

## Leitura mínima

1. esta task;
2. `docs/content/KNIGHT_BANDS.md` — **Seção 4 inteira**, incluindo "A restrição da decisão congelada 6";
3. `docs/playbooks/PB-08/README.md` — decisões congeladas 4, 5 e 6;
4. `.cursor/rules/10-boundaries.mdc`;
5. `packages/contracts/src/content/schemas.ts:540-565`;
6. `packages/content/src/hunts/combatConversion.ts` — `resolveSpellPower` e `knightMeleeDamage`;
7. `docs/content/PB-07-ROTATIONS.md` §Knight, tabela de identidade — os multiplicadores por skill e a
   nota de que o catálogo os tem e o `Character` não os lê;
8. `references/canary/data/XML/vocations.xml`.

## Ambiguidade conhecida — e a saída

**O que acontece com `skills.magic`?** Ele existe e o Knight tem `magic: 0`. Não o remova: remover
campo de contrato público é quebra, e ele volta a importar quando outra vocação entrar.

**Qual skill a fórmula usa quando a arma não é declarada?** Enquanto `weaponItemKey` for fixo e
`weaponType` não for importado — ele é descartado por `parseItemsXml`, e isso só muda no PB-11 —, a
resposta é **sword**, que é o comportamento atual. Escolha o default que preserva `combat:check`
verde e **declare em uma linha no commit**.

Não pare o ciclo por isso.

## Passos

1. **Teste primeiro.** Três vermelhos: `skills` aceita sword, axe e club; um documento sem os campos
   novos produz o **mesmo** blueprint que hoje; e a fórmula de dano usa a skill do tipo declarado.
2. Estenda `CharacterDefinitionSchema` de forma aditiva.
3. Faça `resolveSpellPower` e `knightMeleeDamage` lerem a skill correta.
4. Confirme que os multiplicadores importados de `vocations.xml` chegam ao `Character`.
5. Registre na Seção 4 do `KNIGHT_BANDS.md` o que ficou aberto para o PB-11.
6. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck`
- `corepack pnpm test`
- `corepack pnpm architecture:check`
- `corepack pnpm content:check`
- `corepack pnpm combat:check` — **inalterado**. Esta task é aditiva com default que reproduz o
  comportamento anterior; se o golden mover, o default está errado. **Não regenere.**
- `corepack pnpm save:check` e `corepack pnpm hunt:check` — inalterados.
- `corepack pnpm qa:browser`
- `corepack pnpm verify` no fechamento.

## Definition of Done

- [ ] `skills` aceita sword, axe e club, aditivo, com default que reproduz o comportamento atual.
- [ ] A fórmula de dano lê a skill do tipo declarado.
- [ ] Multiplicadores de `vocations.xml` chegam ao `Character`.
- [ ] **`combat:check` inalterado**, provando que o default reproduz o anterior.
- [ ] Nenhuma vocação nova; nenhuma subclasse desenhada.
- [ ] O que fica para o PB-11 registrado na Seção 4 do `KNIGHT_BANDS.md`.
- [ ] `verify` verde.
- [ ] `STATE.md` só na linha da task, com modelo e effort efetivamente usados.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-08\tasks\PB-08-09-arma-como-eixo-de-build.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, docs/playbooks/PB-08/README.md (decisoes congeladas
4, 5 e 6), o STATE.md, docs/content/KNIGHT_BANDS.md SECAO 4 INTEIRA, e docs/content/PB-07-ROTATIONS.md
secao Knight (tabela de identidade).

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb08-09-weapon-axis com a branch
<agente>/pb08-09-weapon-axis e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Abra o eixo de arma dentro do Knight: SKILL SEPARADA POR SWORD, AXE E CLUB.

O gancho ja existe e ninguem puxa. vocations.xml traz skillMultipliers com skill:1 club, skill:2
sword, skill:3 axe, e eles ESTAO IMPORTADOS no catalogo. O que falta e o Character le-los:
- packages/contracts/src/content/schemas.ts:550 -> CharacterDefinitionSchema.skills e literalmente
  { sword, magic }, e .strict()
- packages/content/src/hunts/combatConversion.ts:168 -> resolveSpellPower so le skills.sword
Um Knight de machado hoje e um Knight de espada com outro nome.

O JULGAMENTO QUE E SEU: o eixo entra agora como SKILL SEPARADA APENAS, ou ja com PASSIVA POR TIPO?

RECOMENDACAO FORTE: skill separada apenas. Tres motivos:
1. Passiva por tipo sem equipamento e passiva sem como trocar de arma — weaponItemKey e fixo na ficha
   ate o PB-11.
2. A skill separada e a mudanca ESTRUTURAL (mexe em contrato) e precisa acontecer antes do
   equipamento chegar. A passiva e conteudo e entra depois sem refatorar nada.
3. A decisao congelada 6 — CLUB PAGA EM OFENSA, mitigacao vira dano — depende de `armor`, que so
   existe no PB-11. Desenhar a passiva do club agora e desenhar contra um campo que nao existe.
Se discordar, decida COM ARGUMENTO ESCRITO e registre no commit.

DECISOES CONGELADAS:
- NAO SE CRIA VOCACAO NOVA. Seis vocacoes por arma estao recusadas e exigiriam emenda a ADR-05. Isto
  e eixo de build DENTRO do Knight.
- NAO SE DESENHA SUBCLASSE. 1 mao x 2 maos e os arquetipos ficam RESERVADOS. Esta task abre o gancho;
  NAO o preenche.
- ADITIVO COM DEFAULT QUE REPRODUZ O COMPORTAMENTO ANTERIOR. combat:check e o juiz.
- NUMEROS DO SNAPSHOT: os multiplicadores saem de vocations.xml. Knight treina melee em 1.1 e
  distance em 1.4 — multiplicador MENOR significa treino MAIS RAPIDO.

CONDICAO DE PARADA: CharacterDefinitionSchema e contrato publico em @huntbound/contracts, consumido
por content, save e game. Se abrir "skills" exigir QUEBRAR um consumidor em vez de estende-lo com
default, PARE e registre bloqueio no STATE.md, nao so no relatorio. O AGENTS.md lista "mudar um
contrato publico, schema ou golden ja integrado" como um dos tres casos que param o ciclo. O mesmo
vale se o save existente deixar de carregar.

AMBIGUIDADES, com saida:
- skills.magic EXISTE e o Knight tem magic 0. NAO O REMOVA: remover campo de contrato publico e
  quebra, e ele volta a importar quando outra vocacao entrar.
- Qual skill a formula usa quando a arma nao e declarada? Enquanto weaponItemKey for fixo e
  weaponType nao for importado (parseItemsXml o descarta; so muda no PB-11), a resposta e SWORD, que
  e o comportamento atual. Escolha o default que preserva combat:check verde e declare no commit.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm typecheck
- corepack pnpm test
- corepack pnpm architecture:check
- corepack pnpm content:check
- corepack pnpm combat:check   -> INALTERADO. Esta task e aditiva com default que reproduz o
  comportamento anterior; se o golden mover, O DEFAULT ESTA ERRADO. NAO REGENERE.
- corepack pnpm save:check e corepack pnpm hunt:check -> INALTERADOS
- corepack pnpm qa:browser
- corepack pnpm verify no fechamento

Registre na Secao 4 do KNIGHT_BANDS.md o que ficou aberto para o PB-11.

Ao terminar: atualize somente a linha PB-08-09 do STATE.md, registrando o modelo e o effort
EFETIVAMENTE usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com
git merge --ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no
relatorio a saida de:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
