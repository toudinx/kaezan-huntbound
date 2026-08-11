# PB-00 — Workspace e shell browser

> **Para agentes:** execute uma task card por chat. Não execute este playbook inteiro em uma única
> conversa. O formato e o handoff seguem `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

**Status:** done

**Objetivo:** transformar a raiz documental atual em um monorepo Git executável, com Phaser 4,
TypeScript strict, Vite, shell canvas + DOM, fronteiras arquiteturais verificáveis e QA browser.

**Arquitetura:** Phaser possui apenas apresentação e lifecycle do canvas. A UI textual vive no DOM.
Os packages de domínio existem desde o bootstrap, mas o PB-00 não implementa gameplay, conteúdo,
assets Canary, save ou kernel determinístico. Regras futuras ficam protegidas por uma política de
dependências que impede `packages/simulation` de importar browser, Phaser ou Node.

**Stack decidida:** Phaser 4 · TypeScript strict · Vite · DOM/CSS · pnpm workspace · Biome ·
Vitest · Playwright · Git local.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
4. `docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`;
5. este `README.md`;
6. a task card em execução;
7. `docs/playbooks/PB-00/STATE.md` apenas para estado operacional.

## Estado inicial observado

Na autoria deste playbook, a raiz contém `docs/`, `references/` e `.obsidian/`. Não existe
repositório Git raiz, `package.json`, lockfile, source tree ou toolchain JavaScript configurada.
`references/` contém repositórios locais de referência e não deve entrar no Git raiz.

## Decisões congeladas

- O runtime é Phaser 4 com TypeScript strict e Vite.
- O gerenciador do monorepo é pnpm; sua versão exata será fixada no `packageManager` e no lockfile.
- A versão Node será uma LTS suportada pelas versões fixadas de Vite, Phaser, Vitest e Playwright.
- Dependências usam versões exatas; upgrades são deliberados.
- Canvas é o playfield; DOM/CSS é HUD, menus e acessibilidade.
- `packages/simulation` não pode depender de Phaser, DOM, Node, banco ou relógio global.
- `SceneBridge` é a fronteira única entre runtime Phaser e projeção DOM.
- Os quatro viewports de aceite são 390×844, 768×1024, 1366×768 e 1920×1080.
- O PB-00 é local e não cria backend, PostgreSQL, conta, telemetria remota ou autoridade econômica.
- Nenhum asset proprietário, conteúdo Canary, hunt, combate, save ou gacha entra neste playbook.
- PWA instalável, service worker, touch gameplay completo e wrappers ficam fora do PB-00.

## Estrutura alvo ao fechar o playbook

```text
apps/
  game/
    src/
      bridge/
      phaser/
      runtime/
      ui/
packages/
  contracts/
  simulation/
  content/
  assets/
  save/
  test-fixtures/
tools/
  architecture/
tests/
  e2e/
docs/playbooks/PB-00/
  README.md
  STATE.md
  artifacts/
  tasks/
```

Os packages posteriores podem conter apenas um entrypoint tipado e documentação de responsabilidade
ao final do PB-00. Criar seus sistemas reais pertence aos playbooks correspondentes.

## Ordem das tasks

| ID | Problema coeso | Dependência | Effort sugerido | Gate principal | Status |
|---|---|---|---|---|---|
| [PB-00-01](tasks/PB-00-01-inicializar-repositorio-workspace.md) | Git, toolchain e monorepo íntegro | nenhuma | high | instalação congelada + checks raiz | done |
| [PB-00-02](tasks/PB-00-02-proteger-fronteiras-arquiteturais.md) | Fronteiras e política de dependências | PB-00-01 | high | violações arquiteturais falham automaticamente | done |
| [PB-00-03](tasks/PB-00-03-criar-shell-phaser-dom.md) | Shell Phaser + DOM + SceneBridge | PB-00-02 | high | canvas e DOM projetam o mesmo estado | done |
| [PB-00-04](tasks/PB-00-04-lifecycle-responsivo.md) | Resize, safe areas, focus e reduced motion | PB-00-03 | high | lifecycle e quatro viewports funcionais | done |
| [PB-00-05](tasks/PB-00-05-automatizar-qa-browser.md) | Playwright, screenshots e budget de boot | PB-00-04 | high | QA browser reproduzível | done |
| [PB-00-06](tasks/PB-00-06-fechar-gate-integrado.md) | Verificação integrada e fechamento | PB-00-05 | high | todos os gates PB-00 aprovados | done |
| [PB-00-FIX-01](tasks/PB-00-FIX-01-cobrir-testes-de-package-no-gate.md) | Testes de package no gate e verify reproduzível | PB-00-06 | medium | 33 testes unitários agregados e PATH via Corepack | done |

As tasks são sequenciais porque cada uma consome contratos ou scripts da anterior. Uma correção
independente descoberta no caminho vira task adicional `PB-00-FIX-<NN>-<slug>.md`; ela não é
absorvida silenciosamente pela task atual.

## Contratos produzidos para os próximos playbooks

O PB-00 entrega infraestrutura, não regras de jogo:

- workspace e versões reproduzíveis;
- packages com responsabilidades e imports permitidos;
- shell browser com `SceneBridge` tipado;
- lifecycle de foco/visibilidade e resize;
- superfície DOM responsiva que preserva o playfield;
- comandos canônicos de typecheck, testes, build e QA browser;
- screenshots baseline nos quatro viewports;
- relatório final de aceite.

PB-01 poderá preencher contratos e importadores Canary sem reconfigurar o repositório. PB-03 poderá
substituir o estado demonstrativo do shell pelo kernel real sem mover regra para Phaser.

## Critérios finais de aceite

- [x] Repositório Git raiz existe e `references/`, assets proprietários, caches e secrets não estão
  rastreados.
- [x] Node, pnpm e todas as dependências estão fixados; instalação congelada funciona.
- [x] `pnpm verify` conclui typecheck, testes, política arquitetural, build e QA browser.
- [x] Uma violação intencional em `packages/simulation` é rejeitada pelo gate arquitetural.
- [x] O shell entra em estado acionável em até 5 s no cenário Fast 4G definido pela task de QA.
- [x] Canvas Phaser e DOM overlay são visíveis e sincronizados pelo mesmo `SceneBridge`.
- [x] Focus/visibility pausa e retoma a apresentação sem duplicar listeners ou criar erros.
- [x] Não há overflow crítico nos quatro viewports obrigatórios.
- [x] Screenshots dos quatro viewports foram capturadas e revisadas visualmente.
- [x] Não existe gameplay, asset Canary, save, backend ou sistema de playbook posterior no diff.

O fechamento integrado está documentado em
`docs/playbooks/PB-00/artifacts/acceptance-report.md`. PB-01 é o próximo playbook elegível; ele não
foi iniciado por este fechamento.

## Como executar uma task

Abra um chat novo e envie:

```text
Trabalhe em C:\Kaezan\kaezan-huntbound.

Execute integralmente e somente a task:
docs/playbooks/PB-00/tasks/PB-00-01-inicializar-repositorio-workspace.md

Leia docs/playbooks/PB-00/STATE.md e somente os arquivos adicionais indicados pela task. Inspecione
o estado real antes de editar, execute todas as verificações, atualize o STATE.md e produza o commit
solicitado. Não antecipe a task seguinte.
```

Nas execuções seguintes, use o path exato da próxima task indicada em `STATE.md`.

No Codex, acrescente as skills indicadas na task card. No Claude Code, preserve o mesmo escopo e
critérios, usando seus mecanismos equivalentes de planejamento, edição e verificação.
