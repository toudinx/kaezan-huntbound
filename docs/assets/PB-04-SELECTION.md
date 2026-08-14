# PB-04 — seleção de assets da Venore Rotworm Cave

Esta seleção empacota os assets mínimos do hunt `hunt:tibia:venore-rotworm-cave`.
O metadata do hunt fica dentro da seleção padrão em `hunt`, e o pack usa o mesmo
`regionSha256` da região gerada para detectar seleção obsoleta.

## Chaves

A fonte das chaves é sempre `region.palette`; nenhuma chave de tile é escrita
manualmente. A região tem 138 posições de palette, das quais 137 são IDs reais.
O `serverId: 0` é o marcador void da região e é descartado antes da conversão
para a chave estável `tile:tibia:<clientId>`.

Além dos 137 tiles derivados, a seleção congela:

- `creature:tibia:rotworm` (`lookType: 26`)
- `outfit:tibia:knight` (`lookType: 131`)

O resultado tem 139 entradas, fica abaixo do limite de 512 entradas e usa o
limite de 6 MiB (`6291456` bytes). O hash da região é
`74bbd94a62c646be4115b1fa9ddf7ceced8dfba8cd3e7f90e2188a11e2a860f5`.

## Perfis e proveniência

O perfil `test` usa a fonte sintética versionada em
`packages/test-fixtures/assets/pb04/source`. Cada entrada aponta para o PNG
transparente 1×1 de 68 bytes, permitindo testar seleção, source lock e pack sem
armazenar arte real.

O perfil `product` é derivado do fixture sintético. A política de produto
continua rejeitando qualquer grupo com licença `cipsoft-personal`; o perfil
privado só pode ser construído fora do repositório com
`HUNTBOUND_PERSONAL_ASSET_SOURCE` apontando para a fonte autorizada. A mídia
privada nunca é copiada para este repositório.

Medições registradas no fixture atual:

| perfil | entradas | mídias deduplicadas | bytes das entradas | bytes da árvore | sha256 do pack |
| --- | ---: | ---: | ---: | ---: | --- |
| test | 139 | 1 | 9452 | 83469 | `a742cb5f38490cb7eac134ccabc5c283f8b066d2d82f86164efc72af951ddb30` |
| personal | 139 | 138 | 762410 | 845403 | `ba47b6b07980483e296cc12e05df87c4745877d7e4deddf60f9f007efc00bf2b` |

Os source locks registram manifest, snapshot, licença, perfil permitido e
hashes dos arquivos. O lock privado registra apenas caminhos lógicos relativos
e metadados; não contém caminho absoluto nem mídia pessoal.

## Gates

```text
corepack pnpm assets:pb04:artifacts:check
corepack pnpm assets:pb04:pack:check
corepack pnpm assets:pb04:profile:check
corepack pnpm assets:pb04:hunt:check
corepack pnpm assets:pb04:personal:check
```

O último comando exige a fonte privada configurada. O verificador de hunt
detecta chaves ausentes, inesperadas, budget excedido e `regionSha256` stale.
