# PB-13-08 — Conquistas do primeiro loop

**Objetivo.** Entregar um conjunto pequeno de conquistas sobre o que o loop já produz — caçar,
equipar, vender, subir de level, completar bestiary —, com progresso visível e recompensa única.

**Onde.** `packages/contracts/src/save/`, `packages/save/src/`, `packages/content/src/`,
`apps/game/src/save/`, `apps/game/src/ui/`.

**Fora de escopo.** Diárias, semanais, temporadas, notificações repetidas e árvore de poder.
Conquista que exija mecanismo que ainda não existe.

**Decisões congeladas.** README do PB-13. Conquista se apoia no que as tasks 01 a 07 integraram; não
inventar um contador novo para ter o que premiar. Recompensa é **única** e persiste sem duplicar
numa recarga. **Autorizado nesta card:** subir `SAVE_SCHEMA_VERSION` para o registro, com campo
aditivo e default que reproduz o save anterior, e regenerar os goldens de
`packages/test-fixtures/save/pb06`.

**Gate.** Linha `packages/save`/`contracts`: teste afetado + `save:check` + `architecture:check`.
Somar `content:check` se as conquistas entrarem por catálogo.

**O que olhar no jogo.** Completar uma conquista, receber a recompensa e recarregar. A tela deve
dizer o que já foi concluído e qual é o próximo objetivo.
