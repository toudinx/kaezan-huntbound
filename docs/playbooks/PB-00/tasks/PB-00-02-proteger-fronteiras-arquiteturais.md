# PB-00-02 — Proteger fronteiras arquiteturais

**Status inicial:** pending  
**Rota Codex:** `game-studio:web-game-foundations` + `game-studio:phaser-2d-game` +
`superpowers:test-driven-development` + `superpowers:verification-before-completion`  
**Effort sugerido:** high

## Objetivo

Transformar as fronteiras da ADR em checks executáveis, antes que Phaser ou gameplay sejam
implementados.

## Resultado esperado

O workspace rejeita automaticamente dependências proibidas, especialmente qualquer acesso de
`packages/simulation` a Phaser, DOM, Node ou packages de apresentação.

## Dependências

PB-00-01 concluída, instalação congelada funcional e Git limpo.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00/STATE.md`;
3. `docs/playbooks/PB-00/README.md`;
4. `docs/03_ADR_PHASER4_BROWSER_FIRST.md` — Arquitetura e Fronteiras obrigatórias;
5. manifests e tsconfigs criados por PB-00-01.

## Decisões congeladas

- `simulation` é TypeScript puro e só pode depender de `contracts`.
- `contracts` não depende de outro package do projeto.
- `game` é composition root e pode depender dos packages do V0.
- DOM libs pertencem somente a packages de apresentação.
- O gate deve analisar imports reais e manifests; busca textual isolada não é suficiente.

## Escopo permitido

```text
docs/architecture/PACKAGE_BOUNDARIES.md
tools/architecture/dependency-policy.json
tools/architecture/check-boundaries.ts
tools/architecture/check-boundaries.test.ts
packages/*/package.json
packages/*/tsconfig.json
package.json
docs/playbooks/PB-00/STATE.md
```

Arquivos de fixture temporária usados pelos testes devem viver dentro de diretório temporário do
sistema ou de uma pasta de fixtures explicitamente ignorada.

## Fora de escopo

- scenes Phaser, DOM UI ou browser lifecycle;
- tipos de combate, entidades, comandos, eventos ou save;
- importers, manifests de assets e conteúdo Canary;
- refatorar a estrutura criada em PB-00-01 sem uma falha demonstrável.

## Política mínima

O arquivo `dependency-policy.json` deve expressar pelo menos:

```json
{
  "@huntbound/contracts": [],
  "@huntbound/simulation": ["@huntbound/contracts"],
  "@huntbound/content": ["@huntbound/contracts"],
  "@huntbound/assets": ["@huntbound/contracts"],
  "@huntbound/save": ["@huntbound/contracts", "@huntbound/simulation"],
  "@huntbound/test-fixtures": ["@huntbound/contracts", "@huntbound/simulation"],
  "@huntbound/game": [
    "@huntbound/contracts",
    "@huntbound/simulation",
    "@huntbound/content",
    "@huntbound/assets",
    "@huntbound/save"
  ]
}
```

Dependências externas também devem ser validadas. `@huntbound/simulation` não pode importar
`phaser`, `node:*`, built-ins Node ou módulos que exijam DOM. Seu tsconfig não inclui `DOM` em `lib`.

## Ciclo de implementação

1. Escreva testes que criem pequenos packages/imports válidos e inválidos em fixture temporária.
2. Execute somente o teste novo e confirme falhas por ausência do checker ou resultados incorretos.
3. Implemente `check-boundaries.ts` usando a API do TypeScript já fixada no workspace para analisar
   import declarations, dynamic imports e package manifests.
4. Faça o checker retornar exit code não zero e uma mensagem acionável contendo arquivo, import e
   regra violada.
5. Cubra no mínimo: import permitido; dependência `simulation -> phaser`; import `node:fs`;
   dependência interna não autorizada; dependência declarada mas não usada não precisa falhar.
6. Integre `architecture:check` a `check` e `verify` na raiz.
7. Escreva `docs/architecture/PACKAGE_BOUNDARIES.md` com dono, responsabilidade, dependências
   permitidas e exemplos proibidos por package.
8. Execute a suíte completa, atualize o handoff e commit.

## Verificação obrigatória

```text
corepack pnpm test -- tools/architecture/check-boundaries.test.ts
corepack pnpm architecture:check
corepack pnpm typecheck
corepack pnpm check
corepack pnpm verify
git diff --check
git status --short
```

Além da suíte verde, faça uma prova controlada: introduza em fixture de teste um import proibido de
`phaser` por `simulation`, demonstre que o checker falha e remova a violação antes do commit.

## Critérios de aceite

- [ ] Política de dependências está versionada e documentada.
- [ ] Checker usa parsing TypeScript/manifests e produz diagnóstico acionável.
- [ ] Testes demonstram caminhos válidos e violações reais.
- [ ] `simulation` compila sem `DOM` e não acessa Node/Phaser.
- [ ] Gate está incluído nos comandos raiz.
- [ ] Workspace termina limpo e todos os checks passam.

## Condições de parada

Pare se a política exigir inverter uma fronteira normativa, se a toolchain de PB-00-01 não puder
analisar o TypeScript fixado ou se surgir necessidade de definir tipos de gameplay para testar o
checker.

## Handoff e commit

Atualize `STATE.md`, registre as regras finais e indique `PB-00-03` como próxima task. Commit:

```text
build: enforce package boundaries
```

## Relatório final

Liste regras aplicadas, violações cobertas, comandos executados e commit. Não crie scenes ou UI.

