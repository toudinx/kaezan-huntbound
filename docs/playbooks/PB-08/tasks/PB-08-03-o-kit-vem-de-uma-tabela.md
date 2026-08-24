# PB-08-03 — O kit vem de uma tabela, não de JSON congelado

**Status inicial:** pending

**Classe da tarefa:** mudança de contrato aditiva + resolução no compositor de cenário; sem regra
de combate nova

**Modelo sugerido:** modelo econômico com effort alto — é implementação bem especificada

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** depende de **PB-08-02 integrada**. Bloqueia 04, 05, 06, 07 e 09.

## Objetivo

Fazer o kit do Knight vir de uma **tabela de faixas** em vez de uma lista chapada, com a tabela
contendo **uma linha só: do level 1 ao teto, tudo liberado**.

É a task estrutural do playbook. Depois dela, mudar quais ações o Knight tem — agora ou no PB-09 —
é **editar dado**, nunca refatorar código.

## Por que isto vale uma task

Hoje `packages/content/src/selections/pb-05-knight-combat.json` declara `spellKeys` como um array
plano, e `CharacterDefinitionSchema` o exige com `.min(1)`. As tasks 04 a 07 vão acrescentar cinco
magias a esse array. Sem a tabela, o array cresce e pronto — e quando o PB-09 quiser que o level
signifique alguma coisa, ou quando o playtest pedir para limitar as nove ações de saída, o formato
não comporta e alguém refatora.

A decisão congelada 1 do playbook diz que o Knight não pode precisar de mudança estrutural depois.
**Esta task é como essa promessa se paga.**

## O que já está resolvido e não se rediscute

A selection **já declara acesso irrestrito**, em dois lugares:

- topo do documento: `"spellAccess": "unrestricted"`;
- por magia, em `spells[].huntboundAccess`: `"unrestricted"`.

Ou seja, **a decisão congelada 2 do README já está honrada no dado**. Esta task não introduz a
regra de não trancar por level: ela dá a essa regra um formato que sobrevive à próxima decisão.

Note também `character.levelSource`, que hoje justifica o nível 35 com *"Berserk requires level 35;
a level 8 knight could not cast the kit it was given"*. Esse texto descreve o Canary, não o
Huntbound. Se a tabela tem uma linha sem portão, o nível 35 do personagem passa a ser escolha de
balanceamento — HP, mana e dano —, não pré-requisito de kit. **Atualize `levelSource` para dizer
isso**, com a divergência declarada.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-08/README.md` — decisões congeladas 1, 2 e 3;
3. `docs/content/KNIGHT_BANDS.md` — entregue pela PB-08-02. **A tabela de faixas desta task é a
   Seção 3 daquele documento, materializada em dado**;
4. `.cursor/rules/10-boundaries.mdc` e `.cursor/rules/20-content.mdc`;
5. `packages/contracts/src/content/schemas.ts:545-563` — `CharacterDefinitionSchema`;
6. `packages/content/src/hunts/buildHuntScenario.ts` — `composePlayer` (linha ~130) e o laço de
   `character.spellKeys` (linha ~309);
7. `packages/content/src/selections/pb-05-knight-combat.json` — `character` e `spells`.

## Resultado esperado

`CharacterDefinition` ganha uma tabela de faixas de kit, aditiva, com default que reproduz
exatamente o comportamento atual. O cenário composto hoje continua **byte-idêntico**.

Forma sugerida — a task pode escolher outra desde que satisfaça as restrições:

```
kit: [
  { minLevel: 1, maxLevel: null, spellKeys: [ ...as magias do conjunto ativo... ] }
]
```

`spellKeys` no topo permanece aceito e significa "uma faixa única de 1 ao teto". Um documento que
traga os dois é inválido — não se declara o kit duas vezes.

## Decisões congeladas desta task

- **Aditivo com default que reproduz o comportamento anterior.** Restrição global do README. Sem
  `kit`, o `spellKeys` atual continua valendo e o cenário não muda.
- **A tabela tem exatamente uma linha.** Faixa que gateia é desvio da decisão congelada 2. As faixas
  futuras da PB-08-02 ficam **na documentação**, não no dado.
- **A resolução é por `character.level`**, mesmo com uma linha só. Resolver por level agora é o que
  torna a segunda linha um problema de dado depois. Selecionar sempre a primeira linha e ignorar o
  level derrota o propósito da task.
- **Zod só em `@huntbound/contracts`.** A validação da tabela vive lá; `packages/content` só lê.
- **Nenhuma magia entra ou sai nesta task.** O conjunto ativo continua sendo as três atuais mais o
  auto-attack. Adicionar magia é a PB-08-04 em diante. Esta task muda **formato**, não conteúdo — e
  é assim que ela consegue provar que não mudou comportamento.

## Ambiguidade conhecida — e a saída

**Faixa aberta no topo.** `maxLevel: null` ou um número grande? Escolha `null` e trate como aberta:
é mais fácil de ler e não produz um teto arbitrário que alguém vai ter que caçar depois.

**Faixas sobrepostas ou com buraco.** Com uma linha só, não acontece. Mas a validação deve recusar
sobreposição e buraco desde já, senão a segunda linha do PB-09 entra torta. Diagnóstico próprio, no
molde dos que já existem em `packages/contracts/src/content/diagnostics.ts`.

Registre a escolha em uma linha no commit e siga. Não pare o ciclo por isso.

## Passos

1. **Teste primeiro.** Dois testes que falham hoje:
   - um documento com `kit` de uma linha produz o **mesmo** `ActorBlueprint` que o `spellKeys`
     equivalente;
   - um documento com `kit` **e** `spellKeys` é rejeitado com diagnóstico nomeado.
   Some um terceiro para a validação de sobreposição/buraco.
2. Estenda `CharacterDefinitionSchema` com o campo aditivo e o diagnóstico.
3. Faça `composePlayer` resolver a faixa por `character.level` antes de montar `abilityIndices`.
4. Migre `pb-05-knight-combat.json` para a forma nova, com uma linha.
5. Atualize `character.levelSource` conforme a seção "O que já está resolvido".
6. Regenere o que for gerado, pelo CLI.
7. Rode os gates.

## Verificações exigidas

Evidência fresca, colada no relatório:

- `corepack pnpm typecheck` — mudou contrato.
- `corepack pnpm test`
- `corepack pnpm architecture:check` — Zod não pode ter vazado para `packages/content`.
- `corepack pnpm content:check`
- `corepack pnpm combat:check` — **golden inalterado**. Esta task não muda comportamento; se o
  golden mover, ou a migração da selection alterou o kit sem querer, ou a resolução por level está
  escolhendo outra coisa. **Pare e investigue; não regenere.**
- `corepack pnpm hunt:check` e `corepack pnpm simulation:check` — inalterados, pelo mesmo motivo.
- `corepack pnpm qa:browser` — o kit chega ao HUD; confirme que continuam três botões.
- `corepack pnpm verify` no fechamento.

## Risco conhecido

**O golden do combate é o juiz desta task.** Ela é uma refatoração de formato disfarçada de mudança
de contrato: se `combat:check` continuar verde com a selection migrada, a equivalência está provada.
Se ficar vermelho, é defeito da migração — nunca autorização para regenerar. A decisão congelada 8
do README vale: golden só se regenera com prova escrita de intencionalidade, e esta task não tem
nenhuma intenção de mudar comportamento.

## Definition of Done

- [ ] `CharacterDefinition` aceita tabela de faixas, aditiva, com default que reproduz o atual.
- [ ] `composePlayer` resolve a faixa **por `character.level`**.
- [ ] Documento com `kit` e `spellKeys` juntos é rejeitado com diagnóstico nomeado.
- [ ] Sobreposição e buraco entre faixas são rejeitados.
- [ ] `pb-05-knight-combat.json` migrado, com **uma linha**, `minLevel: 1`, sem teto.
- [ ] `levelSource` atualizado para refletir que o nível não é mais pré-requisito de kit.
- [ ] `combat:check`, `hunt:check` e `simulation:check` **verdes e inalterados**.
- [ ] `verify` verde.
- [ ] `STATE.md` atualizado só na linha da task.
- [ ] Branch integrada por `git merge --ff-only` e worktree limpa.
