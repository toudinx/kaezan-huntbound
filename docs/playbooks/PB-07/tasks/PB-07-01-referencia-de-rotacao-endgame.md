# PB-07-01 — Referência de rotação endgame das vocações

**Status inicial:** pending

**Classe da tarefa:** pesquisa e especificação sobre fonte canônica; herdada por seis tasks
posteriores

**Modelo sugerido:** GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6, `xhigh`

**Validador sugerido:** modelo frontier diferente do implementador; `biome check .` como primeiro
validador

**Rota:** `superpowers:verification-before-completion`. Skills operacionais: `playbook-task`,
`run-gates`, `worktree-cycle`. **Não** use `test-driven-development`: a task não produz
comportamento testável; a evidência é a citação verificável de arquivo e hash.

**Paralelismo:** sim, com PB-07-02. Nenhum arquivo em comum.

## Objetivo

Responder uma pergunta, não escrever uma enciclopédia: **o kit de quatro ações — auto-attack, duas
magias de dano e uma de cura — é raso demais? Se for, quais papéis faltam?**

A resposta sai do snapshot Canary local, para Knight, Paladin e Sorcerer, e vira a tabela de slots
que PB-07-07, 08 e 11 vão preencher.

## Resultado esperado

`docs/content/PB-07-ROTATIONS.md` com uma **tabela de slots por vocação** — quantas ações, qual papel
cada uma cumpre, e qual magia do snapshot ocupa o slot — mais a lista do que o contrato Huntbound
ainda não sabe representar. Cada afirmação de custo, cooldown, duração ou fórmula aponta arquivo e
`sha256`.

## Dependências

Nenhuma. É a raiz do playbook e não depende de PB-06-09, de auditoria nem de fechamento formal de
playbook anterior. Roda em paralelo com PB-07-02, e **roda mesmo com o bloqueio B1 aberto**: não
toca nenhum arquivo de código.

## Achados da abertura do playbook — não redescubra, confirme

Verificados em 2026-08-21. Confirme cada um em um comando e siga; não gaste a task redescobrindo.

**1. O snapshot tem cinco vocações base** — Sorcerer, Druid, Paladin, Knight e Monk (`id="9"`) — mais
as cinco promoções. `grep -o 'id="[0-9]*" name="[^"]*"' data/XML/vocations.xml` mostra as dez.

**2. Esta task cobre Knight, Paladin e Sorcerer.** Druid e Monk ficam em um parágrafo cada, no fim.

**3. O sistema de stances que o playbook adota NÃO está no snapshot.** É o **Vocation Adjustments
2026**, versão `15.25.3a4a52`, de 16/06/2026 — posterior a `157e6f9e`. O snapshot tem a **versão
anterior** da mecânica, e as duas são desenhos diferentes. O documento precisa trazer **as duas,
lado a lado, com o delta**, porque é o delta que justifica o desvio de proveniência.

Stances 2026, fonte TibiaWiki (`https://tibia.fandom.com/wiki/Stance_Spells`):

| Vocação | Stance | Words | Nível | Mana | Efeito |
|---|---|---|---|---|---|
| Knight | Blood Rage | `utito tempo` | 20 | 20 | +25% sword/axe/club, +15% dano recebido |
| Knight | Protector | `utamo tempo` | 20 | 20 | +30% shielding, −15% dano recebido, −15% dano causado |
| Paladin | Sharpshooter | `utori con` | 20 | 250 | +32% Distance Fighting |
| Paladin | Divine Defiance | `utori hur` | 20 | 250 | +6% de Distance como holy/healing ML, +12% dodge contra não-adjacentes |
| Sorcerer | Master of Flames | `uteta flam` | 20 | 400 | +4% dano base de fogo; próxima magia não-fogo vira fogo |
| Sorcerer | Master of Thunder | `uteta vis` | 20 | 400 | +4% chance de crítico em energia; próxima não-energia vira energia |
| Sorcerer | Master of Decay | `uteta mort` | 20 | 400 | +30% dano extra de crítico em death; próxima não-death vira death |

Regras do sistema 2026: **uma stance ativa por vez**, exceto Sorcerer, que pode manter uma
*crippling* e uma *elemental* ao mesmo tempo; **persiste entre sessões**; **relançar a ativa
desliga**; é válido não ter nenhuma; grupo de cooldown secundário próprio ("Stance Spells").

O delta contra o snapshot é grande e precisa estar tabelado no documento. Amostra já medida:
Blood Rage sai de nível 60 / 290 mana para nível 20 / 20 mana; Protector, de 55 / 200 para 20 / 20;
o Paladin troca de magia e de palavras (`utito tempo san` e `utamo tempo san` viram `utori con` e
`utori hur`); o Sorcerer ganha stances que não existiam.

**4. É por isso que o desenho 2026 foi escolhido, e isso vai no documento como justificativa:**

- **Nível 20 em vez de 60.** O personagem congelado do PB-05 é level 35 e já alcança. A versão do
  snapshot obrigaria a subir o level e refazer o balanceamento inteiro do PB-05.
- **20 de mana no Knight em vez de 290.** O pool do personagem é 185: a versão antiga custa mais que
  a barra inteira e só fecha com poção de mana, que a decisão 1 do playbook recusou.
- **É toggle que persiste, não cast em cooldown.** Vira **modo**, não botão por segundo. Adiciona
  decisão sem custar game feel — que é exatamente o que faltava.

**5. Nada disso é representável hoje.** `SpellDefinitionSchema` não tem campo de condição;
`ConditionDefinitionSchema` é uma união de **um** membro, `poison`, lida só em criatura; `ActorState`
não tem condições ativas; e `ActorState.groupReadyAtTick` é **um número único**, enquanto o sistema
2026 exige um canal de cooldown secundário separado do grupo primário. Este é o achado que define o
escopo de PB-07-03 e precisa estar em destaque.

**6. As stances de Sorcerer dependem de crítico, que não existe no kernel e não entra no PB-07.**
Decisão de produto de 2026-08-21: as três são **adaptadas** — a fantasia e a escolha entre fogo,
energia e death permanecem, mas o efeito é expresso em dano base por elemento em vez de crítico.
Proponha a adaptação no documento, com os números, e marque-a como desvio declarado.

## Por que isso importa para uma decisão já congelada

A sustentação do playbook é *recuar para um spot tranquilo*. Recuar exige **conseguir desengajar**.
Contra rotworm isso já funciona — o jogador anda a 11 ticks por passo e o rotworm a 21 —, mas contra
criatura rápida, não. Mobilidade não é enfeite de kit: é o que torna jogável a decisão que o
playbook já tomou. Diga isso no documento, com os números.

Magic Shield (`utamo vita`, nível 14, 50 mana, **está no snapshot**) merece o mesmo cuidado: converte
mana em vida efetiva, dando ao Sorcerer um regime de sustentação diferente do Knight. PB-07-04
precisa saber que existe antes de escolher os números de leech e regen.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md` e `STATE.md`;
3. `AGENTS.md`, seções "Fontes externas" e "Regras invioláveis";
4. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, decisões vinculantes e "Extensões Huntbound
   permitidas";
5. `packages/content/src/selections/pb-05-knight-combat.json` — **o padrão de citação a seguir**;
6. `packages/content/src/hunts/combatConversion.ts` — as fórmulas já portadas e suas constantes;
7. `packages/contracts/src/content/schemas.ts`, `SpellDefinitionSchema` e
   `CharacterDefinitionSchema` — o que o catálogo já sabe representar e o que não sabe.

Fontes de dados, nesta ordem de autoridade:

- `references/canary/data/XML/vocations.xml`;
- `references/canary/data/scripts/spells/{attack,healing,support,conjuring}/**`;
- `references/canary/data/items/items.xml` para runas e armas;
- `references/canary/data-otservbr-global/monster/bosses/**` para o comportamento contra o qual a
  rotação de boss é descrita.

`references/` é ignorado pelo Git e pelo Biome. **Leia, nunca edite, nunca indexe.**

**Exceção de proveniência, aprovada em 2026-08-21 e limitada às Stances 2026:**
`https://tibia.fandom.com/wiki/Stance_Spells` é fonte declarada **apenas** para o sistema de stances
posterior ao snapshot. Cada número vindo dela é marcado no documento com
`fonte: TibiaWiki, Tibia 15.25.3a4a52` em vez de `sha256`, porque não há arquivo local para hashear.
Nenhum outro assunto pode usar a wiki: kit, fórmula, custo, cooldown, loot e mapa continuam saindo
exclusivamente do snapshot.

## Decisões congeladas

- O documento é **derivado do snapshot**, nunca de memória do modelo. Uma afirmação sem
  `sourceFile` + `sha256` é defeito — salvo as Stances 2026, cobertas pela exceção de proveniência
  acima, que exigem a marca de fonte e versão.
- **O sistema de stances adotado é o de 2026, não o do snapshot.** Já está decidido: não reabra. O
  que a task faz é documentar os dois e tabelar o delta.
- **As stances de Sorcerer são adaptadas** para não exigirem crítico. Proponha os números; não
  introduza crítico no escopo.
- Onde 3.4.1 e `157e6f9e` divergirem, vence `157e6f9e`. Só recorra a
  `C:\Kaezan\kaezan\canary-3.4.1\` se o arquivo **não existir** no snapshot, e diga no documento que
  recorreu.
- O documento **descreve**; não escolhe o kit final. A seleção por vocação é PB-07-07, 08 e 11.
- As três extensões que o playbook já congelou — leech, regen sensível a combate e cargas por hunt —
  entram na seção final como **decisão já tomada**, a ser justificada, não reaberta.
- Nenhum arquivo de código, contrato, seleção ou artefato gerado é tocado nesta task.

## Escopo permitido

```text
docs/content/PB-07-ROTATIONS.md
docs/playbooks/PB-07/STATE.md
```

## Fora de escopo

- editar `packages/content/src/selections/**` — é PB-07-07/08/11;
- editar a ADR-05 — a emenda é PB-07-04, usando o texto produzido aqui;
- decidir números de leech, de regen ou de carga — é PB-07-03 e PB-07-04;
- qualquer arquivo em `packages/**`, `apps/**` ou `tools/**`;
- Druid e Monk: existem no snapshot e são migráveis, mas ficam para depois. Um parágrafo cada,
  não uma seção.

## Estrutura exigida do documento

Uma seção por vocação, na ordem Knight, Paladin, Sorcerer, e dentro de cada uma:

1. **Identidade:** `id` em `vocations.xml`, `gainhp`/`gainmana` e seus ticks, `baseSpeed`,
   `attackSpeedMs`, multiplicadores de skill, e a promoção correspondente.
2. **Kit por faixa de nível:** magias disponíveis com `words`, nível, mana, cooldown, cooldown de
   grupo, `formulaKind` e alcance/área. Faixas sugeridas: até 50, 50–150, 150+.
3. **Rotação solo em hunt:** a sequência real, incluindo o filler quando tudo está em cooldown.
4. **Rotação solo contra boss:** o que muda quando o alvo é único, tem muita vida e bate forte. É
   aqui que postura e mobilidade aparecem ou não aparecem — a diferença entre as duas rotações é a
   evidência de que o eixo faz falta.
5. **Runas:** quais a vocação usa, o que fazem, e quantas cargas o item carrega em `items.xml`.
6. **Quando a mana acaba:** o que a vocação faz de fato no Canary.
7. **O que o catálogo Huntbound ainda não representa:** para cada item do kit, se
   `SpellDefinitionSchema` e `CharacterDefinitionSchema` conseguem descrevê-lo. Esta lista vira o
   escopo de campos de PB-07-03 e PB-07-06.

Fecha com três seções transversais:

- **Tabela de slots — o entregável principal.** Uma linha por slot, uma coluna por vocação. Para
  cada slot: o papel que cumpre, a magia do snapshot que o ocupa, o custo, e se o contrato atual já
  o representa. A hipótese de trabalho é **seis slots** — auto-attack, dano single-target, dano em
  área, cura, postura e mobilidade —, derivada dos achados desta task card. **Confirme ou derrube
  com evidência.** Se cinco bastarem, diga qual sai e por quê; se sete forem necessários, diga qual
  entra. O que não vale é aceitar seis sem examinar.
- **Tabela comparativa** das três vocações: papel, alcance de auto-attack, skill que escala o dano,
  dependência de mana, regime de sustentação, e o que cada uma precisa do contrato que hoje não
  existe.
- **"O que Huntbound adota e o que recusa"**: por que poção de Tibia é recusada, por que leech e
  regen sensível a combate a substituem, por que runa vira carga sem inventário, e qual consequência
  de fidelidade cada recusa tem. Escreva como texto pronto para colar na ADR-05 — PB-07-04 vai fazer
  exatamente isso.

Encerra com **um parágrafo para Druid e um para Monk**: que existem no snapshot, qual é o papel de
cada um, e o que faltaria para migrá-los. Um parágrafo, não uma seção.

## Execução

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb07-01-rotations -b codex/pb07-01-rotations-reference main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-01-rotations install --prefer-offline
```

`references/` não é copiado para a worktree — é ignorado pelo Git. Leia do repositório principal,
`C:\Kaezan\kaezan-huntbound\references\canary`.

- [ ] **2. Inventariar antes de escrever.**

Liste `vocations.xml` e a árvore de `spells`, e monte a tabela bruta de magia → vocação → nível →
mana → cooldown → fórmula. Só depois escreva prosa. Escrever antes de inventariar é como se produz
um documento plausível e errado.

- [ ] **3. Calcular o `sha256` de cada arquivo citado e registrar.**

Mesmo formato de `sourceFiles` em `pb-05-knight-combat.json`: caminho relativo ao root do snapshot e
hash. Se um arquivo for citado e não tiver hash, o documento está incompleto.

- [ ] **4. Escrever as três seções de vocação, as três transversais e os dois parágrafos finais.**

A tabela de slots vem primeiro no documento, porque é a resposta à pergunta da task. O resto é a
evidência que a sustenta.

- [ ] **5. Confrontar com o que já foi portado.**

Para Knight, os números do documento **têm que bater** com
`packages/content/src/selections/pb-05-knight-combat.json` e com as constantes de
`combatConversion.ts`. Divergência aqui é achado, não erro de arredondamento: registre-a em destaque
— significa que a seleção do PB-05 tem um defeito, e isso vira bullet novo no README do playbook.

- [ ] **6. Executar gate e fechar.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb07-01-rotations exec biome check .
```

- [ ] **7. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb07-01-rotations add docs
git -C C:\Kaezan\kaezan-huntbound-pb07-01-rotations commit -m "docs: derive the endgame rotation reference from the Canary snapshot"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-01-rotations-reference
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb07-01-rotations
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-01-rotations-reference
```

`verify` não é exigido: a task não toca código. `biome check .` é o gate.

## Verificação

`biome check .` em `0`. Amostragem manual de cinco afirmações escolhidas ao acaso no documento,
cada uma reaberta no arquivo citado e conferida — registre no relatório quais cinco foram.

## Critérios de aceite

- [ ] O documento existe em `docs/content/PB-07-ROTATIONS.md`.
- [ ] Cobre Knight, Paladin e Sorcerer, cada uma com as sete subseções exigidas.
- [ ] A tabela de slots existe, abre o documento, e confirma ou derruba a hipótese de seis slots
      com evidência.
- [ ] Druid e Monk têm um parágrafo cada, sem virar seção.
- [ ] Toda afirmação de kit, custo, cooldown ou fórmula tem `sourceFile` + `sha256`.
- [ ] A tabela comparativa nomeia, por vocação, o que falta no contrato hoje.
- [ ] O documento diz, em destaque, que postura, mobilidade e magic shield são `Condition` com
      duração, que nem o catálogo nem o kernel as representam hoje, e que `groupReadyAtTick` é um
      número único enquanto o sistema 2026 exige canal de cooldown secundário separado.
- [ ] As Stances 2026 e as do snapshot aparecem lado a lado, com o delta tabelado e a justificativa
      da escolha.
- [ ] Cada número vindo da TibiaWiki está marcado com fonte e versão, e a wiki não foi usada para
      mais nada.
- [ ] A adaptação das stances de Sorcerer está proposta com números e marcada como desvio.
- [ ] A seção "adota e recusa" está escrita como texto colável na ADR-05.
- [ ] Os números de Knight foram confrontados com `pb-05-knight-combat.json`, e qualquer divergência
      está em destaque.
- [ ] Nenhum arquivo fora de `docs/` foi tocado. `references/` intacto.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare e registre no `STATE.md`** se: o snapshot não contiver Knight, Paladin, Sorcerer ou seus
spells; os números de Knight divergirem do PB-05 de forma que invalide a seleção já integrada; ou se
a seção "adota e recusa" exigir reabrir uma decisão já congelada no README do playbook.

**Não pare** por ambiguidade de rotação. Rotação tem mais de uma leitura plausível por natureza:
escolha a mais simples, diga que escolheu, e siga.

## Persistência do handoff

Atualize `docs/playbooks/PB-07/STATE.md`: status, branch, commit, modelo e effort usados, e a
próxima task elegível. Se o passo 5 achou divergência no PB-05, acrescente o bullet correspondente
ao `README.md` do playbook.

## Commit

`docs: derive the endgame rotation reference from the Canary snapshot`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-01-rotations-reference`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb07-01-rotations`; integração por `--ff-only`; limpeza removendo o
diretório antes de `prune` e `branch -d`.

## Relatório final

A tabela de slots proposta e o número de slots que ela defende, contagem de magias inventariadas,
contagem de arquivos com hash, as cinco afirmações reconferidas na amostragem, divergências
achadas contra o PB-05, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol, Claude Opus 5 ou Grok 4.6 em xhigh.
Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07	asks\PB-07-01-referencia-de-rotacao-endgame.md

Leia AGENTS.md, docs/playbooks/PB-07/README.md, docs/playbooks/PB-07/STATE.md e apenas os arquivos
indicados pela task.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb07-01-rotations com a branch
codex/pb07-01-rotations-reference e rode "corepack pnpm install --prefer-offline" dentro dela.

A PERGUNTA da task: o kit de quatro acoes (auto-attack, duas magias de dano, uma de cura) e raso
demais? Se for, quais papeis faltam? Responda com evidencia do snapshot, nao com enciclopedia.

Produza docs/content/PB-07-ROTATIONS.md derivado DO SNAPSHOT LOCAL em
C:\Kaezan\kaezan-huntbound
eferences\canary. Nunca da internet, nunca de memoria. Leia
references/canary, nao edite nada la.

Cubra Knight, Paladin e Sorcerer. Druid e Monk existem no snapshot e ficam para depois: um paragrafo
cada, no fim, nao uma secao.

O ENTREGAVEL PRINCIPAL e a tabela de slots, e ela abre o documento: uma linha por slot, uma coluna
por vocacao, dizendo o papel, a magia do snapshot que ocupa o slot, o custo, e se o contrato atual ja
representa aquilo. A hipotese de trabalho e SEIS slots: auto-attack, dano single-target, dano em
area, cura, postura e mobilidade. CONFIRME OU DERRUBE com evidencia. Se cinco bastarem diga qual sai;
se sete forem necessarios diga qual entra. Lembre que postura no desenho 2026 e TOGGLE que persiste
entre sessoes, nao cast em cooldown: e um modo, nao um botao por segundo.

ATENCAO NA POSTURA: o sistema de stances adotado e o Vocation Adjustments 2026 (Tibia 15.25.3a4a52,
16/06/2026), que NAO esta no snapshot. O snapshot tem a versao ANTERIOR da mecanica. Documente AS
DUAS lado a lado e tabele o delta — o delta e o que justifica o desvio de proveniencia. A task card
ja traz a tabela das stances 2026 e uma amostra do delta: confirme e complete, nao redescubra.

EXCECAO DE PROVENIENCIA, valida so para as Stances 2026: https://tibia.fandom.com/wiki/Stance_Spells
e fonte declarada. Numero vindo da wiki leva a marca "fonte: TibiaWiki, Tibia 15.25.3a4a52" no lugar
do sha256. Nenhum outro assunto usa a wiki — kit, formula, custo, cooldown, loot e mapa continuam
saindo so do snapshot.

As stances de Sorcerer dependem de CRITICO, que nao existe no kernel e NAO entra no PB-07. Adapte as
tres: mantenha a fantasia e a escolha entre fogo, energia e death, mas expresse o efeito em dano base
por elemento. Proponha os numeros e marque como desvio declarado. Nao introduza critico.

Para cada vocacao escreva sete subsecoes: identidade em vocations.xml; kit por faixa de nivel;
rotacao solo em hunt; rotacao solo contra boss; runas e quantas cargas o item carrega em items.xml;
o que a vocacao faz quando a mana acaba; e o que SpellDefinitionSchema/CharacterDefinitionSchema
ainda nao conseguem representar.

Deixe em DESTAQUE que postura, mobilidade e magic shield sao Condition com duracao, que
SpellDefinitionSchema nao tem campo de condicao, que ConditionDefinitionSchema tem UM membro
(poison) e so e lida em criatura, que ActorState nao tem condicoes ativas, e que
ActorState.groupReadyAtTick e UM NUMERO UNICO enquanto o sistema 2026 exige canal de cooldown
secundario separado do primario. Isso define o escopo de PB-07-03.

Feche com a tabela comparativa das tres vocacoes e com a secao "o que Huntbound adota e o que
recusa", escrita como texto colavel na ADR-05, justificando: recusa da pocao de Tibia, adocao de
leech, adocao de regen sensivel a combate, e runa como habilidade com cargas sem inventario. Essas
quatro decisoes ja estao congeladas no README do playbook: justifique, nao reabra.

Toda afirmacao de kit, custo, cooldown, duracao ou formula precisa de sourceFile + sha256, no padrao
de packages/content/src/selections/pb-05-knight-combat.json.

Confronte os numeros de Knight com pb-05-knight-combat.json e com combatConversion.ts. Divergencia e
achado: registre em destaque.

Nao toque packages, apps nem tools. Nao edite a ADR-05 nem selecoes de conteudo.

Rode biome check . Atualize o STATE.md, commite, integre por fast-forward na main e limpe worktree e
branch removendo o diretorio antes do prune.

Se surgir ambiguidade de rotacao, escolha a leitura mais simples, registre a escolha em uma linha e
siga. Pare apenas se o snapshot nao contiver Knight, Paladin ou Sorcerer, ou se os numeros do Knight
invalidarem a selecao ja integrada. Nao inicie a proxima task.
```
