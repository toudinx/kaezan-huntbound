# Contexto mestre para agentes

Kaezan Huntbound é um RPG solo, top-down/tile-based, browser-first, com sensação de hunt de Tibia.
O objetivo do V0 é preparar uma build, jogar ou assistir ao helper, completar uma run e progredir.

- Produto e fontes: [ADR-05](05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md).
- Arquitetura: [ADR-03](03_ADR_PHASER4_BROWSER_FIRST.md), Phaser 4 + TypeScript + Vite.
- Próximo trabalho: [roteiro compacto](06_ROTEIRO_PLAYBOOKS_IMPLEMENTACAO.md), PB-19 → PB-20 → PB-21.
- Evidência atual e lacunas: [validação](VALIDACAO_PROJETO.md).
- Execução e gates: `AGENTS.md`; formato das cards: documento 07; modelos: documento 08.

Já há Knight, cinco hunts, save, conjuração de monstros e cockpit. Isso não prova um loop completo,
helper completo, progressão, gear, outras vocações ou dungeons moduladas.

O V0 continua pessoal e local-first. Conteúdo e assets vêm do acervo existente. Não inventar
criaturas autorais, gacha de poder, backend obrigatório ou monetização. Simulação não conhece
Phaser/DOM; assets são resolvidos por manifesto; artefatos gerados não se editam à mão.

Leia a card da task, o STATE do playbook e os arquivos pertinentes. Não é necessário carregar o
histórico inteiro. Ideias futuras e documentos antigos não ampliam o escopo de uma task.
