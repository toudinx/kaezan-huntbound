# PB-01 Catalog

- Slice: fixture:pb-01-contract-coverage
- Content version: pb-01-contract-coverage-v1
- Snapshot: 157e6f9e21318bd3033eea553fe9275b429faf72
- Roots: creature:tibia:amazon, creature:tibia:cyclops, creature:tibia:dragon, creature:tibia:hero, creature:tibia:orc, creature:tibia:orc-shaman, creature:tibia:orc-spearman, creature:tibia:rotworm, spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:groundshaker, spell:tibia:whirlwind-throw, spell:tibia:wound-cleansing, vocation:tibia:knight
- Dependencies: creature:tibia:snake, item:tibia:arrow, item:tibia:axe, item:tibia:battle-shield, item:tibia:book, item:tibia:bow, item:tibia:broadsword, item:tibia:broken-shamanic-staff, item:tibia:brown-bread, item:tibia:burst-arrow, item:tibia:chain-armor, item:tibia:club-ring, item:tibia:corncob, item:tibia:crossbow, item:tibia:crown-armor, item:tibia:crown-helmet, item:tibia:crown-legs, item:tibia:crown-shield, item:tibia:crystal-necklace, item:tibia:cyclops-toe, item:tibia:cyclops-trophy, item:tibia:dagger, item:tibia:dark-helmet, item:tibia:double-axe, item:tibia:dragon-ham, item:tibia:dragon-hammer, item:tibia:dragon-s-tail, item:tibia:dragon-shield, item:tibia:dragonbone-staff, item:tibia:fire-sword, item:tibia:girlish-hair-decoration, item:tibia:gold-coin, item:tibia:grapes, item:tibia:great-health-potion, item:tibia:green-dragon-leather, item:tibia:green-dragon-scale, item:tibia:green-tunic, item:tibia:halberd, item:tibia:ham, item:tibia:health-potion, item:tibia:heavy-old-tome, item:tibia:legion-helmet, item:tibia:life-crystal, item:tibia:longsword, item:tibia:lump-of-dirt, item:tibia:lyre, item:tibia:mace, item:tibia:machete, item:tibia:meat, item:tibia:might-ring, item:tibia:orc-leather, item:tibia:orc-tooth, item:tibia:piggy-bank, item:tibia:plate-legs, item:tibia:plate-shield, item:tibia:protective-charm, item:tibia:red-piece-of-cloth, item:tibia:red-rose, item:tibia:rope, item:tibia:sabre, item:tibia:scarf, item:tibia:scroll, item:tibia:scroll-of-heroic-deeds, item:tibia:serpent-sword, item:tibia:shamanic-hood, item:tibia:short-sword, item:tibia:skull, item:tibia:small-diamond, item:tibia:small-notebook, item:tibia:small-ruby, item:tibia:sniper-arrow, item:tibia:spear, item:tibia:steel-helmet, item:tibia:steel-shield, item:tibia:strong-health-potion, item:tibia:studded-armor, item:tibia:studded-helmet, item:tibia:studded-legs, item:tibia:studded-shield, item:tibia:sword, item:tibia:torch, item:tibia:two-handed-sword, item:tibia:wand-of-decay, item:tibia:wand-of-inferno, item:tibia:war-hammer, item:tibia:wedding-ring, item:tibia:wolf-tooth-chain, item:tibia:worm

## Entities

### creature:tibia:amazon

- Kind: creature
- GUID: 9951ea01-6349-558a-8358-40a5899e38fd
- Display name: Amazon
- Facets: identity, stats, appearance, combat, loot
- Consumer: creature contract tests
- Rationale: The root covers melee and ranged physical combat with a projectile.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/humans/amazon.lua / 77 / 9792a709311c8281217bffa343e2c9579a8ae631bd69f9c0a8665a6d469cca7b
- Relations: item:tibia:brown-bread, item:tibia:crystal-necklace, item:tibia:dagger, item:tibia:girlish-hair-decoration, item:tibia:gold-coin, item:tibia:protective-charm, item:tibia:sabre, item:tibia:skull, item:tibia:small-ruby, item:tibia:torch

### creature:tibia:cyclops

- Kind: creature
- GUID: 45e26c3c-3889-58ea-972c-0fc417050cb7
- Display name: Cyclops
- Facets: identity, stats, appearance, combat, loot
- Consumer: Cyclopolis hunt and creature contract tests
- Rationale: The root covers the frozen heavy melee creature, appearance, combat, and loot. Lua armor 17 is provenance only and stays inert until PB-11.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/giants/cyclops.lua / 22 / 17ffa298767933be8c5284fe98f81dba8e27d7a384d387d85e9d243a6426707f
- Relations: item:tibia:battle-shield, item:tibia:club-ring, item:tibia:cyclops-toe, item:tibia:cyclops-trophy, item:tibia:dark-helmet, item:tibia:gold-coin, item:tibia:halberd, item:tibia:health-potion, item:tibia:heavy-old-tome, item:tibia:meat, item:tibia:plate-shield, item:tibia:short-sword, item:tibia:wolf-tooth-chain

### creature:tibia:dragon

- Kind: creature
- GUID: 43ea204a-8abc-5afb-af6d-1ea7f7e9ab64
- Display name: Dragon
- Facets: identity, stats, appearance, combat, loot
- Consumer: Dragon Lair hunt and creature contract tests
- Rationale: The root covers melee, fire area of radius 4, healing, unused fire immunity until PB-11, and loot. The length/spread wave is omitted until AbilityShape supports wave.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/dragons/dragon.lua / 34 / 5cf359b04cd7ac0ca47d552c35f224d635d643733af834418c82de22af736ef6
- Relations: item:tibia:broadsword, item:tibia:burst-arrow, item:tibia:crossbow, item:tibia:double-axe, item:tibia:dragon-ham, item:tibia:dragon-hammer, item:tibia:dragon-s-tail, item:tibia:dragon-shield, item:tibia:dragonbone-staff, item:tibia:gold-coin, item:tibia:green-dragon-leather, item:tibia:green-dragon-scale, item:tibia:life-crystal, item:tibia:longsword, item:tibia:plate-legs, item:tibia:serpent-sword, item:tibia:small-diamond, item:tibia:steel-helmet, item:tibia:steel-shield, item:tibia:strong-health-potion, item:tibia:wand-of-inferno

### creature:tibia:hero

- Kind: creature
- GUID: 04a09207-87f9-56d5-a620-c45a10205faf
- Display name: Hero
- Facets: identity, stats, appearance, combat, loot
- Consumer: Hero Cave hunt and creature contract tests
- Rationale: The root covers dual melee/ranged physical combat, healing, armor provenance, and loot.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/humans/hero.lua / 73 / 8c7add3d9e2baf5ab0e91934588d0e59f3b309a48d46d2f181605297220cb089
- Relations: item:tibia:arrow, item:tibia:bow, item:tibia:crown-armor, item:tibia:crown-helmet, item:tibia:crown-legs, item:tibia:crown-shield, item:tibia:fire-sword, item:tibia:gold-coin, item:tibia:grapes, item:tibia:great-health-potion, item:tibia:green-tunic, item:tibia:lyre, item:tibia:meat, item:tibia:might-ring, item:tibia:piggy-bank, item:tibia:red-piece-of-cloth, item:tibia:red-rose, item:tibia:rope, item:tibia:scarf, item:tibia:scroll, item:tibia:scroll-of-heroic-deeds, item:tibia:small-notebook, item:tibia:sniper-arrow, item:tibia:two-handed-sword, item:tibia:war-hammer, item:tibia:wedding-ring

### creature:tibia:orc

- Kind: creature
- GUID: 73bf7bad-3f26-5e8f-9e1e-2b58173b3300
- Display name: Orc
- Facets: identity, stats, appearance, combat, loot
- Consumer: PB-10 Orc Fortress hunt
- Rationale: The root covers the selected Orc Fortress melee creature, defenses, appearance, and loot.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/humanoids/orc.lua / 5 / fc649f2e6dd8c264f9d6537e2f001c7869e7418276aef14ce538a5676f09c086
- Relations: item:tibia:axe, item:tibia:gold-coin, item:tibia:heavy-old-tome, item:tibia:meat, item:tibia:orc-leather, item:tibia:orc-tooth, item:tibia:sabre, item:tibia:studded-armor, item:tibia:studded-helmet, item:tibia:studded-shield

### creature:tibia:orc-shaman

- Kind: creature
- GUID: 0a8571b6-59d7-50b8-8286-1dfe0fd7f963
- Display name: Orc Shaman
- Facets: identity, stats, appearance, combat, loot
- Consumer: creature contract tests
- Rationale: The root covers elemental, area, healing, summon, and loot forms.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/humanoids/orc_shaman.lua / 6 / cf3fee52b211b9f4b18dc7da2bfbf257e816542a320491b3817a883cfbe17864
- Relations: creature:tibia:snake, item:tibia:book, item:tibia:broken-shamanic-staff, item:tibia:chain-armor, item:tibia:corncob, item:tibia:gold-coin, item:tibia:heavy-old-tome, item:tibia:orc-leather, item:tibia:orc-tooth, item:tibia:shamanic-hood, item:tibia:spear, item:tibia:wand-of-decay

### creature:tibia:orc-spearman

- Kind: creature
- GUID: 1ff76234-9455-5865-9cf3-fb61d95f3dbb
- Display name: Orc Spearman
- Facets: identity, stats, appearance, combat, loot
- Consumer: PB-10 Orc Fortress hunt
- Rationale: The root covers the selected Orc Fortress ranged creature, appearance, combat, and loot.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/humanoids/orc_spearman.lua / 50 / 70ecf85eb75432c161b1537e7e4c9db429d204cbb749cb4e4fc7f1a71b9b58d0
- Relations: item:tibia:gold-coin, item:tibia:heavy-old-tome, item:tibia:machete, item:tibia:meat, item:tibia:orc-leather, item:tibia:orc-tooth, item:tibia:spear, item:tibia:studded-helmet, item:tibia:studded-legs

### creature:tibia:rotworm

- Kind: creature
- GUID: 9a8dd398-e67b-5a98-be03-3406bd581cf9
- Display name: Rotworm
- Facets: identity, stats, appearance, combat, loot
- Consumer: creature contract tests
- Rationale: The root covers melee, defense, and mixed ID/name loot resolution.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/vermins/rotworm.lua / 26 / f75ed297cd851013cde4e991113bf2d67ab9930852f20fb0c4e8d0937ddb176b
- Relations: item:tibia:gold-coin, item:tibia:ham, item:tibia:legion-helmet, item:tibia:lump-of-dirt, item:tibia:mace, item:tibia:meat, item:tibia:sword, item:tibia:worm

### creature:tibia:snake

- Kind: creature
- GUID: a6885227-b735-54a4-a56b-2ebe53d7ae43
- Display name: Snake
- Facets: identity, stats, appearance, combat, conditions
- Consumer: summon and condition contract tests
- Rationale: The dependency is needed as Orc Shaman's summon target and poison condition example; its loot is excluded.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/reptiles/snake.lua / 28 / e626dc3591330481f37e1e3703afe67bf89a93771c42ccbd46ad59f0690ca48b
- Relations: none

### item:tibia:arrow

- Kind: item
- GUID: 7d0d7331-6f27-59e3-b40e-eeaab8183c1c
- Display name: arrow
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3447 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:axe

- Kind: item
- GUID: 506ce82f-8e1e-52a2-9f94-5470e45dc84a
- Display name: axe
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3274 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:battle-shield

- Kind: item
- GUID: 492cdaa1-20b6-59ba-8ffa-634115d7b524
- Display name: battle shield
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3413 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:book

- Kind: item
- GUID: b88c6eba-dd05-56ed-9ba9-3ef19bbb6e7b
- Display name: book
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 2824 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:bow

- Kind: item
- GUID: b09a1630-d902-5939-af6b-70d93172ec18
- Display name: bow
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3350 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:broadsword

- Kind: item
- GUID: b39d45fe-405a-56d7-9412-c587251e9aa4
- Display name: broadsword
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3301 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:broken-shamanic-staff

- Kind: item
- GUID: fd3c90c2-d0e9-5229-b3f8-c3c0d97939ed
- Display name: broken shamanic staff
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11452 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:brown-bread

- Kind: item
- GUID: aa165cb5-c226-5d87-9ab4-5914d87c2e69
- Display name: brown bread
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3602 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:burst-arrow

- Kind: item
- GUID: e402d338-b42f-58df-a062-034e7ce3871d
- Display name: burst arrow
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3449 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:chain-armor

- Kind: item
- GUID: 5c55f130-4e11-5534-acee-75e75987d066
- Display name: chain armor
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3358 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:club-ring

- Kind: item
- GUID: 1fd19132-0818-512c-a2d3-6b8f0f047631
- Display name: club ring
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3093 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:corncob

- Kind: item
- GUID: 95cca62a-acc8-5f9a-95fc-c41491b9fe9d
- Display name: corncob
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3597 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:crossbow

- Kind: item
- GUID: 7b7056d3-8347-5568-831c-9c911063e755
- Display name: crossbow
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3349 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:crown-armor

- Kind: item
- GUID: 3f2e4c53-f5d3-5877-8f31-a4cd80a55ae8
- Display name: crown armor
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3381 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:crown-helmet

- Kind: item
- GUID: 4a2bacb3-5bf5-581f-9db5-d935a88b5d33
- Display name: crown helmet
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3385 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:crown-legs

- Kind: item
- GUID: 91d51291-ac02-5784-9ef4-1995c005f45e
- Display name: crown legs
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3382 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:crown-shield

- Kind: item
- GUID: d3e7ef21-36d2-538e-858f-29bf42ff0300
- Display name: crown shield
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3419 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:crystal-necklace

- Kind: item
- GUID: 79aafb96-5486-5fbc-a9b8-4e4dc781b4f4
- Display name: crystal necklace
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3008 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:cyclops-toe

- Kind: item
- GUID: 9daa9181-e1b2-540d-9e2d-e8e6bc4c516a
- Display name: cyclops toe
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 9657 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:cyclops-trophy

- Kind: item
- GUID: 3b667f0e-6d43-5ae5-810f-f644b8df7d5a
- Display name: cyclops trophy
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 7398 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:dagger

- Kind: item
- GUID: 62920b08-9390-59b1-b6cf-d3dd39dec5cb
- Display name: dagger
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3267 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:dark-helmet

- Kind: item
- GUID: 3c15ad95-774f-511a-8b1f-a8d519e19901
- Display name: dark helmet
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3384 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:double-axe

- Kind: item
- GUID: e67617cb-7fb2-5bc6-b932-321746415005
- Display name: double axe
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3275 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:dragon-ham

- Kind: item
- GUID: d53bf7e5-39eb-5cbe-a9e5-ae22ebe6cd41
- Display name: dragon ham
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3583 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:dragon-hammer

- Kind: item
- GUID: 59a413ce-a1d6-52b8-812c-27e5b329f6f6
- Display name: dragon hammer
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3322 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:dragon-s-tail

- Kind: item
- GUID: 491833f9-36f2-50df-8125-1eadef4ada08
- Display name: dragon's tail
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11457 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:dragon-shield

- Kind: item
- GUID: e1838947-4d8f-5488-8858-bef65048382a
- Display name: dragon shield
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3416 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:dragonbone-staff

- Kind: item
- GUID: a08aacec-f589-5ed1-93b3-3fe7ee82e2b7
- Display name: dragonbone staff
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 7430 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:fire-sword

- Kind: item
- GUID: cfb2627e-06b6-52a9-9ad4-d471dcc13bb6
- Display name: fire sword
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3280 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:girlish-hair-decoration

- Kind: item
- GUID: 33858c73-a992-59c8-b38b-1c6c3171084d
- Display name: girlish hair decoration
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11443 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:gold-coin

- Kind: item
- GUID: 78974d81-ae2d-5ba6-855e-04d1909ab11a
- Display name: gold coin
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon, creature:tibia:cyclops, creature:tibia:dragon, creature:tibia:hero, creature:tibia:orc, creature:tibia:orc-shaman, creature:tibia:orc-spearman, creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3031 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:grapes

- Kind: item
- GUID: 16e3705a-3b55-5b72-8fdd-af8b67e328e0
- Display name: grapes
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3592 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:great-health-potion

- Kind: item
- GUID: 3e5a218d-c267-5371-90b5-ffd9187240e0
- Display name: great health potion
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 239 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:green-dragon-leather

- Kind: item
- GUID: b6848a9b-35aa-5110-9985-f10817cae9b4
- Display name: green dragon leather
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 5877 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:green-dragon-scale

- Kind: item
- GUID: 6f8cf89b-6c75-510a-bfba-fb6e8954203b
- Display name: green dragon scale
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 5920 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:green-tunic

- Kind: item
- GUID: ab76f91e-180a-5969-8526-20fa3957ce59
- Display name: green tunic
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3563 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:halberd

- Kind: item
- GUID: 293d653c-74df-5fc4-8378-d703a159469b
- Display name: halberd
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3269 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:ham

- Kind: item
- GUID: 2d2e73ae-8e64-5bb2-a74e-8f208c3135a6
- Display name: ham
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3582 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:health-potion

- Kind: item
- GUID: 70b90237-99dc-56e6-8632-873995ad461f
- Display name: health potion
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 266 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:heavy-old-tome

- Kind: item
- GUID: 1b946230-e40d-53e8-9d14-d1f5b5c440a8
- Display name: heavy old tome
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops, creature:tibia:orc, creature:tibia:orc-shaman, creature:tibia:orc-spearman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 23986 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:legion-helmet

- Kind: item
- GUID: 9ac9eaf4-f708-51fb-b487-b673d2b3f216
- Display name: legion helmet
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3374 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:life-crystal

- Kind: item
- GUID: d75e46a9-fd3f-5929-87fb-1cf5f925b233
- Display name: life crystal
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3061 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:longsword

- Kind: item
- GUID: 85322a32-7464-5071-8d0d-6df837e1a814
- Display name: longsword
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3285 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:lump-of-dirt

- Kind: item
- GUID: de1fc1fa-f0fe-5661-8b55-9ad5ea2d43db
- Display name: lump of dirt
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 9692 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:lyre

- Kind: item
- GUID: c76eb496-66a9-5d2f-ab76-083a09497688
- Display name: lyre
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 2949 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:mace

- Kind: item
- GUID: a3fd722f-8cb4-50f0-9c6b-aa685e5ae879
- Display name: mace
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3286 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:machete

- Kind: item
- GUID: 18160bae-520c-5a9e-91c3-bd28d86a8077
- Display name: machete
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-spearman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3308 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:meat

- Kind: item
- GUID: b7e65ad4-e993-56d3-b107-9fb3bbfc9ef1
- Display name: meat
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops, creature:tibia:hero, creature:tibia:orc, creature:tibia:orc-spearman, creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3577 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:might-ring

- Kind: item
- GUID: 78b7332c-ef6c-58b6-8d3c-cb10b1d6e06e
- Display name: might ring
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3048 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:orc-leather

- Kind: item
- GUID: a6909d12-d58f-519e-a210-95ee032b89d3
- Display name: orc leather
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc, creature:tibia:orc-shaman, creature:tibia:orc-spearman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11479 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:orc-tooth

- Kind: item
- GUID: 227c47df-673a-5f37-9d0a-34fca2c7c5ea
- Display name: orc tooth
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc, creature:tibia:orc-shaman, creature:tibia:orc-spearman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 10196 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:piggy-bank

- Kind: item
- GUID: 27d5d8a7-0567-5f8c-a0c2-2fbff6795ef0
- Display name: piggy bank
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 2995 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:plate-legs

- Kind: item
- GUID: f4956724-8160-5003-953f-07d65e3d3d66
- Display name: plate legs
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3557 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:plate-shield

- Kind: item
- GUID: 27db3338-2160-528a-9e7d-7897dc71ccbf
- Display name: plate shield
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3410 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:protective-charm

- Kind: item
- GUID: 5a8300ad-7bff-5a20-8fb4-b3a518ca3dbf
- Display name: protective charm
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11444 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:red-piece-of-cloth

- Kind: item
- GUID: e98d3231-734a-57df-b607-f9fb003fa0a2
- Display name: red piece of cloth
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 5911 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:red-rose

- Kind: item
- GUID: e4fd316d-0326-5666-97ac-853e61f47f3e
- Display name: red rose
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3658 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:rope

- Kind: item
- GUID: 87a2c372-798e-5576-9c46-817613561293
- Display name: rope
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3003 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:sabre

- Kind: item
- GUID: 92f5f3a0-41d3-58c3-b797-d87ac59169c0
- Display name: sabre
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon, creature:tibia:orc loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3273 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:scarf

- Kind: item
- GUID: c1f5d5eb-0152-504d-884b-a06f55b7b7ba
- Display name: scarf
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3572 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:scroll

- Kind: item
- GUID: ebc51d34-b7c8-55c1-a20b-0f3aeef9e592
- Display name: scroll
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 2815 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:scroll-of-heroic-deeds

- Kind: item
- GUID: b86fcd56-807d-5072-a6ec-70d72c1ab81f
- Display name: scroll of heroic deeds
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11510 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:serpent-sword

- Kind: item
- GUID: 27d3c20c-0697-50f4-b77d-363df971b2ba
- Display name: serpent sword
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3297 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:shamanic-hood

- Kind: item
- GUID: 008f3f02-e124-51cf-872a-6d7fc5678769
- Display name: shamanic hood
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11478 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:short-sword

- Kind: item
- GUID: a7e983ac-c95f-529b-9fe7-7a84d4a9b04a
- Display name: short sword
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3294 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:skull

- Kind: item
- GUID: fe5dbb69-12a4-5a4a-ade3-3a0eb7e266a9
- Display name: skull
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3114 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:small-diamond

- Kind: item
- GUID: feef3d9d-4f61-591a-87f1-2b1e1ef4a348
- Display name: small diamond
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3028 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:small-notebook

- Kind: item
- GUID: aef133b2-f01c-5bb0-bec9-65733a115d03
- Display name: small notebook
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11450 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:small-ruby

- Kind: item
- GUID: 403dad1a-2cb4-5ecd-bd31-4b77f91247e2
- Display name: small ruby
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3030 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:sniper-arrow

- Kind: item
- GUID: 4d2834fc-fb95-527b-a2f2-7d2073bc9dd0
- Display name: sniper arrow
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 7364 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:spear

- Kind: item
- GUID: 6661818c-03a4-56d1-9fcf-152594a64d83
- Display name: spear
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman, creature:tibia:orc-spearman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3277 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:steel-helmet

- Kind: item
- GUID: d3c7305e-d876-579a-851a-2937199813be
- Display name: steel helmet
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3351 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:steel-shield

- Kind: item
- GUID: 985fe1c8-80d5-50b8-bd28-1741a9b2a74a
- Display name: steel shield
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3409 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:strong-health-potion

- Kind: item
- GUID: 57c26843-0c8a-5d2a-b13c-d5e0657eb7f6
- Display name: strong health potion
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 236 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:studded-armor

- Kind: item
- GUID: 1b8eb516-3578-536d-8dca-b4b12bd239a3
- Display name: studded armor
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3378 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:studded-helmet

- Kind: item
- GUID: 61783ef5-0d81-5a6e-bd01-ae08625dcba4
- Display name: studded helmet
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc, creature:tibia:orc-spearman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3376 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:studded-legs

- Kind: item
- GUID: afbeb0dd-743b-5397-930f-05376b2445a1
- Display name: studded legs
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-spearman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3362 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:studded-shield

- Kind: item
- GUID: 7b552e76-614d-5669-b3eb-1a9f8bf5bfec
- Display name: studded shield
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3426 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:sword

- Kind: item
- GUID: bf749ad4-7f98-5777-8b65-39a515150871
- Display name: sword
- Facets: identity, item
- Consumer: frozen character sheet
- Rationale: Required by character:huntbound:knight-cyclopolis, character:huntbound:knight-dragon-lair, character:huntbound:knight-orc-fortress, character:huntbound:knight-venore-rotworm-cave, creature:tibia:rotworm
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3264 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:torch

- Kind: item
- GUID: 377a1ce3-3b2c-58eb-9f25-ee2cb4271a26
- Display name: torch
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 2920 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:two-handed-sword

- Kind: item
- GUID: 9bb399fd-826f-5791-8b2b-212049d6ac44
- Display name: two handed sword
- Facets: identity, item
- Consumer: frozen character sheet
- Rationale: Required by character:huntbound:knight-hero-cave, creature:tibia:hero
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3265 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:wand-of-decay

- Kind: item
- GUID: bbf16d6e-5b90-5e2d-a2f8-5fd7e4cdc889
- Display name: wand of decay
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3072 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:wand-of-inferno

- Kind: item
- GUID: f9705f47-1571-5d90-b258-784fbe606aa7
- Display name: wand of inferno
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:dragon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3071 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:war-hammer

- Kind: item
- GUID: 1942ff5e-eb96-57dd-93a5-16b794aadc3e
- Display name: war hammer
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3279 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:wedding-ring

- Kind: item
- GUID: 89965d61-d690-5a25-9214-3d498a61a31f
- Display name: wedding ring
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:hero loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3004 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:wolf-tooth-chain

- Kind: item
- GUID: 4c209a4e-dd6f-5eae-a00a-d162100416c3
- Display name: wolf tooth chain
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:cyclops loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3012 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:worm

- Kind: item
- GUID: e07a7da6-7a7c-5d43-ae97-5408ab753283
- Display name: worm
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3492 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### spell:tibia:berserk

- Kind: spell
- GUID: 48bec9e6-c6e6-5fd4-9d59-cc29a6478a4c
- Display name: Berserk
- Facets: identity, spell
- Consumer: spell contract tests
- Rationale: The root covers costs, cooldowns, area, formula, and vocation references.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/scripts/spells/attack/berserk.lua / 80 / 819b628608268aebea355be46a1d86e73c24bdf26d1299aa7d3e9af71d10f89f
- Relations: vocation-family:huntbound:knight

### spell:tibia:brutal-strike

- Kind: spell
- GUID: feedfed9-2e06-5521-98dd-fdb2512bc0e1
- Display name: Brutal Strike
- Facets: identity, spell
- Consumer: knight combat contract tests
- Rationale: The root covers the skill-attack-product formula and single-target knight strike.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/scripts/spells/attack/brutal_strike.lua / 61 / 08e00c322d9b0d8805f3f9b40776205d579c1481bd72667efbc85a99efbc62c3
- Relations: vocation-family:huntbound:knight

### spell:tibia:groundshaker

- Kind: spell
- GUID: e7171c40-91ff-5882-9b23-5fcfa380b475
- Display name: Groundshaker
- Facets: identity, spell
- Consumer: PB-08 Knight damage rotation
- Rationale: The root covers the radius-three area translation and skill-attack formula.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/scripts/spells/attack/groundshaker.lua / 106 / 779037e4a1a833cf533be5c0d52a3ced03bacb86b44d93d756fcaac1fcaa2e9e
- Relations: vocation-family:huntbound:knight

### spell:tibia:whirlwind-throw

- Kind: spell
- GUID: 57eda811-dec9-5b5e-b870-b99083671958
- Display name: Whirlwind Throw
- Facets: identity, spell
- Consumer: PB-08 Knight damage rotation
- Rationale: The root covers the five-tile target range, weapon distance effect, and skill-attack formula.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/scripts/spells/attack/whirlwind_throw.lua / 107 / a98632bf83f2828f29af86df80c36e07c682831778bbd90620537932a3e51769
- Relations: vocation-family:huntbound:knight

### spell:tibia:wound-cleansing

- Kind: spell
- GUID: bdf37570-5158-55ec-a5f7-09f38afba8f6
- Display name: Wound Cleansing
- Facets: identity, spell
- Consumer: knight combat contract tests
- Rationale: The root covers the level-magic healing formula.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/scripts/spells/healing/wound_cleansing.lua / 123 / e0a10fcce56a981a811fe18d687336cc1799cc76087b1d0bfd9a1b5f828e245b
- Relations: vocation-family:huntbound:knight

### vocation:tibia:knight

- Kind: vocation
- GUID: e3823a68-9f12-51e1-9b83-fde613163995
- Display name: Knight
- Facets: identity, progression
- Consumer: spell access and progression contract tests
- Rationale: The root covers vocation family membership, gains, speed, and skill multipliers.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/XML/vocations.xml / 4 / 693a179048d5d5c5af519459c8e542cd01013212af1cec88f7c8eb72634f4350
- Relations: none

## Characters

### character:huntbound:knight-cyclopolis

- Vocation: vocation:tibia:knight
- Level: 45
- Skills: magic 0, sword 60
- Weapon: item:tibia:sword attack 14
- Vitals: health 740, mana 185
- Active spells: spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:wound-cleansing, spell:tibia:groundshaker, spell:tibia:whirlwind-throw

### character:huntbound:knight-dragon-lair

- Vocation: vocation:tibia:knight
- Level: 70
- Skills: magic 0, sword 60
- Weapon: item:tibia:sword attack 14
- Vitals: health 1115, mana 185
- Active spells: spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:wound-cleansing, spell:tibia:groundshaker, spell:tibia:whirlwind-throw

### character:huntbound:knight-hero-cave

- Vocation: vocation:tibia:knight
- Level: 130
- Skills: magic 0, sword 90
- Weapon: item:tibia:two-handed-sword attack 30
- Vitals: health 2015, mana 645
- Active spells: spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:wound-cleansing, spell:tibia:groundshaker, spell:tibia:whirlwind-throw

### character:huntbound:knight-orc-fortress

- Vocation: vocation:tibia:knight
- Level: 25
- Skills: magic 0, sword 60
- Weapon: item:tibia:sword attack 14
- Vitals: health 440, mana 185
- Active spells: spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:wound-cleansing, spell:tibia:groundshaker, spell:tibia:whirlwind-throw

### character:huntbound:knight-venore-rotworm-cave

- Vocation: vocation:tibia:knight
- Level: 35
- Skills: magic 0, sword 60
- Weapon: item:tibia:sword attack 14
- Vitals: health 590, mana 185
- Active spells: spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:wound-cleansing, spell:tibia:groundshaker, spell:tibia:whirlwind-throw
