# Kaezan Huntbound — Índice e autoridade documental

Este diretório separa **direção vigente** de **evidência histórica**. Quando houver conflito, a
ordem abaixo vence.

## Fonte normativa

1. `05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md` — produto, fontes de verdade, uso pessoal e escopo do V0.
2. `03_ADR_PHASER4_BROWSER_FIRST.md` — stack e arquitetura web, conforme alterada pela ADR-002.
3. `07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md` — formato obrigatório de playbooks, task cards e handoffs
   portáveis entre agentes.
4. `08_POLITICA_MODELOS_AGENTES.md` — seleção normativa de modelos, effort e revisão independente.
5. `06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` — ordem e Definition of Ready dos futuros playbooks.
6. `BASE_CONTEXTO_KAEZAN_HUNTBOUND(1).md` — contexto mestre atualizado para agentes.
7. `01_GUIA_DE_EXECUCAO.md` — resumo rápido de controle.

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

**Próximo playbook elegível: PB-01 — Contratos e snapshot Canary.** Ainda não iniciado; a ordem e a
Definition of Ready estão em
[`06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`](06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md).

## Decisão vigente em uma linha

> **Phaser 4 + TypeScript + Vite, browser/PWA first, simulação compartilhada fora do renderer e
> V0 pessoal local-first baseado em Canary/Tibia, hunts escolhidas via TibiaRoute e gacha
> exclusivamente cosmético de outfits existentes.**
