# PB-04 — Aceite de produto

**Decisão:** `APPROVED` pelo usuário/supervisor.

**Data da decisão:** 2026-08-15 (o usuário declarou ter jogado em 2026-08-14).

**Quem decide:** o aceite visual é do usuário. Nenhuma auditoria automatizada substitui essa
decisão, e ela não foi inferida: foi declarada explicitamente em sessão.

## O que foi aceito

O usuário declarou: *"se for o meu, então está aprovado. Rodei ontem e aprovei"*, respondendo à
pergunta sobre a titularidade do aceite visual pendente registrado por PB-04-FIX-01.

## Escopo real do aceite, medido pela auditoria PB-04-10

Este registro descreve o que a auditoria conseguiu confirmar sobre o **ambiente em que o aceite
aconteceu**, para que o escopo do aceite não seja lido como maior do que é:

- `HUNTBOUND_PERSONAL_ASSET_SOURCE` está **vazio** neste workspace.
- `packages/test-fixtures/assets/pb04/personal-source-lock.json` exige um `manifest.json` de
  `32 397` bytes, `92636f6f03c84416b97906384a17b151a5a6675a41ea995a6aef2b4590d9e926`. O manifesto
  disponível em `C:\Kaezan\kaezan-arena-fable\frontend\public\assets\tibia\manifest.json` tem
  `808 964` bytes. São artefatos diferentes.
- Portanto `assets:pb04:personal:generate` e o script `dev:personal` **não são executáveis** neste
  workspace, e não existe pack `personal` do PB-04 em disco.
- Os profiles executáveis (`dev`, `build`, `verify`) usam o profile `test`, cujas `147` chaves de
  mídia apontam todas para a mesma fixture sintética de `68` bytes e `1 × 1` px.

**Conclusão:** o aceite cobre a **experiência jogável** — geometria, colisão, transições,
enquadramento, câmera, cadência e ausência de erro — que é exatamente o que o profile `test`
renderiza. Ele **não** cobre identidade visual com mídia real, porque essa mídia não existe neste
repositório nem na origem externa congelada.

## Consequência para B2

B2 continua **aberto**, mas deixa de ser bloqueante para o fechamento do playbook: o usuário aceitou
a experiência sem a mídia pessoal. B2 passa a ser um pré-requisito de **PB-07** (outfit/identidade
visual), não de PB-04.

Destravar B2 continua sendo reexportar `67` dos `137` ids reais da palette no projeto externo
`kaezan-arena-fable`, trabalho fora deste repositório.

## Relação com a auditoria

Este aceite **não** decide o fechamento do playbook. A auditoria integrada PB-04-10 é independente e
avalia gates, determinismo, fronteiras e integridade documental. Seu veredito está em
[`acceptance-report.md`](acceptance-report.md).
