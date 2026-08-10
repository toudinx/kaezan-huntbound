# Kaezan Huntbound Foundation Implementation Plan

> **STATUS: SUPERADO — NÃO EXECUTAR COMO BACKLOG VIGENTE.** Este plano foi escrito antes da decisão
> de usar Canary/Tibia integralmente, operar o V0 como projeto pessoal/local-first e limitar o gacha
> a outfits. Ele permanece como registro de arquitetura e segurança para uma futura fase de produto.
> A ordem vigente está em `06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md`; a fonte de produto é
> `05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: use the Game Studio route named in each task. When a
> task transitions from design to implementation, create a separate implementation plan with
> `superpowers:writing-plans`; execute it with `superpowers:subagent-driven-development` or
> `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** produzir e validar toda a fundação necessária para iniciar o vertical slice browser-first
do Kaezan Huntbound sem misturar regras, renderer, UI e autoridade econômica.

**Architecture:** Phaser e DOM são apresentações descartáveis sobre uma simulação TypeScript pura,
determinística e compartilhada. O backend valida runs e é autoridade sobre progressão; PostgreSQL
garante integridade econômica. Browser/PWA é o único alvo inicial.

**Tech Stack:** Phaser 4 · TypeScript strict · Vite · DOM/CSS · Node.js · PostgreSQL · Tiled JSON ·
Vitest · Playwright · PWA · Capacitor pós-MVP.

## Global Constraints

- A fonte de direção é `02_SINTESE_DIRECAO_UNICA.md` + `03_ADR_PHASER4_BROWSER_FIRST.md`.
- Não implementar multiplayer, PvP, trade, chat, gacha, mundo aberto ou painel admin genérico.
- Simulação não importa Phaser, DOM, Node, banco ou relógio global.
- Phaser scenes não possuem regra de jogo nem progressão.
- UI text-heavy vive no DOM; canvas preserva o playfield.
- Toda recompensa confiável é calculada e persistida pelo servidor.
- Nenhuma progressão remunerada é totalmente offline.
- Mapas do MVP usam Tiled JSON; OTBM nunca é runtime.
- Assets de Tibia são placeholders e não podem sustentar distribuição pública.
- Todo gate exige evidência escrita; opinião sem medição não promove uma task.

---

## Como operar este playbook

### Contexto obrigatório em toda task

Anexar ou instruir o agente a ler, nesta ordem:

1. `docs/BASE_CONTEXTO_KAEZAN_HUNTBOUND(1).md`;
2. `docs/02_SINTESE_DIRECAO_UNICA.md`;
3. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
4. esta task do playbook;
5. somente os relatórios históricos citados na task.

### Ciclo de execução

1. Abrir uma task isolada.
2. Declarar a skill Game Studio indicada.
3. Ler os inputs, sem reabrir decisões fechadas.
4. Produzir o artefato exato.
5. Rodar a checklist/gate da task.
6. Registrar decisões novas em `docs/foundation/DECISION_LOG.md`.
7. Marcar a task como concluída somente após revisão humana.

### Etiquetas

- **[DECIDIDO]** — não reabrir sem evidência nova.
- **[HIPÓTESE]** — implementar com instrumentação e critério de revisão.
- **[PROTÓTIPO]** — o spike decide; não fechar em papel.
- **[PESQUISA]** — bloqueia implementação dependente.

---

## Gate G0 — Governança e fonte de verdade

### Task FND-00: Inicializar governança do projeto

**Game Studio route:** `game-studio:game-studio`  
**Depends on:** nenhuma  
**Produces:**

- `docs/foundation/README.md`
- `docs/foundation/DECISION_LOG.md`
- `docs/foundation/GLOSSARY.md`
- repositório Git na raiz, antes de código de produto

**Prompt operacional:**

> Consolide a governança documental do Huntbound. Não redesenhe o jogo. Crie um índice dos artefatos
> de foundation, um decision log com formato data/status/decisão/evidência/consequência e um glossário
> que preserve a distinção Postura (stance do jogador) versus Ruptura (barra do inimigo).

- [ ] Confirmar que `docs/README.md` aponta a hierarquia normativa correta.
- [ ] Definir status de artefato: `draft`, `accepted`, `superseded`.
- [ ] Registrar ADR-001 como primeira decisão aceita.
- [ ] Registrar termos: run, tick, action, command, event, snapshot, seed, helper, Vigor, item instance.
- [ ] Inicializar Git sem adicionar caches, secrets, exports ou assets proprietários.
- [ ] Revisar que nenhum relatório histórico aparece como fonte normativa.

**Gate:** qualquer agente novo identifica em menos de cinco minutos o que está decidido, o que está
aberto e qual arquivo vence um conflito.

---

## Gate G1 — Contrato de produto e plataforma

### Task FND-01: Congelar fantasia, verbos e loop do slice

**Game Studio route:** `game-studio:game-studio`  
**Depends on:** FND-00  
**Inputs:** síntese §§1–4, §9, §10 e §24; W11  
**Produces:** `docs/foundation/01_PRODUCT_CONTRACT.md`

**Prompt operacional:**

> Transforme as decisões existentes em um contrato testável do vertical slice: fantasia do jogador,
> verbos, loop atômico, estado de falha, duração de sessão e fronteira de agência entre jogador e
> helper. Não acrescente meta, classes ou conteúdo fora do slice.

- [ ] Escrever a promessa de experiência em uma frase.
- [ ] Listar verbos manuais, automáticos e proibidos no slice.
- [ ] Definir começo, meio, fim, falha e retry de uma run.
- [ ] Fixar os seis testes do slice já definidos na síntese §24.
- [ ] Definir sinais que falsificam a tese de agência.
- [ ] Remover qualquer sistema que não contribua para esses testes.

**Gate:** cada feature do slice aponta para um verbo ou pergunta de validação; nenhuma feature existe
apenas porque será útil no futuro.

### Task FND-02: Definir matriz de browsers, dispositivos e inputs

**Game Studio route:** `game-studio:web-game-foundations`  
**Depends on:** FND-01  
**Produces:** `docs/foundation/02_PLATFORM_SUPPORT_MATRIX.md`

**Decisões mínimas a registrar:**

- browsers suportados: duas versões estáveis mais recentes de Chrome/Edge/Firefox e Safari atual;
- viewports: 390×844, 768×1024, 1366×768 e 1920×1080;
- tiers: desktop recomendado, mobile recomendado e mobile mínimo;
- inputs: teclado, pointer e touch; gamepad não bloqueia o slice;
- perda de foco, background tab, fullscreen, áudio bloqueado e WebGL context loss.

- [ ] Escolher aparelhos reais ou perfis equivalentes para cada tier.
- [ ] Definir landscape/portrait em combate e fora dele.
- [ ] Definir política de browser não suportado e renderer indisponível.
- [ ] Definir o que é graceful degradation versus bloqueio.
- [ ] Copiar os budgets do ADR e associá-los a cada tier.

**Gate:** “browser-first” possui uma lista finita de ambientes testáveis e critérios explícitos de
suporte; “funciona no meu PC” não é evidência.

### Task FND-03: Classificar reuso do Arena Fable e acervo histórico

**Game Studio route:** `game-studio:game-studio` + `game-studio:web-game-foundations`  
**Depends on:** FND-01  
**Inputs:** C03, C05, C06 e código do Arena Fable  
**Produces:** `docs/foundation/03_REUSE_INVENTORY.md`

- [ ] Classificar cada ativo como `PORT`, `SPEC`, `DATA`, `REFERENCE` ou `DROP`.
- [ ] Tratar testes/replays C# como especificação executável, não porte automático.
- [ ] Identificar algoritmos que coincidem com o contrato novo.
- [ ] Isolar números tunados cuja origem e licença são conhecidas.
- [ ] Bloquear waifus, gacha, SignalR contínuo, admin genérico e migrations antigas.
- [ ] Registrar dependências legais de cada conjunto de dados/asset.

**Gate:** nenhuma task futura usa “reaproveitar o backend” ou “portar a engine” sem apontar para uma
linha classificada deste inventário.

---

## Gate G2 — Arquitetura offline do jogo

### Task ARC-01: Fechar monorepo, módulos e interfaces

**Game Studio route:** `game-studio:phaser-2d-game`  
**Depends on:** FND-01, FND-02, FND-03  
**Produces:** `docs/foundation/04_ARCHITECTURE_BOUNDARIES.md`

**Estrutura a validar:**

```text
apps/game/
apps/server/
packages/simulation/
packages/contracts/
packages/content/
packages/test-fixtures/
```

- [ ] Definir responsabilidade e imports permitidos para cada package.
- [ ] Definir `GameCommand`, `GameEvent`, `SimulationSnapshot` e `SceneBridge` como contratos, sem implementação.
- [ ] Definir BootScene, GameplayScene e DebugScene como scenes finas.
- [ ] Definir AppShell, HudLayer, ScreenStack, OverlayLayer e ToastLayer no DOM.
- [ ] Definir regras de dependência que lint/CI poderão impor.
- [ ] Registrar política de versão para simulação, conteúdo, API e cliente.

**Gate:** toda responsabilidade possui um único dono; renderer e UI podem ser substituídos sem mudar
regras ou save confiável.

### Task ARC-02: Especificar fixed tick, RNG, determinismo e replay

**Game Studio route:** `game-studio:web-game-foundations` + `game-studio:phaser-2d-game`  
**Depends on:** ARC-01  
**Inputs:** síntese §9, §10 e §16; disciplina de replay do Arena Fable  
**Produces:** `docs/foundation/05_SIMULATION_CONTRACT.md`

- [ ] Fixar frequência lógica do tick e separar render interpolation.
- [ ] Proibir `Math.random()`, `Date.now()` e iteração não ordenada dentro da simulação.
- [ ] Definir RNG seedado e estratégia de inteiros/fixed-point.
- [ ] Definir ordem canônica de systems e desempates por ID.
- [ ] Definir formato versionado de command log e golden hash.
- [ ] Definir snapshot serializável e bisecção do primeiro tick divergente.
- [ ] Definir invariantes do helper como função pura `(snapshot, config) -> intents`.

**Gate:** duas execuções com seed, conteúdo e comandos iguais são obrigadas por contrato a produzir o
mesmo hash, independentemente de FPS.

### Task ARC-03: Especificar input, câmera e feel Tibia-like

**Game Studio route:** `game-studio:web-game-foundations` + `game-studio:phaser-2d-game`  
**Depends on:** ARC-01, ARC-02  
**Inputs:** síntese §9; C02 consolidado em C05; OTClient mapping  
**Produces:** `docs/foundation/06_INPUT_CAMERA_FEEL.md`

- [ ] Criar mapa semântico de ações, separado de teclado/pointer/touch.
- [ ] Fixar passo quantizado, turn-before-walk, fila de um passo e repetição própria.
- [ ] Fixar câmera colada ao offset visual do jogador, sem smoothing/lookahead.
- [ ] Especificar click intent e prioridade de interação.
- [ ] Especificar perda de foco, modal, texto e pause como contexts explícitos.
- [ ] Manter diagonal e colisão do dash marcadas `[PROTÓTIPO]` com experimento definido.

**Gate:** um teste automatizado consegue alimentar actions sem browser; uma troca de binding não toca
a simulação.

### Task ARC-04: Especificar conteúdo, Tiled e manifesto de assets

**Game Studio route:** `game-studio:web-game-foundations` + `game-studio:phaser-2d-game`  
**Depends on:** ARC-01, ARC-02  
**Inputs:** síntese §§16–17; C04; C05; mapeamentos do Arena Fable  
**Produces:** `docs/foundation/07_CONTENT_MAP_MANIFEST.md`

- [ ] Definir schemas de criatura, item, spell, loot, vocação, boss, dungeon e modifier.
- [ ] Definir chaves estáveis de manifesto e política de depreciação.
- [ ] Definir layers Tiled `ground`, `objects` e object layers tipadas.
- [ ] Definir validação de custom properties, walkability, spawn e boss arena.
- [ ] Definir pipeline JSON: author → validate → build → preload.
- [ ] Definir versionamento de conteúdo usado por replay e run protocol.
- [ ] Proibir IDs mágicos, paths como API e OTBM em runtime.

**Gate:** uma dungeon inválida falha no build com erro acionável; a simulação recebe dados validados,
nunca objetos Phaser/Tiled crus.

### Task ARC-05: Definir HUD, UI responsiva e acessibilidade

**Game Studio route:** `game-studio:game-ui-frontend`  
**Depends on:** FND-01, FND-02, ARC-01, ARC-03  
**Inputs:** síntese §§18–21; C03; style guides do Arena Fable  
**Produces:** `docs/foundation/08_UI_RESPONSIVE_ACCESSIBILITY.md`

- [ ] Definir quais superfícies vivem no canvas e quais vivem no DOM.
- [ ] Desenhar HUD desktop, mobile landscape e estados fora de combate.
- [ ] Manter centro e lower-middle livres durante combate normal.
- [ ] Definir focus order, keyboard navigation, touch targets e safe areas.
- [ ] Definir reduced motion, contraste, text scaling e feedback de input.
- [ ] Definir loading, vazio, erro, bloqueado, offline e versão incompatível.
- [ ] Formalizar `accent`/`deep`, regra íris/aurum e fallback sem blur.

**Gate:** todos os viewports de FND-02 têm wireframe aprovado e não há informação crítica exclusiva
de cor, hover ou áudio.

### Task ARC-06: Fechar direitos e pipeline inicial de sprites

**Game Studio route:** `game-studio:sprite-pipeline`  
**Depends on:** ARC-04, ARC-05  
**Inputs:** síntese §16.5, §17 e §23 #1; acervo de arte  
**Produces:**

- `docs/foundation/09_ASSET_RIGHTS_REGISTER.md`
- `docs/foundation/10_SPRITE_PIPELINE.md`

- [ ] Registrar origem, licença, uso permitido e plano de substituição de cada grupo de assets.
- [ ] Bloquear assets sem autorização em builds públicas.
- [ ] Definir seed frame aprovado, frame size, anchor bottom-center e nomenclatura.
- [ ] Definir strip completo por animação, normalização e preview sheet.
- [ ] Definir atlas, scale mode, filtering e orçamento por primeiro carregamento.
- [ ] Definir gate de inspeção em escala real no browser.

**Gate:** todo asset do slice é distribuível ou explicitamente restrito a build local; cada animação
tem anchor/escala estáveis e preview aprovado.

---

## Gate G3 — Autoridade, segurança e persistência

### Task SEC-01: Modelar ameaças e fronteiras de confiança

**Game Studio route:** `game-studio:web-game-foundations`  
**Depends on:** ARC-01, ARC-02  
**Produces:** `docs/foundation/11_THREAT_MODEL.md`

**Ameaças obrigatórias:** save edit, packet tamper, request replay, concorrência, rollback,
duplicação, clock manipulation, versão antiga, bot, account takeover e abuso de endpoint.

- [ ] Classificar impacto considerando que não há PvP, trade ou monetização no MVP.
- [ ] Marcar cliente, cache, CDN e fila como não confiáveis para economia.
- [ ] Definir assets protegidos: conta, Vigor, run, item, moeda, progresso e logs de auditoria.
- [ ] Definir controles preventivos, detectivos e de recuperação por ameaça.
- [ ] Explicitar o que não será combatido: automação compatível com o helper e modificação visual local.
- [ ] Definir gatilhos que exigiriam autoridade em tempo real.

**Gate:** cada mutação econômica aponta para ameaça, controle e teste correspondente; não há
“anti-cheat por ofuscação”.

### Task SEC-02: Especificar protocolo autoritativo de run

**Game Studio route:** `game-studio:web-game-foundations`  
**Depends on:** ARC-02, ARC-04, SEC-01  
**Produces:** `docs/foundation/12_RUN_PROTOCOL.md`

- [ ] Definir estados `created`, `active`, `submitted`, `validated`, `rewarded`, `expired`, `rejected`.
- [ ] Definir payload de start: dungeon, modo, loadout e client versions.
- [ ] Definir grant: `run_id`, seed, versions, expiry e reserva de Vigor.
- [ ] Definir submission: idempotency key, command log, hash e métricas.
- [ ] Definir validação, retry, reconexão e retomada após queda.
- [ ] Definir códigos de rejeição legíveis e auditáveis.
- [ ] Definir política de log máximo e proteção contra payload abusivo.

**Gate:** nenhum caminho de sucesso aceita XP, moeda, item ou quantidade calculada pelo cliente.

### Task SEC-03: Especificar inventário, ledger e idempotência

**Game Studio route:** `game-studio:web-game-foundations`  
**Depends on:** SEC-01, SEC-02  
**Produces:** `docs/foundation/13_ECONOMY_INTEGRITY.md`

- [ ] Definir identidade única de item e ownership atual.
- [ ] Definir ledger append-only e projeções de saldo/inventário.
- [ ] Definir idempotency key por conta/operação e armazenamento do resultado anterior.
- [ ] Definir transação atômica de reserva, consumo, reward e ledger.
- [ ] Definir unique/check/foreign-key constraints e version columns.
- [ ] Definir retry de serialization conflict sem pagamento duplicado.
- [ ] Definir auditoria e ferramenta de reconciliação, sem painel admin genérico.

**Gate:** testes concorrentes com a mesma run, keys diferentes e requests fora de ordem preservam
saldo e criam no máximo uma recompensa.

### Task SEC-04: Fechar conta, sessão, offline e compatibilidade de versão

**Game Studio route:** `game-studio:web-game-foundations`  
**Depends on:** FND-02, SEC-02, SEC-03  
**Produces:** `docs/foundation/14_ACCOUNT_OFFLINE_VERSIONING.md`

- [ ] Escolher guest+upgrade ou login obrigatório para o slice.
- [ ] Definir expiração/rotação de sessão e proteção CSRF/XSS apropriada ao modelo.
- [ ] Definir cache local permitido: preferências, assets, log pendente e UI state.
- [ ] Proibir inventário/moeda local como autoridade.
- [ ] Definir handshake de client/simulation/content/API versions.
- [ ] Definir deploy incompatível, refresh forçado e run antiga ainda submetível.
- [ ] Definir modo treino offline sem recompensa confiável.

**Gate:** queda de rede, duas tabs, refresh e deploy durante run têm comportamento determinístico e
não duplicam nem apagam recompensa válida.

---

## Gate G4 — Performance e testabilidade

### Task QA-01: Fixar budgets e instrumentação

**Game Studio route:** `game-studio:web-game-foundations` + `game-studio:game-playtest`  
**Depends on:** FND-02, ARC-01, ARC-05  
**Produces:** `docs/foundation/15_PERFORMANCE_OBSERVABILITY.md`

- [ ] Copiar budgets do ADR e associar a cenários 50/150/300 atores.
- [ ] Definir métricas: frame p50/p95/p99, long tasks, heap, draw calls, boot e asset bytes.
- [ ] Definir overlay F3 com tick, render, entidades, FX, pathfinding e command backlog.
- [ ] Definir marks/measures do browser e formato de relatório exportável.
- [ ] Definir reduced FX e quality tiers sem alterar regras.
- [ ] Definir build de profiling representativa, sem dev-only false positives ignorados.

**Gate:** toda afirmação de performance futura pode ser respondida com métrica, cenário e hardware.

### Task QA-02: Definir estratégia de testes e playtest

**Game Studio route:** `game-studio:game-playtest`  
**Depends on:** ARC-02, ARC-03, ARC-04, ARC-05, QA-01  
**Produces:** `docs/foundation/16_TEST_PLAYTEST_STRATEGY.md`

- [ ] Definir unit/property tests da simulação em Vitest.
- [ ] Definir golden replays cross-runtime.
- [ ] Definir contract tests de schemas e API.
- [ ] Definir integration tests com PostgreSQL temporário.
- [ ] Definir Playwright para boot, input, focus, resize, pause e transições.
- [ ] Tornar screenshots obrigatórias para HUD/canvas nos quatro viewports.
- [ ] Definir relatório por severidade com reprodução e owner: simulation, renderer, UI, asset ou server.

**Gate:** cada contrato dos gates G1–G3 possui ao menos um teste planejado e owner definido.

---

## Gate G5 — Spikes falsificáveis

Cada spike recebe um plano de implementação próprio antes de código. Os relatórios usam o formato:
hipótese · cenário · hardware/software · método · dados brutos · resultado · decisão · próximos passos.

### Task SPK-01: Shell Phaser + SceneBridge

**Game Studio route:** `game-studio:phaser-2d-game` + `game-studio:game-ui-frontend`  
**Depends on:** Gates G1–G4 aceitos  
**Produces:** `docs/spikes/SPK01_SHELL_BRIDGE_REPORT.md`

- [ ] Planejar scaffold mínimo Vite/TypeScript/Phaser sem gameplay.
- [ ] Provar BootScene, GameplayScene, DOM HUD e SceneBridge.
- [ ] Provar resize nos quatro viewports e troca de input context sob modal.
- [ ] Provar que `packages/simulation` não importa Phaser/DOM.
- [ ] Capturar screenshots e mapa final de imports.

**Gate:** scene e UI projetam o mesmo snapshot sem manter uma segunda fonte de verdade.

### Task SPK-02: Determinismo browser ↔ Node

**Game Studio route:** `game-studio:phaser-2d-game`  
**Depends on:** SPK-01, ARC-02  
**Produces:** `docs/spikes/SPK02_DETERMINISM_REPORT.md`

- [ ] Implementar a menor simulação de grid capaz de mover, atacar e emitir evento.
- [ ] Gerar corpus de seeds/logs com golden hashes.
- [ ] Executar 10.000 replays no browser headless e Node.
- [ ] Forçar uma divergência e demonstrar bisecção do primeiro tick.
- [ ] Registrar custo por replay e limites de payload.

**Gate:** zero divergências não explicadas em 10.000 replays e diagnóstico reproduzível da divergência injetada.

### Task SPK-03: Densidade, FX e tilemap

**Game Studio route:** `game-studio:phaser-2d-game` + `game-studio:game-playtest`  
**Depends on:** SPK-01, QA-01  
**Produces:** `docs/spikes/SPK03_DENSITY_PERFORMANCE_REPORT.md`

- [ ] Montar o mesmo tilemap/câmera em cenários 50, 150 e 300 atores.
- [ ] Adicionar movimento, targeting visual, floating numbers e FX representativos.
- [ ] Medir todos os tiers de FND-02 com build de produção.
- [ ] Capturar frame traces e screenshots.
- [ ] Separar custo de simulação, render, DOM e assets.
- [ ] Aplicar otimizações somente após perfil apontar o owner.

**Gate:** budgets do ADR passam ou a decisão de stack é formalmente reaberta com dados.

### Task SPK-04: HUD responsivo e proteção do playfield

**Game Studio route:** `game-studio:game-ui-frontend` + `game-studio:game-playtest`  
**Depends on:** SPK-01, ARC-05  
**Produces:** `docs/spikes/SPK04_RESPONSIVE_HUD_REPORT.md`

- [ ] Implementar wireframes aprovados com DOM real sobre canvas em movimento.
- [ ] Exercitar teclado, pointer, touch, focus, reduced motion e text scaling.
- [ ] Verificar safe areas e orientation change.
- [ ] Comparar vidro versus fallback *crystal edge* por legibilidade e custo.
- [ ] Capturar estados normal, boss, modal, loading, erro e offline.

**Gate:** informação crítica permanece legível, centro/lower-middle livres e nenhuma interação de UI
vaza input para o jogo.

### Task SPK-05: Autoridade e duplicação concorrente

**Game Studio route:** `game-studio:web-game-foundations`  
**Depends on:** SPK-02, SEC-02, SEC-03, SEC-04  
**Produces:** `docs/spikes/SPK05_AUTHORITY_DUPLICATION_REPORT.md`

- [ ] Implementar start/submit/reward mínimo com PostgreSQL temporário.
- [ ] Disparar a mesma conclusão simultaneamente por múltiplas conexões.
- [ ] Repetir com idempotency keys iguais e diferentes.
- [ ] Alterar hash, seed, versão, duração e payload do log.
- [ ] Simular timeout após commit e retry do cliente.
- [ ] Reconciliar ledger, saldo e instâncias de item após cada cenário.

**Gate:** nenhuma execução paga duas vezes; requests inválidos não alteram economia; retry após commit
devolve o resultado já persistido.

---

## Gate G6 — Autorização do vertical slice

### Task VS-01: Especificar o vertical slice executável

**Game Studio route:** `game-studio:game-studio` → `game-studio:phaser-2d-game` →
`game-studio:game-ui-frontend` → `game-studio:game-playtest`  
**Depends on:** SPK-01 a SPK-05 aprovados  
**Produces:** `docs/superpowers/specs/2026-08-09-huntbound-vertical-slice-design.md`

- [ ] Consolidar os contratos aceitos sem reabrir G1–G4.
- [ ] Incluir somente Knight, uma dungeon, dois inimigos, uma elite e O Metrônomo.
- [ ] Definir helper camadas 0/1, preset Assistido, auto-loot e caixa-preta de morte.
- [ ] Definir interfaces, fluxo de dados, falhas, recovery, testes e instrumentação.
- [ ] Mapear cada requisito a uma das seis perguntas do slice.
- [ ] Rodar self-review de placeholders, contradições, ambiguidade e escopo.
- [ ] Obter aprovação humana da spec escrita.

**Gate:** spec aprovada, nenhum `[PESQUISA]` bloqueante e toda hipótese possui métrica/experimento.

### Task VS-02: Criar plano TDD do vertical slice

**Required skill:** `superpowers:writing-plans`  
**Depends on:** VS-01 aprovado  
**Produces:** `docs/superpowers/plans/2026-08-09-huntbound-vertical-slice.md`

- [ ] Mapear arquivos reais depois do scaffold aprovado.
- [ ] Dividir por entregáveis independentes com interfaces explícitas.
- [ ] Escrever failing test → verify fail → minimal implementation → verify pass → commit.
- [ ] Incluir testes de simulação, browser, screenshots, performance e autoridade.
- [ ] Revisar cobertura da spec, placeholders e consistência de tipos.
- [ ] Escolher execução subagent-driven ou inline somente após aprovação do plano.

**Gate final:** o primeiro código de gameplay só começa depois deste plano ser revisado e aprovado.

---

## Ordem resumida

```text
FND-00
  ├─ FND-01 ─┬─ FND-02 ─────────────┐
  │          └─ FND-03              │
  └──────────── ARC-01 ─ ARC-02 ────┤
                 ├─ ARC-03          │
                 ├─ ARC-04 ─ ARC-06 │
                 └─ ARC-05          │
SEC-01 ─ SEC-02 ─ SEC-03 ─ SEC-04   │
QA-01 ─ QA-02 ──────────────────────┤
                                    ▼
SPK-01 → SPK-02 / SPK-03 / SPK-04 → SPK-05
                                    ▼
                                  VS-01 → VS-02
```

Tasks paralelas só podem rodar quando o diagrama não mostra dependência e seus outputs não alteram
o mesmo contrato. Nenhuma task pula gate porque “já sabemos aproximadamente”.
