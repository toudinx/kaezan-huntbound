# ADR-001 — Phaser 4 + TypeScript, browser-first

**Status:** aceito, alterado pela ADR-002  
**Data:** 2026-08-09  
**Substitui:** a decisão Godot+C#/desktop de `C06_godot_vs_angular_csharp.md` e `02_SINTESE_DIRECAO_UNICA.md` §16.3 anterior.

## Contexto

Huntbound é um RPG single-player 2D, top-down, tile/grid, com sessões curtas, helper, dungeons e
progressão de conta. A pesquisa anterior recomendou Godot+C# porque desktop era o alvo e web era um
non-goal. A direção de produto mudou: o primeiro canal deve permitir jogar por link, alcançar mais
pessoas e manter uma rota de baixo atrito para mobile e desktop.

O protótipo Godot continha somente configuração e uma cena vazia. Não existe custo afundado de
implementação que justifique preservar aquela escolha.

O requisito de integridade também mudou. Inventário, energia, moedas e recompensa não podem depender
de save local nem de estado calculado pelo cliente. Browser, desktop e mobile são igualmente não
confiáveis para esse fim; ofuscação e formato de executável não criam autoridade.

**Alteração ADR-002:** o primeiro V0 é pessoal, sem monetização ou competição. Nesse escopo,
integridade contra o proprietário do dispositivo não é requisito: IndexedDB versionado é suficiente.
O desenho autoritativo abaixo permanece como blueprint obrigatório caso exista produto público.

## Decisão

Adotar:

- **Phaser 4** para runtime 2D, tilemap, câmera, sprites, animação, áudio e FX;
- **TypeScript strict** para cliente e simulação compartilhada; backend futuro usa a mesma linguagem;
- **Vite** para desenvolvimento e build;
- **DOM/CSS** para HUD, menus, configurações e acessibilidade;
- **browser responsivo + PWA** como runtime inicial;
- **IndexedDB** via `SaveRepository` como persistência do V0 pessoal;
- **importadores offline** para normalizar o subconjunto Canary utilizado;
- **JSON validado** como runtime de mapas; Tiled é opcional para inspeção/correção;
- **AssetProvider** e pacotes lazy-loaded por hunt para a apresentação Tibia local;
- **PostgreSQL/API TypeScript** somente em futura fase de produto autoritativo.

A versão exata do Phaser deve ficar fixada no lockfile. Upgrades de engine são deliberados, passam
pelos testes de replay, performance e screenshots, e nunca entram por range flutuante.

## Sequência de plataformas

1. **Browser local/PWA:** único alvo do vertical slice e MVP pessoal.
2. **Mobile web:** validado desde a fundação em touch, safe areas, memória e GPU.
3. **Capacitor:** Android/iOS somente após o mobile web passar os gates e existir demanda de loja ou APIs nativas.
4. **Desktop:** PWA primeiro; wrapper/Steam somente quando distribuição por loja justificar build, QA e suporte adicionais.

Uma base de código não significa uma interface idêntica. Combate pode exigir landscape no mobile;
hub e telas de conta podem adaptar-se a portrait. Essa decisão será fechada no spike responsivo.

## Arquitetura

```text
apps/game (browser/PWA)
  ├─ PhaserCanvas ──────────────┐
  ├─ DOM UI                     │
  └─ SceneBridge                │
                                ▼
packages/simulation ── deterministic fixed-tick state machine
packages/contracts  ── commands, events, snapshots and API schemas
packages/content    ── validated game data and Tiled loaders
packages/test-fixtures ── seeds, command logs and golden hashes
packages/assets     ── manifests, packs and AssetProvider
packages/save       ── SaveRepository + IndexedDB

future product only:
apps/server (TypeScript/Node API) ── PostgreSQL + authoritative ledger
```

### Fronteiras obrigatórias

- `simulation` não importa Phaser, DOM, Node, banco ou relógio global.
- Phaser scenes são finas: boot/preload, shell, gameplay e debug.
- Sprites, tweens, emitters e câmeras são estado de apresentação descartável.
- `SceneBridge` é a única ponte entre simulação, Phaser e DOM.
- A simulação usa fixed tick, RNG próprio seedado, ordenação explícita e estado serializável.
- Conteúdo é acessado por chaves estáveis de manifesto, nunca por paths espalhados.
- O servidor nunca aceita quantidade de recompensa calculada pelo cliente.

## Autoridade e segurança

> **Escopo:** esta seção não é gate do V0 pessoal. Ela volta a ser normativa antes de publicação,
> monetização, ranking, mercado ou qualquer economia com valor externo.

### Fonte de verdade

O servidor é autoridade sobre:

- identidade e sessão;
- loadout válido no início da run;
- saldo e reserva de Vigor;
- `run_id`, seed, versão da simulação e versão do conteúdo;
- recompensa final;
- inventário e propriedade de cada instância de item;
- moedas e progressão de conta.

O cliente é autoridade apenas sobre apresentação, preferências locais e inputs ainda não aceitos.

### Protocolo de run

1. Cliente solicita início com dungeon, modo e loadout desejados.
2. Servidor valida conta, reserva o custo e emite `run_id`, seed, versões e expiração.
3. Cliente executa localmente e grava command log determinístico.
4. Cliente envia conclusão com `run_id`, idempotency key, hash final e command log.
5. Servidor re-simula ou valida o log com o mesmo pacote de simulação.
6. Em uma transação, servidor consome `run_id`, cria recompensas, atualiza inventário e grava ledger.
7. Repetição da mesma requisição devolve o resultado anterior; nunca paga de novo.

Esse modelo protege economia e duplicação sem pagar o custo de um servidor de gameplay conectado a
cada jogador durante toda a run. Se futuramente entrar mercado, PvP, ranking competitivo ou item de
valor financeiro, os modos afetados devem migrar para autoridade em tempo real.

### Invariantes contra duplicação

- Toda instância de item possui `item_instance_id` único criado no servidor.
- Toda mutação possui idempotency key única por conta e operação.
- Um `run_id` pode transicionar para `rewarded` uma única vez.
- Reserva, consumo e recompensa são atômicos.
- Constraints e controle de versão protegem contra corrida concorrente.
- Ledger econômico é append-only; snapshots são projeções para leitura.
- Redis, cache do browser e filas nunca são fonte de verdade econômica.
- Tempo de energia e expiração vem do servidor, nunca do relógio do cliente.

## Offline e reconexão

O V0 pessoal é totalmente local. `SaveRepository` usa IndexedDB transacional, schema versionado e
import/export de backup. Não há promessa de proteção contra edição intencional do próprio save.

Em futura fase de produto, iniciar e resgatar runs remuneradas exige o servidor descrito acima;
offline passa a ser treino/sandbox ou fila temporária de comandos conforme a política do produto.

## UI

- Canvas/WebGL cuida do mundo e movimento.
- DOM cuida de texto, HUD denso, menus, drawers, forms e acessibilidade.
- Centro e lower-middle do playfield permanecem livres durante combate normal.
- Teclado, pointer e touch usam o mesmo mapa de ações sem compartilhar bindings físicos.
- Reduced motion, focus, pause ao perder foco e safe areas entram desde o primeiro slice.

## Conteúdo e mapa

- Hunts são escolhidas no TibiaRoute e congeladas em `HuntDefinition`; o site não é consultado em
  runtime.
- Regras, IDs, loot e região do mapa vêm do snapshot local do Canary.
- A região OTBM é convertida offline para JSON validado; Tiled pode inspecionar ou corrigir a saída.
- Camadas mínimas: `ground`, `objectsBelow`, `objectsAbove`, `collision`, `spawns` e `transitions`.
- Entidades são tipos nomeados; `actionId` mágico não é API.
- OTBM nunca é formato de runtime.
- O perfil `personal` usa os assets de Tibia como apresentação integral do V0.
- O perfil `product` falha se resolver `licenseClass: "cipsoft-personal"`.
- Toda apresentação usa atlas versionado e manifesto estável para permitir substituição futura.

## Performance inicial

Os budgets abaixo são hipóteses de fundação e só mudam por evidência registrada:

- desktop recomendado: 60 fps, frame p95 ≤ 16,7 ms e p99 ≤ 25 ms;
- mobile mínimo: 30 fps, frame p95 ≤ 33,3 ms;
- primeiro estado acionável em até 5 s sob perfil Fast 4G após cache frio;
- nenhum long task recorrente ≥ 50 ms durante combate;
- spike de densidade obrigatório em 50, 150 e 300 atores com FX;
- screenshots obrigatórias nos viewports 390×844, 768×1024, 1366×768 e 1920×1080.

## Reuso do Arena Fable

Reusar:

- documentos, decisões descartadas e critérios de feeling;
- algoritmos que coincidirem com o novo contrato;
- seeds, números tunados, testes conceituais e corpus de replay;
- design system, coreografias, HUD, helper e feedback como linguagem de produto;
- schemas e dados após validação de licença e adequação.

Não portar por inércia:

- Angular components e rotas;
- `renderer.ts`;
- SignalR/snapshot/dedup contínuo;
- gacha de personagem/poder, waifus, admin genérico e migrations antigas;
- regras C# cujo modelo não coincide com Huntbound.

## Consequências

### Ganhos

- execução imediata por link em ambiente local/privado;
- cliente estático preparado para CDN se futuramente houver distribuição;
- simulação compartilhável entre browser, testes, balance e verificador;
- UI responsiva e acessível com ferramentas web maduras;
- mobile e desktop possíveis sem reescrever o jogo;
- fronteira pronta para autoridade econômica futura sem contaminar o renderer.

### Custos aceitos

- menor teto nativo que Godot em cenários extremos;
- QA real em múltiplos browsers, GPUs, aspect ratios e inputs;
- wrapper mobile/desktop adiciona trabalho específico quando adotado;
- Phaser 4 precisa ficar atrás de adapters para não contaminar as regras;
- uma futura progressão pública confiável exigirá serviço online e operação de backend;
- parte do núcleo C# vira especificação, não porte direto.
- o V0 pessoal não oferece integridade contra edição deliberada do save.

## Gatilhos para reabrir

Reavaliar a engine somente se ocorrer um destes fatos medidos:

1. o spike de densidade falha nos budgets após profiling e correções arquiteturais;
2. desktop/console torna-se o canal principal antes do vertical slice;
3. recursos nativos obrigatórios não são atendidos por browser/wrapper;
4. o custo de compatibilidade entre browsers supera o custo comprovado de uma build nativa;
5. o jogo deixa de ser 2D tile/sprite e passa a exigir 3D como mecânica central.

Preferência pessoal, novidade de engine ou um efeito visual isolado não reabrem a decisão.

## Referências externas

- Phaser: https://docs.phaser.io/phaser/getting-started/what-is-phaser
- Phaser project templates: https://docs.phaser.io/phaser/getting-started/project-templates
- Capacitor: https://capacitorjs.com/docs
- PostgreSQL transaction isolation: https://www.postgresql.org/docs/current/transaction-iso.html
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
