# PB-02 — Manifesto e asset pack pessoal — Design

**Status:** aprovado para planejamento

**Data:** 2026-08-13
**Escopo desta spec:** definir o futuro playbook PB-02; não implementar código, manifests de runtime
nem assets.

## Contexto

PB-01 está fechado e fornece conteúdo curado por chaves estáveis. O próximo gate antes de gameplay é
PB-02: transformar um subset visual local em packs browser-safe que o renderer acessa sem conhecer
paths, formatos do cliente ou IDs numéricos não tipados.

O acervo local relevante já existe como um export histórico do Arena Fable: um manifesto JSON e
PNGs por aparência, gerados anteriormente a partir do cliente Tibia. PB-02 trata esse export como
entrada externa, configurável e somente de leitura. A decodificação de `appearances.dat`, catálogo de
sheets e LZMA permanece fora do Huntbound.

O resultado precisa atender simultaneamente a duas condições:

- o perfil pessoal carrega o subset real local, classificado como `cipsoft-personal`;
- o perfil de produto prova que nenhum asset com essa classe pode ser resolvido, empacotado ou
  incluído transitivamente.

## Objetivo

Especificar um playbook modular que entregue:

- contratos validados para catálogos, packs, entradas, proveniência, licenças e perfis;
- adapters separados para `lookType`, `clientId`, `effectId` e `missileId`;
- packer TypeScript determinístico que consome o export histórico, sem reextrair formatos do cliente;
- `AssetPackRegistry` e `AssetProvider` browser-safe, sem tipos Phaser;
- carregamento e descarregamento sob demanda;
- fixture reproduzível sem material proprietário e gate local equivalente com o dump real;
- proteção verificável contra assets `cipsoft-personal` no perfil `product`.

## Resultado independente

Ao fechar PB-02, um cenário de contrato deve carregar um outfit, uma criatura, um objeto, um efeito
e um projétil somente por stable keys e por um provider. O mesmo subset gerado duas vezes deve
produzir bytes idênticos. O build ou a validação `product` deve falhar quando qualquer dependência
visual transitiva tiver `licenseClass: "cipsoft-personal"`.

O cenário se chama `pb-02-contract-coverage`. Ele existe para provar contratos e não representa nem
escolhe a primeira hunt; essa decisão continua reservada ao PB-04.

## Opções consideradas

### 1. Consumir o export histórico já materializado — escolhida

O packer lê o manifesto e os PNGs exportados pelo Arena Fable, valida hashes e metadata e copia
somente o subset escolhido para o formato Huntbound.

Vantagens:

- mantém PB-02 focado em identidade, packs, licença e runtime browser;
- reaproveita uma extração já paga e inspecionável;
- não incorpora formatos proprietários e compactação legada ao workspace;
- permite substituir o exportador sem mudar selection manifests, packs ou consumidores.

Custo aceito: a geração pessoal depende de uma entrada externa local, comprovada por source lock.

### 2. Portar o extrator C# histórico

Foi descartada porque introduziria outro runtime, protobuf, LZMA e ImageSharp no playbook, ampliando
o problema sem melhorar o contrato consumido pelo jogo.

### 3. Reescrever o extrator em TypeScript

Foi descartada porque duplicaria a decodificação de `appearances.dat` e sheets LZMA. Esse trabalho
não é necessário para provar o pipeline de packs nem para substituir assets futuramente.

## Princípios congelados

- Stable keys são a única API pública de resolução de assets.
- IDs Tibia são aceitos apenas por adapters tipados e separados por domínio.
- Paths de mídia existem somente dentro de manifests e são relativos ao diretório do pack.
- A URL do catálogo do perfil é o único bootstrap permitido fora dos manifests; ela entra como
  configuração da composition root.
- O packer lê uma origem configurável e nunca persiste seu path absoluto.
- Todo output é determinístico, validado e produzido por staging antes de promoção.
- O runtime não lê `appearances.dat`, LZMA, XML, Lua, OTBM ou o manifesto histórico diretamente.
- `ResolvedAsset` pertence à apresentação e nunca entra na simulação nem no save.
- Não existe fallback visual silencioso. Ausência, corrupção ou incompatibilidade são erros
  estruturados.
- Assets pessoais reais e packs derivados permanecem locais e ignorados pelo Git.
- Fixtures sintéticas, schemas, selections, source locks, hashes e tooling são versionados.

## Arquitetura

```text
export histórico externo (somente leitura)
  ├─ manifest.json
  └─ PNGs por aparência
        │
        ▼
selection.json + source-lock.json
        │
        ▼
tools/asset-packer
  ├─ valida origem e seleção
  ├─ agrega diagnósticos
  ├─ escreve staging determinístico
  └─ promove pack íntegro
        │
        ▼
pack.json + pack.sha256 + media/<sha256>.png
        │
        ▼
catálogo do perfil
        │
        ▼
AssetPackRegistry / AssetProvider
  ├─ adapters de IDs → stable keys
  ├─ load / validate / resolve
  └─ unload
        │
        ▼
composition root browser → apresentação Phaser futura
```

### Fronteiras de código futuras

```text
packages/assets/src/manifest/          schemas, tipos e canonicalização
packages/assets/src/adapters/          lookType, clientId, effectId e missileId
packages/assets/src/providers/         registry, provider e erros de runtime
packages/test-fixtures/assets/pb02/    origem e packs sintéticos mínimos
tools/asset-packer/                     source lock, seleção, validação e materialização
docs/assets/                            política, seleção e documentação gerada
apps/game/public/assets/personal/       packs reais locais e ignorados
```

`@huntbound/assets` permanece browser-safe e renderer-agnostic. O packer é tooling Node e não é
importado pelo pacote de runtime. `packages/simulation` não depende de assets.

## Fixture de cobertura

O subset congelado para planejamento é:

| Papel | Stable key | Adapter | ID de origem | Evidência existente |
|---|---|---|---:|---|
| outfit | `outfit:tibia:knight` | `lookType` | 131 | Knight masculino no catálogo de outfits |
| criatura | `creature:tibia:rotworm` | `lookType` | 26 | aparência do Rotworm no bundle PB-01 |
| objeto | `item:tibia:gold-coin` | `clientId` | 3031 | source ID do gold coin no catálogo PB-01 |
| efeito | `effect:tibia:energy-hit` | `effectId` | 12 | `CONST_ME_ENERGYHIT` e entrada no export |
| projétil | `missile:tibia:energy-ball` | `missileId` | 36 | `energyball` usado pelo Orc Shaman PB-01 |

`missile:tibia:throwing-knife` foi considerado inicialmente, mas o export histórico não contém
`missileId: 9`. O fixture usa `energy-ball`, que existe na origem e mantém vínculo com o slice PB-01.

## Contratos de autoria e runtime

### Selection manifest

O `selection.json` é input versionado de autoria. Ele declara:

- ID estável do pack e versão do contrato;
- cada stable key desejada;
- adapter e ID numérico de origem;
- grupo de proveniência/licença;
- consumidor e justificativa;
- perfil ou perfis para os quais a seleção é elegível.

O selection manifest não contém paths de mídia. Ele diz **o que** selecionar; o adapter encontra a
entrada correspondente no manifesto histórico.

### Source lock

O `source-lock.json` fixa, no mínimo:

- identidade lógica e versão do export;
- hash SHA-256 do manifesto histórico;
- hash e tamanho de cada uma das cinco mídias selecionadas;
- categoria e ID esperados de cada entrada;
- versão do schema do lock.

O source lock não contém path absoluto. A raiz externa é fornecida ao comando por argumento ou
variável de ambiente e é verificada antes de qualquer geração.

### Pack manifest

O `pack.json` é a fronteira de runtime. Ele contém:

- `packId`, versão de schema e versão de conteúdo;
- grupos com `source`, `sourceSnapshot`, `licenseClass` e `buildProfiles`;
- stable keys e categoria visual;
- path POSIX relativo e content-addressed;
- SHA-256 e tamanho do arquivo;
- dimensões de célula e atlas;
- grupos de animação, frames e durações;
- pivô, escala e filtering explícitos;
- índices tipados que sustentam os quatro adapters.

O JSON é canônico: ordenação, finais de linha e serialização são determinísticos. `pack.sha256`
contém o hash do `pack.json` canônico. Mídias são nomeadas pelo próprio hash, permitindo deduplicação
e invalidação sem mudar stable keys.

### Catálogo do perfil

O catálogo lista os packs disponíveis para um perfil e suas URLs relativas. O provider recebe
somente a URL desse catálogo na composition root. Paths de packs e mídias não aparecem em código de
feature, cena, conteúdo ou simulação.

## Adapters de identidade visual

Existem quatro contratos distintos:

- `LookTypeAssetAdapter`;
- `ClientIdAssetAdapter`;
- `EffectIdAssetAdapter`;
- `MissileIdAssetAdapter`.

Cada adapter consulta somente seu índice tipado e retorna uma stable key. Não há índice numérico
global. Portanto, `lookType: 12` e `effectId: 12` não podem colidir ou ser confundidos.

O provider resolve somente a stable key devolvida. Consumidores que já possuem stable key pulam a
adaptação numérica. Os adapters não retornam URL, path, textura Phaser nem mídia carregada.

## Packer determinístico

O packer segue estas fases:

1. validar argumentos, raiz externa, selection e source lock;
2. validar o schema do manifesto histórico;
3. resolver todas as entradas pelos adapters e agregar todas as ausências;
4. validar categoria, metadata de atlas/animação, path seguro, arquivo, tamanho e hash;
5. construir em memória o manifest Huntbound canônico;
6. escrever todas as mídias e manifests em diretório de staging fora do destino final;
7. revalidar o staging;
8. promover o diretório completo somente após sucesso;
9. comparar ou gerar golden hash conforme o comando executado.

Falha em qualquer fase preserva o último pack válido e não deixa output parcial. Duas execuções com
a mesma entrada produzem árvore, bytes e hashes idênticos.

O packer não:

- decodifica formatos do cliente;
- modifica o export histórico;
- inclui entradas não declaradas;
- inventa animações ou corrige sprites;
- consulta Canary, TibiaRoute ou serviços remotos;
- lê o catálogo inteiro no runtime.

## Provider e registry

O contrato conceitual continua alinhado à ADR:

```ts
export interface AssetProvider {
  loadPack(packId: string): Promise<void>;
  validateKeys(keys: readonly string[]): AssetValidationResult;
  resolve(key: string): ResolvedAsset;
  unloadPack(packId: string): Promise<void>;
}
```

`ResolvedAsset` é um descritor renderer-agnostic com URL validada, hashes e metadata de apresentação.
Ele não cria textura, animação ou objeto Phaser.

Comportamento:

- carregar novamente o mesmo pack íntegro é idempotente;
- um pack só se torna visível depois que manifesto e todas as mídias forem validados;
- falha de carregamento não altera o registry anterior;
- stable key conflitante entre packs carregados é bloqueante;
- `validateKeys` informa todas as chaves ausentes em uma única resposta;
- `resolve` falha com erro tipado quando a chave é desconhecida ou seu pack não está carregado;
- `unloadPack` remove somente entradas pertencentes ao pack indicado;
- catálogo, manifests e mídia podem ser carregados sob demanda, sem dependência de Phaser.

## Perfis, licenças e distribuição

As classes mínimas previstas são:

- `cipsoft-personal` para o export Tibia local;
- `huntbound-test` para fixtures sintéticas do repositório;
- `huntbound-owned` para uma substituição futura de produto.

`buildProfiles` e `licenseClass` são verificações independentes. Uma entrada precisa permitir o
perfil solicitado, e a política do perfil também precisa aceitar sua licença.

O perfil `product` usa defesa em profundidade:

- recusa selection, grupo ou pack que não permita `product`;
- recusa toda dependência transitiva `cipsoft-personal`;
- falha em validação, empacotamento e build, antes de gerar um artefato distribuível;
- possui prova negativa controlada que demonstra que o guard realmente detecta a violação.

O perfil `personal` pode carregar `cipsoft-personal` apenas localmente. Nada nesta fronteira afirma
que o V0 pessoal seja redistribuível.

## Política de versionamento

São versionados:

- schemas e código de contratos;
- selection manifests;
- source locks e golden hashes;
- tooling;
- fixtures sintéticas mínimas e sua mídia;
- documentação e relatórios de aceite.

Não são versionados:

- o export Tibia externo;
- PNGs copiados ou derivados dele;
- packs reais `cipsoft-personal`;
- caches, staging ou temporários do packer.

O destino pessoal esperado é
`apps/game/public/assets/personal/packs/pb-02-contract-coverage/`, explicitamente ignorado pelo Git.
Testes reproduzíveis usam somente `packages/test-fixtures/assets/pb02/`.

## Diagnósticos e tratamento de erros

Erros possuem código estável, mensagem, localização lógica e contexto seguro. Diagnósticos de
autoria são agregados antes de abortar. Devem existir códigos distintos para:

- schema inválido;
- path absoluto, traversal ou separador inválido;
- stable key ou ID duplicado;
- categoria de adapter incorreta;
- entrada ou mídia ausente;
- tamanho ou hash divergente;
- metadata de atlas/animação inconsistente;
- perfil não permitido;
- licença bloqueada;
- conflito entre packs;
- pack não carregado ou stable key desconhecida.

Mensagens não vazam paths absolutos da máquina para manifests, bundles, snapshots ou relatórios
versionados. Logs locais podem mostrar a raiz fornecida pelo operador.

## Estratégia de testes

### Trilha reproduzível

Uma origem sintética mínima reproduz a forma do export histórico e contém cinco PNGs pequenos. Ela
entra no Git e cobre os quatro adapters e as cinco categorias do cenário. Essa trilha executa em CI
e em `corepack pnpm verify`.

Provas mínimas:

- schemas aceitam o fixture válido e rejeitam campos inesperados;
- os quatro namespaces numéricos permanecem separados;
- várias entradas ausentes aparecem em um único diagnóstico;
- path traversal, path absoluto e hash adulterado falham;
- geração em duas passagens é byte-identical;
- staging falho preserva o último output válido;
- `product` aceita o fixture `huntbound-test` permitido;
- injeção controlada de `cipsoft-personal` faz `product` falhar;
- load, resolução das cinco stable keys e unload funcionam;
- falha parcial de mídia não contamina o registry.

### Trilha pessoal local

O gate local aponta para o export Arena Fable por configuração, verifica o source lock, gera o pack
real ignorado e carrega as cinco categorias. A ausência ou divergência da origem bloqueia o gate
pessoal; não há download automático nem substituição pelo fixture sintético.

### Browser e boundaries

O cenário browser usa o mesmo provider e a mesma API do jogo. Ele comprova:

- preload explícito do pack;
- outfit, criatura, objeto, efeito e projétil resolvidos por stable key;
- URLs e metadata vindas do manifest;
- unload observável;
- nenhum path literal de mídia em código consumidor;
- nenhum asset, provider ou path em `packages/simulation`.

Uma varredura arquitetural falha para extensões de mídia e paths de packs fora das allowlists de
manifest, tooling, fixtures e composition root.

## Decomposição do playbook

| ID | Problema coeso | Dependência | Resultado |
|---|---|---|---|
| PB-02-01 | contratos de asset | PB-01 fechado | keys, schemas, diagnósticos e contratos dos adapters |
| PB-02-02 | origem e seleção | PB-02-01 | source lock real, selection congelada e dump sintético |
| PB-02-03 | materialização | PB-02-02 | packer determinístico e golden pack |
| PB-02-04 | runtime | PB-02-02 | registry, provider, adapters e load/unload |
| PB-02-05 | perfis e integração | PB-02-03/04 | catálogos, guard `product`, scripts e boundaries |
| PB-02-06 | browser | PB-02-05 | cenário de contrato e preload sob demanda |
| PB-02-07 | gate integrado | PB-02-06 | auditoria, aceite e elegibilidade de PB-03 |

PB-02-03 e PB-02-04 possuem paths funcionais independentes e podem executar em paralelo depois de
PB-02-02. O padrão continua serial. Se o paralelismo for ativado, PB-02-05 é o único integrador e
resolve apenas integração prevista e handoff documental.

Cada task futura deve seguir `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, declarar modelo/effort
conforme `docs/08_POLITICA_MODELOS_AGENTES.md`, começar por evidência RED quando houver comportamento
testável e terminar com verificação fresca, commit, integração e limpeza.

## Critérios finais de aceite

- [ ] Selection, source lock, pack e catálogo possuem schemas estritos e diagnósticos estruturados.
- [ ] `lookType`, `clientId`, `effectId` e `missileId` usam adapters e índices separados.
- [ ] O fixture cobre exatamente outfit, criatura, objeto, efeito e projétil declarados nesta spec.
- [ ] Nenhum path absoluto é persistido e nenhum path de mídia aparece em consumidor.
- [ ] O packer agrega ausências, valida hashes e não deixa output parcial.
- [ ] Duas gerações limpas produzem árvore, JSON e hashes byte-idênticos.
- [ ] O pack real permanece ignorado e zero mídia `cipsoft-personal` é rastreada.
- [ ] `product` falha para dependência `cipsoft-personal` e passa para fixture permitida.
- [ ] Provider só publica um pack depois de validação integral e preserva estado em falha.
- [ ] `validateKeys` informa todas as chaves ausentes de uma vez.
- [ ] Cenário browser carrega e descarrega o pack sob demanda sem tipos Phaser no provider.
- [ ] `packages/simulation` permanece sem dependência de assets e sem paths de mídia.
- [ ] Trilha sintética reproduzível e trilha pessoal local passam com evidência fresca.
- [ ] `corepack pnpm verify` passa no resultado integrado.
- [ ] Relatório final decide objetivamente a elegibilidade de PB-03.

## Fora de escopo

- portar ou reescrever o extrator C# histórico;
- ler `appearances.dat`, protobuf ou sheets LZMA no Huntbound;
- escolher, empacotar ou implementar a primeira hunt real;
- mapa, tiles de hunt, colisão, spawn, câmera, combate ou gameplay;
- criar texturas e animações Phaser finais;
- compositor, addons, coloração e catálogo completo de outfits;
- importar o catálogo visual completo de Tibia;
- fallback visual silencioso;
- distribuir publicamente material `cipsoft-personal`;
- save, backend, cache persistente ou service worker de assets;
- alterar PB-01 sem defeito bloqueante reproduzido e registrado.

## Decisão final

PB-02 será um playbook de fronteira visual, não um projeto de extração nem uma primeira hunt. Ele
consome um export local existente, prova sua integridade, materializa apenas um subset explícito e
isola origem, licença, IDs e paths atrás de manifests, adapters e providers. O resultado fecha o
último contrato de apresentação necessário antes do kernel determinístico PB-03.
