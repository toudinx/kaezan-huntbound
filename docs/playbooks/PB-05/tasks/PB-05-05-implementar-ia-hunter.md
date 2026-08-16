# PB-05-05 — Implementar a IA de agressão e perseguição

**Status inicial:** pending

**Classe da tarefa:** regra nova de kernel com consumo de aleatoriedade — gatilho de escalonamento
pela política de modelos

**Modelo sugerido:** GPT-5.6 Sol `xhigh` ou Grok 4.6 `xhigh`. **Luna está excluída em qualquer
effort.**

**Validador sugerido:** modelo frontier diferente do implementador

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.
Skills operacionais: `playbook-task`, `run-gates`, `worktree-cycle`.

**Paralelismo:** só por ativação explícita do supervisor, com PB-05-06. As duas tocam
`packages/simulation/src/kernel/`; o padrão é serial.

## Objetivo

Fazer criaturas caçarem: escolher alvo por raio de agressão, perseguir com passo guloso e golpear ao
ficar adjacente — sem pathfinding, sem line of sight e **sem alterar o consumo do stream `ai` de um
cenário que não tenha `hunter`**.

## Resultado esperado

`ActorBehavior: 'hunter'` funcional em `S6`, com alvo serializado, decisões reprodutíveis e os
journals golden de PB-03 e PB-04 intactos — porque nenhum deles declara `hunter`.

## Dependências

- PB-05-04 `done` e integrada em `main`, com `main` verde.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-05/STATE.md`;
3. `docs/superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md`, seção "Regra de IA `hunter`";
4. `docs/simulation/KERNEL_CONTRACT.md`, seções "Sistemas", "Aleatoriedade" e "Fases do tick";
5. `packages/simulation/src/kernel/kernel.ts` e os testes de `S6 ai`;
6. `packages/simulation/src/grid/directions.ts`, para a ordem canônica das direções.

## Decisões congeladas

Para cada ator `hunter` fora de cooldown, em ordem crescente de `EntityId`:

1. **manutenção de alvo:** descarta o alvo atual se ele morreu, mudou de andar ou saiu do raio de
   agressão; mudança de alvo emite `combat/target-changed`;
2. **aquisição:** sem alvo, escolhe o ator vivo de facção diferente, no mesmo andar, dentro do raio
   Chebyshev, com menor distância; empate resolve pelo **menor `EntityId`**; nenhuma aleatoriedade é
   consumida;
3. **ação:** alvo adjacente enfileira intent interna de ataque para `currentTick + 1`; alvo distante
   enfileira intent de passo guloso, com direção dada pelo sinal de `dx` e `dy` mapeado na ordem
   canônica;
4. **sem alvo:** o ator cai em `wander` e consome exatamente um `nextBelow(8)` do stream `ai`.

Regras adicionais congeladas:

- Perseguição é **gulosa**: um passo por decisão, sem contornar parede e sem replanejar rota. Passo
  bloqueado apenas emite `actor/move-blocked`; não há segunda tentativa no mesmo tick.
- `aggroRadius = 0` significa que o blueprint nunca agride, mesmo sendo `hunter`.
- A IA decide sempre para `currentTick + 1`, nunca para o tick corrente.
- Um ator `inert` ou `wander` mantém exatamente o consumo de stream de PB-03.
- Nenhuma nova fase, nenhum comando novo, nenhum evento além de `combat/target-changed`.

## Escopo permitido

```text
packages/simulation/src/kernel/**
packages/simulation/src/grid/**              (somente helpers de distância/direção, se necessário)
packages/contracts/src/simulation/**         (somente se um diagnóstico faltar)
docs/simulation/KERNEL_CONTRACT.md
docs/playbooks/PB-05/STATE.md
```

## Fora de escopo

- loot — PB-05-06;
- `packages/content`, `packages/assets`, `apps/game`;
- pathfinding, line of sight, fuga em vida baixa;
- alterar o comportamento `wander` existente.

## Execução RED/GREEN

- [ ] **1. Criar branch e worktree irmã, e instalar dependências.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb05-05-hunter -b codex/pb-05-05-hunter-ai main
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter install --prefer-offline
```

- [ ] **2. Escrever testes RED de aquisição de alvo.**

Prove: escolhe o alvo válido mais próximo por distância Chebyshev; empate de distância resolve pelo
menor `EntityId`; ignora ator da mesma facção; ignora ator em outro andar mesmo com `(x, y)` dentro
do raio; ignora ator fora do raio; `aggroRadius = 0` nunca adquire alvo; a aquisição **não consome**
o stream `ai`; a troca de alvo emite `combat/target-changed`.

O caso de outro andar é o erro fácil, pelo mesmo motivo que a ocupação foi em PB-04-05: distância
calculada só em `(x, y)` faz uma criatura de baixo perseguir alguém de cima.

- [ ] **3. Implementar a aquisição; obter GREEN.**

- [ ] **4. Escrever testes RED de perseguição.**

Prove: com alvo a nordeste, o passo escolhido é `ne`; com alvo exatamente ao norte, é `n`; o passo é
enfileirado para `currentTick + 1`; um passo bloqueado por parede emite `actor/move-blocked` e **não**
gera segunda tentativa no mesmo tick; a perseguição não contorna obstáculo; perseguição não consome
aleatoriedade.

- [ ] **5. Implementar a perseguição; obter GREEN.**

- [ ] **6. Escrever testes RED de golpe por IA.**

Prove: alvo adjacente gera intent de ataque para o tick seguinte, e não passo; a intent de ataque
resolve em `S4` no tick seguinte, respeitando `attackReadyAtTick`; o alvo que morre antes da
resolução não produz golpe nem erro; o ator volta a perseguir quando o alvo se afasta.

- [ ] **7. Implementar o golpe por IA; obter GREEN.**

- [ ] **8. Provar a preservação do consumo de `ai`.**

Escreva o teste que mais importa nesta task: um cenário **sem** nenhum ator `hunter` consome o stream
`ai` exatamente como antes, com os mesmos valores e o mesmo `drawCount`. Depois, um cenário com
`hunter` **sem alvo** consome exatamente um `nextBelow(8)` por ator por tick, como `wander`.

- [ ] **9. Escrever teste RED de fidelidade de restauração.**

Varra **todas** as fronteiras de um cenário com perseguição, troca de alvo e golpe por IA, e exija
convergência de snapshot final e de cauda de eventos. É este teste que pega `targetEntityId` ou a
intent de ataque pendente ausentes do snapshot.

- [ ] **10. Implementar o que faltar na serialização; obter GREEN.**

- [ ] **11. Documentar.**

Atualize `KERNEL_CONTRACT.md`, seção de sistemas, com o comportamento `hunter` completo: manutenção,
aquisição, ação, fallback e o que consome ou não consome aleatoriedade.

- [ ] **12. Executar gates.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter exec biome check .
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter --filter @huntbound/simulation test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter simulation:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter hunt:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb05-05-hunter verify
```

Os goldens de PB-03 e PB-04 precisam continuar byte-idênticos: nenhum deles declara `hunter`, então
qualquer mudança neles significa que o fallback `wander` foi alterado.

- [ ] **13. Atualizar handoff, commitar, integrar e limpar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb05-05-hunter add packages docs
git -C C:\Kaezan\kaezan-huntbound-pb05-05-hunter commit -m "feat: make creatures aggro, chase and strike"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb-05-05-hunter-ai
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
Remove-Item -Recurse -Force C:\Kaezan\kaezan-huntbound-pb05-05-hunter
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb-05-05-hunter-ai
```

Em modo paralelo com PB-05-06: remova a worktree limpa, preserve a branch e deixe a integração para o
responsável designado.

## Verificação

Testes de `@huntbound/simulation`, `simulation:check`, `hunt:check`, `architecture:check` e `verify`
verdes na worktree e no resultado integrado; `biome check .` em `0`.

## Critérios de aceite

- [ ] Alvo é adquirido por distância Chebyshev, no mesmo andar, com empate por menor `EntityId`.
- [ ] `aggroRadius = 0` nunca agride.
- [ ] Aquisição e perseguição não consomem aleatoriedade.
- [ ] `hunter` sem alvo consome exatamente um `nextBelow(8)` do stream `ai`, como `wander`.
- [ ] Cenário sem `hunter` tem consumo de `ai` idêntico ao de antes desta task.
- [ ] Perseguição é gulosa, não contorna parede e não retenta no mesmo tick.
- [ ] Alvo adjacente gera ataque, não passo.
- [ ] `combat/target-changed` é emitido em toda troca de alvo.
- [ ] A restauração é fiel em **todas** as fronteiras varridas.
- [ ] Os journals golden de PB-03 e PB-04 permaneceram byte-idênticos.
- [ ] `biome check .` sai `0`.

## Condições de parada

**Pare** se: algum journal golden mudar; o consumo de `ai` de um cenário sem `hunter` divergir; a
perseguição exigir pathfinding para não travar em parede — travar é comportamento aceito nesta
versão, contornar é escopo de outro playbook; ou se a decisão de alvo tiver empate que não seja
resolvível deterministicamente.

## Persistência do handoff

Atualize `STATE.md` com status, branch, commit, testes, comandos e exit codes, modelo e effort usados,
e a próxima task elegível.

## Commit

`feat: make creatures aggro, chase and strike`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb-05-05-hunter-ai`; worktree irmã
`C:\Kaezan\kaezan-huntbound-pb05-05-hunter`; integração serial por `--ff-only`; verificação
pós-integração por `verify`; limpeza removendo o diretório antes de `prune` e `branch -d`.

## Relatório final

Mudanças, contagem de testes, prova do consumo preservado do stream `ai`, confirmação de que os
journals não mudaram com o comando que provou isso, integração, limpeza, desvios e próxima task
elegível.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol xhigh ou Grok 4.6 xhigh.
Nao use Luna nesta task: ela altera semantica do kernel.
Use obrigatoriamente superpowers:test-driven-development e
superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-05\tasks\PB-05-05-implementar-ia-hunter.md

Leia AGENTS.md, o STATE.md do playbook PB-05 e apenas os arquivos indicados pela task. Confirme que
PB-05-04 esta done e integrada e que main esta verde.

Crie a worktree irma C:\Kaezan\kaezan-huntbound-pb05-05-hunter com a branch
codex/pb-05-05-hunter-ai e rode "corepack pnpm install --prefer-offline" dentro dela.

Comece por RED. Implemente o comportamento hunter em S6: manutencao de alvo, aquisicao pelo alvo
valido mais proximo em distancia Chebyshev no mesmo andar com empate por menor EntityId, passo guloso
sem pathfinding, e golpe quando adjacente. Sem alvo, o ator cai em wander e consome exatamente um
nextBelow(8) do stream ai.

O teste que mais importa: um cenario SEM hunter precisa consumir o stream ai exatamente como antes,
com os mesmos valores e o mesmo drawCount. Os journals golden de PB-03 e PB-04 precisam permanecer
byte-identicos — se mudarem, o fallback wander foi alterado: PARE e reporte.

Prove a fidelidade de restauracao varrendo TODAS as fronteiras de um cenario com perseguicao, troca
de alvo e golpe por IA.

Nao implemente loot (PB-05-06), pathfinding, line of sight nem fuga em vida baixa. Travar em parede e
comportamento aceito nesta versao.

Rode biome check ., os testes de simulation, typecheck, simulation:check, hunt:check,
architecture:check e verify. Atualize o handoff, commite, integre por fast-forward na main,
reverifique e limpe worktree e branch removendo o diretorio antes do prune.

Se surgir decisao nao coberta, pare e registre o bloqueio. Nao inicie a proxima task.
```
