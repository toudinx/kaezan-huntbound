# Worktree Integration and Cleanup Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make integration, post-integration verification, worktree removal, pruning, and temporary-branch deletion part of normal task completion without requiring an extra user prompt.

**Architecture:** The portable-task standard owns the lifecycle rules, the model policy owns the copied-prompt contract, and the pending PB-00R-FIX-01 card adopts the rule immediately. Serial tasks use `git merge --ff-only`; parallel executors remove clean worktrees after committing but preserve branches for the designated integrator.

**Tech Stack:** Markdown, Git worktrees, PowerShell-compatible Git commands

## Global Constraints

- Never delete the main repository root.
- Never remove a worktree that contains relevant uncommitted or untracked files.
- Never delete a temporary branch before its commit is represented in the base branch and the integrated verification passes.
- Never create an automatic merge commit, rebase, force-delete, or conflict resolution when `git merge --ff-only` fails.
- Pull-request worktrees and branches remain until review is complete.
- Completed historical task cards remain unchanged.

---

### Task 1: Apply the automatic lifecycle to normative docs and PB-00R-FIX-01

**Files:**
- Modify: `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`
- Modify: `docs/08_POLITICA_MODELOS_AGENTES.md`
- Modify: `docs/playbooks/PB-00R/tasks/PB-00R-FIX-01-normalizar-fim-de-linha-do-checkout.md`
- Reference: `docs/superpowers/specs/2026-08-11-worktree-integration-cleanup-policy-design.md`

**Interfaces:**
- Consumes: the approved lifecycle decision in the design spec.
- Produces: a normative task-completion protocol and a self-contained FIX-01 prompt that no longer requires the user to request fast-forward or cleanup.

- [ ] **Step 1: Strengthen the mandatory task-card contract**

In `docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md`, add a mandatory completion-lifecycle item requiring the task card to declare its base branch, integration mode, post-integration verification, worktree cleanup, pruning, and temporary-branch cleanup.

- [ ] **Step 2: Replace the commit-only execution ending**

Extend the execution protocol so a serial task performs these operations without asking the user again:

```powershell
git status --porcelain=v1 --untracked-files=all
git switch main
git merge --ff-only codex/pb00r-fix-01-line-endings
corepack pnpm verify
git worktree remove C:\Kaezan\kaezan-huntbound-pb00r-fix-01-line-endings
git worktree prune
git branch -d codex/pb00r-fix-01-line-endings
```

Document that every copied task prompt must contain concrete branch names, paths, and verification commands, as in the FIX-01 example above.

- [ ] **Step 3: Define serial and parallel cleanup rules**

In the parallel-tasks section, require each executor to remove its clean worktree after committing while preserving the temporary branch. Require the designated integrator to integrate branches serially, verify the combined result, and delete integrated branches. State that failure, conflict, dirty state, or unexpected base preserves worktree/branch and blocks completion.

- [ ] **Step 4: Update prompt and playbook checklists**

Amend the minimum prompt, new-playbook checklist, and prohibited-antipattern list so future task cards cannot end at commit/handoff, leave completed worktrees behind, or ask the user to perform a routine fast-forward.

- [ ] **Step 5: Update the model-policy prompt contract**

In `docs/08_POLITICA_MODELOS_AGENTES.md`, add base branch, integration mode, integrated verification, and cleanup to the required copied-prompt fields. Make explicit that routine local integration and cleanup are implied by task execution and do not need a second authorization.

- [ ] **Step 6: Make PB-00R-FIX-01 self-cleaning**

In the FIX-01 card:

- declare `main` as the base and `codex/pb00r-fix-01-line-endings` as the temporary branch;
- require an isolated worktree if the executor is not already in an isolated environment;
- add final integrated verification on `main`;
- require `git worktree remove`, `git worktree prune`, and safe branch deletion after success;
- preserve the worktree/branch and report if `--ff-only`, verification, or cleanup preconditions fail;
- include the same requirements in the copied prompt.

- [ ] **Step 7: Verify exact policy coverage**

Run:

```powershell
rg -n "ff-only|worktree remove|worktree prune|branch -d|não exige.*confirmação|não.*pedir" docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md docs/08_POLITICA_MODELOS_AGENTES.md docs/playbooks/PB-00R/tasks/PB-00R-FIX-01-normalizar-fim-de-linha-do-checkout.md
rg -n "T[B]D|T[O]DO|PLACEH[O]LDER" docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md docs/08_POLITICA_MODELOS_AGENTES.md docs/playbooks/PB-00R/tasks/PB-00R-FIX-01-normalizar-fim-de-linha-do-checkout.md
git diff --check
```

Expected: lifecycle terms occur in the normative standard and FIX-01; placeholder scan returns no matches; `git diff --check` exits `0`.

- [ ] **Step 8: Review the diff for contradictions**

Confirm manually that:

- serial tasks integrate before deleting their branch;
- parallel tasks delete worktrees but retain branches until integration;
- failures preserve recoverable state;
- PR workflows remain exempt;
- no completed historical task card was modified.

- [ ] **Step 9: Commit the implementation**

```powershell
git add docs/07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md docs/08_POLITICA_MODELOS_AGENTES.md docs/playbooks/PB-00R/tasks/PB-00R-FIX-01-normalizar-fim-de-linha-do-checkout.md docs/superpowers/plans/2026-08-11-worktree-integration-cleanup-policy.md
git commit -m "docs: automate task integration cleanup"
```
