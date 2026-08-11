# PB-01-04 — Importar vocação e itens por XML estático

**Status inicial:** pending

**Classe da tarefa:** implementação geral bem especificada — adapter XML seletivo

**Modelo sugerido:** GPT-5.6 Luna `xhigh`

**Validador sugerido:** gates automatizados; GPT-5.6 Sol `xhigh` ou Claude Code/Opus 5 somente após
gatilho de escalonamento

**Rota:** `superpowers:test-driven-development` + `superpowers:verification-before-completion`.

**Paralelismo:** pode formar onda com PB-01-05 após PB-01-03. O fluxo copiável abaixo usa execução
serial e integração `--ff-only`, que é o padrão.

## Objetivo

Implementar adapters XML puros e estritos que selecionem Knight por vocation ID e somente os itens
pedidos por ID/nome. XML é convertido em DTOs internos com unidades explícitas, diagnósticos
acionáveis e sem acesso a filesystem.

## Resultado esperado

Fixtures sintéticas passam; XML malformado, entidade ausente, duplicada, ambígua ou com campo
obrigatório inválido falha. O parser do catálogo inteiro só retorna a seleção solicitada e nunca
importa entidades extras por conveniência.

## Dependências e leitura mínima

1. esta task, `README.md` e `STATE.md` do PB-01;
2. `packages/contracts/src/content/**`;
3. `packages/content/src/importers/canary/sourceTypes.ts`;
4. fixtures XML sintéticas de PB-01-03;
5. `packages/content/src/selections/pb-01-contract-coverage.json`;
6. somente as estruturas relevantes de `references/canary/data/XML/vocations.xml` e
   `references/canary/data/items/items.xml`; não ler outros subsistemas Canary.

## Decisões congeladas

- `fast-xml-parser@5.10.1` já está fixado.
- Parser recebe string; a borda Node lerá arquivo apenas em PB-01-06.
- Knight é selecionado por source ID `4`, não por nome.
- Itens são selecionados por conjuntos explícitos de IDs e nomes normalizados.
- Range `fromid/toid` só resolve um ID solicitado dentro do range; nunca expande o range inteiro.
- Nome ambíguo entre dois IDs é erro e exige seleção por ID.
- Atributos desconhecidos obrigatórios bloqueiam; atributos allowlisted sem consumidor são ignorados
  com regra testada, não copiados para `metadata` genérico.

## Escopo permitido

```text
packages/content/src/importers/canary/xml/**
packages/content/src/importers/canary/xml/**/*.test.ts
packages/content/src/index.ts (não exportar adapter pelo entrypoint runtime)
docs/content/CANARY_XML_MAPPING.md
docs/playbooks/PB-01/STATE.md
```

## Fora de escopo

- filesystem, source lock, SQLite, CLI e JSON gerado;
- parser Lua, creatures, loot resolution ou dependency closure;
- outras vocações ou itens não solicitados;
- gameplay, fórmulas ou balanceamento.

## Interfaces produzidas

```ts
export interface CanaryVocationDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly gainHp: number;
  readonly gainMana: number;
  readonly gainCapacity: number;
  readonly baseSpeed: number;
  readonly attackSpeedMs: number;
  readonly manaMultiplier: number;
  readonly skillMultipliers: Readonly<Record<string, number>>;
}

export interface CanaryItemDto {
  readonly sourceId: string;
  readonly displayName: string;
  readonly attributes: Readonly<Record<string, string | number | boolean>>;
}

export function parseCanaryVocationsXml(
  xml: string,
  sourceIds: readonly string[],
): CanaryParseResult<readonly CanaryVocationDto[]>;

export function parseCanaryItemsXml(
  xml: string,
  selection: { readonly ids: readonly string[]; readonly names: readonly string[] },
): CanaryParseResult<readonly CanaryItemDto[]>;
```

DTOs são ordenados por `sourceId`. `attributes` aceita somente o conjunto documentado no mapping;
não é saco genérico para tudo que aparecer.

## Execução RED/GREEN

- [ ] **1. Criar branch/worktree.** Branch `codex/pb01-04-xml-importers`; worktree
  `C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers`; base `main` com PB-01-03 integrada.

```powershell
git -C C:\Kaezan\kaezan-huntbound status --short
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers -b codex/pb01-04-xml-importers main
```
- [ ] **2. Escrever testes de vocation e confirmar RED.** Cubra Knight selecionado, outra vocação
  ignorada, ID ausente, ID duplicado, número inválido e campo extra semanticamente relevante.
- [ ] **3. Implementar parser de vocations mínimo e obter GREEN.** Configure atributos com prefixo
  consistente; valide o XML antes de mapear e converta números explicitamente.
- [ ] **4. Escrever testes de items e confirmar RED.** Cubra seleção por ID, por nome, range contendo
  um ID, nome ambíguo, item ausente, range inválido e prova de que item não solicitado não aparece.
- [ ] **5. Implementar parser de items mínimo e obter GREEN.** Indexe apenas durante a chamada; não
  mantenha cache global nem leia arquivo.
- [ ] **6. Criar mapping documental.** Para cada atributo consumido, registre origem, unidade,
  normalização, destino e razão de uso. Liste campos ignorados allowlisted separadamente.
- [ ] **7. Rodar gates.**

```powershell
corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml
corepack pnpm --filter @huntbound/content typecheck
corepack pnpm architecture:check
corepack pnpm exec biome check packages/content docs/content/CANARY_XML_MAPPING.md
corepack pnpm format:check
git diff --check
```

- [ ] **8. Atualizar STATE, commitar, integrar e limpar.** Commit
  `feat: parse curated Canary XML content`. No fluxo serial, faça fast-forward na `main`, repita os
  testes XML/typecheck, remova worktree/branch e indique PB-01-05. No modo paralelo explicitamente
  ativado, remova somente a worktree limpa, preserve a branch e não edite a `main`; PB-01-06 integra.

Fluxo serial — execute somente este bloco quando PB-01-04 integrar diretamente na `main`:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers add packages/content docs/content/CANARY_XML_MAPPING.md docs/playbooks/PB-01/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers commit -m "feat: parse curated Canary XML content"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb01-04-xml-importers
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/content test -- src/importers/canary/xml
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/content typecheck
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb01-04-xml-importers
```

Fluxo paralelo — execute este bloco no lugar do serial; não faça merge nem apague a branch:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers add packages/content docs/content/CANARY_XML_MAPPING.md docs/playbooks/PB-01/STATE.md
git -C C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers commit -m "feat: parse curated Canary XML content"
git -C C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers status --short
git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers
git -C C:\Kaezan\kaezan-huntbound worktree prune
git -C C:\Kaezan\kaezan-huntbound branch --list codex/pb01-04-xml-importers
```

O `status --short` deve ficar vazio e o último comando deve listar a branch preservada para PB-01-06.

## Critérios de aceite

- [ ] Parser é puro, estrito e seletivo.
- [ ] Knight é resolvido exclusivamente por ID 4.
- [ ] Item range não causa importação em massa.
- [ ] Ambiguidade/ausência produz diagnósticos, não fallback.
- [ ] Mapping documenta todo campo consumido/ignorado.
- [ ] XML adapter não aparece no entrypoint browser.
- [ ] RED/GREEN e gates registrados no handoff.

## Condições de parada

Pare se o XML real exigir importar catálogo inteiro, se nome ambíguo não puder ser resolvido por ID,
se um campo exigir regra de gameplay ou se for necessário afrouxar schemas.

## Relatório final

Liste seleções cobertas, diagnósticos, mapping, testes, commit e modo de integração/limpeza. Não
inicie parser Lua ou materialização.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna xhigh.
Use superpowers:test-driven-development e superpowers:verification-before-completion.
Não escale por cautela genérica; use Sol/Claude somente após um gatilho objetivo da política,
registrado no STATE.
Execute somente C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-01\tasks\PB-01-04-importar-vocacao-e-itens-xml.md.
Siga o fluxo serial por padrão: branch/worktree exatas, RED/GREEN, gates, STATE, commit, fast-forward
na main, reverificação e limpeza. Importe somente Knight e itens solicitados; não leia filesystem no
adapter, não importe catálogo inteiro e não inicie PB-01-05/06.
```
