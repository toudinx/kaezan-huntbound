# Emenda à ADR-05 — Sincronização de faixa

> **Replanejamento de 2026-09-07:** proposta técnica histórica, a revisar em PB-15-01.
> Dungeons/modulação entram no roteiro por pedido do usuário, mas o §5 não foi aceito
> integralmente. Preset por hunt não equivale a sync de personagem persistente; recompensa
> por minuto é hipótese de balanceamento. Referências ao PB-12 abaixo pertencem à fila anterior.


**Status:** **proposta. Não vigente.** Nada nesta página vale enquanto o dono não aceitar; até lá a
ADR-05 continua como está e o PB-12 continua não elegível.

**Emenda:** `docs/05_ADR_CANARY_PERSONAL_OUTFIT_GACHA.md`, seção *Extensões Huntbound permitidas* —
um bullet substituído e um parágrafo reescrito. O texto exato está no §5.

**Pré-requisito de:** `docs/playbooks/PB-12/README.md`, que declara esta emenda como bloqueio.

**Escrita em:** 2026-08-30, contra o catálogo gerado da mesma data.

---

## 1. O que se pede autorização para fazer

> Ao entrar numa hunt de faixa inferior à sua, o poder do personagem é reduzido à faixa daquela hunt.

Uma frase. É isso que precisa de emenda; o resto deste documento existe para dizer por que, o que
**não** vem junto, e o que a emenda deixa em aberto.

## 2. Por que precisa de emenda

Decisão vinculante 1 da ADR-05:

> Toda mecânica usada no V0 deve existir no Canary/Tibia ou ser uma extensão Huntbound listada
> explicitamente neste documento.

**Level sync não existe no Tibia.** Não é adaptação de proveniência como as stances, nem promoção de
uma regra que o snapshot já conhece como o leech: é mecânica nova. A própria ADR antecipa isso, no
fim da seção de curadoria: *"a resposta prevista é sincronização de nível e de gear (…), que não
existe no Tibia e portanto exigirá emenda própria a esta seção antes de ser implementada."*

Esta é essa emenda.

## 3. O fato que muda o custo da decisão: o V0 já sincroniza

Conferido no catálogo gerado em 2026-08-30. Não é estimativa.

Não existe um personagem que progride. Existe **uma ficha por hunt**, e
`apps/game/src/hunt/readHuntCharacter.ts` resolve `character:huntbound:knight-<hunt>`, lançando se
faltar:

| Hunt | Faixa | Nível | HP | Mana | Arma | Sword |
|---|---:|---:|---:|---:|---|---:|
| Venore Rotworm Cave | 1 | 35 | 590 | 185 | sword | 60 |
| Orc Fortress | 2 | 25 | 440 | 185 | sword | 60 |
| Cyclopolis | 3 | 45 | 740 | 185 | sword | 60 |
| Dragon Lair | 4 | 70 | 1115 | 185 | sword | 60 |
| Hero Cave | 5 | 130 | 2015 | 645 | two-handed sword | 90 |

O kit **não** varia: `pb-05-knight-combat.json` declara uma banda só, `minLevel: 1, maxLevel: null`.
As nove ações são as mesmas em toda hunt — a regra 4 da curadoria ("nenhuma ação é trancada por
level") já está valendo na prática.

E a ADR **já autoriza isso**, com prazo de validade:

> personagem resolvido pela hunt escolhida, **temporário até o PB-09**: escolher a hunt escolhe a
> faixa e o personagem recomendado. (…) Enquanto não houver progressão, quatro das cinco faixas
> seriam triviais ou letais com um único Knight de nível fixo.

Isso reenquadra a decisão inteira. **A pergunta não é "adotar level sync?".** A pergunta é:

> Quando o PB-09 der ao jogador um nível próprio, o que acontece com a ficha que a hunt escolhe?

Sem emenda, a extensão temporária expira dentro do PB-09 e ninguém decidiu o que entra no lugar. É a
pior das saídas: a decisão acontece por omissão, dentro de uma task de implementação.

## 4. As três saídas, e a recomendada

### A. Deixar expirar — o nível do jogador substitui a ficha

Custo zero hoje. Consequência: quatro das cinco hunts morrem. Um jogador de nível 130 entra na
rotworm e assiste. O PB-10 acabou de autorar cinco hunts, com mapa recortado do Canary uma a uma;
esta saída **apaga quatro delas** em troca de não escrever um parágrafo. É a obsolescência entre
faixas que a regra 1 da curadoria cria e que a própria ADR já reconheceu como dívida.

### B. Sincronizar o jogador à faixa — **recomendada**

O jogador entra reduzido à faixa da hunt, com poder derivado do **próprio personagem**. É o que o
jogo já faz hoje por construção de conteúdo; a emenda o mantém vivo depois que houver progressão de
verdade, e troca "ficha autorada por hunt" por "sua ficha, reduzida à faixa".

### C. Escalar a hunt ao jogador — **rejeitada**

O outro sentido: o conteúdo sobe até o nível do jogador. Rejeitada por dois motivos, e nenhum é de
gosto:

1. **Contradiz a regra 1 da curadoria.** Se a rotworm escala até 130, ela vira o dragão com outro
   sprite: mesma luta, número maior. É exatamente a redundância que a regra existe para impedir, e a
   regra diz que a faixa decide **o que existe**, não o quanto.
2. **A pesquisa mede o resultado.** `docs/research/wakfu/01_modular_dungeons.md` §3.7: dungeon fácil
   com recompensa escalada leva todo mundo para a dungeon fácil — *"a comunidade inteira acabaria em
   Astrub"*. Num single-player não há comunidade, mas há o mesmo jogador escolhendo o caminho barato,
   e o efeito sobre o conteúdo é idêntico.

## 5. Texto proposto

### 5.1 Substituir o bullet da extensão temporária

**Sai** (ADR-05, *Extensões Huntbound permitidas*):

> - personagem resolvido pela hunt escolhida, **temporário até o PB-09**: escolher a hunt escolhe a
>   faixa e o personagem recomendado. A tela de seleção já cabe em UI/UX; esta resolução de
>   personagem não. Enquanto não houver progressão, quatro das cinco faixas seriam triviais ou letais
>   com um único Knight de nível fixo;

**Entra:**

> - **sincronização de faixa.** Entrar numa hunt de faixa inferior à do personagem reduz o poder dele
>   à faixa daquela hunt. Até o PB-09 isso se realiza como hoje — personagem resolvido pela hunt
>   escolhida, uma ficha autorada por faixa; a partir do PB-09, como redução do personagem real.
>   Cinco propriedades são vinculantes, e só elas:
>   1. **A faixa é discreta.** São as faixas de `docs/content/HUNT_BANDS.md`. Não existe sync contínuo
>      por nível, nem faixa negociável dentro da hunt.
>   2. **O poder sincronizado deriva do personagem real.** Nunca set emprestado, nunca preset
>      genérico, nunca build automática: o jogador reconhece a própria build lá dentro.
>   3. **A sincronização pertence ao run, nunca ao personagem.** Não é persistida no save e some ao
>      sair da hunt. Sync é máquina de estado, e máquina de estado que altera o personagem tem de ser
>      reversível por construção.
>   4. **Nada some em silêncio.** Nenhuma ação, passiva ou item é removido sem que a tela diga que
>      foi, o quê e por quê.
>   5. **Sincronizado não pode pagar pior por minuto** que a hunt da faixa corrente. Se pagar, o modo
>      vira museu e a extensão não se justifica.
>
>   O que **não** está autorizado por este bullet, e exige emenda própria: dial de dificuldade, modo
>   competitivo, ranking, baús periódicos, moeda ou material exclusivo de faixa, consumível de
>   entrada, e sincronização obrigatória fora de hunt.

### 5.2 Reescrever o parágrafo de consequência

**Sai** (fim de *Curadoria de conteúdo — regra de projeto, 2026-08-24*):

> **Consequência de escopo, ainda não decidida:** a regra 1 cria obsolescência entre faixas —
> conteúdo antigo morre quando o jogador o ultrapassa. A resposta prevista é sincronização de nível e
> de gear (`docs/playbooks/PB-12/README.md`), que **não existe no Tibia** e portanto exigirá emenda
> própria a esta seção antes de ser implementada.

**Entra:**

> **Consequência de escopo, decidida em [data]:** a regra 1 cria obsolescência entre faixas —
> conteúdo antigo morre quando o jogador o ultrapassa. A resposta é a **sincronização de faixa**,
> listada acima como extensão Huntbound. Ela não existe no Tibia e entrou por emenda, cujo raciocínio
> está em `docs/09_EMENDA_ADR05_SINCRONIZACAO_DE_FAIXA.md`. A implementação é o PB-12, que passa a
> depender apenas de PB-09 e PB-11 terem produzido o que sincronizar.

## 6. O que a emenda deliberadamente não autoriza

Cada item aqui é uma peça do WAKFU que o usuário pode querer depois. Nenhuma vem de graça com esta
emenda, e todas são baratas de conceder separadamente **quando existir o que elas multiplicam**.

- **O dial de dificuldade (Stasis).** No WAKFU é sistema separado do nível (§1.2), e o que ele faz é
  **multiplicar recompensa**. O Huntbound ainda não tem a economia de recompensa que o dial
  multiplicaria — ela nasce no PB-09 (XP) e no PB-11 (loot com poder). Autorizá-lo agora seria
  decidir um fator antes de existir a grandeza. **Recomendação:** emenda própria, depois do PB-11, e
  curta — a pesquisa é explícita em que 50 degraus é ilusão de escolha (§3.12) e que a escala curta
  venceu.
- **Modo competitivo, ranking, baús periódicos.** São mecanismos sociais. O V0 é single-player
  local-first, e a ADR já colocou backend, conta e anticheat fora do escopo.
- **Moeda ou material exclusivo por faixa.** Está na lista negra da pesquisa (§12) e distorce a
  economia interna de craft (§3.6).
- **Sync obrigatório fora de hunt.** §3.10: transformar um sistema opcional em pedágio narrativo é a
  via mais rápida para rejeição.

## 7. O que fica em aberto para o PB-12 decidir

A emenda autoriza e limita. Ela **não** desenha, e nada abaixo é congelado por ela:

- a matemática do downscale de stats — a pesquisa recomenda downscale proporcional (§6-B);
- o tratamento do equipamento, quando houver equipamento — a pesquisa recomenda downscale do item no
  lugar (§7-3), com o modo "Autêntico" (§7-5) como opt-in;
- se existe modo livre além do sincronizado, e quem escolhe. **A pesquisa é enfática num ponto:** os
  dois extremos falham — GW2 tira stats e irrita, ESO nivela e mata o desafio — e *"a diferença está
  em quem escolhe"* (§3.8). Num single-player, quem escolhe é sempre o jogador, e isso é de graça;
- como o XP responde ao nível real. O WAKFU multiplica por `(nível_real / nível_modulado)^c` (§1.1) e
  chama isso de melhor benefício do sistema; a forma exata depende do PB-09;
- a largura da faixa. §3.4: degraus largos criam fronteira explorável — modular de 190 para 185 não
  custa quase nada. Cinco faixas até o nível 130 são degraus largos, e isso é um risco conhecido, não
  um bug a descobrir.

## 8. Consequências de aceitar

- **PB-12 deixa de estar bloqueado por documento.** Passa a depender só de PB-09 e PB-11, como já diz
  o README dele.
- **PB-09 nasce sabendo.** Progressão tem de produzir um nível que a sincronização saiba reduzir; é
  mais barato desenhar assim do que retroagir.
- **PB-18 ganha sentido pleno.** O assento do dial na porta passa a ter dono declarado, e a porta
  passa a dizer uma verdade autorizada em vez de descrever um acidente de conteúdo.
- **Custo assumido:** §11 da pesquisa é sobre complexidade agregada, e a queixa citada lá — *"eu não
  entendo mais nada nesse jogo"* — é o risco real desta extensão. As cinco propriedades vinculantes
  do §5.1 existem para segurá-la; se uma task começar a negociá-las, a emenda falhou.

## 9. Critério único de sucesso

Adaptado do §12 da pesquisa para um jogo sem servidor e sem economia:

> Se, depois de chegar à faixa 5, o usuário **escolher** voltar à Orc Fortress num dia em que tem
> vinte minutos — e não se sentir burro por isso — a extensão funcionou. Se ele só voltar lá para
> testar bug, ela virou decoração.

## 10. Como aceitar

Uma edição: aplicar o §5.1 e o §5.2 na ADR-05 com a data, trocar o **Status** desta página para
*vigente em [data]*, e mudar o `README.md` do PB-12 de "esqueleto, não elegível" para elegível.

Para recusar, o mesmo caminho com a saída A do §4 registrada como decisão — e aí vale dizer no
`STATE.md` do PB-10 que quatro hunts são conteúdo de passagem única, para ninguém autorar a sexta
achando outra coisa.
