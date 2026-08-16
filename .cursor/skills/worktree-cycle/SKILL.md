---
name: worktree-cycle
description: Criar, usar, integrar e limpar a git worktree de uma task do Kaezan Huntbound no Windows, incluindo as três falhas recorrentes de limpeza. Use ao iniciar ou concluir qualquer task de playbook.
---

# Ciclo de worktree

Padrão atual: worktree em `.worktrees/<slug>` dentro do repositório (o diretório é gitignorado e o
Biome o exclui). Worktree irmã em `C:\Kaezan\kaezan-huntbound-<branch>` ainda aparece em tasks
antigas e continua válida. Branch: `<agente>/pb-<NN>-<NN>-<slug>`.

## Criar

```bash
git worktree add .worktrees/pb-04-fix-02-input-edge -b codex/pb-04-fix-02-input-edge main
cd .worktrees/pb-04-fix-02-input-edge
corepack pnpm install --prefer-offline
```

**Defeito de gate conhecido (aberto, pertence a `PB-04-FIX-04`):** worktree aninhada carrega um
`biome.json` próprio e o Biome aborta com *"Found a nested root configuration"*, derrubando
`format:check` e, com ele, `verify` na raiz. Enquanto `biome.json` não excluir `.worktrees`, rode os
gates de dentro da worktree, ou use a forma irmã `C:\Kaezan\kaezan-huntbound-<branch>`. Não
contorne removendo arquivo de configuração.

O `install` não é opcional: worktree nova não tem `node_modules` e todo gate falha sem ele. Com o
store local, resolve em segundos e não toca `pnpm-lock.yaml`.

## Integrar (task serial)

```bash
git status --porcelain=v1 --untracked-files=all
git switch main
git merge --ff-only codex/pb-04-fix-02-input-edge
corepack pnpm verify
```

Verificação pós-integração é obrigatória: o que passou na branch pode falhar integrado.

Se `--ff-only` falhar, houver conflito, teste vermelho, árvore suja ou branch-base inesperado: pare.
Preserve worktree e branch, registre no `STATE.md`, reporte. Não crie merge commit, não faça rebase,
não force deleção.

## Limpar

Confirme antes: árvore limpa, commit existe, path resolvido é mesmo a worktree temporária.

```bash
rm -rf .worktrees/pb-04-fix-02-input-edge
git worktree prune
git branch -d codex/pb-04-fix-02-input-edge
```

`git worktree remove` costuma falhar com **"Directory not empty"** por causa de `node_modules`. Não
insista nele: apague o diretório e use `prune`.

Se o `rm -rf` falhar com **"Device or resource busy"** em `apps/game`, há um `vite dev`/`preview`
segurando a pasta. Mate o listener e repita:

```powershell
Get-NetTCPConnection -LocalPort 4173 -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

## Task paralela

O executor remove a worktree limpa depois do commit e **preserva a branch** para o integrador.
Remover worktree não remove branch nem commit. Só o integrador apaga a branch, depois de incorporar e
verificar o conjunto. Tasks paralelas não disputam fast-forward concorrente de `main`.

## Nunca

Apagar worktree suja, branch não integrada, ou qualquer path que você não tenha resolvido e conferido.
