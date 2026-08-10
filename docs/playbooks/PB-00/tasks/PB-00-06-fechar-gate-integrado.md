# PB-00-06 — Fechar gate integrado do PB-00

**Status inicial:** pending  
**Rota Codex:** `game-studio:game-playtest` + `game-studio:web-game-foundations` +
`superpowers:verification-before-completion`  
**Effort sugerido:** high; preferir agente/modelo diferente do usado em PB-00-03 a PB-00-05.

## Objetivo

Auditar o resultado integrado do PB-00 com evidência fresca e decidir se PB-01 pode começar. Esta
task verifica; ela não absorve silenciosamente novos problemas de implementação.

## Resultado esperado

Um relatório rastreável aprova todos os critérios finais, ou o playbook fica `blocked` com uma task
de correção limitada e reproduzível. Não existe aprovação parcial descrita como conclusão.

## Dependências

PB-00-01 a PB-00-05 marcadas `done`, commits presentes, working tree limpa e próxima task igual a
`PB-00-06` no `STATE.md`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-00/STATE.md`;
3. `docs/playbooks/PB-00/README.md` completo;
4. `docs/playbooks/PB-00/artifacts/toolchain-baseline.md`;
5. `docs/playbooks/PB-00/artifacts/browser-qa.md`;
6. `docs/architecture/PACKAGE_BOUNDARIES.md`;
7. root manifests, scripts e arquivos diretamente envolvidos nos gates que falharem.

Não releia relatórios históricos ou `references/` sem uma falha que aponte especificamente para eles.

## Decisões congeladas

- O fechamento não acrescenta gameplay nem melhora o visual por preferência.
- Evidência fresca vence relatos anteriores de sucesso.
- Correções documentais do relatório/estado pertencem a esta task.
- Defeito de código pequeno e diretamente necessário pode ser corrigido apenas se tiver causa clara,
  teste de regressão e permanecer dentro do PB-00; caso contrário, crie uma task `PB-00-FIX-*` e
  marque o fechamento `blocked`.

## Escopo permitido

```text
docs/playbooks/PB-00/artifacts/acceptance-report.md
docs/playbooks/PB-00/README.md
docs/playbooks/PB-00/STATE.md
docs/playbooks/PB-00/tasks/PB-00-FIX-*.md
```

Arquivos de implementação só podem ser alterados sob a exceção de regressão limitada descrita nas
decisões congeladas; toda alteração exige red-green e deve constar no relatório.

## Fora de escopo

- iniciar PB-01;
- upgrades de dependência sem falha demonstrada;
- refatoração, polish visual, assets, gameplay, PWA, backend ou suporte multi-browser completo;
- reexecutar todas as decisões de arquitetura já aprovadas sem evidência de contradição.

## Auditoria obrigatória

1. Confirme commits, ordem das tasks e working tree inicial limpa.
2. Execute instalação congelada e `pnpm verify` sem alterar o lockfile.
3. Execute `pnpm architecture:check` e confirme nos testes que a violação controlada de
   `simulation -> phaser` continua falhando.
4. Inspecione `git ls-files` para provar que `references/`, `.obsidian/`, secrets, assets pessoais,
   reports temporários e builds não estão rastreados.
5. Verifique que versões diretas são exatas e coincidem com baseline, `packageManager`, engines,
   `.node-version` e lockfile.
6. Abra a build e repita boot, blur/visibility, resize e teardown/HMR relevante.
7. Abra os quatro screenshots no tamanho original e revise canvas dominante, overlay, centro livre,
   clipping, overflow e legibilidade.
8. Busque imports/referências a Phaser, DOM e Node em `packages/simulation` e compare com o checker.
9. Busque indícios fora de escopo: Canary runtime, paths de assets, gameplay, IndexedDB, backend,
   service worker ou gacha.
10. Mapeie cada critério final do README para comando, teste, screenshot ou inspeção no
    `acceptance-report.md`.
11. Se tudo passar, marque checkboxes, `STATE.md` e playbook como `done`, declare PB-01 elegível e
    commit. Se qualquer gate falhar, registre evidência, crie task de correção quando apropriado e
    mantenha o PB-00 bloqueado.

## Verificação obrigatória

```text
corepack pnpm install --frozen-lockfile
corepack pnpm verify
corepack pnpm architecture:check
git diff --check
git status --short
git ls-files
```

O relatório deve registrar exit codes, duração do boot, versão do browser, paths dos screenshots e
resultado individual de cada critério. “Parece correto” não é evidência.

## Critérios de aceite

- [ ] Todos os critérios finais do README possuem evidência fresca.
- [ ] Lockfile e working tree não mudam durante instalação/verificação, exceto documentação desta
  task.
- [ ] Screenshots foram inspecionadas visualmente, não apenas geradas.
- [ ] Nenhum conteúdo de PB-01 ou posterior foi antecipado.
- [ ] Relatório registra limites conhecidos sem tratá-los como falhas quando estão fora do PB-00.
- [ ] Estado final e próxima task elegível são inequívocos.

## Condições de parada

Qualquer gate funcional, arquitetural, visual ou de escopo sem evidência suficiente bloqueia o
fechamento. Não reduza critérios para obter aprovação.

## Handoff e commit

Se aprovado, atualize `README.md` e `STATE.md` para `done`, indique PB-01 como próximo playbook e use:

```text
docs: close PB-00 foundation gate
```

Se bloqueado, o commit deve registrar somente relatório, estado e task de correção com mensagem
descritiva do bloqueio.

## Relatório final

Comece com `APPROVED` ou `BLOCKED`, seguido das evidências, eventuais correções, commit e próximo
passo. Não execute PB-01.

