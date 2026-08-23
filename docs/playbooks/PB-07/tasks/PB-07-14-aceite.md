# PB-07-14 — Entregar para o aceite

**Status inicial:** pending

**Classe da tarefa:** fechamento de playbook; verificação e entrega

**Modelo sugerido:** Luna `max` ou Grok 4.6 `high`

**Validador sugerido:** **o usuário jogando.** Os gates só habilitam a entrega; não emitem veredito.

**Rota:** `superpowers:verification-before-completion`. Skills operacionais: `playbook-task`,
`run-gates`.

**Paralelismo:** não. É a última.

## Objetivo

Entregar o PB-07 jogável e dizer, em poucas linhas, **o que olhar** e **como reproduzir**. Playbook
não fecha por veredito de auditoria: fecha quando o usuário roda o jogo e aprova.

## Resultado esperado

`corepack pnpm verify` verde, `corepack pnpm dev` de pé, `qa:budgets` medido e registrado como
número, e um roteiro curto de sete itens — um por observação que originou o playbook.

## Dependências

- PB-07-02 a PB-07-13 integradas em `main`.

## Leitura mínima

1. esta task;
2. `docs/playbooks/PB-07/README.md`, "Critérios finais de aceite", e `STATE.md` inteiro;
3. `AGENTS.md`, "O aceite é o usuário jogando" e a seção "Gates";
4. `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, "Fechamento de playbook".

## Decisões congeladas

- **`qa:budgets` é informativo.** Vermelho aqui vira task de performance no backlog, **nunca**
  bloqueio. Rodar é obrigatório; bloquear não é. B5 do PB-05 estourou o teto em 11,7 ms e manteve o
  gate global vermelho por um playbook inteiro — não repita.
- **Auditoria independente é opcional e roda depois do aceite.** O que ela achar vira task de
  correção, não portão para o PB-08.
- **Nada de retry, `skip`, timeout inflado ou asserção enfraquecida** para fechar. Se um teste está
  instável, isso é um achado do relatório, não um problema a esconder.
- **Não abra escopo.** Se algo estiver faltando, vira bullet no README ou task de correção. Esta task
  não implementa.
- **O relatório não vai para o `STATE.md`.** A narrativa vai na mensagem de commit; o `STATE.md`
  recebe status, número do budget e bloqueios abertos.

## Escopo permitido

```text
docs/playbooks/PB-07/STATE.md
docs/playbooks/PB-07/README.md          (só marcar os critérios de aceite)
docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md   (só a linha de status do PB-07)
```

Nenhum código. Se o `verify` reprovar, a correção é uma task de FIX própria, não um remendo aqui.

## Fora de escopo

- **qualquer arquivo de código.** `verify` vermelho vira task de FIX, nunca remendo aqui;
- implementar o que faltou: vira bullet no `README.md` ou task de correção;
- auditoria independente, que é opcional e roda **depois** do aceite;
- abrir o PB-08. Nenhum playbook espera o fechamento formal de outro: o que o PB-08 precisa é código
  integrado em `main` e verde.

## Execução

- [ ] **1. Confirmar a árvore limpa e a `main` integrada.**

```powershell
git -C C:\Kaezan\kaezan-huntbound status --porcelain=v1 --untracked-files=all
git -C C:\Kaezan\kaezan-huntbound log --oneline -20
```

Toda task de PB-07-02 a PB-07-13 precisa ter commit integrado registrado no `STATE.md`. Se alguma não
tiver, o playbook não está pronto para o aceite.

- [ ] **2. Gate bloqueante, em checkout limpo.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound verify
```

Registre o tempo e o exit code. Se reprovar, **pare**: abra uma task de FIX e registre o bloqueio.

- [ ] **3. Gate informativo.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound qa:budgets
```

Registre o número no `STATE.md`, seção "Métricas", verde ou vermelho. Vermelho vira bullet de
performance no backlog e **não** impede a entrega.

- [ ] **4. Percorrer os critérios de aceite do README, um a um.**

Para cada um, diga como foi verificado: teste, spec de browser, ou observação ao jogar. Critério sem
evidência não é marcado.

- [ ] **5. Jogar as três vocações.**

```powershell
corepack pnpm --dir C:\Kaezan\kaezan-huntbound dev
```

Knight, Paladin e Sorcerer, nas duas hunts, contra criatura comum e contra o boss. Recue e veja
regenerar. Ligue e desligue stance. Gaste cargas. Dê `F5` no meio e confirme que a run e a stance
voltam.

- [ ] **6. Escrever o roteiro de aceite.**

Vai na mensagem de commit e na resposta ao usuário — **não** no `STATE.md`. Sete itens, um por
observação original, cada um dizendo o que olhar e como reproduzir. Curto: se passar de uma tela, o
usuário não lê.

- [ ] **7. Atualizar estado e entregar.**

```powershell
git -C C:\Kaezan\kaezan-huntbound switch -c codex/pb07-14-acceptance
git -C C:\Kaezan\kaezan-huntbound add docs
git -C C:\Kaezan\kaezan-huntbound commit -m "docs: hand PB-07 over for acceptance"
git -C C:\Kaezan\kaezan-huntbound switch main
git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb07-14-acceptance
git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb07-14-acceptance
```

Worktree não é necessária: a task só toca documentação.

- [ ] **8. Entregar ao usuário com o jogo de pé**, e parar. O aceite é dele.

## Verificação

`corepack pnpm verify` verde em checkout limpo, com tempo e exit code registrados.
`corepack pnpm qa:budgets` executado e o número registrado. Os dez critérios de aceite do README
percorridos com evidência nomeada. As três vocações jogadas nas duas hunts.

## Critérios de aceite

- [ ] `verify` verde em `main`, com evidência fresca.
- [ ] `qa:budgets` executado e o número no `STATE.md`, verde ou vermelho.
- [ ] Todo critério do README marcado tem evidência nomeada; nenhum marcado sem.
- [ ] As três vocações foram jogadas nas duas hunts e contra o boss.
- [ ] `F5` no meio da run devolve a run e a stance.
- [ ] Nenhum `retry`, `skip` ou asserção enfraquecida foi introduzido.
- [ ] O roteiro de sete itens existe, e cabe em uma tela.
- [ ] `STATE.md` tem status final, número do budget e bloqueios abertos — e **não** tem a narrativa.
- [ ] A linha do PB-07 no roteiro está atualizada.
- [ ] Nenhum arquivo de código foi tocado nesta task.

## Condições de parada

**Pare e registre no `STATE.md`** se: `verify` reprovar; um critério de aceite não puder ser
verificado; ou um teste se mostrar instável. Nos três casos a saída é a mesma — abrir uma task de
FIX — e nenhum deles se resolve remendando aqui.

## Persistência do handoff

`STATE.md`: estado geral do playbook, número do `qa:budgets`, bloqueios abertos e o que virou backlog.
Nada de relatório.

## Commit

`docs: hand PB-07 over for acceptance`

## Ciclo de conclusão

Branch-base `main`; branch `codex/pb07-14-acceptance`; sem worktree; integração por `--ff-only`;
limpeza por `branch -d`.

## Relatório final

O roteiro de sete itens, o resultado dos dois gates com números, o que foi observado jogando cada
vocação, o que virou backlog, e a frase que entrega o jogo ao usuário.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com Luna max ou Grok 4.6 high.
Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-07\tasks\PB-07-14-aceite.md

Leia AGENTS.md (secoes "Gates" e "O aceite e o usuario jogando"), docs/playbooks/PB-07/README.md,
o STATE.md inteiro, e docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md secao "Fechamento de playbook".

Esta task NAO TOCA CODIGO. Se o verify reprovar, abra uma task de FIX e registre o bloqueio; nao
remende aqui.

Confirme que PB-07-02 a PB-07-13 tem commit integrado registrado no STATE.md.

Rode corepack pnpm verify em checkout limpo e registre tempo e exit code.

Rode corepack pnpm qa:budgets e registre o NUMERO no STATE.md, verde ou vermelho. Budget e
INFORMATIVO: vermelho vira bullet de performance no backlog e NAO impede a entrega. B5 do PB-05
estourou o teto em 11,7 ms e manteve o gate global vermelho por um playbook inteiro — nao repita.

Percorra os criterios de aceite do README um a um. Criterio sem evidencia nomeada NAO e marcado.

Suba corepack pnpm dev e jogue Knight, Paladin e Sorcerer nas duas hunts, contra criatura comum e
contra o boss. Recue e veja regenerar. Ligue e desligue stance. Gaste cargas. De F5 no meio e
confirme que a run e a stance voltam.

Escreva o ROTEIRO DE ACEITE: sete itens, um por observacao que originou o playbook, cada um dizendo o
que olhar e como reproduzir. Cabe em uma tela. Vai na mensagem de commit e na resposta ao usuario,
NAO no STATE.md — o STATE.md recebe status, numero do budget e bloqueios abertos.

Nada de retry, skip, timeout inflado ou assercao enfraquecida para fechar. Teste instavel e ACHADO do
relatorio, nao problema a esconder. Nao abra escopo: o que faltar vira bullet ou task de correcao.

Atualize a linha do PB-07 em docs/06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md. Commite, integre por
fast-forward e limpe a branch. Sem worktree: a task so toca documentacao.

Entregue ao usuario com o jogo de pe e PARE. O aceite e dele.
```
