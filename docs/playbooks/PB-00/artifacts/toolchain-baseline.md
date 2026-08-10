# PB-00-01 — Toolchain baseline

**Data da consulta:** 2026-08-10
**Escopo:** bootstrap local do workspace, sem runtime de jogo ou testes browser.

## Versões fixadas

| Componente | Versão | Fonte consultada | Compatibilidade |
|---|---:|---|---|
| Node.js | 24.14.0 | `node --version`; índice oficial `https://nodejs.org/dist/index.json` | LTS Krypton e compatível com todas as ferramentas abaixo. A release LTS mais nova observada foi 24.19.0; a 24.14.0 instalada foi mantida, pois já satisfaz todos os engines. |
| Corepack | 0.34.6 | `corepack --version` | Resolve o pnpm fixado pelo campo `packageManager`. |
| pnpm | 11.21.0 | `Invoke-RestMethod https://registry.npmjs.org/pnpm/latest` | Exige Node `>=22.13`. |
| Phaser | 4.2.1 | `Invoke-RestMethod https://registry.npmjs.org/phaser/latest` | Sem restrição de engine publicada no metadata consultado. |
| TypeScript | 7.0.2 | `Invoke-RestMethod https://registry.npmjs.org/typescript/latest` | Exige Node `>=16.20.0`. |
| Vite | 8.2.1 | `Invoke-RestMethod https://registry.npmjs.org/vite/latest` | Exige Node `^20.19.0 || >=22.12.0`. |
| Biome | 2.5.7 | `Invoke-RestMethod https://registry.npmjs.org/@biomejs%2Fbiome/latest` | Exige Node `>=14.21.3`. |
| Vitest | 4.1.10 | `Invoke-RestMethod https://registry.npmjs.org/vitest/latest` | Exige Node `^20.0.0 || ^22.0.0 || >=24.0.0`. |
| Playwright | 1.62.1 | `Invoke-RestMethod https://registry.npmjs.org/@playwright%2Ftest/latest` | Exige Node `>=20`. |

Todas as dependências diretas estão em versões exatas e `.npmrc` contém `save-exact=true`.

## Convenções do workspace

- `packageManager` fixa `pnpm@11.21.0`; não há dependência de instalação global do pnpm.
- `.node-version` fixa a LTS disponível no host, `24.14.0`, e `engines.node` restringe a linha 24.
- TypeScript usa `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `useUnknownInCatchVariables`, `verbatimModuleSyntax`, `isolatedModules` e `noEmit` no tsconfig base.
- Os oito projetos do workspace são privados e usam o namespace `@huntbound/*`.
- Vite e Phaser estão fixados, mas o app ainda executa somente `tsc`: esta task não cria o
  `index.html` nem o shell Phaser, que pertencem à PB-00-03.

## Comandos canônicos

```text
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm check
corepack pnpm verify
```

Neste host, o proxy TLS corporativo exige que os processos Node usem o repositório de CAs do Windows.
As verificações foram executadas com `NODE_OPTIONS=--use-system-ca` apenas no processo atual; nenhuma
configuração global foi alterada. Em ambientes cuja cadeia TLS já seja confiável para Node, os comandos
acima são executados sem essa variável.
