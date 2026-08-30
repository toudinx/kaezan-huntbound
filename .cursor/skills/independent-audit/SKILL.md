---
name: independent-audit
description: Conduzir a auditoria independente e opcional de um playbook do Kaezan Huntbound, reproduzindo a evidência sobre um commit identificado por hash e devolvendo defeitos numerados que viram tasks de correção. Use depois do aceite do usuário, ou em revisão crítica do trabalho de outro agente. Não emite veredito bloqueante e não exige árvore de trabalho limpa.
---

# Auditoria independente

Você não é o implementador. Este roteiro **não** vale para task de implementação — lá vale o
`AGENTS.md` (piloto: jogável, `verify` só no fechamento do playbook). Seu produto é uma lista de
defeitos reproduzíveis, não um resumo simpático do que foi feito.

## Posição no processo (revisão de 2026-08-18)

Auditoria **não é gate**. Ela roda **depois** do aceite do usuário, é opcional — decidida caso a caso,
tipicamente quando o playbook mexeu em kernel, contrato, golden ou persistência — e o que ela encontra
vira task de correção priorizada. Ela **não** impede o playbook seguinte de começar, e nenhuma task
espera o resultado dela.

Ela audita **um commit identificado por hash**. **Não exige `git status` limpo na `main`**: crie a
worktree a partir do SHA e audite ali. Exigir árvore vazia transforma qualquer trabalho paralelo não
relacionado em bloqueio, e foi o que travou PB-05-12 contra PB-06.

## Regra central

**Não aceite relatório: reproduza.** Toda afirmação do implementador — gate verde, hash, determinismo,
comportamento no browser — precisa ser reexecutada por você em checkout limpo, com a saída registrada.
Relatório e realidade já divergiram neste projeto.

Use modelo diferente do implementador. Se a plataforma não oferecer alternativa, registre o desvio com
modelo, effort e motivo (`docs/08_POLITICA_MODELOS_AGENTES.md`).

## Roteiro

1. **Checkout do commit auditado.** Worktree a partir do SHA exato. Registre o SHA. O estado da
   árvore de trabalho da `main` é irrelevante para a auditoria.
2. **Idempotência do fechamento.** Se o playbook fechou com `verify`, rode-o **uma vez** neste SHA.
   Duas vezes só se a primeira alterar a árvore (gate que escreve não é gate). Não aplique isto a
   cada task de implementação.
3. **Lint.** `biome check .` — já incluído no `verify` desde 2026-08-18; confirme mesmo assim.
4. **Determinismo.** `simulation:check` e `hunt:check` repetidos; goldens de playbooks anteriores
   precisam sobreviver byte-idênticos.
5. **Fronteiras.** `architecture:check` limpo; confira que a simulação continua sem DOM, sem `node:*`
   e sem dependência externa.
6. **Artefatos gerados.** Todo `--check` de gerador verde, provando que o versionado corresponde à
   geração.
7. **Higiene do repositório.** Nenhuma mídia pessoal versionada; nada de `apps/game/public/assets/**`
   no índice.
8. **Documentação.** Todo hash, path e fixture citado em card, spec ou contrato **existe** na árvore.
   Hash publicado e inexistente é defeito, não detalhe.
9. **Comportamento real.** Rode o jogo de fato quando o playbook entregar experiência jogável:
   andar, colidir, transicionar de andar, cooldown, console sem erro.
10. **Aceite de produto.** Registre separadamente do aceite técnico, com o que ele cobre e o que não
    cobre.

## Resultado

Uma lista de defeitos, não um veredito bloqueante. Cada defeito recebe identificador (`D1`, `D2`, …),
evidência reproduzível, impacto e o que precisa acontecer para fechá-lo.

Grave o relatório em `docs/playbooks/<PB-ID>/artifacts/acceptance-report.md` e abra as tasks
`PB-NN-FIX-MM` correspondentes. Registre no `STATE.md` apenas o commit auditado e as tasks abertas —
sem transcrever o relatório.

Orçamento de tempo (`qa:budgets`) entra como medição registrada, nunca como defeito bloqueante.

## O que nunca fazer

- Reduzir gate, escopo ou critério de aceite para conseguir aprovar.
- Aprovar por ausência de evidência ("não consegui rodar, mas parece certo").
- Consertar o que você está auditando: defeito encontrado vira defeito relatado e task de correção,
  não commit seu no meio da auditoria.
- Tratar limitação de ambiente (source pessoal ausente, por exemplo) como aprovação. Ela é escopo
  não coberto e precisa estar explícita no relatório.
