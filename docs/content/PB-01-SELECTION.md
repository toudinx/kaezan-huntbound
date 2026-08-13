# PB-01 — Seleção curada e fechamento de proveniência

O slice `fixture:pb-01-contract-coverage` é uma prova de cobertura dos contratos de conteúdo. Ele
não representa uma hunt e não autoriza importar o catálogo Canary inteiro.

## Raízes congeladas

| Stable key | Source ID | Facets | Razão principal |
|---|---:|---|---|
| `vocation:tibia:knight` | `4` | `identity`, `progression` | família, ganhos, velocidade e multiplicadores |
| `spell:tibia:berserk` | `80` | `identity`, `spell` | custo, cooldown, área, fórmula e vocações |
| `creature:tibia:rotworm` | `26` | `identity`, `stats`, `appearance`, `combat`, `loot` | melee, defesa e loot misto |
| `creature:tibia:amazon` | `77` | `identity`, `stats`, `appearance`, `combat`, `loot` | melee e ataque físico à distância |
| `creature:tibia:orc-shaman` | `6` | `identity`, `stats`, `appearance`, `combat`, `loot` | dano elemental, área, cura, summon e loot |

Snake não é raiz. A criatura `creature:tibia:snake`, source ID `28`, entra somente como dependência
alcançável do summon do Orc Shaman e recebe `identity`, `stats`, `appearance`, `combat` e
`conditions`; seu loot fica fora do slice.

## Proveniência

O manifesto de origem versionado em
`packages/content/src/sources/canary-157e6f9e.json` fixa o commit
`157e6f9e21318bd3033eea553fe9275b429faf72`, os sete paths reais e seus SHA-256. A licença é registrada
como `GPL-2.0-only`, com `LICENSE` e seu SHA-256. A ferramenta
`tools/content-catalog/source/verifySourceLock.ts` usa o snapshot local somente para verificar commit,
confinamento por `realpath`, tipo regular, hash e integridade da licença; ela não copia nem modifica a
origem.

Os sete paths são os arquivos de vocações, itens, Berserk e os quatro monsters do source lock. O
manifesto não contém conteúdo Canary, e `references/` continua ignorado pelo Git.

## Política de projeção

Os nomes crus `knight` e `elite knight` encontrados em Berserk são referências auditáveis e ambas são
projetadas para `vocation-family:huntbound:knight`. Essa família é uma identidade Huntbound distinta
de `vocation:tibia:knight`. `elite knight` não é alias, não cria entidade e não pode ser importado sem
um consumidor explícito.

Todo projection facet tem `consumer` e `rationale`. Campos fora dos facets aprovados falham na
validação. GUIDs não fazem parte da seleção: a identidade é resolvida posteriormente a partir do tipo,
sistema e source ID.

## Dependências e órfãos

`dependencyMode` é `reachable-only`. A materialização deve começar pelas cinco raízes, seguir apenas
relações declarativas necessárias ao contrato e incluir Snake como dependência do summon. Itens de loot
são descobertos e justificados pela materialização das três criaturas raiz; eles não são listados aqui
antecipadamente e não podem ser promovidos a raiz sem uma nova seleção curada e um consumidor explícito.

Qualquer entidade fora das raízes e das dependências alcançáveis é órfã e deve fazer a operação falhar.
Referências textuais, localizações, bestiary, itens adjacentes ou outras entradas do catálogo não
fecham o slice. Não existe caminho de importação em massa.

## Fixtures sintéticas

`packages/test-fixtures/canary/pb01/` contém XML e Lua pequenos, com IDs, nomes `Fixture ...` e valores
inventados. Há duas vocações, itens selecionáveis por ID/nome e faixa, as formas melee/ranged/area/heal/
summon/spell e arquivos inválidos para diagnósticos. Nenhum arquivo reproduz comentários, dados ou
código literal de Canary.
