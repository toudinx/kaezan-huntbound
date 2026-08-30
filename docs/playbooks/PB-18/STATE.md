# PB-18 — Estado operacional

**Playbook:** `docs/playbooks/PB-18/README.md`

**Estado geral:** criado em 2026-08-30 a pedido do usuário — a seleção de hunts no formato da porta
de dungeon do WAKFU. Elegível, roda depois do PB-17. Nenhuma task iniciada.

**Última atualização:** 2026-08-30 — criação.

**Base:** a tela de hunting places da PB-10-05 e o índice gerado da PB-10-04. Nada aqui inventa dado:
o `HuntIndex` já carrega banda, nível recomendado, exp/h, criaturas com `lookType` e tabela de loot,
e `readHuntCharacter` já resolve uma ficha por hunt.

## Tasks

| ID | Status | Branch prevista | Modelo previsto | Modelo usado | Commit | Evidência principal |
|---|---|---|---|---|---|---|
| PB-18-01 | pending | `main` | econômico `xhigh` | — | — | — |
| PB-18-02 | pending | `main` | frontier `xhigh` | — | — | — |
| PB-18-03 | pending | `main` | frontier `xhigh` | — | — | — |
| PB-18-04 | pending | `main` | econômico `xhigh` | — | — | — |

## Bloqueios

**B21 — aberto por desenho, e é a fronteira do playbook.** O dial de dificuldade e a modulação de
nível do WAKFU são **mecânica**, não apresentação: são PB-12, e o PB-12 **exige emenda à ADR-05**
(decisão vinculante 1 — level sync não existe no Tibia). O PB-18 entrega o **assento** do dial e
nada mais. Uma task que comece a calcular recompensa por dificuldade saiu do playbook.

**B22 — aberto, decisão do usuário quando a PB-18-04 chegar lá.** Uma escada que marque "já rodei" /
"nunca entrei" exige estado persistido por hunt, e isso é **migração de schema de save** (PB-06),
que o `AGENTS.md` classifica como parada obrigatória. O default da PB-18-04 é entregar a escada só
com o que já existe — ordem de faixa e nível recomendado — e registrar aqui se o usuário quiser
histórico.

**B23 — aberto, medido.** O runtime de asset é criado **depois** da seleção
(`apps/game/src/main.ts:363`), e o boot da tela de hunting places foi medido em ~5,27 s na PB-10-05.
Carregar os cinco packs de hunt no atlas para ter retrato é a saída errada. A PB-18-03 escolhe outra
e registra qual.

**B18 — aberto, herdado, e relevante aqui.** Outfits de 32 × 32 do export pessoal saem cisalhados;
Orc (lookType 5) é um deles, Hero (73) não. Retrato de criatura na porta vai **exibir** esse defeito
onde ele hoje passa despercebido. Não é regressão da PB-18-03, e não é dela consertar.
