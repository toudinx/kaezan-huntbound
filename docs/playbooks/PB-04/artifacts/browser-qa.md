# PB-04 — Browser QA da hunt

**Data:** 2026-08-14
**Task:** PB-04-09
**Runner:** Playwright 1.62.1 / Chromium, Windows, `workers: 1`
**Build servida:** `corepack pnpm build` (profile `test`) e `vite preview` em `127.0.0.1:4173`
**Commit medido:** ver handoff de PB-04-09 em `docs/playbooks/PB-04/STATE.md`

> **Atualização PB-04-FIX-01 — 2026-08-15:** este artefato histórico foi rerodado contra o remix
> autorado e os contratos atuais. A sessão agora é a fixture versionada em
> `packages/test-fixtures/hunt/pb04/`, com `hunt:check` e a fixture suplementar de respawn em
> `pb04-respawn/`. A suíte Playwright atual passou `27/27`: quatro viewports com `visibleRows=11`,
> `zoom>1`, ground composto, hold curto com um comando por tick, BFS de descida/retorno e zero erros
> de console, página, rede ou HTTP. A topologia medida é `104` tiles caminháveis em `z=8` e `152` em
> `z=9`, ambos com um componente. A câmera agora centraliza o jogador; as referências históricas a
> deadzone, coordenadas antigas e W11 abaixo pertencem ao estado anterior ao FIX-01.
>
> Os quatro PNGs foram regenerados deliberadamente. O profile `test` continua usando a mídia
> sintética 1×1 prevista neste documento, portanto os pixels validam HUD e geometria, não a arte final.
> O aceite visual do profile pessoal permanece pendente por B2; não há placeholders nem aprovação do
> usuário registrada.

## 1. Desvio de escopo declarado

PB-04-06 **não** entregou a fixture `pb-04-hunt-session` nem o script `hunt:check`. O próprio handoff
de PB-04-06 registra isso ("Não entregue deliberadamente: fixture `pb-04-hunt-session` … `hunt:check`"),
mas a linha da tabela de PB-04-06 em `STATE.md` afirmava o contrário. Verificado nesta task:

- `packages/test-fixtures/simulation/` contém somente `pb03/`;
- `git log --all -- packages/test-fixtures/simulation/pb04` não devolve nenhum commit;
- `package.json` não define `hunt:check` (só `assets:pb04:hunt:check`).

Logo **não existe SHA-256 registrado por PB-04-06** para o Chromium comparar. Por decisão de
supervisor, a paridade foi provada em forma **diferencial**: a mesma cena e o mesmo command log são
executados em Node e em Chromium a cada corrida, e os quatro campos são comparados campo a campo.
Nenhum golden foi fabricado; o lado Node é recalculado toda vez. A cobertura de 600 ticks com
retomada em 313, e o gate `hunt:check`, continuam pertencendo a PB-04-06 — ver finding **W11**.

## 2. Paridade de replay Node ↔ Chromium

`tests/e2e/hunt-replay.spec.ts` monta a sessão em Node a partir de
`packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json`, injeta cena e log no browser
pelo probe test-only do PB-03-07 (`__huntboundKernelProbe`, **não alterado**) e compara.

| Campo | Valor |
|---|---|
| `scenarioId` | `scenario:hunt:tibia:venore-rotworm-cave` |
| seed | `1a2b3c4d5e6f7a8b` |
| `tickCount` | `600` |
| SHA-256 do snapshot canônico | `9b4fcd61bc957d31b7433d74ab4a9992f83c8cdd148cb85e03132857eda33a41` |
| eventos | `3122` |
| tick final | `600` |
| cena serializada | `14332` bytes |
| command log | `3980` bytes |

O SHA-256 acima é **o mesmo em Node e em Chromium**; é um valor medido, não um golden versionado, e
muda legitimamente se a região, o kernel ou a rota mudarem.

### Cobertura da sessão

`tests/e2e/support/huntSession.test.ts` impede que a rota degenere e a comparação vire vácuo:

| Métrica | Valor |
|---|---|
| passos declarados na rota | `30` |
| passos aceitos do jogador | `22` |
| maior deslocamento de um passo aceito | `1` tile |
| transições de andar do jogador | `1` (`z=8` → `z=9`) |
| recusas do jogador | `terrain` e `occupied` |
| atores nascidos | `12` (teto `maxLiveActors`) |

## 3. Jogabilidade por input sintético

`tests/e2e/hunt-play.spec.ts` (1366 × 768) dirige o jogo por **teclado real via CDP**. O kernel nunca
é chamado: as asserções leem o `HuntProbe` test-only, que devolve o que a `HuntScene` está de fato
desenhando, e o journal de eventos que a própria cena consome.

| Asserção | Evidência |
|---|---|
| jogador aparece em `playerStart` | posição `(24, 14, 8)`, andar desenhado `8`, sprite presente |
| a região está desenhada | `1133` sprites: `ground=880`, `objectsBelow=249`, `actors=4`, `objectsAbove=0` |
| um passo move exatamente um tile | todo `actor/moved` tem distância de Chebyshev `1`; o primeiro vai de `(24,14,8)` a `(24,15,8)` |
| parede não move e não lança | `actor/move-blocked` `reason=terrain` em `(25,14,8)`, zero `actor/moved`, zero `pageerror` |
| transição troca o andar desenhado | `actor/transitioned` `(23,14,8)` → `(23,14,9)`; ground desenhado passa de `880` para `929` e `objectsBelow` de `249` para `395` |
| rotworm visível no andar | ≥ 1 ator não-jogador visível no andar corrente |
| rotworm bloqueia o passo | `actor/move-blocked` `reason=occupied`; **nenhum** `actor/moved` do jogador no mesmo tick, e a célula recusada fica a exatamente 1 tile de onde o jogador estava naquele tick |

### Prova de mutação

Para provar que a suíte testa a cadeia input → comando → evento → pixel, e não o kernel:
`InputMap.onKeyDown` foi neutralizado (a tecla deixou de entrar em `heldKeys`), o bundle foi
reconstruído e a suíte foi executada. **Os 4 testes que dependem de movimento falharam**; só os 2
estáticos (jogador em `playerStart`, rotworm visível) sobreviveram. A mutação foi revertida.

### Nota sobre "um tile por tecla"

Uma tecla mantida repete: `InputMap.drain()` devolve um passo por frame, e o kernel aplica um a cada
`stepCooldownTicks = 2` (100 ms). O driver solta a tecla cerca de um frame depois que a hunt
responde, e na prática isso rende um passo — mas a soltura pode custar mais que o cooldown. O
invariante testado é portanto o correto: **todo passo aceito avança exatamente um tile**, e o primeiro
passo de uma tecla pousa na célula adjacente. Recusa por `cooldown` é tratada como "pergunte de novo",
não como resposta.

## 4. D-pad e clearance em 390 × 844

`tests/e2e/hunt-mobile.spec.ts`, viewport `390 × 844` com `hasTouch`.

- o `nav[data-testid="hunt-dpad"]` é montado com `aria-label="Movement controls"` e **8** botões, um
  por direção, cada um com `aria-label` próprio;
- o toque no d-pad (pointer real via CDP, mantido até a hunt responder) produz **o mesmo passo** que a
  tecla: ambos `{ dx: 0, dy: 1, dz: 0 }`;
- a câmera **não** rola enquanto o jogador anda dentro da deadzone e **rola** quando ele a deixa,
  provado por amostras `(playerX, scrollX)` ao longo de oito passos para oeste na linha 15.

### Clearance do playfield (ADR-001)

A ADR exige "centro e lower-middle do playfield permanecem livres" mas não dá geometria. Esta task lê
as regiões como as células central e centro-inferior da grade 3 × 3 do canvas, e mede toda a chrome
de `#ui-root` que **pinta** (fundo não transparente) ou **captura pointer**.

| Viewport | Centro | Terço centro-inferior |
|---|---|---|
| 390 × 844 | livre | **mordido** — ver W9 |
| 768 × 1024 | livre | livre |
| 1366 × 768 | livre | livre |
| 1920 × 1080 | livre | livre |

Medição exata em `390 × 844` (terço centro-inferior = `x ∈ [130, 260]`, `y ∈ [563, 844]`):

| Elemento | Caixa | Mordida |
|---|---|---|
| `nav.hunt-dpad` (canto inferior esquerdo) | `12, 707, 125 × 125` | `7.0 px` de largura |
| `aside` do painel de viewport (canto inferior direito) | `248, 803, 130 × 29` | `12.3 px` de largura × `28.8 px` |

Somadas, as duas ocupam ~`3,4 %` da área do terço, toda ela colada às bordas externas. A faixa que o
jogador de fato ocupa — o quinto central do playfield, já que a deadzone o mantém centrado — está
**livre em todos os quatro viewports**, e é isso que o teste exige estritamente. A mordida das bordas
fica orçada em `≤ 13 px` para que uma regressão falhe, e registrada como W9.

## 5. Orçamento de carregamento e de caminhada

`tests/e2e/hunt-budget.spec.ts`, cache frio (`Network.setCacheDisabled`) e perfil Fast 4G
(1,6 Mbit/s down, 750 Kbit/s up, 150 ms de latência), viewport `1366 × 768`, sem retry. O throttling é
retirado antes da caminhada: o orçamento de caminhada é sobre trabalho de frame, não sobre rede.

Oito execuções observadas:

| Métrica | Observado | Orçamento ADR-001 |
|---|---|---|
| primeiro estado acionável (`huntbound:shell-actionable`) | **4 090 – 4 602 ms** | ≤ 5 000 ms |
| mesma marca medida por `boot-budget.spec.ts` | 4 145 – 4 276 ms | ≤ 5 000 ms |
| caminhada contínua | 10,4 s, tick final ~`300`, terminando no andar `9` | — |
| long tasks ≥ 50 ms durante a caminhada | **exatamente 1 por corrida**, `51 – 63 ms` | nenhuma recorrente |
| posição dessa long task | sempre nos primeiros `15 – 36 ms` da caminhada | — |
| maior long task da corrida inteira (boot) | 98 – 394 ms | fora do escopo desta linha |

Leitura honesta dos dois números que encostam no limite:

- **O boot consome ~84 % do orçamento.** Passa, mas com folga pequena: PB-00 media `2 368 ms` para o
  shell vazio; a hunt acrescenta `pack.json` de 83 KB, catálogo e região. O gargalo medido é o bundle
  JavaScript (`~2 260 ms` de transferência sob Fast 4G, `1 570 KB` / `412 KB` gzip). Otimizar isso é
  decisão de supervisor e pertence a PB-10 — nada foi reduzido nem desligado aqui.
- **A long task de ~55 ms não é recorrente.** A API de long task só reporta tarefas ≥ 50 ms, e houve
  **uma** em cada corrida, sempre na fronteira ocioso → dirigido por input, nunca durante a caminhada
  estável. Os ~10,4 s restantes de caminhada contínua não produziram **nenhuma** tarefa ≥ 50 ms. A
  asserção rejeita duas ou mais, que é o que "recorrente" significa na ADR.

O spike de densidade de 50/150/300 atores **não** foi feito: pertence a PB-10.

## 6. Screenshots versionadas

`tests/e2e/hunt-screenshots.spec.ts` grava em `docs/playbooks/PB-04/artifacts/screenshots/`.

| Arquivo | Viewport |
|---|---:|
| `hunt-mobile-390x844.png` | 390 × 844 |
| `hunt-tablet-768x1024.png` | 768 × 1024 |
| `hunt-desktop-1366x768.png` | 1366 × 768 |
| `hunt-desktop-wide-1920x1080.png` | 1920 × 1080 |

Elas são **artefato de QA, não baseline do Playwright**: a hunt tem criaturas que vagam, então uma
comparação de pixels seria ruído. Em corrida normal o teste confirma que os quatro arquivos existem,
são PNG e têm exatamente as dimensões do viewport que declaram; regenerar é deliberado:

```bash
HUNTBOUND_HUNT_SCREENSHOTS=write corepack pnpm exec playwright test hunt-screenshots.spec.ts
```

No PowerShell:

```bash
$env:HUNTBOUND_HUNT_SCREENSHOTS='write'; corepack pnpm exec playwright test hunt-screenshots.spec.ts; Remove-Item Env:\HUNTBOUND_HUNT_SCREENSHOTS
```

**Nenhuma contém mídia `cipsoft-personal`.** O profile `test` serve um único PNG sintético de 1 × 1 e
68 bytes para todas as chaves do pack, e o teste falha se qualquer requisição tocar
`/assets/personal/` ou `/assets/product/`. Como consequência as imagens são quase pretas: elas
documentam **geometria de HUD e layout**, não arte. O que provam os pixels é a colocação da chrome; o
que prova o desenho da região são as contagens de sprite da seção 3.

## 7. Ausência de erro

Toda spec desta task coleta `console` de tipo `error`, `pageerror`, `requestfailed` e respostas HTTP
com status ≥ 400, e exige lista vazia. Nos quatro viewports obrigatórios, em `verify` completo:
**zero ocorrências de qualquer um dos quatro**.

## 8. Baselines legadas de `shell.spec.ts`

PB-04-08 deixou cinco baselines de screenshot desatualizadas — elas ainda mostravam o grid do
`ShellScene`, enquanto a shell agora abre a hunt — e explicitamente delegou a atualização a esta task.
As cinco foram regeneradas com `--update-snapshots` e confirmadas estáveis em três corridas
consecutivas. `shell.spec.ts` continua com todas as suas asserções funcionais intactas.

## 9. Comandos e exit codes

| Comando | Exit |
|---|---:|
| `corepack pnpm install --prefer-offline` (worktree) | `0` |
| `corepack pnpm exec playwright install chromium` | `0` |
| RED — `playwright test hunt-replay.spec.ts` (sessão inexistente) | `1` |
| GREEN — `playwright test hunt-replay.spec.ts` | `0` |
| RED — `vitest run tests/e2e/support/huntSession.test.ts` | `1` |
| GREEN — idem, `10/10` | `0` |
| RED — `vitest run src/hunt/HuntProbe.test.ts` (módulo ausente) | `1` |
| GREEN — idem, `10/10` | `0` |
| RED — `playwright test hunt-play.spec.ts` (probe não instalado), `6` falhas | `1` |
| GREEN — idem, `6/6`, estável em 4 corridas e em `10 × repeat-each` (`60/60`) | `0` |
| `corepack pnpm format:check` | `0` |
| `corepack pnpm typecheck` | `0` |
| `corepack pnpm architecture:check` | `0` |
| `corepack pnpm test` | `0` |
| `corepack pnpm verify` | `0` |
| `git diff --check` | `0` |

Contagens em `verify`: raiz `17` testes em `4` arquivos; replay `31`; tile-flags `79`; map-extractor
`104`; arquitetura `23` asserções; `@huntbound/contracts` `112`; `@huntbound/assets` `44`;
`@huntbound/content` `62`; `@huntbound/simulation` `155`; `@huntbound/game` `76`; Playwright `25`.

## 10. Findings

### W9 — chrome de canto morde o terço centro-inferior em 390 × 844 (não bloqueante)

Medido na seção 4. Fechar exige encolher **as duas** caixas de canto: o d-pad já usa células de 39 px,
abaixo dos 44 px usuais de alvo de toque, e o painel de viewport precisa caber texto. Isso é decisão
de layout que esta task não possui — o card exclui alterar cena e UI — então fica orçado e reportado.
Card novo sugerido: reduzir a chrome de canto em viewports estreitos, ou fixar na ADR uma geometria
para "lower-middle" que aceite margens de canto.

### W10 — `biome check .` está vermelho em `main` (não bloqueante, pré-existente)

`corepack pnpm check` falha em `main` desde antes desta task, com seis diagnósticos, **nenhum** deles
introduzido aqui:

- `assist/source/organizeImports` em `apps/game/src/assets/AssetRuntimeProbe.test.ts`,
  `apps/game/src/assets/createAssetRuntime.test.ts`, `apps/game/src/assets/createAssetRuntime.ts`,
  `apps/game/src/hunt/huntRuntime.ts` e `apps/game/src/main.ts`;
- `lint/style/useTemplate` em `tests/e2e/asset-pack.spec.ts:79`.

`verify` não os pega porque roda `format:check` (formatação) e não `biome check` (lint + assist). O
autofix foi aplicado por engano durante esta task e **revertido**, para não vazar do escopo declarado;
a lista acima foi confirmada idêntica em `main` e no branch. Card novo sugerido: aplicar
`biome check --write` nesses cinco arquivos e decidir se `biome check` entra em `verify`.

### W11 — `pb-04-hunt-session` e `hunt:check` continuam devendo (bloqueante para PB-04-06)

Detalhado na seção 1. A linha de PB-04-06 na tabela de `STATE.md` foi corrigida por esta task. O que
falta: fixture versionada (`scenario.json`, `commands.jsonl`, goldens e sidecars `.sha256`), cobertura
de 600 ticks com retomada em `313`, e o script `hunt:check` entrando em `check` e `verify` depois de
`simulation:check`.

### W12 — `tests/**` não é coberto por nenhum gate de tipos (não bloqueante)

`corepack pnpm typecheck` roda `pnpm --recursive run typecheck`, e nenhum `tsconfig` do workspace
inclui `tests/`. O Playwright transpila sem checar tipos, então um erro de tipo em spec passa
despercebido — e havia nove nesta entrega, encontrados só porque foram procurados à mão. Foram
corrigidos com um `tsc` avulso sobre `tests/**`, que agora sai `0`. Card novo sugerido: acrescentar um
`tsconfig` para `tests/` e ligá-lo a `typecheck`.

## 11. Nota de segurança de escopo

Nenhuma regra de kernel, cena, input, contrato, extração, pack ou fixture foi alterada. O que foi
tocado em `apps/game` está autorizado pelo passo 5 do card e se resume a observação test-only:
`apps/game/src/hunt/HuntProbe.ts` (novo, inerte fora de `MODE === 'test'`) e o método de leitura
`huntProbeState()` mais a instalação/descarte do probe em `HuntScene`. O probe não consegue enfileirar
comando nem avançar tick.
