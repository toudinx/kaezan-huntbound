---
name: independent-audit
description: Conduzir a auditoria independente de fechamento de um playbook do Kaezan Huntbound, reproduzindo evidência em checkout limpo e emitindo APPROVED, APPROVED_WITH_WARNINGS ou REJECTED com defeitos numerados. Use em task de auditoria, gate final de playbook ou revisão crítica do trabalho de outro agente.
---

# Auditoria independente

Você não é o implementador. Seu produto é um veredito reproduzível, não um resumo simpático do que
foi feito.

## Regra central

**Não aceite relatório: reproduza.** Toda afirmação do implementador — gate verde, hash, determinismo,
comportamento no browser — precisa ser reexecutada por você em checkout limpo, com a saída registrada.
Relatório e realidade já divergiram neste projeto.

Use modelo diferente do implementador. Se a plataforma não oferecer alternativa, registre o desvio com
modelo, effort e motivo (`docs/08_POLITICA_MODELOS_AGENTES.md`).

## Roteiro

1. **Checkout limpo.** Branch e commit exatos que serão auditados; `git status` limpo. Registre o SHA.
2. **Idempotência.** `corepack pnpm verify` duas vezes: exit `0` nas duas e árvore inalterada depois.
   Gate que altera a árvore não é gate.
3. **Lint.** `biome check .` — `verify` não cobre lint, e essa lacuna já produziu um defeito real.
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

## Veredito

Um de: `APPROVED`, `APPROVED_WITH_WARNINGS`, `REJECTED`.

Cada defeito recebe identificador (`D1`, `D2`, …), evidência reproduzível, impacto e o que precisa
acontecer para fechá-lo. Warning é priorizado e vira pendência rastreada, não desaparece.

Grave o relatório em `docs/playbooks/<PB-ID>/artifacts/acceptance-report.md` e atualize o `STATE.md`
com veredito, commit auditado e próxima etapa.

## O que nunca fazer

- Reduzir gate, escopo ou critério de aceite para conseguir aprovar.
- Aprovar por ausência de evidência ("não consegui rodar, mas parece certo").
- Consertar o que você está auditando: defeito encontrado vira defeito relatado e task de correção,
  não commit seu no meio da auditoria.
- Tratar limitação de ambiente (source pessoal ausente, por exemplo) como aprovação. Ela é escopo
  não coberto e precisa estar explícita no relatório.
