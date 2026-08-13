# PB-02-07 — Auditar e fechar o playbook

**Status inicial:** pending

**Classe da tarefa:** auditoria integrada e fechamento — sem implementação

**Modelo sugerido:** Claude Code/Opus 5; fallback GPT-5.6 Sol `xhigh`

**Validador sugerido:** modelo diferente do auditor quando houver decisão ambígua

**Rota:** `game-studio:game-playtest` + `superpowers:verification-before-completion`.

**Paralelismo:** não. É a última task e exige PB-02-01 a PB-02-06 integradas.

## Objetivo

Executar do zero a matriz de aceite do PB-02 sobre uma árvore limpa, guardar evidências reproduzíveis,
confirmar fronteiras/licença/browser e fechar o playbook sem corrigir código durante a auditoria.

## Resultado esperado

Um relatório versionado mapeia cada critério a comando e evidência. Com tudo verde, README, STATE e
roteiro marcam PB-02 fechado e PB-03 elegível. Qualquer falha de produto abre blocker explícito e
encerra a task sem alteração de implementação.

## Dependências e leitura mínima

1. todas as task cards, `README.md`, `STATE.md` e a spec aprovada;
2. todos os docs em `docs/assets/` produzidos pelo playbook;
3. commits e relatórios de PB-02-01 a PB-02-06;
4. `package.json`, profiles, fixtures, packer/provider, architecture e E2E integrados;
5. padrão de fechamento em `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`.

As seis tasks anteriores devem estar integradas em `main`, sem branches em disputa e com workspace
limpo antes do início.

## Decisões congeladas

- Esta task é read-only para código, contratos, fixtures e testes.
- Somente relatório e documentos de estado/índice podem mudar.
- O audit reproduz o fixture sintético sem depender do export pessoal.
- A prova pessoal é adicional e exige `HUNTBOUND_PERSONAL_ASSET_SOURCE` válido.
- A origem pessoal nunca é copiada, modificada, impressa no relatório ou persistida em manifest.
- Hashes do source lock são comparados; não basta a existência dos arquivos.
- Determinismo exige duas gerações independentes com árvore e bytes idênticos.
- Falhas negativas são sucesso apenas quando retornam o código tipado e preservam o estado esperado.
- O perfil `product` restrito deve falhar; um profile permitido deve passar imediatamente depois.
- O cenário browser inclui preload, unload, reload, console/rede e budget de cinco segundos.
- Nenhum PNG ou pack `cipsoft-personal` pode estar tracked.
- Warnings somente fecham o playbook se forem não-risco, explicados e sem critério pendente.

## Escopo permitido

```text
docs/playbooks/PB-02/artifacts/acceptance-report.md
docs/playbooks/PB-02/README.md
docs/playbooks/PB-02/STATE.md
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md
docs/README.md
```

## Fora de escopo

- editar código, schema, testes, fixtures ou config para fazer um gate passar;
- regenerar e commitar golden durante a auditoria;
- baixar/copiar assets reais;
- ignorar falha por ser “somente local”;
- aceitar `cipsoft-personal` em `product`;
- iniciar PB-03;
- limpar alterações preexistentes do usuário.

## Estrutura obrigatória do relatório

`acceptance-report.md` deve conter:

1. data, commit auditado, SO, Node, pnpm e browser;
2. estado inicial e confirmação de árvore limpa;
3. matriz `critério | comando/prova | resultado | evidência curta`;
4. hashes da dupla geração sintética;
5. resultado da verificação pessoal sem source path;
6. códigos observados em cada prova negativa;
7. duração do boot e resultado do ciclo browser;
8. prova de arquivos tracked/ignored;
9. warnings e blockers;
10. decisão final `APPROVED`, `APPROVED_WITH_WARNINGS` ou `REJECTED`.

Não copiar logs extensos. Registrar comando, exit code, resumo objetivo e hash quando aplicável.

## Plano de execução

### 1. Preparar worktree de auditoria

```powershell
git -C C:\Kaezan\kaezan-huntbound status --short
git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate -b codex/pb02-07-integrated-gate main
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate rev-parse HEAD
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate status --short
node --version
corepack pnpm --version
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate install --frozen-lockfile
```

Criar o esqueleto do relatório. Se a origem estiver suja, registrar `REJECTED` e parar; não guardar,
apagar ou sobrescrever alterações alheias.

### 2. Validar e limpar somente saídas geradas

Resolver cada target com `Resolve-Path` e confirmar que começa pelo worktree de auditoria e termina
exatamente em um destes caminhos antes de remover:

```text
.cache/asset-packer
apps/game/public/assets/test
apps/game/public/assets/product
apps/game/public/assets/personal
```

Usar `Remove-Item -Recurse -Force -LiteralPath` somente após as duas confirmações. Nunca apontar para
o workspace raiz, variável vazia, glob ou source root pessoal. Registrar quais saídas ignoradas foram
removidas; elas são reconstruíveis e não fazem parte do commit.

### 3. Provar contratos e fixture sintético

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate --filter @huntbound/assets test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate --filter @huntbound/assets typecheck
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate assets:check
```

Confirmar que o source fixture tem exatamente cinco PNGs de 68 bytes, todos com SHA-256
`431ced6916a2a21a156e38701afe55bbd7f88969fbbfc56d7fe099d47f265460`, e que selection/source lock
declaram as cinco stable keys e IDs congelados.

### 4. Provar determinismo em duas árvores independentes

Gerar o mesmo pack em dois diretórios temporários dentro de `.cache/asset-packer/audit-a` e
`audit-b`. Calcular SHA-256 de todos os arquivos, normalizar apenas os paths relativos, ordenar
ordinalmente e comparar as duas listas. Exigir:

- mesmos arquivos relativos;
- mesmos hashes byte a byte;
- mesmo `packId` e `pack.sha256`;
- nenhum timestamp, source root ou separador Windows no JSON;
- `--check` verde contra o golden versionado.

Depois remover somente esses dois diretórios temporários com as validações da etapa 2.

### 5. Provar origem pessoal local sem versioná-la

Se `HUNTBOUND_PERSONAL_ASSET_SOURCE` não estiver definida, descobrir o sibling export somente para
essa execução e manter a variável em memória. Executar:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate assets:personal:generate
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate assets:personal:check
```

Verificar os seis hashes e tamanhos congelados, gerar para saída ignorada e confirmar que manifests
não contêm path absoluto. Registrar apenas commit histórico, nomes relativos, tamanhos, hashes e exit
codes. Se a fonte legítima não existir, a decisão é `REJECTED` com blocker operacional; não substituir
pela fixture sintética.

### 6. Executar provas negativas controladas

Usar helpers de teste/CLI existentes e diretórios temporários validados. Cada prova deve falhar com o
código esperado e deixar o destino/registry anterior intacto:

| Prova | Resultado exigido |
|---|---|
| duas stable keys ausentes | um erro agregado contendo ambas |
| path `../escape.png` | `ASSET_PATH_UNSAFE` |
| byte de mídia corrompido | `ASSET_MEDIA_HASH_MISMATCH` |
| promoção com falha após staging | pack anterior permanece byte a byte |
| mesmo `packId` com hash diferente | `ASSET_PACK_CONFLICT` |
| `effectId: 12` consultado como `missileId` | lookup ausente, sem colisão de namespace |
| catálogo `product` referindo grupo `cipsoft-personal` | `ASSET_LICENSE_FORBIDDEN` antes do bundle |
| catálogo `product` sintético permitido | validação e build passam depois da falha restrita |
| falha parcial no provider | registry e URLs anteriores permanecem válidos |

Não editar fixtures versionadas para fabricar essas provas; usar builders temporários já cobertos por
testes. Registrar código e preservação observada.

### 7. Provar boundaries como regras vivas

Executar `architecture:check` verde. Depois usar os helpers dos próprios testes de arquitetura para
provar, isoladamente, que:

- `packages/simulation` importando `@huntbound/assets` falha;
- consumer do app contendo `media/<hash>.png` falha;
- consumer contendo `pack.json` ou ID legado proibido falha;
- arquivos allowlisted de profile/manifest não geram falso positivo.

As provas vivem em diretório temporário do test harness e não deixam arquivo tracked. Reexecutar
`architecture:check` verde ao final.

### 8. Provar profiles, build e browser

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate assets:stage:test
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate assets:stage:product
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate --filter @huntbound/game build
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate --filter @huntbound/game build:product
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate --filter @huntbound/game build:personal
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate exec playwright test tests/e2e/asset-pack.spec.ts tests/e2e/boot-budget.spec.ts --project=chromium
```

Confirmar cinco keys no preload, zero no unload, cinco no reload, nenhuma falha de console/rede e
boot em até cinco segundos sob Fast 4G. Confirmar também que `__huntboundAssetProbe` está ausente nos
bundles/modes `personal` e `product` por teste focal ou inspeção automatizada existente.

### 9. Provar política Git e ausência de vazamento

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate ls-files apps/game/public/assets/personal
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate ls-files -- ':(glob)packages/test-fixtures/assets/pb02/source/**/*.png'
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate grep -n -I -E "[A-Za-z]:[/\\\\]|frontend/public/assets/tibia" -- packages/assets/src packages/assets/catalog packages/test-fixtures/assets/pb02/expected apps/game/src ':(exclude)**/*.test.ts'
```

O primeiro comando deve retornar vazio; o segundo, exatamente os cinco PNGs sintéticos; o terceiro,
nenhum source path persistido. Comparar hashes dos PNGs tracked com o hash sintético e confirmar que
nenhum deles coincide com os cinco hashes reais congelados.

### 10. Executar o gate raiz

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate verify
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate diff --check
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate status --short
```

Se qualquer gate falhar, finalizar relatório como `REJECTED`, registrar o próximo ID
`PB-02-FIX-01`, não alterar código e não fechar o playbook.

### 11. Fechar documentação somente após aprovação

Se todos os critérios estiverem satisfeitos:

- concluir `acceptance-report.md` com `APPROVED` ou `APPROVED_WITH_WARNINGS`;
- marcar as sete tasks `done` em `STATE.md` e PB-02 `closed`;
- atualizar o README com commit auditado e link do relatório;
- marcar PB-02 fechado e PB-03 elegível no roteiro/índice;
- verificar que o diff contém somente o escopo permitido.

Então commitar:

```powershell
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate add docs/playbooks/PB-02/artifacts/acceptance-report.md docs/playbooks/PB-02/README.md docs/playbooks/PB-02/STATE.md docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md docs/README.md
git -C C:\Kaezan\kaezan-huntbound-pb02-07-integrated-gate commit -m "docs: close PB-02 asset pack gate"
```

### 12. Integrar e reconfirmar em `main`

O orquestrador revisa o relatório/diff, integra por fast-forward e executa em `main`:

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound assets:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound assets:personal:generate
corepack pnpm --dir C:\Kaezan\kaezan-huntbound assets:personal:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound assets:stage:product
corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/game build:product
corepack pnpm --dir C:\Kaezan\kaezan-huntbound architecture:check
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
git -C C:\Kaezan\kaezan-huntbound status --short
```

Somente depois remove worktree e branch integrados. Se a reconfirmação falhar, reverter apenas o
fechamento documental por commit explícito ou abrir `PB-02-FIX-01`; não declarar PB-03 elegível.

## Critérios de aceite

- [ ] A auditoria começou de `main` limpo e commit identificado.
- [ ] Contratos e fixture sintético passam sem origem externa.
- [ ] Duas gerações independentes têm árvore e bytes idênticos.
- [ ] A origem pessoal confere com os hashes congelados sem path persistido.
- [ ] Todas as provas negativas retornam códigos e preservam estado.
- [ ] O build `product` bloqueia `cipsoft-personal` e permite o pack sintético.
- [ ] Boundaries falham nos casos proibidos e passam nos allowlists.
- [ ] Browser completa preload/unload/reload e respeita cinco segundos.
- [ ] Nenhum asset pessoal ou pack gerado está tracked.
- [ ] `verify` passa no worktree e novamente em `main` após integração.
- [ ] Relatório mapeia todos os critérios a evidências.
- [ ] O fechamento altera somente documentação permitida.

## Handoff final

O relatório final deve informar decisão, commit auditado, commit de fechamento, gates, warnings,
blockers e elegibilidade de PB-03. `PB-03` só fica elegível com `APPROVED` ou
`APPROVED_WITH_WARNINGS` sem risco de produto; `REJECTED` mantém PB-02 aberto e aponta a primeira
task corretiva.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Claude Code/Opus 5; se indisponível, use GPT-5.6 Sol
xhigh e registre o desvio. Leia integralmente
docs/playbooks/PB-02/tasks/PB-02-07-auditar-e-fechar-playbook.md, todas as cards, README, STATE,
spec e documentos assets indicados. Use game-studio:game-playtest, superpowers:using-git-worktrees e
superpowers:verification-before-completion. Execute somente a auditoria PB-02-07 no worktree e branch
exatos codex/pb02-07-integrated-gate criados a partir de main limpa. Não altere implementação,
schemas, fixtures, testes ou config. Limpe apenas as quatro saídas geradas allowlisted depois de
validar seus paths absolutos. Execute a matriz completa: contratos, fixture, dupla geração,
source-lock pessoal, provas negativas, licença/product, boundaries, browser, política Git e verify.
Produza docs/playbooks/PB-02/artifacts/acceptance-report.md. Se algum critério falhar, marque REJECTED,
registre PB-02-FIX-01 e pare sem fechar o playbook. Se tudo passar, atualize somente os cinco paths
documentais permitidos, crie o commit "docs: close PB-02 asset pack gate", integre por
git merge --ff-only, reexecute os gates pós-integração e só então remova worktree/branch e declare
PB-03 elegível. Não inicie PB-03.
```
