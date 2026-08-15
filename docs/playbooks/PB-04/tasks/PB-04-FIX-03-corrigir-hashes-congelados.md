# PB-04-FIX-03 — Corrigir os hashes congelados e o contrato de replay

**Status inicial:** pending

**Classe da tarefa:** correção de integridade documental

**Modelo sugerido:** GPT-5.6 Sol `xhigh`; fallback Claude Opus 5.

**Rota:** `superpowers:verification-before-completion`. TDD não se aplica: nenhum comportamento novo.

**Paralelismo:** pode paralelizar com PB-04-FIX-02 e PB-04-FIX-04.

## Defeito

Duas superfícies documentais de congelamento estão erradas ou ausentes.

### D2 — os 5 hashes de replay do card FIX-01 não descrevem nada

`docs/playbooks/PB-04/tasks/PB-04-FIX-01-corrigir-experiencia-da-hunt.md` publica uma tabela de
"evidências determinísticas". Busca literal de cada prefixo no repositório inteiro (excluindo `.git`
e `node_modules`) retorna **um único arquivo: o próprio card**.

| Alegado pelo card | Valor real, medido por `hunt:check` e pelos `hashes.md` |
|---|---|
| cenário `pb04` `986b23df…` | `f8ecff35694c0ba8557546f40d0f7ad384746a0027f0bc3a5c51b2777f88c6e0` |
| snapshot `pb04` `89879376…` | `2e546b17a6905f5be29393b388df0c7dc37919fa75d09d8bcbb776bd75756816` |
| eventos `pb04` `74bd1a51…` | `6e1206eb2ce7ed7647e9923b6d29a3f08f30ca7ec9ddf01b539d6310818d42e1` |
| snapshot `pb04-respawn` `0cf24215…` | `2e968f79b850725dd2942ffc2421108b9f4cc09a82b13bda19995fad43e993d3` |
| eventos `pb04-respawn` `5803374b…` | `613079d592335829a8e9e7565877c046cee9e21f0f4478b38af4050b7334ba30` |

O card ainda afirma que "os hashes abreviados acima têm os valores completos nos `hashes.md` de cada
fixture" — falso, os prefixos não batem com nenhum `hashes.md`.

**As fixtures estão corretas.** O que está errado é a tabela que as documenta.

### D3 — `REPLAY_CONTRACT.md` nunca recebeu as fixtures do PB-04

`docs/simulation/REPLAY_CONTRACT.md` congela apenas `pb-03-kernel-coverage`. Não existe seção para
`pb04` nem para `pb04-respawn`, embora `hunt:check` já esteja em `check` e `verify` e o roteiro liste
`packages/test-fixtures/hunt/pb04/` como área do gate.

`STATE.md` declara W11 fechado "com sidecars e hash tables versionados": os sidecars existem, a
atualização do contrato não aconteceu.

## Resultado esperado

- O card do FIX-01 publica os hashes reais, ou remete aos `hashes.md` sem republicar valores.
- `REPLAY_CONTRACT.md` ganha a seção do PB-04, com as duas fixtures, seus quatro artefatos cada,
  seed, contagem de ticks, contagem de eventos e tick final — no mesmo formato da seção do PB-03.
- Existe um gate que **impede a divergência de voltar a acontecer** sem ser notada.

## Dependências

Nenhuma.

## Leitura mínima

1. este card;
2. `docs/playbooks/PB-04/artifacts/acceptance-report.md`, §4 e §8 D2/D3;
3. `docs/simulation/REPLAY_CONTRACT.md` inteiro, com atenção à seção do PB-03 como modelo;
4. `packages/test-fixtures/hunt/pb04/hashes.md` e `packages/test-fixtures/hunt/pb04-respawn/hashes.md`;
5. `docs/playbooks/PB-04/tasks/PB-04-FIX-01-corrigir-experiencia-da-hunt.md`.

## Decisões congeladas

- **Nenhuma fixture, golden, sidecar ou artefato muda.** Os bytes estão certos; a documentação é que
  vai até eles. Se algum digest medido divergir de §4 do relatório de aceite, **pare**: isso é
  defeito novo, não item deste card.
- Republicar hash em prosa é a causa raiz do D2. Prefira **uma fonte só**: o `hashes.md` da fixture,
  gerado, e referências apontando para ele.
- O gate anti-divergência deve comparar **arquivo contra sidecar**, não prosa contra prosa.

## Escopo permitido

```text
docs/simulation/REPLAY_CONTRACT.md
docs/playbooks/PB-04/tasks/PB-04-FIX-01-corrigir-experiencia-da-hunt.md
packages/test-fixtures/hunt/**/hashes.md
package.json
tools/replay/**
```

## Fora de escopo

- alterar qualquer `.json`, `.jsonl` ou `.sha256` de fixture;
- alterar kernel, contratos, conteúdo ou app;
- corrigir `PB-04-SELECTION.md` (W13) — pertence a PB-04-FIX-04;
- qualquer trabalho de PB-05.

## Execução

- [ ] **1. Medir antes de escrever.** Rode `corepack pnpm hunt:check` e `corepack pnpm simulation:check`
      e registre os digests com exit code. Compare com §4 do relatório de aceite; devem ser idênticos.
- [ ] **2. Corrigir o card do FIX-01**, substituindo a tabela errada pelos valores reais ou por
      remissão aos `hashes.md`. Registre no próprio card que a tabela anterior estava incorreta e que
      a auditoria PB-04-10 a detectou — histórico de erro não se apaga.
- [ ] **3. Acrescentar a seção PB-04 ao `REPLAY_CONTRACT.md`**, no formato da seção do PB-03.
- [ ] **4. Fechar o buraco com gate.** Acrescente uma verificação que compare os hashes publicados
      com os arquivos reais e falhe se divergirem, e a encaixe em `check`/`verify`.
- [ ] **5. Provar o gate por mutação.** Altere um dígito de um hash publicado, confirme que o gate
      sai `1`, restaure e confirme `0`.
- [ ] **6. Confirmar que nenhuma fixture mudou:** `git status` limpo em
      `packages/test-fixtures/hunt/**` exceto os `hashes.md` que a task tocar deliberadamente.
- [ ] **7. Gate completo:** `format:check`, `hunt:check`, `simulation:check` e
      `corepack pnpm verify`, todos exit `0`.

## Critérios de aceite

- [ ] Nenhum prefixo de hash inexistente permanece em `docs/playbooks/PB-04/**`.
- [ ] `REPLAY_CONTRACT.md` congela `pb04` e `pb04-respawn` com os quatro artefatos de cada.
- [ ] Existe gate que falha quando hash publicado e arquivo divergem, provado por mutação com exit
      code registrado.
- [ ] Os digests de `hunt:check` e `simulation:check` são byte-idênticos aos de §4 do relatório.
- [ ] Nenhum arquivo de fixture além de `hashes.md` foi alterado.
- [ ] `corepack pnpm verify` sai `0`.

## Condições de parada

Pare se qualquer digest medido divergir de §4 do relatório de aceite. Isso significa que algo mudou
os artefatos entre a auditoria e esta task, o que é investigação, não correção documental.

## Prompt copiável para novo chat

```text
Trabalhe em C:\Kaezan\kaezan-huntbound com GPT-5.6 Sol effort xhigh, ou Claude Opus 5 como fallback.
Use obrigatoriamente superpowers:verification-before-completion.

Execute integralmente e somente:
C:\Kaezan\kaezan-huntbound\docs\playbooks\PB-04\tasks\PB-04-FIX-03-corrigir-hashes-congelados.md

Leia antes o §4 e o §8 D2/D3 de docs/playbooks/PB-04/artifacts/acceptance-report.md. Crie branch e
worktree isoladas e rode "corepack pnpm install --prefer-offline" dentro dela.

O defeito e documental: os cinco hashes de replay publicados no card PB-04-FIX-01 nao existem em
lugar nenhum do repositorio, e REPLAY_CONTRACT.md nunca recebeu as fixtures pb04 e pb04-respawn. As
FIXTURES ESTAO CORRETAS - nao toque em nenhum .json, .jsonl ou .sha256 de fixture.

Comece medindo: corepack pnpm hunt:check e corepack pnpm simulation:check, e compare os digests com
o §4 do relatorio. Se divergirem, PARE e reporte.

Corrija o card, acrescente a secao PB-04 ao contrato de replay no formato da secao PB-03, e crie um
gate que compare hash publicado contra arquivo real e falhe na divergencia. Prove esse gate por
mutacao, com exit code registrado.

Nao corrija PB-04-SELECTION.md, que pertence a outro card. Nao inicie nenhum trabalho de PB-05.
```
