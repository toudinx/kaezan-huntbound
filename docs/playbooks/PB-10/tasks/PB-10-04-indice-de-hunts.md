# PB-10-04 — Índice de hunts como artefato gerado

**Status inicial:** pending

**Classe da tarefa:** **implementação bem especificada** — um contrato novo em `@huntbound/contracts`
e um gerador com `--check`. A forma do artefato está congelada pela spec; o trabalho é derivar os
números dos arquivos que já existem.

**Modelo sugerido:** camada econômica com effort `xhigh`. O contrato é aditivo e não migra nada; a
derivação é aritmética sobre dados já lidos.

**Validador sugerido:** modelo diferente do implementador. A revisão olha uma coisa: **cada número do
índice sai de um arquivo local**, e nenhum sai do TibiaRoute.

**Rota:** **sem skill externa.** Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`,
`hunt-content-pipeline`.

**Paralelismo:** **serial, depois da PB-10-03.** O índice mora em
`packages/content/src/generated/hunts/` e o `sidecar-check` que a 03 generaliza é quem vai cobri-lo.
Rodar as duas juntas conflita no mesmo diretório e no mesmo bloco de `package.json`.

**Spec:** `docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md`, decisão congelada 1.

## Objetivo

Entregar `packages/content/src/generated/hunts/index.json`, com sidecar `.sha256` e `--check` ligado
ao `content:check`: **o card de catálogo de cada hunt, derivado do snapshot**, mais o contrato que o
descreve em `@huntbound/contracts`.

Depois desta task, a tela da PB-10-05 tem de onde ler. Hoje ela não teria: `HuntDefinition`
(`packages/contracts/src/hunt/types.ts:74`) tem região, transições, spawns, blueprints e ponto de
início, e **nenhum campo de apresentação** — nem nome, nem faixa, nem exp, nem loot.

## Por que esta task existe

Porque a alternativa é a tela ler número escrito à mão, e número escrito à mão numa tela é
exatamente onde o TibiaRoute entraria pela porta dos fundos. `AGENTS.md` é explícito: TibiaRoute
escolhe *qual* hunt; o Canary fornece IDs, regras e mapa. Um número derivado localmente também é o
único que descreve o **balanço do Kaezan** em vez do Tibia real — o jogo tem 12 rotworms num recorte
autoral, não a caverna inteira.

## A decisão que dispensa regenerar golden

**O índice é um artefato novo e separado. `hunt.json` não é tocado.**

`HuntDefinition` não ganha campo nesta task. Mexer nele invalida save e replay — é o bloqueio B9, que
a PB-10-01 acabou de fechar e que custou 8 testes vermelhos na PB-08-01 com **uma** mudança de
conteúdo. Um arquivo irmão custa zero e entrega o mesmo. Se você se pegou editando
`packages/contracts/src/hunt/types.ts:74`, parou de fazer esta task.

## De onde sai cada campo

Tudo abaixo já existe no workspace, verificado em 2026-08-26. Nada é lido da web e nada é inventado.

| Campo do índice | Fonte |
|---|---|
| `huntId` | a chave da selection (`key`, hoje `hunt:tibia:venore-rotworm-cave`) |
| `displayName` | `displayName` da selection |
| `recommendedLevel` | `recommendedLevel` da selection |
| `soloVocation` | `soloVocation` da selection |
| `band` | **novo campo declarado na selection** — ver abaixo |
| criaturas da hunt | `creatureKey` distintos em `spawns.json`, com a contagem de slots |
| HP e exp por criatura | `stats.health` e `stats.experience` no catálogo gerado (`pb-01-contract-coverage.json`) |
| `lookType` | o mesmo catálogo |
| loot | `loot[]` do mesmo catálogo: `itemKey`, `chancePerHundredThousand`, `minCount`, `maxCount` |
| exp derivada | slots × exp da espécie, contra `respawnTicks` e `maxLiveActors` de `spawns.json` |
| `sourceUrl` | da selection, **como registro de curadoria e nada mais** |

`spawns.json` da rotworm tem `groups[].slots[]` com `blueprintId`, `creatureKey`, `respawnTicks` e
`source`, mais `maxLiveActors`. É tudo que a derivação precisa.

### `band` é curadoria declarada, não número derivado

A faixa de uma hunt é decisão de produto, congelada em `docs/content/HUNT_BANDS.md` pela PB-10-02.
Um documento em prosa não é fonte legível por máquina, e o gerador não pode adivinhar.

Então `band` entra como **campo novo na selection versionada**, inteiro de 1 a 5, e o `HUNT_BANDS.md`
é a justificativa escrita dele. O gerador copia; ele não decide. A rotworm é `band: 1`
(`HUNT_BANDS.md`, Seção 2, Faixa 1).

O gerador **valida**: as faixas declaradas têm de ser ordenadas de forma consistente com
`recommendedLevel` — banda maior nunca com nível recomendado menor. É barato e pega a inversão de
dedo antes de ela chegar na tela.

### A derivação de exp precisa ser aritmética inteira e escrita

`--check` compara byte a byte. Ponto flutuante deriva entre máquinas e entre versões de Node, e um
`0.30000000000000004` num artefato gerado é um gate vermelho que ninguém sabe explicar.

Faça a conta em inteiros, documente a fórmula em uma linha no próprio contrato, e **escreva a unidade
no nome do campo** — o repositório já faz isso em `chancePerHundredThousand` e `respawnTicks`. Se a
taxa precisa de fração, guarde numerador e denominador ou uma unidade menor; não guarde `number`
fracionário.

Qual exatamente é a fórmula de exp por hora é escolha sua dentro dessas regras: **escolha a mais
simples, registre em uma linha no commit e siga.** O que não pode é ela ser irreprodutível.

### Ordenação determinística, em tudo

Hunts por `huntId`. Criaturas por `creatureKey`. Loot por chance decrescente e, no empate, por
`itemKey` crescente. `readdir` não garante ordem entre plataformas, e ordem instável num artefato
gerado é o jeito mais silencioso de fazer o `--check` piscar.

## O contrato

Novo schema em `@huntbound/contracts`, ao lado dos outros de hunt
(`packages/contracts/src/hunt/schemas.ts`, tipos em `types.ts`, export em `index.ts`). Siga o padrão
do arquivo vizinho: Zod só em `contracts`, `schemaVersion` no topo, `readonly` nos campos.

O contrato é **aditivo**: nada existente muda de forma, então nenhum save migra e nenhum golden é
regenerado.

## Fora de escopo, explicitamente

- **A tela.** `apps/game` não é tocado. A PB-10-05 consome este arquivo; ela não existe ainda.
- **Hunt nova.** A rotworm continua sendo a única entrada do índice quando esta task fecha. O índice
  com um item é o índice certo — ele prova a forma.
- **`HuntDefinition`.** Ver acima.
- **Personagem por hunt.** A resolução de personagem (decisão congelada 2 da spec, já emendada na
  ADR-05 pela PB-10-02) entra quando a tela entrar. Aqui só `soloVocation` e `recommendedLevel`, que
  já existem na selection.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-10/README.md` e o `STATE.md`;
3. a spec congelada, decisão 1;
4. `docs/content/HUNT_BANDS.md`, Seção 2 (faixas) e Seção 5 (o que o contrato ainda não representa);
5. `packages/content/src/selections/hunts/venore-rotworm-cave.json`;
6. `packages/content/src/generated/hunts/venore-rotworm-cave/spawns.json`;
7. `packages/content/src/generated/pb-01-contract-coverage.json` — a forma de uma criatura gerada;
8. `packages/contracts/src/hunt/schemas.ts` e `types.ts` — o molde do contrato;
9. `tools/content-catalog/cli.ts`, comando `generate` — o molde de um gerador com `--check`;
10. `.cursor/rules/10-boundaries.mdc` e `.cursor/rules/20-content.mdc`.

## Passos

1. Escreva o teste antes: dado spawns e catálogo conhecidos, o índice sai com estes números.
2. Escreva o contrato em `@huntbound/contracts`.
3. Acrescente `band` à selection da rotworm e a validação de consistência com `recommendedLevel`.
4. Escreva o gerador, com `--check` e sidecar `.sha256`, no molde dos que já existem.
5. Ligue o `--check` ao `content:check`.
6. Gere, rode duas vezes, confirme que o segundo `--check` é verde e o artefato não mudou.
7. Atualize a linha PB-10-04 do `STATE.md`.

## Verificações exigidas

Com saída fresca colada no relatório:

- `corepack pnpm verify` — verde;
- `corepack pnpm content:check` isolado, porque é o gate que esta task estende;
- `corepack pnpm architecture:check` — o contrato novo não pode arrastar dependência;
- `corepack pnpm hunt:check` verde **sem** golden regenerado;
- **prova de determinismo**: gerar duas vezes produz o mesmo byte, e o `.sha256` bate;
- **prova de que o `--check` reprova**: mude um byte do índice, rode, veja vermelho, desfaça.

## Risco conhecido

**Um número plausível que não veio de arquivo nenhum.** É o mesmo modo de falhar da PB-10-02, um
andar abaixo: a exp de uma hunt "parece certa" porque bate com a memória do Tibia, e ninguém percebe
que ela foi digitada em vez de derivada. A defesa é o teste do passo 1 — se o número não cai de
`spawns.json` × catálogo, ele não entra.

O segundo modo de falhar é mais chato de achar: **ponto flutuante no artefato**. Ele passa em tudo na
sua máquina e reprova o `content:check` na próxima. Aritmética inteira, sempre.

## Definition of Done

- [ ] `packages/content/src/generated/hunts/index.json` existe, com sidecar `.sha256`.
- [ ] Contrato novo em `@huntbound/contracts`, aditivo, sem mudar nada existente.
- [ ] `band` declarada na selection, validada contra `recommendedLevel`.
- [ ] Todo número do índice é derivado de `spawns.json` ou do catálogo gerado; nenhum é digitado.
- [ ] Nenhum ponto flutuante no artefato; a fórmula está documentada no contrato.
- [ ] Ordenação determinística de hunts, criaturas e loot.
- [ ] `--check` ligado ao `content:check`, e provado que sabe reprovar.
- [ ] `hunt.json`, `HuntDefinition` e todo golden **intactos**.
- [ ] `verify` verde e branch integrada por `git merge --ff-only`.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com um modelo economico em effort xhigh.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-10\tasks\PB-10-04-indice-de-hunts.md

Leia AGENTS.md, .cursor/rules/10-boundaries.mdc, .cursor/rules/20-content.mdc,
docs/playbooks/PB-10/README.md, o STATE.md, a spec
docs/superpowers/specs/2026-08-26-pb-10-catalogo-de-hunts-design.md (decisao congelada 1) e
docs/content/HUNT_BANDS.md secoes 2 e 5.

ESTA TASK E SERIAL DEPOIS DA PB-10-03. Confirme com git log que a 03 esta integrada na main antes de
comecar; ela generaliza o sidecar-check que vai cobrir o arquivo que voce cria.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb10-04-indice com a branch
<agente>/pb10-04-indice-de-hunts e rode "corepack pnpm install --prefer-offline" dentro dela.

ENTREGUE packages/content/src/generated/hunts/index.json, com sidecar .sha256 e --check ligado ao
content:check, mais o contrato que o descreve em @huntbound/contracts. E o card de catalogo de cada
hunt, DERIVADO DO SNAPSHOT. A tela da PB-10-05 vai ler dali; hoje ela nao teria de onde, porque
HuntDefinition em packages/contracts/src/hunt/types.ts:74 nao tem NENHUM campo de apresentacao.

DECISAO QUE DISPENSA REGENERAR GOLDEN: o indice e um ARTEFATO NOVO E SEPARADO. hunt.json NAO E
TOCADO e HuntDefinition NAO GANHA CAMPO. Mexer nele invalida save e replay — e o B9, que a PB-10-01
acabou de fechar e que custou 8 testes vermelhos na PB-08-01 com UMA mudanca de conteudo. Se voce se
pegou editando packages/contracts/src/hunt/types.ts:74, parou de fazer esta task.

DE ONDE SAI CADA CAMPO (tudo ja existe no workspace, nada e lido da web):
- huntId, displayName, recommendedLevel, soloVocation, sourceUrl: da selection
  packages/content/src/selections/hunts/venore-rotworm-cave.json
- criaturas e contagem: creatureKey distintos em
  packages/content/src/generated/hunts/venore-rotworm-cave/spawns.json (groups[].slots[])
- HP, exp, lookType e loot: packages/content/src/generated/pb-01-contract-coverage.json
  (stats.health, stats.experience, lookType, loot[] com chancePerHundredThousand/minCount/maxCount)
- exp derivada: slots x exp da especie contra respawnTicks e maxLiveActors de spawns.json

sourceUrl entra COMO REGISTRO DE CURADORIA E NADA MAIS. NENHUM NUMERO VEM DO TIBIAROUTE. Ele escolhe
QUAL hunt; o Canary fornece IDs, regras e mapa.

band E CURADORIA DECLARADA, NAO NUMERO DERIVADO: a faixa esta congelada em docs/content/HUNT_BANDS.md
e prosa nao e fonte legivel por maquina. Acrescente band como CAMPO NOVO na selection versionada,
inteiro 1 a 5; a rotworm e band 1. O gerador COPIA, nao decide — mas VALIDA que banda maior nunca tem
recommendedLevel menor.

ARITMETICA INTEIRA, SEMPRE. --check compara byte a byte e ponto flutuante deriva entre maquinas: um
0.30000000000000004 num artefato gerado e um gate vermelho que ninguem sabe explicar. Escreva a
unidade no nome do campo, como o repo ja faz em chancePerHundredThousand e respawnTicks. A formula de
exp e sua escolha dentro dessas regras: pegue a mais simples, documente em uma linha no contrato e
registre no commit. O que nao pode e ela ser irreproduzivel.

ORDENACAO DETERMINISTICA EM TUDO: hunts por huntId, criaturas por creatureKey, loot por chance
decrescente e no empate por itemKey crescente. readdir nao garante ordem entre plataformas.

O contrato vai em packages/contracts/src/hunt/ (schemas.ts, types.ts, export em index.ts), no padrao
do arquivo vizinho: Zod so em contracts, schemaVersion no topo, readonly nos campos. ADITIVO: nada
existente muda de forma, nenhum save migra, nenhum golden e regenerado.

FORA DE ESCOPO: apps/game (a tela e a PB-10-05); hunt nova (07+) — a rotworm continua sendo a unica
entrada, e o indice com um item e o indice certo, ele prova a forma; HuntDefinition; resolucao de
personagem por hunt.

TESTE ANTES DA IMPLEMENTACAO: dado spawns e catalogo conhecidos, o indice sai com estes numeros.

RISCO CENTRAL: um numero plausivel que nao veio de arquivo nenhum — a exp "parece certa" porque bate
com a memoria do Tibia e ninguem percebe que foi digitada. Se o numero nao cai de spawns.json x
catalogo, ele nao entra.

Verificacao exigida, com saida fresca colada no relatorio:
- corepack pnpm verify
- corepack pnpm content:check isolado
- corepack pnpm architecture:check (o contrato novo nao pode arrastar dependencia)
- corepack pnpm hunt:check verde SEM golden regenerado
- prova de determinismo: gerar duas vezes da o mesmo byte e o .sha256 bate
- prova de que o --check reprova: mude um byte, rode, veja vermelho, desfaca

Ao terminar: atualize somente a linha PB-10-04 do STATE.md com o modelo e o effort EFETIVAMENTE
usados. Commit com mensagem que explique o PORQUE. Integre voce mesmo na main com git merge
--ff-only, rode a verificacao pos-integracao, remova a worktree e a branch, e cole no relatorio:
git status --porcelain && git branch --no-merged main && git worktree list

Isso ja esta autorizado pela task; nao peca confirmacao. NAO inicie a proxima task.
```
