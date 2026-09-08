# PB-14 — Três vocações, encontros distintos

**Status:** planejado. Depende do código integrado de PB-13.

## Objetivo e escopo

Entregar Sorcerer e Paladin, suporte necessário aos kits e encontros com comportamento distinto. Reutilizar Knight, cinco hunts, economia e helper; sem Druid.

## Decisões congeladas

Roteiro 06 e ADR-05 regem produto; ADR-03 rege arquitetura. **Herda inteiras as decisões congeladas
do `README.md` do PB-13** — morte, personagem persistente nascendo no nível 1 com o kit completo, o
set da faixa como eixo de progressão, curva comprimida, buff de próxima hunt. Elas não se reabrem
aqui.

Duas consequências que este playbook precisa resolver e que o PB-13 criou:

1. **Três vocações contra um personagem persistente.** O PB-13 congelou *um* personagem, e este
   playbook acrescenta dois. A PB-14-01 decide se a conta guarda três personagens independentes ou
   um que troca de vocação, e registra a escolha — é decisão de save, não de tela.
2. **Cada vocação precisa do seu set.** Se o eixo de progressão é o set da faixa, Sorcerer e Paladin
   não herdam o do Knight. A PB-14-01 cura o set de cada uma junto com o kit.

A task 01 registra decisões pendentes, fontes, mudanças de contrato e rollback num design curto em
`docs/superpowers/specs/`; cards seguintes leem esse design. **Contrato, schema e golden estão
autorizados task a task pelo texto de cada card**: onde a card autoriza, o executor bumpa e regenera
em vez de parar, e as condições de parada de `AGENTS.md` seguem valendo para tudo que a card não
nomear. Escolhas reversíveis seguem o protocolo. Não tratar hipótese de RNG, consumível ou modulação
como autorização implícita.

## Tasks e dependências

Execução **serial**, uma task por chat. Cada linha depende da anterior; a primeira depende da base
indicada acima. Não há tasks paralelas, branches ou worktrees previstas. Todas as cards existem;
a existência da card não elimina sua dependência. As recomendações abaixo aplicam a política 08; o `STATE.md` registra o modelo/effort usado.

| ID | Task | Modelo sugerido | Effort | Motivo |
|---|---|---|---|---|
| PB-14-01 | [Kits, comportamento e lacunas reais](tasks/PB-14-01-kits.md) | Claude Opus 5 | `xhigh` | Curadoria e decisões de kit, fonte e contrato. |
| PB-14-02 | [Suporte aos kits curados](tasks/PB-14-02-suporte.md) | Grok 4.6 | `xhigh` | Kernel e comportamento compartilhado; continuidade com taunt e conjuração anteriores. |
| PB-14-03 | [Sorcerer no loop completo](tasks/PB-14-03-sorcerer.md) | GPT-5.6 Luna | `xhigh` | Conteúdo e integração com kit e suporte congelados nas 01/02. |
| PB-14-04 | [Paladin no loop completo](tasks/PB-14-04-paladin.md) | GPT-5.6 Luna | `xhigh` | Reaplica o caminho da Sorcerer com kit ranged já decidido. |
| PB-14-05 | [Comportamentos dos monstros](tasks/PB-14-05-comportamentos.md) | Grok 4.6 | `xhigh` | IA determinística; continuidade com a conjuração de mobs já implementada. |
| PB-14-06 | [Encontros das três vocações](tasks/PB-14-06-encontros.md) | GPT-5.6 Sol | `xhigh` | Integração de composição, apresentação e helper das três classes. |

## Como escolher o executor

GPT roda no Codex; Opus 5 no Claude Code; Grok 4.6 no Cursor, conforme os ambientes informados
pelo usuário. `xhigh` segue a política local; se a interface não expuser esse nome, usar a opção
alta equivalente disponível e registrar o valor real no STATE, sem inventar um parâmetro.

Luna pressupõe decisões e contratos congelados pelas tasks anteriores. Se houver decisão nova,
risco não coberto ou dois ciclos bloqueados pela mesma causa, escalar conforme a política 08.
Tasks já classificadas como complexas começam diretamente no modelo indicado. Sol, Opus e Grok
podem substituir uns aos outros conforme disponibilidade; a alocação não é um benchmark de superioridade.
Revisão por outro modelo continua opcional, pós-aceite. Não executar a mesma task em três agentes.

## Aceite e validação

Cada implementação entrega o comportamento da card com `corepack pnpm dev` de pé e uma indicação
do que olhar. O usuário valida gameplay e diversão. Rodar só as linhas aplicáveis da tabela de
`AGENTS.md`, uma vez; teste focado e suíte transversal são alternativas salvo mudança do runner.
A última implementação roda build. Browser correctness e `verify` são do usuário. Revisão externa
é opcional pós-aceite; não bloqueia integração. Não executar a próxima card no mesmo chat.
