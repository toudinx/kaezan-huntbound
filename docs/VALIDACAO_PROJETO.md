# Validação de direção e documentação — 2026-09-07

**Base examinada:** `ed7368f`, árvore limpa na `main`. Inspeção de documentos e código;
não é playtest, auditoria exaustiva ou afirmação de que os testes atuais passam.

## Parecer

**Complemento do usuário após esta revisão:** os motivos de farm estão definidos: set, rares,
venda a NPC/gold, XP/level, bestiary e conquistas. Buffs/consumíveis/imbuements e RNG/reroll são
alternativas em avaliação. O roteiro e PB-13 incorporam essa direção. “Fechar o ciclo” abaixo é
conectar esses ganhos à persistência e preparação, não substituir a caça por recompensa só no fim.

A base técnica atende à direção de um Tibia solo de browser. O risco principal é completar sistemas
isolados sem formar uma sessão satisfatória. Priorizar mais hunts antes de saída, recompensa útil e
helper atrasa a validação da proposta. O próximo investimento deve fechar esse ciclo numa hunt.

[Huntera](https://huntera.com.br/) apresenta quatro vocações, combate automático, mundo persistente
e negociação entre jogadores. A referência é útil para acesso pelo browser e fantasia de hunt.
Isso não transforma nosso V0 em MMORPG. A página direta retornou 403; a descrição foi consultada
pelo resultado indexado, sem validar o jogo, suas funcionalidades ou sua qualidade por dentro.

No WAKFU, nível ajustável e dificuldade Stasis são eixos distintos, como descreve o
[anúncio oficial de Stasis no Steam](https://store.steampowered.com/news/posts/?appids=215080&enddate=1486140804&feed=steam_community_announcements).
A adaptação proposta é uma dungeon curta com modo modulado que preserve a build; não copiar toda
a economia, competição ou quantidade de níveis do WAKFU. A duração e a diversão são hipóteses locais.

## O que existe e o que falta

| Frente | Evidência no repositório | Leitura para o plano |
|---|---|---|
| Fundação | PB-00–05; `packages/simulation/src/kernel/`, replay e fronteiras de pacote | Reutilizar; não trocar stack nem reconstruir kernel. |
| Knight | PB-08-01–09 integrados; `packages/content/src/selections/pb-05-knight-combat.json` | Kit de referência existente; aceite de diversão continua no playtest. |
| Hunts | Cinco selections em `packages/content/src/selections/hunts/`; PB-10-01–13 integrados | Há catálogo, não necessidade de uma sexta hunt. Mapas 14/15 continuam pendentes. |
| Monstros | `packages/simulation/src/kernel/hunterCast.ts` escolhe magia elegível por alvo, alcance, cooldown e chance | Conjuração existe. Comportamento tático diversificado é expansão, não implementação do zero. |
| Outras vocações | PB-07-07/08 congelados; seleção de combate atual é Knight | Citações de Paladin/Sorcerer nas fontes de spells não provam vocação jogável. |
| Persistência | `packages/save/src/`, `apps/game/src/save/SaveSession.ts` e PB-06-01–08 | Save e inventário existem; não confundir persistir bag com economia e gear completos. |
| Fim de run | Em produção, `apps/game/src/main.ts` chama somente `finish('abandoned')`; API aceita `completed` | Falta conectar conclusão e recompensa no fluxo de jogo. |
| Personagem | `apps/game/src/hunt/readHuntCharacter.ts` resolve ficha por vocação/hunt | Preset de hunt não é progressão persistente nem sync de uma build real. |
| Elementos | `combat.ts` já lê `attackElement` no modificador ofensivo; não há leitura de `resistances`/`immunities` nesse arquivo | A afirmação antiga de que todos esses campos são inertes está parcialmente errada. Validar defesa na task, não copiar a spec. |
| Helper | Nenhum módulo de helper completo foi localizado na busca; IA `hunter` pertence às criaturas | Planejar helper explicitamente; não deduzir entrega pela presença de autoataque ou IA de mob. |
| Cockpit | PB-17-01–04 e FIX integrados | Ícones, cooldown, bag e minimapa são base; feedback restante acompanha o loop. |
| Dungeon/sync/gacha | PB-12 e emenda são propostas; PB-13/14 eram previsão do roteiro | Resultados futuros, sem alegação de implementação. |

## Problemas documentais encontrados

1. **Índice atrasado:** indicava PB-06 elegível e PB-10 esqueleto, apesar das integrações registradas.
2. **Múltiplas próximas tasks:** o roteiro dizia PB-05 liberado e PB-10-01 próxima enquanto os
   estados locais já tinham dezenas de entregas posteriores. A fila passa a existir só no roteiro.
3. **Estado misturado com diário:** PB-06/08/10/17 têm cabeçalhos contraditórios com suas tabelas,
   e estados antigos extrapolam o teto atual de 60 linhas. São preservados como históricos, sem
   obrigar nova auditoria; os estados novos são curtos.
4. **Regras de gate conflitantes:** o índice ainda exigia `verify` no fechamento; a regra vigente é
   build na última task, gate pelo diff e browser do usuário. O índice foi corrigido.
5. **Política de revisão conflitante:** revisão por outro modelo aparecia obrigatória na política
   de modelos, mas opcional e pós-aceite no protocolo. Foi alinhada ao protocolo.
6. **Preset chamado de sync:** o roteiro e a emenda tratavam ficha autorada como se provasse
   sincronização. A equivalência não vale quando itens e personagem persistente entram.
7. **Propostas vendidas como conclusões:** a emenda afirmava que quatro hunts necessariamente
   morreriam e exigia recompensa/minuto nunca inferior. São hipóteses de design, não fatos medidos;
   a revisão do sync deve trabalhar com interesse e recompensas úteis, sem prometer igualdade exata.
8. **Contexto de entrada excessivo:** guia e contexto mestre repetiam ideias futuras como escopo.
   Viraram entradas curtas; originais preservados no arquivo histórico.

Não reescrever pesquisas antigas nem invalidar seus fatos por terem recomendado outra stack.
Specs e cards antigas são proveniência. Contratos de código, schemas e goldens continuam congelados
até a task responsável tratar a alteração explicitamente.

## Como validar diversão

Em cada marco, jogar uma run manual e acompanhar outra com helper na mesma hunt. Responder:

- Consigo dizer qual é meu objetivo e quando é hora de sair?
- Consigo reconhecer uma ameaça, a resposta da classe e o motivo de uma cura ou recuo?
- Alguma decisão de alvo, posição ou equipamento mudou o resultado?
- A recompensa permite uma escolha concreta e permanece após recarregar?
- Quero repetir ou mudar a build sem precisar de uma diária me obrigando?

Isso é um roteiro de aceite, não uma suíte automatizada nem aprovação já obtida. Se assistir for
monótono, ajustar composição, ritmo e legibilidade antes de acrescentar partículas, moedas ou mobs.

## Uso dos agentes

Usar os ambientes informados pelo usuário — GPT/Codex, Opus 5/Claude Code e Grok 4.6/Cursor — como
opções de execução. Não houve benchmark comparativo nem verificação comercial dos nomes nesta
validação. A escolha é pelo risco da task, conforme a política 08: executor econômico para trabalho
bem delimitado; frontier para decisões de progressão, contratos, IA e sync. Revisão opcional por
outro modelo após aceite pode trazer perspectiva diferente; três agentes lendo toda task não são
necessários. Uma task e um responsável por vez neste roteiro.

## Validação desta revisão documental

O comando `corepack pnpm exec biome check .` não executou: `corepack` não está instalado/no PATH
deste host. Também não há `node_modules` no checkout. Não foi declarada aprovação do gate nem
instalada a toolchain completa para uma revisão somente documental. Rodar o comando no ambiente
configurado permanece pendente. Nenhum código de gameplay, contrato, schema ou golden foi alterado.
