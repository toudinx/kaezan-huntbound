# Map Editor — Plano do projeto

**Status:** pronto para ME-01 quando a `main` voltar a ter `corepack pnpm verify` verde

**Natureza:** projeto auxiliar independente dos playbooks numerados do jogo

**Diretriz de execução:** `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`

**Política de modelos:** `docs/08_POLITICA_MODELOS_AGENTES.md`

## Resultado

Uma aplicação local para abrir, visualizar, retocar, validar e publicar mapas do Kaezan Huntbound.
O jogo continua consumindo somente os artefatos runtime compactos; o editor, suas dependências e
seus painéis não entram no site publicado.

O editor fica no mesmo monorepo:

```text
apps/map-editor/                 aplicação local Vite + Phaser + painéis DOM
packages/map-authoring/         contrato, comandos, validação e compilação puros
tools/map-authoring/            servidor local, draft, publish e integração com os CLIs
packages/content/src/layouts/   fonte canônica dos mapas autorados
packages/content/src/generated/ saída runtime gerada; nunca editada à mão
```

Essa localização compartilha contratos, catálogo, tile flags, packs e gates sem copiar versões. O
comando `build:site` permanece filtrado para `@huntbound/game`, então `apps/map-editor` não aumenta o
download do produto.

## Fluxo de um mapa novo

```text
Canary congelado
      |
      | investigação e decisões por agente de IA
      v
seed Huntbound autorada  ->  editor local  ->  draft local
                                      |             |
                                      +---- validate/publish
                                                    |
                                                    v
                             artefatos gerados + seleção de assets
                                                    |
                                                    v
                                             jogo real / playtest
```

1. Uma task própria de agente de IA investiga o snapshot Canary, a região OTBM, andares, materiais,
   spawns e transições. O agente escolhe recorte, composição, limites e preenchimento, registra a
   proveniência e materializa o primeiro documento autorado.
2. O agente pode usar CLIs de inspeção e serialização para trabalho mecânico, mas **não existe
   importador genérico, wizard ou botão que decida e crie o mapa automaticamente**.
3. O editor abre essa seed. Pessoa ou agente retoca tiles, stacks, colisão derivada, spawns,
   transições e início do jogador.
4. Autosave grava somente um draft local, fora do Git e fora do runtime.
5. `publish` valida e escreve atomicamente a fonte canônica, regenera os artefatos runtime e deriva a
   seleção mínima de assets. Falha preserva a última versão publicada.
6. `play` abre o jogo real com o mapa publicado. O aceite é feito jogando.

Uma atualização futura do Canary nunca sobrescreve retoques silenciosamente. Reimportação é uma nova
task de agente, com diff explícito entre seed, versão publicada e nova evidência.

## Fontes de verdade

- Canary é evidência upstream para a primeira materialização; não é formato de runtime nem fonte
  editável pelo editor.
- `packages/content/src/layouts/hunts/<slug>.json` é a fonte canônica autorada e versionada.
- Drafts vivem em diretório local ignorado pelo Git e têm estado explícito `draft`, `invalid`,
  `published`, `stale` ou `playable`.
- `packages/content/src/generated/hunts/**` e packs sob `apps/game/public/assets/**` são saídas de
  CLI. Nunca recebem edição manual.
- Identidade visual do terreno e dos objetos usa `clientId`; regras de chão, camada e colisão derivam
  do catálogo e de `tile-flags.json`.
- Criaturas usam `creatureKey`. NPC ainda não tem categoria/contrato runtime no projeto e fica fora
  deste MVP.

## Arquitetura congelada

- `apps/map-editor` é local-only, abre apenas em `127.0.0.1` e não ganha rota dentro de
  `apps/game`.
- Phaser renderiza o mapa; painéis, formulários e toolbar são DOM/CSS.
- `packages/map-authoring` é TypeScript puro, determinístico e browser-safe. Não conhece Phaser,
  DOM, Node, filesystem ou Canary e depende no máximo de `@huntbound/contracts`.
- Escrita em disco e processos ficam em `tools/map-authoring`; o browser não recebe acesso direto ao
  filesystem.
- O runtime não lê o documento de authoring. `publish` compila para `MapRegion`, `TransitionTable`,
  `SpawnTable`, `HuntDefinition` e seleção de assets já existentes.
- O documento canônico guarda stacks completos de `clientId` por SQM. Ground, objetos abaixo/acima e
  colisão são derivados na compilação, não duplicados à mão.
- Comandos de edição são operações reversíveis; undo/redo é baseado em comando, não em snapshots da
  aplicação inteira.
- Publicação é determinística e atômica: os mesmos bytes de entrada e catálogos produzem os mesmos
  bytes de saída; qualquer erro mantém a publicação anterior intacta.

## Escopo do MVP

- múltiplos andares, pan, zoom, grade e coordenada sob o cursor;
- paleta local pesquisável de terrenos e objetos já exportados, carregada sob demanda;
- selecionar, pincel, retângulo, fill, borracha e edição ordenada do stack do SQM;
- undo/redo, dirty state, draft local, validate, publish e play;
- player start, spawns de criaturas e transições entre andares;
- overlays de colisão, SQM vazio, alcançabilidade e saída visual falsa;
- pincel de caverna/auto-wall para fechar bordas e preencher vazios com terreno coerente;
- primeiro uso real: corrigir os vazios e bordas da Venore Rotworm Cave.

## Fora do MVP

- editor público ou incluído no site;
- importação automática do Canary, mundo inteiro ou merge automático de versões do OTBM;
- colaboração multiusuário, backend, cloud save ou banco remoto;
- criação de sprites, animações ou edição gráfica de assets;
- NPCs, quests, houses, scripts Lua e lógica de diálogo;
- mudar regras da simulação ou fazer o runtime consumir formato de authoring.

## Interface alvo

Os comandos abaixo são contrato do PB e só passam a existir nas tasks indicadas:

```text
corepack pnpm map:edit       # ME-02: abre o editor local
corepack pnpm map:check      # ME-01/04: valida sem escrever
corepack pnpm map:publish    # ME-04: publica atomicamente
corepack pnpm map:play       # ME-04: publica e abre o jogo
```

Não haverá `map:new` automático. Uma task de agente cria a seed e entrega o path que `map:edit` abre.

## Roadmap

| Task | Resultado | Modelo sugerido | Estado |
|---|---|---|---|
| ME-01 | contrato autoral v2, compilador determinístico e seed da hunt atual materializada por agente | GPT-5.6 Sol `xhigh` | card escrito |
| ME-02 | editor local read-only, mapa real, andares e paleta de assets | GPT-5.6 Luna `max` | card escrito |
| ME-03 | reducer de comandos, seleção, pintura, stack e undo/redo | GPT-5.6 Luna `max` | bullet |
| ME-04 | drafts, validação, publish atômico e play no jogo | GPT-5.6 Luna `max` | bullet |
| ME-05 | player start, spawns, transições e overlays de diagnóstico | GPT-5.6 Luna `max` | bullet |
| ME-06 | cave brush, auto-wall, preenchimento e detector de borda/saída falsa | GPT-5.6 Luna `max` | bullet |
| ME-07 | template executável da task de IA e ensaio com uma segunda seed | GPT-5.6 Luna `max` | bullet |
| ME-08 | retoque real da Venore Rotworm Cave e aceite jogando | GPT-5.6 Sol `xhigh` | bullet |
| ME-09 | isolamento do bundle, QA do editor e fechamento | GPT-5.6 Luna `max` | bullet |

Somente ME-01 e ME-02 têm task cards. A task seguinte é escrita quando a anterior revelar as
interfaces reais, evitando documentação que envelhece antes do código.

## Aceite do playbook

- Uma seed criada por agente abre no editor sem depender do OTBM em runtime.
- Alterar um SQM, publicar e abrir o jogo mostra exatamente a alteração.
- SQM ausente adjacente a área caminhável é eliminado ou marcado como abertura intencional.
- Bordas sem continuação terminam em parede/terreno bloqueante coerente, sem caminho visual falso.
- Colisão, stack, spawn, início e transições passam nos validadores e batem com o visual.
- Falha de publish não corrompe a última versão jogável.
- `corepack pnpm build:site` não empacota o editor.
- `corepack pnpm verify` fica verde e o usuário aprova a caverna no jogo real.

## Condições de parada

Pare e registre em `STATE.md` se a implementação exigir mudar um contrato público já integrado,
migrar save/golden, introduzir uma categoria NPC ou automatizar a decisão de extração do Canary. A
mesma causa em dois ciclos RED/GREEN também escala a task conforme a política de modelos.
