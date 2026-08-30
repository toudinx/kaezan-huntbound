---
name: hunt-content-pipeline
description: Regenerar de forma determinística a cadeia de conteúdo de uma hunt do Kaezan Huntbound - seleção, tile-flags, região do mapa, catálogo e pack de assets - com os --check correspondentes. Use ao adicionar ou alterar uma hunt, a seleção, o snapshot Canary ou qualquer artefato gerado de conteúdo.
---

# Pipeline de conteúdo de hunt

Toda etapa é offline, determinística e tem um `--check` que reexecuta a geração e falha se o artefato
versionado divergir. Requer `HUNTBOUND_CANARY_SOURCE` apontando para o snapshot.

## Ordem das dependências

```text
selection (curada, versionada)
  → tile-flags.json         (tools/tile-flags)
    → região da hunt         (tools/map-extractor)
      → catálogo gerado      (tools/content-catalog)
        → pack de assets     (tools/asset-packer)
          → staging em apps/game/public/assets
```

Mudou uma etapa, revalide dela para baixo. Não pule etapa "porque o diff parece pequeno".

## Comandos

```bash
corepack pnpm hunt:selection:check     # seleção coerente com o snapshot
corepack pnpm hunt:sources:check       # fontes exigidas pelas seleções existem
corepack pnpm content:tileflags:check  # regenera tile-flags e compara
corepack pnpm hunt:extract             # extrai a região (use --check para validar sem gravar)
corepack pnpm content:generate         # catálogo gerado (content:generate:check valida)
corepack pnpm content:check            # cadeia de conteúdo inteira, incluindo sidecars
corepack pnpm assets:check             # se o pack mudou
```

`hunt:check` só se um golden **existente** puder ter se movido. Hunt nova não deve mover replay.
Não rode `verify` nem Playwright. Deixe `dev` de pé.

## Regras

- **Nunca edite a saída.** `packages/content/src/generated/**` e os `expected/**` das fixtures são
  gerados. Para mudar a saída, mude a entrada e regenere.
- **`dropped` diferente de zero é sinal**, não ruído: alguma coisa do snapshot não foi mapeada.
  Investigue antes de aceitar a extração.
- **Uma hunt por vez.** Não extraia região, criatura ou loot que a hunt corrente não exija.
- **Chave estável** conforme `docs/content/IDENTITY_POLICY.md`. Não invente id nem renomeie.
- Contratos de região e mapa em `docs/content/MAP_REGION_CONTRACT.md`; mapeamentos de origem em
  `docs/content/CANARY_XML_MAPPING.md` e `docs/content/CANARY_LUA_MAPPING.md`.

## Snapshot ausente

`references/canary` é clone parcial em `157e6f9e` e não tem o mapa global. Antes de concluir que um
arquivo não existe, procure em `C:\Kaezan\kaezan\canary-3.4.1\`, `C:\Kaezan\kaezan - world\canary-3.4.1\`
e `C:\Users\toudi\Downloads\otservbr.otbm`. Nada precisa ser baixado.

3.4.1 e `157e6f9e` são versões diferentes. Ao usar um arquivo de uma versão para complementar a
outra, compare a região relevante primeiro e registre a equivalência na task.

## Depois de regenerar

Rode o `--check` da própria etapa e `content:check`. `assets:check` se o pack mudou. Um artefato
regenerado que muda um golden de replay é mudança de comportamento: justifique na task e no
`STATE.md` antes de aceitar. Sem `verify`.
