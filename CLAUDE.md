# CLAUDE.md

As instruções deste repositório são compartilhadas entre Cursor, Codex e Claude Code. Elas vivem em
`AGENTS.md`, importado abaixo. **Este arquivo não cria regra nova.** Se algo aqui divergir do
`AGENTS.md`, o `AGENTS.md` vence.

@AGENTS.md

## Piloto

Isto é um MVP, e **o custo do processo é proporcional ao raio do diff**: renomear uma constante e
reescrever o kernel não pagam a mesma conta. O tempo vai para arquitetura, qualidade de código e a
feature **jogável**. Aceite é o usuário abrindo o jogo e apontando o erro — não uma suíte verde. Não
existe primeira integração 100%: bug no playtest vira `PB-NN-FIX-MM`.

O default é editar, rodar a linha do seu raio na tabela de gates — segundos, uma vez — e commitar na
`main`. **A suíte pesada é do usuário:** `test`, `qa:browser`, `verify` e `qa:budgets` não são seus.
Escreva o teste pequeno que prova que funciona, nunca a suíte. Branch e worktree só quando o playbook
declarar duas tasks paralelas ao mesmo tempo.

Funcionalidade rodando e gate verde: **pare**. Não releia o diff atrás de melhorias.

Detalhe: `AGENTS.md` § Gates e a skill `run-gates`.

## Regras por diretório

Valem para qualquer agente, inclusive os que não carregam `.cursor/rules` automaticamente. Leia a
que corresponder ao que você for editar:

- `.cursor/rules/00-workspace.mdc` — toolchain; **sempre aplica**
- `.cursor/rules/10-boundaries.mdc` — `packages/simulation`, `packages/contracts`
- `.cursor/rules/20-content.mdc` — `packages/content`, tools de conteúdo
- `.cursor/rules/30-assets.mdc` — `packages/assets`, asset-packer
- `.cursor/rules/40-game.mdc` — `apps/game`
- `.cursor/rules/50-tests.mdc` — testes e fixtures
- `.cursor/rules/60-playbook.mdc` — `docs/playbooks`

## Skills

Procedimentos em `.cursor/skills/<nome>/SKILL.md`: `playbook-task`, `run-gates`,
`hunt-content-pipeline`, `independent-audit`. Não carregue skills de plugin (Superpowers e afins) a
menos que a task card as nomeie.
