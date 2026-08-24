# PB-01 Catalog

- Slice: fixture:pb-01-contract-coverage
- Content version: pb-01-contract-coverage-v1
- Snapshot: 157e6f9e21318bd3033eea553fe9275b429faf72
- Roots: creature:tibia:amazon, creature:tibia:orc-shaman, creature:tibia:rotworm, spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:wound-cleansing, vocation:tibia:knight
- Dependencies: creature:tibia:snake, item:tibia:book, item:tibia:broken-shamanic-staff, item:tibia:brown-bread, item:tibia:chain-armor, item:tibia:corncob, item:tibia:crystal-necklace, item:tibia:dagger, item:tibia:girlish-hair-decoration, item:tibia:gold-coin, item:tibia:ham, item:tibia:heavy-old-tome, item:tibia:legion-helmet, item:tibia:lump-of-dirt, item:tibia:mace, item:tibia:meat, item:tibia:orc-leather, item:tibia:orc-tooth, item:tibia:protective-charm, item:tibia:sabre, item:tibia:shamanic-hood, item:tibia:skull, item:tibia:small-ruby, item:tibia:spear, item:tibia:sword, item:tibia:torch, item:tibia:wand-of-decay, item:tibia:worm

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

### creature:tibia:orc-shaman

- Kind: creature
- GUID: 0a8571b6-59d7-50b8-8286-1dfe0fd7f963
- Display name: Orc Shaman
- Facets: identity, stats, appearance, combat, loot
- Consumer: creature contract tests
- Rationale: The root covers elemental, area, healing, summon, and loot forms.
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data-otservbr-global/monster/humanoids/orc_shaman.lua / 6 / cf3fee52b211b9f4b18dc7da2bfbf257e816542a320491b3817a883cfbe17864
- Relations: creature:tibia:snake, item:tibia:book, item:tibia:broken-shamanic-staff, item:tibia:chain-armor, item:tibia:corncob, item:tibia:gold-coin, item:tibia:heavy-old-tome, item:tibia:orc-leather, item:tibia:orc-tooth, item:tibia:shamanic-hood, item:tibia:spear, item:tibia:wand-of-decay

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

### item:tibia:book

- Kind: item
- GUID: b88c6eba-dd05-56ed-9ba9-3ef19bbb6e7b
- Display name: book
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 2824 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### item:tibia:chain-armor

- Kind: item
- GUID: 5c55f130-4e11-5534-acee-75e75987d066
- Display name: chain armor
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3358 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### item:tibia:crystal-necklace

- Kind: item
- GUID: 79aafb96-5486-5fbc-a9b8-4e4dc781b4f4
- Display name: crystal necklace
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3008 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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
- Rationale: Required by creature:tibia:amazon, creature:tibia:orc-shaman, creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3031 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### item:tibia:heavy-old-tome

- Kind: item
- GUID: 1b946230-e40d-53e8-9d14-d1f5b5c440a8
- Display name: heavy old tome
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
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

### item:tibia:lump-of-dirt

- Kind: item
- GUID: de1fc1fa-f0fe-5661-8b55-9ad5ea2d43db
- Display name: lump of dirt
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 9692 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### item:tibia:meat

- Kind: item
- GUID: b7e65ad4-e993-56d3-b107-9fb3bbfc9ef1
- Display name: meat
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:rotworm loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3577 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:orc-leather

- Kind: item
- GUID: a6909d12-d58f-519e-a210-95ee032b89d3
- Display name: orc leather
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 11479 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:orc-tooth

- Kind: item
- GUID: 227c47df-673a-5f37-9d0a-34fca2c7c5ea
- Display name: orc tooth
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 10196 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### item:tibia:sabre

- Kind: item
- GUID: 92f5f3a0-41d3-58c3-b797-d87ac59169c0
- Display name: sabre
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3273 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### item:tibia:skull

- Kind: item
- GUID: fe5dbb69-12a4-5a4a-ade3-3a0eb7e266a9
- Display name: skull
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:amazon loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3114 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### item:tibia:spear

- Kind: item
- GUID: 6661818c-03a4-56d1-9fcf-152594a64d83
- Display name: spear
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3277 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
- Relations: none

### item:tibia:sword

- Kind: item
- GUID: bf749ad4-7f98-5777-8b65-39a515150871
- Display name: sword
- Facets: identity, item
- Consumer: frozen character sheet
- Rationale: Required by character:huntbound:knight-venore-rotworm-cave, creature:tibia:rotworm
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

### item:tibia:wand-of-decay

- Kind: item
- GUID: bbf16d6e-5b90-5e2d-a2f8-5fd7e4cdc889
- Display name: wand of decay
- Facets: identity, item
- Consumer: creature contract tests
- Rationale: Required by creature:tibia:orc-shaman loot
- Source: 157e6f9e21318bd3033eea553fe9275b429faf72 / data/items/items.xml / 3072 / b339e0ab5f7eec1d766aa2c09c1c0e74a2747e2a4e70a72e1b74f159f7b80ed8
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

### character:huntbound:knight-venore-rotworm-cave

- Vocation: vocation:tibia:knight
- Level: 35
- Skills: magic 0, sword 60
- Weapon: item:tibia:sword attack 14
- Vitals: health 590, mana 185
- Active spells: spell:tibia:berserk, spell:tibia:brutal-strike, spell:tibia:wound-cleansing
