# CLAUDE.md

As instruções deste repositório são compartilhadas entre Cursor, Codex e Claude Code. Elas vivem em
um único arquivo, importado abaixo:

@AGENTS.md

Regras com escopo por diretório estão em `.cursor/rules/*.mdc` e valem para qualquer agente. Carregue
a que corresponder ao diretório que você for editar:

- `.cursor/rules/10-boundaries.mdc` — `packages/simulation`, `packages/contracts`
- `.cursor/rules/20-content.mdc` — `packages/content`, tools de conteúdo
- `.cursor/rules/30-assets.mdc` — `packages/assets`, asset-packer
- `.cursor/rules/40-game.mdc` — `apps/game`
- `.cursor/rules/50-tests.mdc` — testes e fixtures
- `.cursor/rules/60-playbook.mdc` — `docs/playbooks`

Procedimentos longos estão em `.cursor/skills/<nome>/SKILL.md` como skills no formato aberto
SKILL.md: `run-gates`, `playbook-task`, `worktree-cycle`, `hunt-content-pipeline`,
`independent-audit`.
