# PB-08-02 — O mapa do Knight

**Status inicial:** pending

**Classe da tarefa:** design de conteúdo com proveniência de snapshot; **sem código**

**Modelo sugerido:** modelo frontier, effort `xhigh` — é decisão de produto, não implementação

**Validador sugerido:** modelo frontier diferente do autor

**Rota:** `superpowers:verification-before-completion`. Skills operacionais: `playbook-task`,
`worktree-cycle`. **Não** use `test-driven-development`: esta task não produz código.

**Paralelismo:** **primeira e sozinha.** PB-08-03 a 09 dependem do resultado dela. Não comece
nenhuma outra task do PB-08 antes desta integrar.

## Objetivo

Produzir `docs/content/KNIGHT_BANDS.md`: o mapa da classe Knight inteira, congelado, para que
nenhuma task futura precise de mudança estrutural na classe.

O mapa responde três perguntas e só elas:

1. **Quais ações existem** — o conjunto ativo hoje, com uma imagem própria para cada uma.
2. **O que é escada** — quais magias do snapshot são substituições futuras, e portanto nunca
   coexistem com a forma atual, com o motivo escrito.
3. **O que fica reservado** — quais eixos de arma poderiam preencher cada célula no futuro, para que
   subclasses entrem como conteúdo e não como refatoração.

## Por que esta task vem primeiro

O Knight tem quatro ações, três delas de dano. As tasks 04 a 07 vão adicionar cinco. **Sem o mapa,
cada uma dessas tasks decidiria sozinha qual forma de cada papel entra**, e é assim que se produz um
kit com duas magias que fazem a mesma coisa — o defeito que o playbook inteiro existe para evitar.

O mapa também é o que impede a próxima pessoa de "só adicionar `exori gran` porque está no
snapshot".

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-08/README.md` — seções "O princípio de design", "O kit alvo" e "Decisões
   congeladas". **O princípio e as decisões não se redesenham aqui**; esta task os aplica;
3. `docs/content/PB-07-ROTATIONS.md` §Knight — kit por faixa, identidade, rotação em hunt e contra
   boss, e a tabela "O que o catálogo ainda não representa". É a fonte com `sourceFile` + `sha256`;
4. `docs/research/tibia/02_vocations_spells_runes.md` §3.1 (identidade do Knight), §4.2 (o que não
   copiar das runas), §7 (postura), §10 (Wheel of Destiny) e §11 (síntese);
5. `docs/research/tibia/01_hunts_progression.md` §13 (lista do que **não** copiar);
6. `packages/contracts/src/simulation/types.ts` — `AbilityDefinition`, `AbilityShape`,
   `ScenarioConditionDefinition`. O mapa não pode propor uma forma que o contrato não representa sem
   dizer isso em voz alta;
7. `references/canary/data/scripts/spells/` — os doze arquivos listados na tabela de fontes abaixo.

## Tabela de fontes — leia estes arquivos, não a wiki

Todos existem e foram conferidos em 2026-08-24. Paths relativos a
`references/canary/data/scripts/spells/`:

| Magia | Arquivo |
|---|---|
| Berserk | `attack/berserk.lua` |
| Groundshaker | `attack/groundshaker.lua` |
| Brutal Strike | `attack/brutal_strike.lua` |
| Whirlwind Throw | `attack/whirlwind_throw.lua` |
| Front Sweep | `attack/front_sweep.lua` |
| Fierce Berserk | `attack/fierce_berserk.lua` |
| Annihilation | `attack/annihilation.lua` |
| Wound Cleansing | `healing/wound_cleansing.lua` |
| Recovery | `healing/recovery.lua` |
| Challenge | `support/challenge.lua` |
| Haste | `support/haste.lua` |
| Charge | `support/charge.lua` |

Toda linha do mapa carrega `sourceFile` e o `sha256` do arquivo. **Exceção única, herdada do
PB-07-ROTATIONS e já aprovada:** os números de Blood Rage e Protector saem do Vocation Adjustments
2026 (fonte: TibiaWiki, Tibia `15.25.3a4a52`), porque o snapshot `157e6f9e` é anterior. Isso vale
**só** para stances.

## O que o mapa deve conter

### Seção 1 — O conjunto ativo

Uma linha por ação, com estas colunas: **papel**, **nome**, **words**, **nível de origem**,
**mana**, **cooldown**, **grupo de cooldown**, **forma no contrato**, **imagem própria**,
`sourceFile`, `sha256`.

A coluna **imagem própria** é a mais importante e não aceita número. "Mais forte que Berserk" não é
imagem. "Pancada no chão que acende um anel de tiles maior que o giro do Berserk" é.

Restrições, do README:

- **no máximo 9 ações**, contando o auto-attack;
- **pelo menos 4 de dano**;
- **nenhum par produz a mesma imagem**.

### Seção 2 — Os cortes

Uma linha por magia do snapshot que **não** entra, com o motivo. Duas categorias, e a distinção
importa:

- **Escada** — mesma imagem de uma ação ativa, diferindo só em número. Ex.: Charge, que é Haste com
  outra duração e fórmula. Corte permanente.
- **Substituição futura** — a forma de uma faixa que ainda não existe. Ex.: `exori gran`,
  `exura gran ico`, Annihilation, Front Sweep. **Nunca coexistem** com a forma atual; entram
  trocando, não somando.

### Seção 3 — As faixas futuras

A tabela de faixas, documentada mas **sem vigor**. Ver a próxima seção.

### Seção 4 — Eixos de arma reservados

Por célula, qual variação de arma poderia preenchê-la: 1 mão × 2 mãos, e os arquétipos sword
balanceado / axe agressivo / club defensivo. É documentação de intenção, não desenho de subclasse.

Registre também a restrição da decisão congelada 6: **se o club virar o arquétipo defensivo, ele
paga em ofensa** — mitigação vira dano derivado do bloqueado, não sobrevida.

### Seção 5 — O que o contrato ainda não representa

No molde da tabela homônima do `PB-07-ROTATIONS.md`. Se o mapa colocar uma forma que o contrato não
suporta, ela vira bullet do README com o campo que falta nomeado. Já conhecidos:

- **cura por tick** — `packages/simulation/src/kernel/conditions.ts:162` recusa
  `tickDamageAmount <= 0`. É o que Recovery pede;
- **forma de onda** — `AbilityShape` é só `self | target | area`. É o que Front Sweep pede;
- **alvo forçado** — não existe; a IA escolhe alvo livremente. É o que Challenge pede, e é o único
  desses três que **entra** neste playbook, pela PB-08-06.

## Decisões congeladas desta task

- **O conjunto ativo do README é o ponto de partida, não o resultado.** As nove ações listadas lá
  são a proposta que a investigação de 2026-08-24 produziu. Esta task pode **derrubar qualquer uma**
  com argumento escrito de imagem — inclusive as quatro que já existem no jogo. O que ela não pode é
  mudar o princípio ou o orçamento.
- **Nenhuma faixa gateia.** Decisão congelada 2 do README. A tabela de faixas é documentação do
  futuro; o conjunto ativo vale do level 1 ao teto.
- **Nenhum número é inventado.** Mana, cooldown, nível, fórmula e forma saem do snapshot. Divergência
  Huntbound é declarada com campo de origem, nunca silenciosa.
- **Nenhuma magia nova.** O mapa escolhe entre o que existe no snapshot. Criar magia autoral exige
  emenda à ADR-05 e está fora deste playbook.

## Ambiguidade conhecida — e a saída

**Berserk vs Groundshaker é o par mais difícil do mapa.** Ambos são "dano em área ao meu redor". O
que os separa é a forma no grid — `AREA_SQUARE1X1` contra `AREA_CIRCLE3X3` — mais o custo e a
cadência. A investigação de 2026-08-24 julgou que **passa** no critério de leitura, porque o número
de tiles acesos é visivelmente diferente. Mas isso é julgamento, não medição.

**Se você discordar, derrube — com argumento de imagem, e escolha qual dos dois fica.** É a decisão
mais consequente desta task: derrubar um deles leva a rotação de dano de cinco para quatro ações, e
aí o mapa precisa dizer se quatro basta ou se algo mais entra no lugar.

O mesmo julgamento se aplica, com menos força, a **Brutal Strike vs auto-attack**: ambos são "bato no
que está na minha frente". Brutal Strike já está no jogo, mas isso não o isenta do critério.

Registre a decisão em uma linha no commit e siga. Não pare o ciclo por isso.

## Passos

1. Leia os doze arquivos de spell e extraia os números **do arquivo**, não desta card nem do README
   — eles estão aqui para orientar, e um erro de transcrição meu não pode virar conteúdo.
2. Calcule o `sha256` de cada arquivo lido.
3. Monte a Seção 1 e verifique as três restrições de orçamento.
4. Passe **cada par** do conjunto ativo pelo critério de imagem. Todo par que sobrevive ganha uma
   linha dizendo qual é a imagem de cada um.
5. Monte as Seções 2 a 5.
6. Reveja: alguma célula do conjunto ativo ficou vazia? Papel sem forma é faixa mal desenhada.

## Verificações exigidas

Esta task não tem gate de código, mas tem gate de consistência. Evidência colada no relatório:

- `corepack pnpm verify` — verde e **inalterado**; nenhuma linha de código mudou. Se mudou, a task
  saiu do escopo.
- Contagem: conjunto ativo com **≤ 9 ações** e **≥ 4 de dano**.
- Toda linha da Seção 1 tem `sourceFile` e `sha256`, exceto as stances (proveniência TibiaWiki
  declarada).
- Todo par do conjunto ativo tem justificativa **de imagem**. Par justificado por cooldown, mana ou
  dano é escada não detectada — é o erro exato que esta task existe para não cometer.
- Toda magia da Seção 2 está **fora** do conjunto ativo, não ao lado dele.
- Nenhum papel do conjunto ativo está vazio.

## Definition of Done

- [ ] `docs/content/KNIGHT_BANDS.md` existe com as cinco seções.
- [ ] Conjunto ativo com ≤ 9 ações, ≥ 4 de dano, e nenhum par com a mesma imagem.
- [ ] Proveniência por linha; divergências declaradas.
- [ ] Berserk vs Groundshaker resolvido, com argumento escrito.
- [ ] Eixos de arma reservados declarados por célula.
- [ ] O README do PB-08 aponta `KNIGHT_BANDS.md` como fonte do kit — já aponta, na posição 10 das
      fontes normativas; confirme que o arquivo existe.
- [ ] Se o mapa mudar o conjunto ativo em relação ao README, **atualize a tabela do README** e diga
      no commit o que mudou e por quê.
- [ ] `verify` verde e inalterado.
- [ ] `STATE.md` atualizado só na linha da task.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.
