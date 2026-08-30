# Kaezan Huntbound — Índice e autoridade documental

Este diretório separa **direção vigente** de **evidência histórica**. Quando houver conflito, a
ordem abaixo vence.

## Entrada dos agentes

`AGENTS.md` na raiz é a instrução compartilhada por Cursor, Codex e Claude Code (`CLAUDE.md` só
reexporta). Piloto: entregue jogável; aceite é o usuário jogando; `verify` só no fechamento do
playbook. Regras por diretório em `.cursor/rules/*.mdc`; procedimentos em `.cursor/skills/`. Em
conflito, os documentos normativos abaixo vencem.

## Fonte normativa

1. `05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` — produto, fontes de verdade, uso pessoal e escopo do V0.
2. `03_ADR_PHASER4_BROWSER_FIRST.md` — stack e arquitetura web, conforme alterada pela ADR-002.
3. `07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md` — formato obrigatório de playbooks, task cards e handoffs
   portáveis entre agentes.
4. `08_POLITICA_MODELOS_AGENTES.md` — seleção normativa de modelos, effort e revisão independente.
5. `06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` — ordem e Definition of Ready dos futuros playbooks.
6. `BASE_CONTEXTO_KAEZAN_HUNTBOUND(1).md` — contexto mestre atualizado para agentes.
7. `01_GUIA_DE_EXECUCAO.md` — resumo rápido de controle.

**Emenda pendente:** `09_EMENDA_ADR05_SINCRONIZACAO_DE_FAIXA.md` propõe listar a sincronização de
faixa entre as extensões Huntbound da ADR-05. **Não é direção vigente** enquanto o status dela for
"proposta"; é pré-requisito declarado do PB-12.

## Evidência histórica

- `C03_auditoria_arena_fable.md` — auditoria do Arena Fable sob a hipótese Godot.
- `C04_mapeamento_rme.md` — evidência sobre RME/OTBM; recomendações Godot foram substituídas.
- `C05_consolidacao_mapeamentos_historicos.md` — consolidação Canary/OTClient/RME.
- `C06_godot_vs_angular_csharp.md` — comparação que recomendou Godot sob a premissa desktop-first.
- `00_DOSSIE_PESQUISA_E_PROMPTS(2).md` — pacote histórico de pesquisa; prompts Godot não são atuais.
- `02_SINTESE_DIRECAO_UNICA.md` — síntese anterior à decisão Canary/Tibia integral; útil como banco
  de hipóteses, mas superada pela ADR-002 no V0.
- `04_PLAYBOOK_FUNDAMENTACAO_GAME_STUDIO.md` — plano de fundamentação anterior, substituído pelo
  roteiro `06`; não executar como backlog vigente.
- `research/**` — relatórios de referência de design e sistemas.

Relatórios históricos não devem ser reescritos para parecer que estudaram Phaser. Seus fatos e
medições continuam úteis; suas recomendações de stack cedem ao ADR atual.

## Playbooks ativos

- [`PB-00R — Correções do gate de fundação`](playbooks/PB-00R/README.md) — **fechado** em 2026-08-11
  como `APPROVED_WITH_WARNINGS`; corrigiu resize, budget de boot, descoberta de testes e limpeza do
  output, e **não bloqueia mais PB-01**. Warnings priorizados em
  [`acceptance-report.md`](playbooks/PB-00R/artifacts/acceptance-report.md).
- [`PB-00 — Workspace e shell browser`](playbooks/PB-00/README.md) — histórico da fundação original;
  seu fechamento foi revalidado por PB-00R.
- [`PB-01 — Catálogo curado de conteúdo`](playbooks/PB-01/README.md) — **fechado** em 2026-08-13
  como `APPROVED_WITH_WARNINGS`; entrega chaves estáveis e bundle runtime determinístico.
- [`PB-02 — Manifesto e asset pack pessoal`](playbooks/PB-02/README.md) — **fechado** em 2026-08-13
  como `APPROVED_WITH_WARNINGS`; entrega subset visual carregável por chaves estáveis, packs
  determinísticos e perfil `product` que recusa assets `cipsoft-personal`. Warnings priorizados em
  [`acceptance-report.md`](playbooks/PB-02/artifacts/acceptance-report.md).

- [`PB-03 — Kernel determinístico`](playbooks/PB-03/README.md) — **fechado** em 2026-08-14 como
  `APPROVED_WITH_WARNINGS`, commit auditado `f885535`; entrega kernel headless de tick fixo com RNG
  seedado, grid inteiro, comandos validados, eventos ordenados e replay golden reproduzido byte a
  byte em Node e no Chromium. Warnings priorizados em
  [`acceptance-report.md`](playbooks/PB-03/artifacts/acceptance-report.md).

- [`PB-04 — Primeira hunt ponta a ponta`](playbooks/PB-04/README.md) — **fechado** em `9f1c14c`.
  Design em
  [`2026-08-14-pb-04-first-hunt-design.md`](superpowers/specs/2026-08-14-pb-04-first-hunt-design.md).
- [`PB-05 — Vocação e combate Canary`](playbooks/PB-05/README.md) — **implementado e integrado** em
  `d4490e9`; aguardando o aceite do usuário jogando. Design em
  [`2026-08-15-pb-05-vocation-combat-design.md`](superpowers/specs/2026-08-15-pb-05-vocation-combat-design.md).
- [`PB-06 — Save local e inventário`](playbooks/PB-06/README.md) — **elegível**; PB-06-01 pode
  começar. Design em
  [`2026-08-18-pb-06-local-save-inventory-design.md`](superpowers/specs/2026-08-18-pb-06-local-save-inventory-design.md).
- [`PB-07 — Profundidade de combate e vocações`](playbooks/PB-07/README.md) — implementação parcial;
  congelado depois da task 05 até a retomada do combate.
- [`PB-08 — O Knight completo`](playbooks/PB-08/README.md) — **reescrito em 2026-08-24**; a
  próxima task é PB-08-02, primeira e sozinha.
- [`PB-09 — Progressão`](playbooks/PB-09/README.md) — esqueleto; **começa por design doc**.
- [`PB-10 — Novas criaturas`](playbooks/PB-10/README.md) — esqueleto.
- [`PB-11 — O loot vira poder`](playbooks/PB-11/README.md) — esqueleto.
- [`PB-12 — Hunts moduladas e level sync`](playbooks/PB-12/README.md) — esqueleto; **exige
  emenda à ADR-05**.

Os playbooks de produto seguem a ordem e a Definition of Ready de
[`06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`](06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md).

## Projetos auxiliares

- [`Map Editor local`](projects/map-editor/PLAN.md) — projeto independente dos playbooks do jogo. A
  materialização inicial a partir do Canary é feita por agente de IA; os retoques acontecem numa
  aplicação local que não entra no bundle publicado.
- [`Borderizer`](projects/map-editor/BORDERIZER.md) — trilha MB, que precede o editor. Fecha por
  algoritmo os buracos que a colagem de retângulos do Canary deixa, usando uma tabela de bordas
  medida no mapa original em vez de escrita à mão.

## Decisão vigente em uma linha

> **Phaser 4 + TypeScript + Vite, browser/PWA first, simulação compartilhada fora do renderer e
> V0 pessoal local-first baseado em Canary/Tibia, hunts escolhidas via TibiaRoute e gacha
> exclusivamente cosmético de outfits existentes.**
