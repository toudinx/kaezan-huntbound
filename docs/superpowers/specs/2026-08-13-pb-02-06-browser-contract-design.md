# PB-02-06 — Design do contrato de assets no browser

## Objetivo

Conectar o provider público de `@huntbound/assets` à composition root do game e
provar no Chromium o ciclo do perfil `test`: preload de cinco stable keys,
unload para zero assets e reload das mesmas cinco keys. O boot deve continuar
aguardando os assets antes de declarar prontidão e antes de iniciar Phaser.

## Escopo e restrições

- O único bootstrap é `/assets/<profile>/catalog.json`.
- O profile vem exclusivamente de `import.meta.env.MODE` e aceita `test`,
  `personal` e `product`.
- Scene, simulation e UI não conhecerão paths de pack/media, atlas ou IDs
  numéricos legados.
- O probe global existe apenas em `test` e expõe snapshots serializáveis,
  `unload()` e `reload()`.
- Falha no preload bloqueia o boot, deixa uma mensagem acionável no shell e
  não cria um jogo Phaser.
- O escopo de código fica restrito aos arquivos listados na task PB-02-06;
  provider, packer, schema e guard não serão alterados.

## Abordagens consideradas

1. **Runtime pequeno na composition root (escolhida).** Um módulo de profile,
   um runtime renderer-agnostic e um probe test-only mantêm a fronteira entre
   provider e Phaser explícita. É a menor alteração compatível com o contrato
   congelado e permite testes unitários focais.
2. **Preload dentro de uma Scene Phaser.** Rejeitada porque faria a prontidão
   dos assets depender do renderer e permitiria que a criação do jogo ocorresse
   antes do preload concluído.
3. **Novo bootstrap genérico separado da `main.ts`.** Rejeitada nesta task por
   adicionar uma abstração e um arquivo fora do escopo permitido sem necessidade
   para testar a ordem; `main.ts` terá uma função de inicialização pequena e
   testável, mantendo o entrypoint como composition root.

## Componentes e contratos

### Profile

`AssetProfile.ts` exportará `AppAssetProfile`, `parseAppAssetProfile(mode)` e
`getAssetCatalogUrl(profile)`. O parser usa uma allowlist exata e rejeita mode
desconhecido; a URL é sempre uma rota relativa POSIX sob `/assets/`.

### Runtime

`createAssetRuntime.ts` receberá `profile`, `catalogUrl` e uma
`providerFactory` opcional para testes. A factory default chamará somente
`createFetchAssetProvider` através dos exports públicos de `@huntbound/assets`.

O runtime:

- começa em `idle` com snapshot imutável vazio;
- cria e memoriza a promise do provider no primeiro preload, incluindo chamadas
  concorrentes;
- chama `loadPreloads()` uma vez por ciclo carregado e ordena as keys
  lexicograficamente;
- torna preload repetido idempotente;
- chama `unloadAll()`, revoga as URLs pelo provider e publica `unloaded` vazio;
- após unload, reutiliza a mesma instância do provider para carregar novamente;
- deixa o estado não-carregado quando o preload falha e relança o erro original,
  preservando `AssetProviderError` e seus diagnósticos.

Snapshots e suas listas de keys serão congelados para que consumidores de teste
não consigam mutar o estado interno por referência.

### Probe

`AssetRuntimeProbe.ts` declarará o tipo global opcional
`window.__huntboundAssetProbe` no próprio módulo e exportará uma instalação
explícita. A instalação só será chamada pela composition root quando o profile
for `test`; os profiles `personal` e `product` não criarão a propriedade.
Cada operação retornará um novo snapshot do runtime, sem expor provider,
registry, URLs blob ou objetos mutáveis.

### Composition root

`main.ts` manterá a espera de HMR, validará os roots e montará o shell inicial.
Em seguida:

1. deriva profile e catalog URL;
2. cria o runtime;
3. aguarda `runtime.preload()`;
4. marca `data-assets-ready="true"` e `data-assets-count="5"`;
5. instala o probe apenas em `test`;
6. cria Phaser e registra lifecycle, viewport e métricas existentes.

O root começa com `data-assets-ready="false"` e count zero. Em erro, permanece
sem Phaser, mantém prontidão falsa e publica no bridge uma mensagem de erro
acionável; não há fallback visual silencioso.

## Fluxo browser

O catálogo de `test` é servido pelo staging existente. O provider baixa apenas o
catálogo, manifests e mídias referenciadas por ele. O teste Playwright observa
requests, console e page errors, espera a prontidão em até cinco segundos,
confere as cinco stable keys, chama `unload()`, chama `reload()` e compara as
keys restauradas com o conjunto inicial. As URLs de mídia esperadas serão
descobertas lendo os manifests servidos, sem hardcode de media path no app.

## Verificação

Os testes unitários cobrirão parser/URL, ciclo do runtime, imutabilidade e
probe, além da ordem de boot e bloqueio em falha. Os gates finais serão:

- testes e typecheck do game;
- build `test`;
- Playwright de `asset-pack` e `boot-budget` em Chromium;
- `architecture:check`, `verify` e `git diff --check`.

O diff será revisado contra o escopo da task e o handoff de `STATE.md` registrará
commit, comandos, contagens e duração observada do boot.
