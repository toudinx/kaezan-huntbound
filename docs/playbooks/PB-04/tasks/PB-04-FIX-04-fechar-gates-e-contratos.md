# PB-04-FIX-04 — Fechar os gates e reconciliar os contratos

**Status inicial:** pending

**Classe da tarefa:** correção de gate e de contrato

**Modelo sugerido:** GPT-5.6 Luna `xhigh`; fallback Claude Opus 5.

**Rota:** `superpowers:verification-before-completion`.

**Paralelismo:** pode paralelizar com PB-04-FIX-02 e PB-04-FIX-03.

## Defeitos

### D4 — `corepack pnpm check` está vermelho e o PB-04 piorou o número

```powershell
corepack pnpm exec biome check .
```

Exit `1`. `Found 10 errors, 2 warnings, 1 info` em `370` arquivos:

- `assist/source/organizeImports` — `10` erros
- `lint/correctness/noUnusedVariables` — `2` warnings, ambos em `tools/map-extractor/topology.ts`,
  **arquivo novo do PB-04-FIX-01**
- `lint/style/useTemplate` — `1` info, em `tests/e2e/asset-pack.spec.ts`

Arquivos ofensores em território do PB-04: `apps/game/src/hunt/HuntPresentation.ts`,
`apps/game/src/hunt/huntRuntime.ts`, `apps/game/src/main.ts`, `tools/map-extractor/cli.ts`,
`tools/map-extractor/extract.ts`, `tools/map-extractor/layout.test.ts`,
`tools/replay/pb04HuntFixture.test.ts`. Os demais: `apps/game/src/assets/AssetRuntimeProbe.test.ts`,
`apps/game/src/assets/createAssetRuntime.test.ts`, `apps/game/src/assets/createAssetRuntime.ts`.

PB-04-09 registrou isso como W10 com **6** diagnósticos. Agora são **13**.

`verify` não pega porque roda `format:check`, não `biome check`.

### W15 — `verify` esconde falha atrás de retry

`playwright.config.ts:12` define `retries: 1`. Um teste que falha em 100% das primeiras tentativas é
reportado como suite verde e o gate sai `0`. Foi exatamente o que aconteceu com o defeito D1 do
relatório de aceite: ele estava lá desde o FIX-01 e nenhum gate o mostrou.

### W16 — `tools/content-catalog` tem 14 arquivos de teste que nunca rodam

`tools/content-catalog/vitest.config.ts` existe e há `14` arquivos `*.test.ts` sob
`tools/content-catalog/`. O script `test` da raiz enumera `tools/replay`, `tools/tile-flags` e
`tools/map-extractor` e **omite** `tools/content-catalog`. O `vitest.config.ts` da raiz inclui apenas
`tests/**` e `src/**`.

Esses testes leem `references/canary` por caminho literal
(`tools/content-catalog/application/ContentCatalogApplication.test.ts:12`), então entrarão vermelhos
em qualquer máquina sem o snapshot. Isso é parte do trabalho: decidir e implementar o
comportamento correto na ausência do snapshot, como os outros gates que exigem
`HUNTBOUND_CANARY_SOURCE` já fazem.

### W13 — `PB-04-SELECTION.md` cita o mapa errado

O item "Região localizável e extraível" afirma que o mapa da hunt é `data-canary/world/canary.otbm`,
pareado com `otservbr-monster.xml` via `mapName = "otservbr"`. PB-04-04 **refutou isso com medição**
e `STATE.md` já marca a afirmação como riscada: `canary.otbm` não contém a caixa; `otservbr.otbm`
contém. A conclusão do item continua verdadeira; a evidência citada, não.

### W14 — o roteiro e o README exigem extração; a realidade é recipe autorado

`docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md` exige que o gate prove que "a região reextraída é
byte-idêntica", e `docs/playbooks/PB-04/README.md:194` lista "Reextrair a região do mesmo snapshot
produz JSON byte-idêntico". Desde o FIX-01 a geometria jogável é **autorada** pelo recipe
`packages/content/src/layouts/hunts/venore-rotworm-cave.json` e materializada deterministicamente —
o envelope OTBM virou fonte de spawn e de material, não de geometria.

A decisão é legítima e está documentada no design do FIX-01, mas contrato e realidade divergem, e um
critério de aceite que ninguém pode cumprir literalmente é pior do que nenhum.

## Resultado esperado

`corepack pnpm check` sai `0`. `verify` não esconde mais falha de primeira tentativa. Os testes de
`content-catalog` rodam em algum gate ou têm ausência declarada e justificada. Os documentos de
contrato descrevem o que o sistema faz hoje.

## Dependências

Nenhuma técnica. Se `PB-04-FIX-02` estiver em andamento, coordene a mudança de `retries` para não
mascarar a validação dele.

## Leitura mínima

1. este card;
2. `docs/playbooks/PB-04/artifacts/acceptance-report.md`, §8 D4 e §9;
3. `package.json`, scripts `check`, `verify` e `test`;
4. `playwright.config.ts`;
5. `docs/content/PB-04-SELECTION.md`, seção "Checklist do roteiro";
6. `docs/superpowers/specs/2026-08-15-pb-04-corrective-hunt-experience-design.md`.

## Decisões congeladas

- Corrigir lint é **mecânico e sem alteração de comportamento**. Se um `organizeImports` mudar
  ordem de import com efeito colateral, isso é defeito separado: pare e reporte.
- As `2` variáveis não usadas em `topology.ts` devem ser **investigadas antes de removidas**: variável
  não usada em módulo de topologia pode ser sintoma de lógica incompleta, não sujeira.
- Não relaxe regra do Biome para fazer o gate passar. Corrija o código.
- `retries` continua permitido em CI se o relatório tratar flaky como falha. O inaceitável é o gate
  sair `0` com teste que falha sempre na primeira tentativa.
- W13 e W14 são correções de texto: **não** mude código de seleção, recipe ou extração para
  "casar" com o documento. O documento é que está desatualizado.

## Escopo permitido

```text
package.json
playwright.config.ts
vitest.config.ts
apps/game/src/**            (apenas organizeImports)
tools/map-extractor/**      (apenas organizeImports e as duas variáveis não usadas)
tools/replay/**             (apenas organizeImports)
tests/e2e/asset-pack.spec.ts
tools/content-catalog/**
docs/content/PB-04-SELECTION.md
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md
docs/playbooks/PB-04/README.md
```

## Fora de escopo

- corrigir o gate de input (PB-04-FIX-02) ou os hashes congelados (PB-04-FIX-03);
- alterar kernel, contratos, fixture, golden ou recipe;
- qualquer trabalho de PB-05.

## Execução

- [ ] **1. Registrar o vermelho.** `corepack pnpm exec biome check .` com exit code e contagem, e
      `corepack pnpm check` com exit code.
- [ ] **2. Corrigir os 10 `organizeImports`**, sem alterar comportamento.
- [ ] **3. Investigar as duas variáveis não usadas em `topology.ts`** e registrar a conclusão: sujeira
      ou lógica incompleta. Se for lógica incompleta, pare e abra card.
- [ ] **4. Corrigir o `useTemplate`** em `tests/e2e/asset-pack.spec.ts`.
- [ ] **5. Tratar flaky como falha** no gate: ou `retries: 0`, ou reporter que faça `verify` sair
      diferente de `0` quando houver flaky. Prove com um teste temporariamente instável que o gate
      agora reprova; reverta a instabilidade.
- [ ] **6. Decidir e implementar o destino de `tools/content-catalog`:** entra em `test` com guarda de
      snapshot ausente, ou tem a ausência declarada e justificada em documento. Sem terceira opção
      silenciosa.
- [ ] **7. Corrigir W13** em `PB-04-SELECTION.md`, citando `otservbr.otbm` e referenciando a medição
      de PB-04-04. Preserve o texto anterior riscado.
- [ ] **8. Reconciliar W14:** roteiro e README passam a descrever geometria autorada por recipe
      determinístico, com o critério de aceite correspondente ("materializar o recipe duas vezes
      produz JSON byte-idêntico"), e o envelope OTBM descrito como fonte de spawn e material.
- [ ] **9. Gate completo:** `corepack pnpm check` exit `0` e `corepack pnpm verify` exit `0`, duas
      vezes seguidas, com a árvore inalterada entre as execuções.

## Critérios de aceite

- [ ] `corepack pnpm exec biome check .` sai `0`.
- [ ] `corepack pnpm check` sai `0`.
- [ ] O gate reprova quando há flaky, provado por instabilidade temporária com exit code registrado.
- [ ] `tools/content-catalog` roda em gate, ou tem ausência declarada com justificativa escrita.
- [ ] As duas variáveis de `topology.ts` têm conclusão registrada.
- [ ] `PB-04-SELECTION.md` não afirma mais que `canary.otbm` contém a hunt.
- [ ] Roteiro e README descrevem geometria autorada, com critério de aceite cumprível.
- [ ] `corepack pnpm verify` sai `0` duas vezes seguidas, árvore inalterada.

## Condições de parada

Pare se um `organizeImports` alterar comportamento, ou se as variáveis não usadas de `topology.ts`
revelarem lógica incompleta. Ambos são defeito novo e merecem card próprio.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Luna effort xhigh, ou Claude Opus 5 como
fallback. Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-FIX-04-fechar-gates-e-contratos.md

Leia antes o §8 D4 e o §9 de docs/playbooks/PB-04/artifacts/acceptance-report.md. Crie branch e
worktree isoladas e rode "corepack pnpm install --prefer-offline" dentro dela.

Sao cinco frentes: (1) biome check . sai 1 com 10 erros e 2 warnings, e pnpm check esta vermelho;
(2) playwright.config.ts usa retries: 1, entao um teste que falha sempre na primeira tentativa passa
no gate; (3) tools/content-catalog tem 14 arquivos de teste que nenhum script executa;
(4) PB-04-SELECTION.md ainda diz que canary.otbm contem a hunt, o que PB-04-04 refutou;
(5) o roteiro e o README ainda exigem "reextrair a regiao", mas a geometria e autorada por recipe
desde o FIX-01.

Comece registrando o vermelho com exit code. NAO relaxe regra do Biome para passar. As duas
variaveis nao usadas em tools/map-extractor/topology.ts sao de um arquivo novo do FIX-01:
investigue antes de remover, e se for logica incompleta PARE e reporte.

Nao toque no gate de input nem nos hashes congelados: sao outros cards. Finalize com pnpm check
exit 0 e pnpm verify exit 0 duas vezes seguidas, arvore inalterada entre elas.

Nao inicie nenhum trabalho de PB-05.
```
