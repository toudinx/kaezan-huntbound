# Kaezan Huntbound — entrada e autoridade

**Direção:** RPG solo de browser com hunts, build e helper; V0 pessoal/local-first sobre Canary,
Phaser 4 + TypeScript + Vite e gacha exclusivamente cosmético.

## Comece aqui

- [Validação do projeto](VALIDACAO_PROJETO.md): o que existe, lacunas e critérios de diversão.
- [Roteiro compacto](06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md): início, meio, fim e destino do backlog.
- **Próxima task:** [PB-13-01 — Fechar as decisões do loop](playbooks/PB-13/tasks/PB-13-01-loop.md).

## Autoridade

1. [ADR-05](05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md): produto, conteúdo e extensões permitidas.
2. [ADR-03](03_ADR_PHASER4_BROWSER_FIRST.md): stack e arquitetura, alterada pela ADR-05.
3. [Padrão 07](07_PADRAO_PLAYBOOKS_TASKS_PORTAVEIS.md): playbooks e tasks portáveis.
4. [Política 08](08_POLITICA_MODELOS_AGENTES.md): escolha de executor conforme risco.
5. [Roteiro 06](06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md): única fila de produto vigente.
6. [Contexto mestre](BASE_CONTEXTO_KAEZAN_HUNTBOUND(1).md) e [guia rápido](01_GUIA_DE_EXECUCAO.md): resumos.

`AGENTS.md` rege processo e gates, compartilhado com Cursor e Claude Code. O agente roda o gate do
diff; última task roda build; `verify` e browser QA são do usuário. Revisão independente é opcional,
pós-aceite, e produz backlog. Regras por diretório vivem em `.cursor/rules/`.

A [emenda 09](09_EMENDA_ADR05_SINCRONIZACAO_DE_FAIXA.md) continua uma proposta técnica; inclusão de
dungeons/modulação no plano não aprova automaticamente sua matemática ou todas as suas restrições.

## Fila vigente

| Playbook | Estado | Resultado |
|---|---|---|
| [PB-13](playbooks/PB-13/README.md) | Planejado; primeira task elegível | Run, recompensa útil e helper |
| [PB-14](playbooks/PB-14/README.md) | Planejado; depende do loop integrado | Mage, Paladin e encontros |
| [PB-15](playbooks/PB-15/README.md) | Planejado; depende das builds integradas | Dungeon modulada e V0 completo |

Os `STATE.md` registram execução; estar implementado não significa aceite de diversão.

## Histórico e referências

PB-00–12 e os antigos PB-17/18 mantêm specs e cards nos paths originais como histórico.
PB-19–21 são redirecionamentos; as cópias anteriores estão no arquivo de 2026-09-07. Cabeçalhos
históricos retiram as pendências da fila; consulte o roteiro para o destino de cada uma.
O roteiro e os contextos anteriores estão em `archive/2026-09-07/`.

`00`, `02`, `04`, `C03`–`C06` e `research/**` são evidência histórica, não direção de stack ou
backlog vigente. Não reescrever pesquisas para parecer que estudaram a arquitetura atual.

[Map Editor](projects/map-editor/PLAN.md) e [Borderizer](projects/map-editor/BORDERIZER.md) são
ferramentas auxiliares sob demanda. Não precedem automaticamente as entregas do jogo.
