# PB-05-06 — Implementar a rolagem de loot e o autoloot

**Status inicial:** pending

**Classe da tarefa:** implementação bem especificada com consumo de aleatoriedade determinística

**Modelo sugerido:** GPT-5.6 Luna `xhigh` ou Grok 4.6 `high`

**Validador sugerido:** gates automatizados; escalonamento para modelo frontier se a varredura de
fronteiras ficar vermelha duas vezes pela mesma causa

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** só por ativação explícita do supervisor, com PB-05-05. As duas tocam
`packages/simulation/src/kernel/`; o padrão é serial.

## Objetivo

Fazer a morte render loot: rolar a tabela do cenário pelo stream `loot`, conceder os itens ao matador
por evento, e projetar a bolsa da run **fora** do kernel — sem comando de coleta e sem campo novo no
snapshot.

## Resultado esperado

`loot/granted` determinístico e auditável pelo `drawCount`, mais uma projeção pura, testada e
reutilizável que dobra os eventos numa bolsa de run. O snapshot não cresce.

## Dependências

- PB-05-04 `done` e integrada em `main`, com a morte funcionando em `S5`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seções "Autoloot: o corpo é
   decoração" e "Regra de loot";
4. `docs/simulation/KERNEL_CONTRACT.md`, seções "Aleatoriedade" e "Sistemas";
5. `packages/simulation/src/kernel/kernel.ts`, a parte de `S5 death e loot`;
6. `packages/simulation/src/random/**`, para o contrato de `nextBelow`.

## Decisões congeladas

Para o ator morto com `lootTableIndex` não nulo, na ordem declarada das entradas:

1. um `nextBelow(100000)` do stream `loot`; a entrada cai quando o valor sorteado é **menor** que
   `chancePerHundredThousand`;
2. quando cai e `minCount < maxCount`, um `nextBelow(maxCount - minCount + 1)` do mesmo stream define
   a contagem; quando `minCount == maxCount`, **nenhum sorteio é consumido**;
3. cada entrada que cai emite um `loot/granted` para o matador, na ordem das entradas.

Mais:

- **Sem matador identificável, o loot não é rolado** e nenhum sorteio é consumido. Isso mantém o
  stream auditável pelo `drawCount`.
- `loot/granted` é emitido **depois** do `actor/died` da mesma morte, no mesmo tick.
- `lootTableIndex` nulo significa que a morte não rola nada e não consome sorteio.
- **Não existe comando de coleta.** A bolsa da run é uma projeção sobre eventos, fora do kernel, na
  mesma natureza do view model do DOM. Nada de bolsa, capacidade ou peso no snapshot.
- O kernel não conhece `itemKey`: só `itemIndex` inteiro.
- Corpo, sangue e o arco de autoloot são apresentação e pertencem a PB-05-10.

## Escopo permitido

```text
packages/simulation/src/kernel/**
packages/content/src/runtime/**              (a projeção da bolsa da run)
packages/content/src/hunts/**                (somente a exposição da projeção, se necessário)
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-05/STATE.md
```

A projeção mora em `@huntbound/content` porque é ela que sabe traduzir `itemIndex` em `itemKey`.
Colocá-la em `apps/game` prenderia a regra à apresentação, e PB-06 vai precisar dela para persistir.

## Fora de escopo

- IA `hunter` — PB-05-05;
- corpo, sangue, animação e HUD — PB-05-10;
- persistência da bolsa — PB-06;
- montar tabelas de loot a partir do catálogo — PB-05-07;
- capacidade, peso, filtro de autoloot e inventário.

## Interfaces produzidas

```ts
export interface RunBagEntry {
  readonly itemKey: string;
  readonly count: number;
}

export function projectRunBag(
  events: readonly SimulationEvent[],
  itemKeys: readonly string[],
  previous?: readonly RunBagEntry[],
): readonly RunBagEntry[];
```

A projeção é pura, incremental e ordenada por `itemKey`, para que a apresentação possa dobrar lote a
lote sem reprocessar a run inteira.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-06-loot -b codex/pb-05-06-loot-autoloot main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot install --prefer-offline
```

- [ ] **2. Escrever testes RED da rolagem.**

Prove: uma entrada com `chancePerHundredThousand = 100000` sempre cai; com `1`, cai apenas no
sorteio correspondente; a comparação é **estritamente menor**, provada nos dois valores de fronteira;
as entradas são percorridas na ordem declarada; cada entrada consome exatamente um sorteio de chance;
`minCount == maxCount` não consome o segundo sorteio; `minCount < maxCount` consome exatamente um e
produz contagem dentro do intervalo; a mesma seed produz o mesmo resultado em duas execuções.

- [ ] **3. Escrever testes RED de quem recebe e de quando não rola.**

Prove: `loot/granted` nomeia o matador e sai depois do `actor/died` da mesma morte, no mesmo tick;
`lootTableIndex` nulo não emite nada e não consome sorteio; morte sem matador identificável não rola
e não consome sorteio, verificado pelo `drawCount` do stream `loot` antes e depois; a morte do
jogador não gera loot.

O `drawCount` é a asserção que importa: ele audita o consumo exato e é o que impede uma rolagem
silenciosa de deslocar o stream.

- [ ] **4. Implementar a rolagem em `S5`; obter GREEN.**

- [ ] **5. Escrever testes RED da projeção da bolsa.**

Prove: eventos de loot viram entradas agregadas por `itemKey`; contagens do mesmo item somam; a saída
é ordenada por `itemKey`; a projeção é incremental — dobrar dois lotes dá o mesmo resultado que dobrar
o lote concatenado; eventos que não são `loot/granted` são ignorados; `itemIndex` fora da tabela é
erro explícito, nunca item silencioso.

- [ ] **6. Implementar `projectRunBag`; obter GREEN.**

- [ ] **7. Escrever teste RED de fidelidade de restauração.**

Varra **todas** as fronteiras de um cenário com morte e loot e exija convergência de snapshot final e
de cauda de eventos. O ponto sutil: como a bolsa **não** está no snapshot, o que precisa convergir é
o estado do stream `loot`, e é isso que o teste tem que fixar.

- [ ] **8. Documentar.**

Atualize `KERNEL_CONTRACT.md` com a regra de loot, o consumo exato do stream `loot`, a ordem
`actor/died` → `loot/granted`, e a decisão explícita de que a bolsa não é estado do kernel.

- [ ] **9. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot --filter @huntbound/content test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-06-loot verify
```

- [ ] **10. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-06-loot add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb05-06-loot commit -m "feat: roll loot on death and project the run bag"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-06-loot-autoloot
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-06-loot
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-06-loot-autoloot
```

Em modo paralelo com PB-05-05: remova a worktree limpa, preserve a branch e deixe a integração para o
responsável designado.

## Verificação

Testes de `@huntbound/simulation` e `@huntbound/content`, `simulation:check`, `hunt:check`,
`architecture:check` e `verify` verdes na worktree e no resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] A comparação de chance é estritamente menor, provada nos dois valores de fronteira.
- [ ] Cada entrada consome exatamente um sorteio de chance, na ordem declarada.
- [ ] `minCount == maxCount` não consome o segundo sorteio.
- [ ] Morte sem matador ou sem tabela não consome sorteio, provado pelo `drawCount`.
- [ ] `loot/granted` sai depois do `actor/died` da mesma morte, no mesmo tick.
- [ ] Nenhum campo novo entrou no snapshot.
- [ ] `itemKey` não aparece em `packages/simulation`, provado pelo gate de fronteira.
- [ ] A projeção é pura, incremental, ordenada e falha alto em `itemIndex` desconhecido.
- [ ] A restauração é fiel em **todas** as fronteiras varridas.
- [ ] Os journals golden de PB-03 e PB-04 permaneceram byte-idênticos.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: a rolagem exigir estado novo no snapshot para ser fiel na retomada; a bolsa precisar
entrar no kernel para algum teste passar; `itemKey` precisar cruzar a fronteira; ou se o `drawCount`
do stream `loot` divergir entre duas execuções da mesma seed.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, testes, comandos e exit codes, modelo e effort usados,
e a próxima task elegível.

## Commit

`feat: roll loot on death and project the run bag`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-06-loot-autoloot`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-06-loot`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, consumo medido do stream `loot`, confirmação de que o snapshot não
cresceu, integração, limpeza, desvios e próxima task elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh ou Grok 4.6 high.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-06-implementar-loot-e-autoloot.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Confirme que
PB-05-04 esta done e integrada e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-06-loot com a branch
codex/pb-05-06-loot-autoloot e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Role o loot em S5 pelo stream loot: um nextBelow(100000) por entrada na ordem
declarada, entrada cai quando o sorteio e ESTRITAMENTE MENOR que a chance, e um segundo sorteio para a
contagem apenas quando minCount < maxCount. Sem matador identificavel ou sem tabela, nao role e nao
consuma sorteio — prove isso pelo drawCount do stream.

Emita loot/granted depois do actor/died da mesma morte. NAO crie comando de coleta e NAO acrescente
bolsa ao snapshot: a bolsa da run e uma projecao pura sobre eventos, em @huntbound/content, ordenada
por itemKey e incremental. itemKey nao pode cruzar a fronteira do kernel.

Prove a fidelidade de restauracao varrendo TODAS as fronteiras de um cenario com morte e loot.

Nao implemente corpo, sangue, animacao nem HUD: isso e PB-05-10.

Rode biome check ., os testes de simulation e content, typecheck, simulation:check, hunt:check,
architecture:check e verify. Atualize o handoff, commite, integre por fast-forward na main,
reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
