# PB-04-FIX-01 — Corrigir a experiência da hunt

**Status:** implementação automatizada concluída; aceite visual pessoal pendente.

**Objetivo:** corrigir o primeiro percurso de hunt sem alterar o kernel determinístico: remix offline
conectado, transições de ida e volta, composição de ground, enquadramento de 10–12 linhas, movimento
visual por duração do tick, input segurado com cadência e fixtures de replay versionadas.

## Entrega

- `venore-rotworm-cave.json` agora aponta para o recipe autorado
  `packages/content/src/layouts/hunts/venore-rotworm-cave.json`, que materializa uma região `24 × 24`
  em dois pisos (`z=8` e `z=9`), um componente caminhável por piso e um par de transições opostas.
- O extrator valida recipe estrito, operações determinísticas, alcance do jogador, spawns e transições;
  o relatório real mede `104` tiles caminháveis em `z=8` e `152` em `z=9`, ambos com um componente.
- `HuntPresentation` compõe ground do piso ativo e, em aberturas, do piso inferior; `HuntScene` usa
  zoom fixo por `11` linhas, backdrop de caverna, movimento interpolado pelo tick e gate de input.
- `packages/test-fixtures/hunt/pb04/` congela a sessão de `600` ticks; `pb04-respawn/` prova o
  respawn real de `1800` ticks. `hunt:check` verifica ambos e entrou nos gates raiz.
- A QA Chromium cobre `27/27` testes, quatro viewports, rota BFS de descida/retorno, hold curto com
  um comando por tick e ausência de erros de console, página, rede e HTTP.

## Evidências determinísticas

| Artefato | SHA-256 |
|---|---|
| recipe | `180aab488ab80426ce5b9c7c5e5472db450a83f44e864abbb16cc1ef3f18702e` |
| região | `a56697fd75a978ac2ccf270df44bf299de289076827be18ff5b2af0a8d6cf0c5` |
| sessão `pb04` | `986b23df…` cenário / `89879376…` snapshot / `74bd1a51…` eventos |
| respawn `pb04-respawn` | `0cf24215…` snapshot / `5803374b…` eventos |

Os hashes abreviados acima têm os valores completos nos `hashes.md` de cada fixture.

## Bloqueio de aceite visual

O profile `test` usa uma mídia sintética 1×1 compartilhada para todas as chaves; seus screenshots
validam layout e geometria, não identidade visual. O profile pessoal não foi gerado nem alterado:
`HUNTBOUND_PERSONAL_ASSET_SOURCE` não está configurado no workspace, e o lock pessoal documenta que
67 dos 137 IDs reais ainda precisam ser reexportados no projeto externo
`C:\Kaezan\kaezan-arena-fable`. Não foram criados placeholders e não há `product-acceptance.md`:
o usuário precisa testar o profile pessoal depois que essa mídia existir e decidir aprovação ou rejeição.

Até esse checkpoint, PB-04-10 não é elegível para fechamento do playbook.

## Gates executados

`hunt:check`, `simulation:check`, `assets:check`, `architecture:check`, `typecheck`, `test`, `build`
e `playwright test` passam. `format:check` e `git diff --check` devem ser executados novamente após
qualquer alteração documental ou de integração.
