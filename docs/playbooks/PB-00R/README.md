# PB-00R — Correções do gate de fundação

> **Para agentes:** use `superpowers:subagent-driven-development` ou
> `superpowers:executing-plans` para executar uma task por chat. Cada task termina com um prompt
> completo para copiar e colar. Não execute o playbook inteiro em uma conversa.

**Objetivo:** corrigir achados reproduzidos após o fechamento do PB-00 e revalidar o gate de
fundação com foco em viabilizar a próxima iteração jogável. Problemas conhecidos são medidos e
registrados, mas somente riscos graves impedem a evolução do produto.

**Arquitetura:** cada defeito possui uma task coesa e verificável. Resize, contrato de testes e
limpeza do output podem ser implementados em worktrees paralelos; o budget de boot consome o output
limpo e o fechamento integrado depende de todas as correções.

**Stack:** Phaser 4.2.1 · TypeScript 7.0.2 · Vite 8.2.1 · Vitest 4.1.10 · Playwright 1.62.1 · pnpm
11.21.0 · Windows.

## Restrições globais

- PB-01 permanece bloqueado enquanto este playbook não estiver `done`.
- Um achado só bloqueia quando impede build/boot, inutiliza um fluxo essencial, causa crash ou
  corrupção/perda de dados, cria risco de segurança, ou impede concretamente a próxima iteração.
- Performance, flakiness diagnóstica, polish e dívida técnica sem impacto grave são warnings
  priorizados, não bloqueios.
- O alvo saudável de boot permanece em 5.000 ms e continua produzindo métricas; entre 5.000 e
  30.000 ms é warning aceito, e acima de 30.000 ms ou sem shell acionável é falha bloqueante.
- Nenhuma task adiciona retry ou aquece cache para obter aprovação.
- Nenhuma task introduz gameplay, assets, save, backend, PWA ou suporte multi-browser.
- Implementações comportamentais começam por teste falhando e terminam com evidência fresca.
- Tasks paralelas usam worktree e branch isolados; porta 4173 e atualização de documentos
  compartilhados são serializadas.
- Modelo e validador seguem `docs/08_POLITICA_MODELOS_AGENTES.md`.

## Fontes normativas

Em caso de conflito, ler nesta ordem:

1. `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`;
2. `docs/03_ADR_PHASER4_BROWSER_FIRST.md`;
3. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`;
4. `docs/08_POLITICA_MODELOS_AGENTES.md`;
5. `docs/superpowers/specs/2026-08-11-pb-00r-model-policy-design.md`;
6. este `README.md`;
7. a task card em execução;
8. `STATE.md` somente para estado operacional.

## Achados confirmados

1. A grade Phaser é desenhada apenas em `ShellScene.create()` e não acompanha resize pós-boot.
2. O budget Fast 4G falhou intermitentemente com mark de 12.328,8 ms contra 5.000 ms.
3. `pnpm --recursive run test` ignora packages sem script `test`; seis stubs estão nessa condição.
4. Vite não limpa automaticamente `dist/game` porque o `outDir` está fora da raiz do app.

## Estrutura de execução

```text
Onda 1 — paralela em worktrees:
  PB-00R-01  resize do playfield
  PB-00R-03  contrato de testes por package
  PB-00R-04  limpeza do output

Onda 2 — após integrar PB-00R-04:
  PB-00R-02  estabilidade e diagnóstico do boot

Onda 3 — após integrar PB-00R-01/02/03/04:
  PB-00R-05  revalidação independente
```

As três tasks da onda 1 não compartilham código funcional. Seus commits podem ser produzidos em
paralelo, mas um integrador único resolve `README.md`/`STATE.md` e executa verificações que usem a
porta 4173.

### Uso deliberado do Game Studio

- PB-00R-01 usa `game-studio:phaser-2d-game` para o lifecycle da scene e
  `game-studio:game-playtest` para a regressão visual pós-resize.
- PB-00R-02 usa `game-studio:game-playtest` para boot, métricas e reprodução no browser.
- PB-00R-05 usa `game-studio:game-playtest` e `game-studio:web-game-foundations` para a auditoria
  visual, de performance e de fronteiras arquiteturais.
- PB-00R-03 e PB-00R-04 não invocam Game Studio: são correções mecânicas de workspace e build, fora
  da especialidade do plugin. Elas mantêm TDD e verificação geral.

## Ordem das tasks

| ID | Classe | Modelo sugerido | Dependência | Paralelo | Status |
|---|---|---|---|---|---|
| [PB-00R-01](tasks/PB-00R-01-redesenhar-playfield-no-resize.md) | implementação menor | Luna `xhigh` | nenhuma | onda 1 | pronto para integrar |
| [PB-00R-03](tasks/PB-00R-03-fechar-descoberta-de-testes-por-package.md) | implementação menor | Luna `xhigh` | nenhuma | onda 1 | pronto para integrar |
| [PB-00R-04](tasks/PB-00R-04-limpar-output-de-build.md) | implementação menor | Luna `xhigh` | nenhuma | onda 1 | done |
| [PB-00R-02](tasks/PB-00R-02-estabilizar-budget-de-boot.md) | implementação complexa | Sol `xhigh` ou Opus 5 | PB-00R-04 | não | done (risco aceito) |
| [PB-00R-05](tasks/PB-00R-05-revalidar-gate-integrado.md) | validação | Sol `xhigh` ou Opus 5 | PB-00R-01/02/03/04 | não | pending |

## Critérios finais de aceite

- [ ] Resize de 390×844 para 1366×768 na mesma página redesenha o playfield completo.
- [ ] Listener de resize da scene é removido no shutdown e não duplica após HMR/recriação.
- [ ] Screenshot pós-resize está versionada e revisada no tamanho original.
- [ ] Cinco processos frios consecutivos observam o mark acionável em até 30.000 ms; ocorrências
  acima do alvo saudável de 5.000 ms ficam registradas como warning não bloqueante.
- [ ] Toda execução do budget registra métricas suficientes para diagnosticar nova falha.
- [ ] Todo package do workspace declara script `test` não mascarado.
- [ ] Um teste novo em qualquer package entra no gate sem editar o script raiz.
- [ ] Playwright continua fora do runner unitário.
- [ ] Build limpa `dist/game` e remove sentinela sem tocar paths externos ao output.
- [ ] `corepack pnpm install --frozen-lockfile` passa e os gates do `verify` passam; é aceita somente
  a falha conhecida da assertion de 5.000 ms quando o shell fica acionável em até 30.000 ms e as
  métricas são preservadas.
- [ ] Relatório final registra limites conhecidos, modelos usados e desvios.

## Fora de escopo

- code splitting ou redução do bundle Phaser;
- remoção da instrumentação, aumento do limite bloqueante de 30.000 ms ou retry de medição;
- mudança de engine, gameplay, conteúdo, assets ou persistência;
- suporte completo a outros browsers;
- início do PB-01.

## Resultado esperado

O playbook termina em um de três estados:

- `APPROVED`: todos os critérios possuem evidência fresca e PB-01 volta a ser elegível;
- `APPROVED_WITH_WARNINGS`: não há risco grave, os desvios estão registrados e priorizados, e PB-01
  volta a ser elegível;
- `BLOCKED`: existe risco grave reproduzido que impede a próxima iteração; PB-01 continua inelegível.
