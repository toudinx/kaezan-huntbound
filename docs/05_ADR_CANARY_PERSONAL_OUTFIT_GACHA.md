# ADR-002 — Canary/Tibia como base integral do V0 pessoal

**Status:** aceito  
**Data:** 2026-08-09  
**Escopo:** vertical slice e MVP de uso pessoal  
**Altera:** `02_SINTESE_DIRECAO_UNICA.md`, `03_ADR_PHASER4_BROWSER_FIRST.md` e
`04_PLAYBOOK_FUNDAMENTACAO_GAME_STUDIO.md` onde houver conflito

## Contexto

O objetivo imediato não é criar um bestiário, uma progressão ou uma linguagem visual novos. O
objetivo é descobrir se **Tibia jogado no browser, com as extensões escolhidas de Huntbound e um
gacha exclusivamente cosmético de outfits**, é divertido para uso pessoal.

O workspace já contém:

- snapshot local do Canary, com regras, dados, mapas e scripts de referência;
- catálogo local extraído do cliente de Tibia, com objetos, outfits, efeitos e projéteis;
- manifestos e ferramentas históricas do Arena Fable, OTClient e RME;
- Phaser 4 + TypeScript como stack browser-first já decidida.

Criar biomas, criaturas e bosses Kaezan antes de validar o jogo aumentaria o custo sem responder à
pergunta principal. Para o V0 pessoal, a fidelidade ao conteúdo existente é uma vantagem.

## Decisão de produto

O V0 será:

> **Tibia/Canary no browser, para uso pessoal, com gacha cosmético de outfits existentes e sem
> produção de arte nova.**

Decisões vinculantes:

1. Toda mecânica usada no V0 deve existir no Canary/Tibia ou ser uma extensão Huntbound listada
   explicitamente neste documento.
2. Criaturas, itens, loot, vocações, spells, efeitos, projéteis, outfits e mapas vêm do acervo
   existente; não se cria um equivalente Kaezan para o V0.
3. Hunts elegíveis são as catalogadas em
   [TibiaRoute — Locais de caça](https://tibiaroute.com/br/hunting-places).
4. TibiaRoute é fonte de **descoberta e seleção**, nunca dependência de runtime nem fonte canônica de
   stats, loot, IDs ou mapa.
5. O snapshot local do Canary é a fonte canônica de regras e dados para a versão selecionada.
6. O pacote local extraído do cliente é a fonte visual do perfil `personal`.
7. O gacha concede somente famílias de outfit. Não concede stats, spells, vocações, itens ou poder.
8. O V0 é local-first e não exige backend, conta online, PostgreSQL ou proteção contra trapaça.
9. Um eventual produto comercial será outra fase: a apresentação inteira será substituída e a
   progressão confiável migrará para autoridade de servidor.

## Extensões Huntbound permitidas

O compromisso com Canary/Tibia não proíbe estas extensões, desde que sejam módulos desligáveis e não
alterem os IDs de conteúdo importado:

- gacha cosmético de outfits;
- helper, inicialmente limitado a cura, alvo, ações e loot;
- dash, caso o playtest demonstre que melhora o combate;
- instrumentação, replay, debug e ferramentas de importação;
- UI/UX para browser, touch e acessibilidade;
- leech de vida e mana: fração do dano efetivamente aplicado devolve vida e mana à fonte, depois do
  clamp, sem ultrapassar o máximo. O snapshot já conhece life leech e mana leech como skills de
  criatura e como imbuement da espada id 3264; sem imbuing e sem item usável, o Huntbound promove
  leech a regra do personagem. Valoriza bater em criatura viva;
- regen sensível a combate: “em combate” é o tempo desde o último dano recebido. Quase nada enquanto
  apanha; forte alguns segundos após o último hit. Só o jogador regenera fora de combate; criatura
  ferida continua ferida. O loop pretendido é recuar para um spot tranquilo. O regen fiel do snapshot
  (Knight 1 HP e 2 mana / 6 s) permanece a taxa em combate;
- habilidade com cargas por hunt: runa e poção reaproveitam a máquina de ability — N cargas,
  recarregadas fora de combate ou entre runs, sem inventário, sem loja, sem `actor/use-item`. Sudden
  Death id 3155 carrega 3; GFB id 3191 carrega 4; HMM id 3198 carrega 10; UH id 3160 carrega 1;
- stances do Vocation Adjustments 2026, com desvio de proveniência: postura adotada é a de Tibia
  `15.25.3a4a52` (fonte: TibiaWiki), não a do snapshot `157e6f9e`. Vale só para stances; kit, fórmula,
  custo, cooldown, loot e mapa continuam saindo do snapshot. As stances de Sorcerer que dependem de
  crítico são adaptadas para dano base por elemento; crítico não entra no kernel.

Metrônomo, Echoing Den, criaturas Kaezan T1, posturas novas, ruptura nova e bosses autorais deixam de
ser requisitos do primeiro slice. Podem voltar como experimentos posteriores, nunca como bloqueio.

### Curadoria de conteúdo — regra de projeto, 2026-08-24

A decisão vinculante 1 diz o que **pode** entrar. Esta regra diz o que **deve ficar de fora**, e vale
para magia, criatura, item e equipamento. Foi formulada durante o replanejamento do PB-08 e está
detalhada em `docs/playbooks/PB-08/README.md`, seção "O princípio de design".

1. **Nada convive com a própria versão obsoleta.** `exura` → `exura gran` → `exura vita` é escada:
   mesma coisa com número maior, e a de baixo vira peso morto. Cada faixa tem a sua forma de cada
   papel, e cruzar a faixa **substitui**. Minotauro e demônio não competem — cada um é a forma da sua
   faixa. Isso restringe o que se importa do snapshot, não o que existe nele.
2. **Coexistência exige distinção visual.** Duas ações só convivem se um espectador distingue as duas
   **olhando**. Cooldown, mana e dano são invisíveis e não justificam coexistência. O motivo é de
   produto: o helper vai executar a rotação, então o valor dela é ser divertida de assistir.
3. **Orçamento de ações: 8–9 por vocação, cerca de metade de dano.** O teto não é a contagem, é
   redundância zero. A rotação de dano é o que se assiste; utilidade é situacional por definição.
4. **Faixa decide o que existe, não quando o jogador recebe.** Nenhuma ação é trancada por level. Se
   o playtest pedir para limitar, a lógica entra depois, editando dado.

**Consequência de escopo, ainda não decidida:** a regra 1 cria obsolescência entre faixas — conteúdo
antigo morre quando o jogador o ultrapassa. A resposta prevista é sincronização de nível e de gear
(`docs/playbooks/PB-12/README.md`), que **não existe no Tibia** e portanto exigirá emenda própria a
esta seção antes de ser implementada.

**Recusado nesta data:** dividir o Knight em vocações por tipo de arma. A fantasia de sword/axe/club
e de uma mão contra duas entrega-se como eixo de build dentro da vocação — `vocations.xml` já traz
`skillMultipliers` por skill —, não como seis vocações. Subclasses ficam reservadas como tópico
futuro e exigiriam emenda.

## Fontes de verdade

| Domínio | Fonte de verdade | Uso |
|---|---|---|
| Catálogo de hunts | TibiaRoute | descobrir opções e registrar URL/metadata da escolha |
| Regras, stats, loot e scripts | snapshot local do Canary | importar e portar o subconjunto usado |
| Mapa | mapa do snapshot Canary | extrair a área da hunt para formato browser |
| Aparências e animações | pacote local do cliente + manifestos extraídos | resolver `lookType`, `clientId`, `effectId` e `missileId` |
| UI e acessibilidade | Huntbound | apresentação web, sem alterar regras de combate |
| Save do V0 | repositório local versionado | progresso pessoal, sem promessa de integridade contra o dono do dispositivo |

**Regra de proveniência:** cada pacote registra a versão/snapshot de origem. O runtime nunca consulta
TibiaRoute, Canary remoto ou o cliente instalado.

## Seleção de hunt

Qualquer entrada do catálogo do TibiaRoute é elegível, inclusive conteúdo de nível alto. Cada
playbook de hunt deve congelar uma seleção em `HuntDefinition` com:

```ts
export interface HuntDefinition {
  id: `tibia:${string}`;
  displayName: string;
  sourceUrl: string;
  sourceSnapshot: string;
  recommendedLevel: number;
  supportedVocations: readonly VocationId[];
  creatureIds: readonly string[];
  mapRegionId: string;
  assetPackId: string;
}
```

Critérios para a primeira hunt:

- funciona solo com Knight ou com todas as vocações;
- possui poucos tipos de criatura e mapa pequeno o bastante para inspeção manual;
- usa apenas IDs presentes no snapshot local;
- cabe em um pacote inicial compatível com o budget de boot;
- não exige sistemas fora do primeiro playbook, como party, quest chain ou world event.

O TibiaRoute lista 131 locais na data desta decisão e oferece filtros por composição, lucro e
experiência. Esse número é apenas contexto; o manifesto congela a URL e os dados escolhidos para que
mudanças no site não alterem o jogo.

## Conteúdo como adaptação, não cópia espalhada

O código não referencia paths de PNG nem arquivos Canary diretamente. Importadores produzem schemas
internos validados:

```text
Canary snapshot ──► importer ──► packages/content/generated
Tibia asset dump ─► packer   ──► public/assets/personal/packs
                                      │
                                      ▼
                             stable manifest keys
```

Os IDs originais são preservados como proveniência e compatibilidade. O runtime consome chaves
estáveis como `creature:tibia:rotworm`, `outfit:tibia:knight` e `hunt:tibia:venore-rotworm-cave`.

O renderer acessa arquivos somente por esta fronteira:

```ts
export interface AssetProvider {
  loadPack(packId: string): Promise<void>;
  resolve(key: string): ResolvedAsset;
  unloadPack(packId: string): Promise<void>;
}
```

`ResolvedAsset` pertence à camada de apresentação. Nenhum objeto retornado por `AssetProvider`
entra no estado serializável da simulação.

## Contrato do gacha de outfits

### Prêmio

O prêmio é uma **família de outfit**, não um personagem. Uma família agrupa os `lookType` aplicáveis
às apresentações suportadas pelo catálogo. Desbloquear a família libera:

- todos os `lookType` associados à família no snapshot;
- addons disponíveis para essa família no V0;
- livre escolha de cores permitidas pelo compositor de outfit.

### Economia local

- Uma única moeda de pull, obtida jogando hunts.
- Banner é um pool versionado de famílias de outfit.
- Raridade é cosmética e altera somente o peso do sorteio.
- Duplicata converte-se em `outfit_tokens`; nunca cria uma segunda instância do mesmo unlock.
- A cada 10 pulls, se ainda existir família bloqueada no banner, ao menos um resultado é novo.
- `outfit_tokens` compram diretamente famílias do mesmo catálogo.
- Não existe compra com dinheiro real no projeto pessoal.

### Modelo mínimo

```ts
export interface OutfitFamilyDefinition {
  id: `outfit:tibia:${string}`;
  displayName: string;
  lookTypes: readonly number[];
  rarity: "common" | "rare" | "epic" | "legendary";
  tokenCost: number;
  sourceSnapshot: string;
}

export interface OutfitCollectionState {
  unlockedFamilyIds: readonly OutfitFamilyDefinition["id"][];
  outfitTokens: number;
  pullsSinceGuaranteedNew: number;
}
```

O resultado do pull é gravado em transação única no save local: consumo de moeda, unlock ou
conversão da duplicata, contador de garantia e registro do resultado.

## Persistência e confiança

No V0 pessoal, modificar o próprio save não é ameaça de produto. O objetivo é impedir corrupção e
duplicação acidental, não impedir o proprietário do dispositivo de editar seus dados.

- `SaveRepository` é interface; IndexedDB é a primeira implementação.
- Save possui `schemaVersion`, migrations e backup exportável.
- Toda operação de gacha é atômica em uma transação IndexedDB.
- O estado salvo pertence à simulação; Phaser e DOM não são serializados.
- Import/export manual serve a backup, replay e depuração.
- `transact` recebe `SaveDraft`, o espelho mutável de `GameSave`; a forma, os quatro
  métodos e a semântica do contrato continuam os mesmos.

Se surgir um produto, outra implementação de `SaveRepository` fala com um backend autoritativo. O
modelo de `run_id`, idempotência e ledger da ADR-001 volta a ser obrigatório nessa fase.

## Política de assets e builds

Dois perfis são definidos desde o início:

| Perfil | Pode conter assets proprietários | Distribuição |
|---|---:|---|
| `personal` | sim | máquina local, rede privada e backups pessoais |
| `product` | não | bloqueado enquanto qualquer dependência visual restrita permanecer |

Todo grupo de asset possui `source`, `sourceSnapshot`, `licenseClass` e `buildProfiles`. O build
`product` falha se resolver uma entrada `licenseClass: "cipsoft-personal"`.

Isso não transforma o V0 em produto licenciável; apenas preserva uma fronteira barata de troca. A
licença GPL do Canary e as licenças de ferramentas continuam sendo tratadas separadamente da
propriedade dos assets do cliente.

## Asset loading e performance

O catálogo completo é fonte de importação, não payload inicial. Cada hunt gera um pacote fechado:

```text
public/assets/personal/packs/<hunt-id>/
  pack.json
  terrain.webp
  objects.webp
  creatures.webp
  effects.webp
```

- boot contém apenas shell, UI essencial e outfit equipado;
- selecionar uma hunt dispara preload do pacote dela;
- atlases são versionados por hash;
- IDs ausentes falham no validador, não silenciosamente no runtime;
- filtering, escala e pivô são definidos no manifesto;
- o budget de primeiro estado acionável continua sendo até 5 s em Fast 4G simulado.

## Mapa

OTBM e materiais do RME são formatos de entrada, nunca formatos de runtime. O pipeline extrai a
região da hunt do mapa Canary e produz JSON normalizado. Tiled pode ser usado como ferramenta de
inspeção ou correção, mas o V0 não exige redesenhar a hunt.

Camadas mínimas:

- `ground`;
- `objectsBelow`;
- `objectsAbove`;
- `collision`;
- `spawns`;
- `transitions`.

## O que está explicitamente fora do V0

- arte, biomas, criaturas ou bosses Kaezan novos;
- gacha de personagem, arma, item, spell ou poder;
- monetização real;
- marketplace, trade, PvP, guilda e chat;
- backend, conta online e banco de dados;
- importação de todas as hunts antes de uma funcionar ponta a ponta;
- scraping de TibiaRoute em runtime;
- reprodução completa do cliente Tibia antes do primeiro playtest.

## Critério de sucesso

O V0 está validado quando uma pessoa consegue, em browser local:

1. escolher uma hunt importada;
2. entrar com uma vocação/outfit existentes;
3. mover, lutar, matar criaturas e receber loot segundo o subconjunto Canary implementado;
4. concluir ou abandonar a sessão sem corromper o save;
5. ganhar moeda cosmética, realizar pulls e trocar de outfit;
6. recarregar a página e recuperar progresso, coleção e outfit equipado;
7. repetir a mesma seed em teste e obter o mesmo resultado de simulação.

## Consequências

### Ganhos

- elimina produção de conteúdo e arte como bloqueio do V0;
- reduz o gacha a uma coleção cosmética auditável;
- permite validar diversão antes de qualquer investimento de produto;
- mantém a troca futura da apresentação atrás de manifestos e providers;
- transforma o catálogo Tibia em fonte sob demanda, sem carregar tudo no browser.

### Custos aceitos

- o V0 é pessoal e não pode ser promovido como produto distribuível;
- importadores e packers precisam lidar com formatos legados;
- fidelidade total ao Canary é incremental: cada playbook fecha um subconjunto vertical verificável;
- eventual produto exigirá arte nova e retorno da autoridade econômica de servidor.
