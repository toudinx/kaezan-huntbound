# W02 — Tibia: vocações, spells e runas essenciais

> Pesquisa de referência para **Kaezan Huntbound** (Godot 4.7.1, single-player, top-down, feeling de Tibia).
> Documento de **direção conceitual**, não de balanceamento. Nenhum número aqui deve ser tratado como valor final do nosso jogo.
> Escopo: Knight, Paladin, Sorcerer, Druid e Monk.

---

## 0. Como esta pesquisa foi feita

Duas camadas de fonte, com pesos diferentes:

1. **Fonte técnica primária (alta confiança)** — o código do servidor **Canary** já clonado em `references/canary`, que implementa o Tibia moderno incluindo o Monk.
   Foram lidos diretamente:
   - `data/scripts/spells/{attack,healing,support,conjuring}/*.lua` — ~200 spells com vocação, level, mana, cooldown, grupo, área, fórmula.
   - `data/XML/vocations.xml` — ganhos de HP/mana/cap e regeneração por vocação.
   - `src/creatures/players/player.cpp`, `src/creatures/combat/spells.cpp`, `src/creatures/combat/combat.cpp` — implementação de Harmony, Serene, Virtues.
   - `src/creatures/players/components/wheel/wheel_definitions.hpp` — estrutura da Wheel of Destiny.
2. **Fonte comunitária/wiki (confiança média)** — TibiaWiki, guias e notícias, usados para confirmar *intenção de design* e *prática real de jogo* (rotação, o que a comunidade considera útil ou lixo). Ver §12.

Quando as duas discordam em números (ex.: bônus exato de Virtue of Harmony), o documento descreve o **mecanismo**, não o número. Números específicos citados servem apenas para mostrar ordem de grandeza e proporção entre spells.

---

## 1. Resumo executivo

**O que realmente define uma vocação em Tibia não é a lista de spells — é a combinação de quatro coisas:**

| Eixo | Por que importa |
|---|---|
| **Curva de recurso** | Cada vocação tem um recurso escasso diferente (HP/potions, munição, mana, Harmony). É isso que dita o ritmo. |
| **Distância de operação** | 1 tile, 3–5 tiles, ou tela inteira. Define o risco assumido. |
| **Formato do AoE** | Anel ao redor (knight), cone frontal (wave), círculo no alvo (runa), corrente (chain). Define o *pull* e o posicionamento. |
| **Quem cura você** | Auto-sustain integrado, potion, spell caro, ou recurso convertido. |

Tudo o resto — dezenas de spells de conjuração, campos, ilusão, luz, corda mágica, summons — é **acessório histórico**, mantido por compatibilidade e não por design. Cada vocação de Tibia tem, na prática, **entre 5 e 9 botões que importam**, e o resto quase nunca é apertado numa hunt.

Isso é uma excelente notícia para Huntbound: a meta de **4–6 ações relevantes por classe** não é uma simplificação agressiva de Tibia — é **aproximadamente o que Tibia já é na prática**, uma vez removido o entulho.

**Três descobertas que mudam decisões de design:**

1. **Postura já existe em Tibia, sem esse nome.** Knight tem Blood Rage × Protector (mutuamente exclusivos, mesmo `SubId` no código). Paladin tem Sharpshooter × Swift Foot (ofensivo × mobilidade, ambos com penalidade). Monk tem três Virtues explícitas. Mages têm Magic Shield. **Não estamos inventando um sistema estranho ao Tibia — estamos formalizando algo que Tibia já faz de forma inconsistente.**
2. **O Monk é o modelo que Huntbound deveria seguir para todas as classes.** É a única vocação desenhada depois de ~28 anos de aprendizado: kit pequeno, recurso próprio (Harmony 0–5), builder/spender, cura acoplada ao recurso, três posturas, e uma regra de "estado forte" (Serene). É moderno, enxuto e legível.
3. **Serene, no nosso contexto, é quase sempre verdadeiro.** No código, um Monk perde Serene apenas quando está *em party com membros visíveis* E cercado por muitos monstros. Em um jogo **single-player**, isso significa que o "modo forte" do Monk seria permanente — a mecânica precisa ser **reinterpretada**, não copiada.

---

## 2. Tabela comparativa — os 14 eixos pedidos

| Eixo | **Knight** | **Paladin** | **Sorcerer** | **Druid** | **Monk** |
|---|---|---|---|---|---|
| **1. Papel** | Tank / frontline / AoE melee / controle de aggro | DPS à distância sustentado, kiter, autossuficiente | Burst caster, maior dano bruto, glass cannon | Caster de controle + healer, AoE de gelo/terra | Bruiser melee autossuficiente, burst por recurso |
| **2. Range** | 1 tile (exceções: Whirlwind Throw, Executioner's Throw) | 4–7 tiles (arma) + spells de 3–7 | 3–8 tiles conforme spell/runa | Igual Sorcerer | 1 tile + Mystic Repulse (7) e chains (Chained Penance / Spiritual Outburst) |
| **3. Sustain** | Maior HP/level (15) e maior regen; mana péssima → **depende de health potions** | Equilibrado (10 HP / 15 mana / 20 cap); cura própria boa; **depende de munição** | Pior HP/level (5), melhor mana (30); sustain = Magic Shield + mana potions | Igual Sorcerer, mas com o melhor kit de cura do jogo | 10 HP / 10 mana / 25 cap; **cura embutida no ciclo de Harmony** |
| **4. Single target** | Annihilation (cd longo), Brutal Strike, Executioner's Throw | Ataque de distância contínuo + Divine Missile / Ethereal Spear; Divine Grenade no topo | Strikes (Death/Flame/Energy/Ice/Terra) → Strong → Ultimate; Sudden Death Rune; Great Death Beam | Ice/Terra Strike → Strong → Ultimate; Icicle Rune; Ice/Terra Burst | Spenders: Greater Tiger Clash, Devastating Knockout; Forceful Uppercut (não gasta recurso) |
| **5. AoE** | **Anel/quadrado ao redor de si**: Berserk, Fierce Berserk, Groundshaker; cone: Front Sweep | Média: Divine Caldera (ao redor), Holy Flash | **O melhor**: waves (cone), beams (linha), Hell's Core, Rage of the Skies, Great Fireball/Thunderstorm/Energy Bomb runes | Waves de gelo/terra, Eternal Winter, Wrath of Nature, Avalanche/Stone Shower runes | Flurry of Blows (ao redor), Greater Flurry (área maior), Sweeping Takedown (spender AoE), Spiritual Outburst (chain) |
| **6. Mobilidade** | Charge (haste forte curta), Haste | **A melhor**: Swift Foot (velocidade alta, mas −dano), Strong Haste, e o kite é a mecânica central | Haste / Strong Haste, Invisibility, e **controle de espaço** via Magic Wall | Igual Sorcerer + Wild Growth e Paralyze Rune (controle > mobilidade) | Mystic Repulse (aproximação/afastamento em 7 tiles), Balanced Brawl (puxa monstros para perto), Haste |
| **7. Cura** | Fraca e com cooldowns punitivos (Intense Wound Cleansing tem cd de ~10 min); regen buffs (Recovery) | Boa e barata (Divine Healing, Salvation, Intense Healing) | Suficiente (Ultimate Healing, Restoration) | **Melhor do jogo**: UH, Mass Healing, Heal Friend, Nature's Embrace, UH Rune | Boa e *acoplada*: cura passiva ao gerar e ao gastar Harmony, Spirit Mend, Mass Spirit Mend, Restore Balance |
| **8. Resource mgmt** | **Cooldowns + potions + capacidade**. Mana quase não existe (multiplier 3.0) | **Munição** (conjurada com mana) + capacidade. Mais barato de sustentar → "vocação lucrativa" | **Mana**, e soul points para fabricar runas | **Mana** + runas (mais dependente de runa que o Sorcerer) | **Harmony (0–5)**: builders geram 1, spenders gastam tudo. Bônus **exponencial** (~2× por carga) e gastar reduz cooldowns proporcionalmente |
| **9. Spells representativas** | `exori` / `exori gran` (Berserk / Fierce Berserk), `exori gran ico` (Annihilation), `exori mas` (Groundshaker), `exori min` (Front Sweep), `utito tempo` (Blood Rage), `utamo tempo` (Protector), `exeta res` (Challenge), `utani tempo hur` (Charge) | Divine Missile, Ethereal Spear / Strong, Divine Caldera, Divine Grenade, Sharpshooter, Swift Foot, Divine Dazzle, Conjure (munição) | Strikes, Fire/Energy Wave, Great Fire Wave, Energy/Death Beam, Hell's Core, Rage of the Skies, Magic Shield, Magic Wall | Ice/Terra Strike, Ice/Terra Wave, Eternal Winter, Wrath of Nature, Mass Healing, Heal Friend, Wild Growth, Paralyze | Double Jab, Flurry of Blows, Chained Penance, Greater Tiger Clash, Sweeping Takedown, Devastating Knockout, Virtues, Focus Serenity |
| **10. Raramente relevante** | Levitate, Magic Rope, Find Person/Fiend, Light/Great Light, Train Party, spells de casa, Whirlwind Throw (obsoleto cedo), Bruise Bane | Cancel Invisibility, Enchant Spear, tiers antigos de conjuração, Blank Rune, Destroy Field, Protect Party, Holy Missile Rune | Animate Dead, Chameleon, Creature Illusion, Summon Creature, Wand of Darkness, todos os campos (fire/poison/energy), Soulfire, Stalagmite, Enchant Staff, Ultimate Light, DoTs (Curse/Ignite/Electrify) | Convince Creature, Chameleon, Animate Dead, Food, Cure Burning/Electrification, Physical Strike, Mud Attack, Poison Bomb, campos | Swift Jab / Tiger Clash base, Lesser Mystic Repulse, Mentor Other, Enlighten Party, familiar |
| **11. Runas** | **Praticamente nenhuma** (magic level baixo demais). Só utilitário: Destroy Field | Quase nenhuma. Holy Missile Rune é própria mas pouco usada; Ultimate Healing Rune comprada | **Fabricante**: Sudden Death, Great Fireball, Thunderstorm, Energy Bomb, Magic Wall, Explosion | **Fabricante**: Avalanche, Stone Shower, Icicle, Wild Growth, Paralyze, Ultimate Healing Rune, Intense Healing Rune | **Nenhuma, por design** — runas não geram Harmony e quebram a economia do ciclo |
| **12. Rotação típica** | Blood Rage → puxar pack → `exori gran` → `exori` / `exori min` conforme forma da sala → `exori gran ico` no último alvo. Protector em emergência | Manter tiro automático → Divine Missile / Ethereal Spear sempre que sair de cd → Divine Caldera com 2+ alvos → Sharpshooter em burst → Swift Foot para escapar | Magic Shield antes → puxar → wave do elemento fraco do monstro → runa AoE no aglomerado → strike no que sobra | Igual Sorcerer, trocando fogo/energia por gelo/terra; usa mais runa AoE e Paralyze/Wild Growth para segurar o pack | **Builder ×N até 5 cargas → spender**. Nunca gastar com poucas cargas. Focus Serenity = botão de burst (enche Harmony + zera cooldowns) |
| **13. Solo / hunt / boss** | Solo: excelente, tanka tudo. Hunt: rei do pull grande. Boss: baixo dano single target, vira tank | Solo: o mais seguro do jogo. Hunt: kite constante. Boss: forte e seguro (Sharpshooter + Grenade) | Solo: arriscado. Hunt: melhor exp/h em spawn denso. Boss: bom, mas frágil; depende de SD runes e debuffs | Solo: mais lento que o Sorcerer, mais seguro. Hunt: forte. Boss: melhor em grupo (cura) que sozinho | Solo: excelente (autossuficiente). Hunt: bom, mas o ciclo builder/spender penaliza pulls curtos. Boss: muito bom (pack de 5 cargas + Focus Serenity) |
| **14. Wheel of Destiny** | Avatar of Steel, Executioner's Throw, Combat Mastery, Battle Instinct/Battle Healing | Avatar of Light, Divine Grenade, Divine Empowerment, Ballistic Mastery, Positional Tactics | Avatar of Storm, Beam Mastery, Drain Body, Runic Mastery, Sap Strength / Expose Weakness | Avatar of Nature, Blessing of the Grove, Twin Burst, Healing Link, Runic Mastery | Avatar of Balance, Spiritual Outburst, Ascetic, Sanctuary, Focus Mastery |

**Ganhos por level (de `vocations.xml`, para leitura de proporção):**

| Vocação | HP/level | Mana/level | Cap/level | Mana multiplier | Regen HP (promovido) |
|---|---|---|---|---|---|
| Knight | 15 | 5 | 25 | 3.0 | mais rápido |
| Paladin | 10 | 15 | 20 | 1.4 | médio |
| Sorcerer | 5 | 30 | 10 | 1.1 | lento |
| Druid | 5 | 30 | 10 | 1.1 | lento |
| Monk | 10 | 10 | 25 | 1.3 | rápido |

Repare que o **Monk é deliberadamente o meio-termo**: HP de paladino, cap de knight, mana suficiente para não travar, e mana multiplier baixo. Foi desenhado para ser autossuficiente sem depender de economia externa — exatamente o perfil que um jogo single-player de sessão curta quer.

---

## 3. Identidade de cada vocação

### 3.1 Knight — "eu escolho onde a luta acontece"

**Fantasia real:** não é "dano alto", é **domínio do espaço corpo a corpo**. O Knight junta o pack, fica no meio, e sobrevive. Ele é o único que *quer* estar cercado.

**O que dá identidade (mecânica, não estética):**
- **AoE centrado em si mesmo** — todas as spells principais explodem ao redor do próprio corpo. Isso força o gameplay de *pull* e *cage*: reunir monstros e depois girar.
- **Taunt** (`exeta res` / Chivalrous Challenge) — o único com controle de aggro real.
- **Trade-off explícito de postura** — Blood Rage (mais melee, mais dano recebido, defesa desligada) × Protector (muito mais shielding, menos dano causado). No código são a mesma condição com `SubId` compartilhado: **um cancela o outro**.
- **Recurso não é mana, é cooldown e frasco.** O Knight nunca "fica sem mana" — ele fica sem potion ou sem capacidade.
- **Ponto fraco estrutural:** dano single target ruim, com Annihilation em cooldown longo. Um Knight sozinho contra um boss é lento.

**Núcleo obrigatório**
1. Um AoE curto e barato ao redor de si (spam), com um irmão maior e mais caro (`exori` → `exori gran`).
2. Um AoE com formato diferente para ler a sala (cone/linha frontal, tipo Front Sweep, ou quadrado maior tipo Groundshaker).
3. Um nuke single target com cooldown longo (Annihilation).
4. Taunt / puxar aggro.
5. As duas posturas ofensiva/defensiva.

**Pode ser descartado**
- Whirlwind Throw (existe só para preencher um vazio de level).
- Bruise Bane, Cure Poison, Cure Bleeding, Wound Cleansing e todas as variantes de cura de knight — em Huntbound, cura de Knight deveria ser **uma coisa só**, não cinco.
- Recovery / Intense Recovery (regen over time) — mecânica boa, mas é redundante se a cura já for HoT.
- Levitate, Magic Rope, Find Person, Find Fiend, Light, Great Light, Train Party, spells de casa. Tudo isso é infraestrutura de MMO.
- Runas — Knight não faz e mal usa.

**Kit enxuto proposto (5 ações + postura)**

| Slot | Conceito | Papel |
|---|---|---|
| 1 | **Golpe Circular** | AoE 3×3 ao redor, custo baixo, cooldown curto. O botão de spam. |
| 2 | **Investida Frontal** | Cone/linha à frente, dano maior, exige direção. Recompensa posicionamento. |
| 3 | **Execução** | Single target pesado, cooldown longo. Fecha o pack e serve em boss. |
| 4 | **Provocar** | Puxa aggro de N inimigos por X segundos + reduz dano recebido durante o pull. |
| 5 | **Segundo Fôlego** | Cura instantânea + regeneração curta, cooldown médio. **Uma** cura só. |
| Postura | **Fúria** × **Guarda** | Ver §7. |

---

### 3.2 Paladin — "eu nunca deixo você me alcançar"

**Fantasia real:** distância + movimento contínuo. O Paladin é a vocação onde *andar é parte do dano*, porque o tiro automático continua enquanto você recua.

**O que dá identidade:**
- **Dano base vem do ataque automático à distância**, não das spells. As spells são temperos em cima de um DPS contínuo. Isso é estruturalmente diferente das outras quatro.
- **Munição como recurso físico** — conjurar flechas custa mana e capacidade. O recurso do Paladin é *logístico*, não *de combate*.
- **Postura de tiro × postura de fuga** — Sharpshooter (muito mais skill de distância, mas desliga defesa e reduz velocidade) × Swift Foot (velocidade alta, mas dano cortado pela metade). São o mesmo eixo: **você escolhe se está atirando ou fugindo, nunca os dois**.
- **Autossuficiência**: cura boa e barata + range + velocidade = a vocação que menos morre.
- **Divine Grenade** (topo de progressão): planta um efeito no alvo que detona depois — é a única mecânica *não instantânea* do Paladin, e é justamente a mais interessante para copiar.

**Núcleo obrigatório**
1. Ataque à distância contínuo (auto-attack) — sem isso não é Paladin.
2. Um projétil instantâneo de cooldown curto (Divine Missile / Ethereal Spear).
3. Um AoE modesto para quando o pack encosta (Divine Caldera).
4. Um recurso de munição/carga visível.
5. Uma ferramenta de reposicionamento (Swift Foot).
6. Cura própria confiável.

**Pode ser descartado**
- Toda a árvore de conjuração escalonada (arrow → poisoned → sniper → explosive → bolt → piercing → power bolt → royal star). São 8 spells que fazem **uma** coisa. Em Huntbound: **uma** ação de recarregar munição, ou munição regenerando sozinha.
- Enchant Spear, Cancel Invisibility, Protect Party, Blank Rune, Destroy Field.
- Holy Missile Rune — a única runa do Paladin, e mesmo assim marginal.
- Divine Dazzle / Divine Empowerment como spells separadas — são conceitos de party.

**Kit enxuto proposto (5 ações + postura)**

| Slot | Conceito | Papel |
|---|---|---|
| — | **Tiro automático** | Base do dano. Não ocupa slot. |
| 1 | **Lança Etérea** | Projétil single target, cooldown curto, gasta 1 munição. Botão de spam. |
| 2 | **Marca Divina** | Aplica marca no alvo que detona após X s ou após N tiros (herdeiro do Divine Grenade). |
| 3 | **Caldeira** | AoE ao redor de si, "me tirem de perto". |
| 4 | **Recarga / Comunhão** | Reabastece munição; opcionalmente cura. Um botão, não oito. |
| 5 | **Bênção** | Cura instantânea, barata, cooldown curto. |
| Postura | **Precisão** × **Evasão** | Ver §7. |

---

### 3.3 Sorcerer — "eu apago a sala"

**Fantasia real:** conversão de mana em dano em área, com corpo de papel. É a vocação de **decisão antes do combate** (preparar, puxar, posicionar) e **execução rápida** (2–3 botões, sala limpa).

**O que dá identidade:**
- **Formatos de AoE variados e memorizáveis**: wave (cone frontal), beam (linha), runa (círculo centrado no alvo), ultimate (tela). O Sorcerer é a vocação que pensa em **geometria**.
- **Elementos como escolha tática** — fogo, energia, morte, gelo, terra. Escolher o elemento certo contra a fraqueza do monstro é a decisão de skill do mage.
- **Magic Shield** — converte mana em vida efetiva. É a postura do mage: "meu pool de recurso *é* minha vida".
- **Fabricação de runas** consumindo mana e soul points — camada de preparação fora do combate.
- **Magic Wall** — controle de espaço puro, e uma das mecânicas mais icônicas de Tibia.

**Núcleo obrigatório**
1. Um strike single target de cooldown curto.
2. Um AoE em cone/linha (wave) — o botão principal de hunt.
3. Um AoE grande de cooldown longo (ultimate).
4. Magic Shield ou equivalente.
5. Runas de dano em área.
6. Cura de emergência cara.

**Pode ser descartado**
- **Todos os campos e paredes elementais exceto uma** — fire field, poison field, energy field, fire wall, poison wall, energy wall. Guardar apenas a Magic Wall (bloqueio puro), que é a única com identidade.
- Animate Dead, Chameleon, Creature Illusion, Summon Creature, Conjure Wand of Darkness — sistemas paralelos inteiros que não valem o custo.
- DoTs de aplicação (Curse, Ignite, Electrify) — cooldown longo, dano baixo, quase nunca usados. Se quisermos DoT, ele deve ser um **efeito** de outra spell, não uma spell.
- A escada completa de strikes (Apprentice's → normal → Strong → Ultimate, ×5 elementos = ~15 spells que são a mesma spell). Em Huntbound: **uma** spell que melhora, não quinze.
- Ultimate Light, Levitate, Magic Rope, Food, Find Person.
- Soulfire, Stalagmite, Explosion — runas obsoletas.

**Kit enxuto proposto (5 ações + postura)**

| Slot | Conceito | Papel |
|---|---|---|
| 1 | **Dardo Elemental** | Single target, cooldown curto, barato. Botão de spam e de "sobrou um". |
| 2 | **Onda** | Cone frontal. Botão principal de hunt. Exige direção → recompensa posicionamento. |
| 3 | **Cataclismo** | AoE grande, cooldown longo, caro. O "apagar a sala". |
| 4 | **Barreira** | Cria bloqueio temporário no chão (herdeiro do Magic Wall). Defesa por geometria. |
| 5 | **Cura Arcana** | Cura forte e cara. |
| Postura | **Condução** × **Égide** | Ver §7. |

*Sugestão adicional:* o **elemento** deveria ser uma escolha de build (runa/talento), não spells separadas. Uma "Onda" que pode ser de fogo, gelo ou energia conforme a build resolve 12 spells de Tibia com 1 ação.

---

### 3.4 Druid — "eu decido quando vocês podem se mover"

**Fantasia real:** controle + sustentação. O Druid não apaga a sala mais rápido que o Sorcerer — ele **impede que a sala reaja**.

**O que dá identidade (e o que o separa do Sorcerer):**

Este é o ponto mais delicado do documento. No Tibia atual, Sorcerer e Druid são **mecanicamente quase idênticos** (mesmos ganhos por level, mesma estrutura de strike/wave/ultimate, mesmas runas com nomes trocados). A diferença real é:

| | Sorcerer | Druid |
|---|---|---|
| Elementos | Fogo, energia, morte | Gelo, terra |
| Diferencial | Burst maior, Beams (linha) | **Paralyze Rune** e **Wild Growth Rune** — controle |
| Cura | Suficiente | Heal Friend, Mass Healing, Nature's Embrace — **cura em outros** |
| Posição em grupo | Dano | Suporte insubstituível |

**Em single-player, "curar aliados" perde quase todo o valor.** Se Huntbound não tiver party, o Druid precisa de outro pilar. A resposta natural, apoiada no que Tibia já dá a ele, é **controle**: paralisia, raízes, bloqueio de caminho, lentidão. Isso também casa perfeitamente com um jogo tile-based.

**Núcleo obrigatório**
1. Um AoE de gelo/terra (identidade elemental).
2. **Controle de movimento** (paralisia/raiz) — o pilar que deve substituir a cura de party.
3. Cura forte (agora voltada a si e ao helper/pet, se houver).
4. Um AoE grande de cooldown longo.
5. Runas de área e de cura.

**Pode ser descartado**
- Convince Creature, Animate Dead, Chameleon, Creature Illusion, Summon Creature — mesma poda do Sorcerer.
- Food (spell de comida é puro artefato de MMO).
- Cure Burning / Cure Electrification / Cure Bleeding / Cure Poison como **spells separadas** — vira uma limpeza única ou um efeito passivo.
- Physical Strike, Mud Attack — spells de nível 1 sem função.
- Heal Friend / Mass Healing **se não houver party**.
- Campos de veneno/energia.

**Kit enxuto proposto (5 ações + postura)**

| Slot | Conceito | Papel |
|---|---|---|
| 1 | **Estilhaço** | Single target de gelo/terra, cooldown curto. |
| 2 | **Vendaval Gélido** | Cone/área frontal + aplica lentidão. AoE principal, com controle embutido. |
| 3 | **Raízes** | Prende inimigos numa área por X s (herdeiro de Paralyze + Wild Growth fundidos). |
| 4 | **Inverno Eterno** | AoE grande, cooldown longo. |
| 5 | **Rejuvenescer** | Cura forte + limpeza de status. |
| Postura | **Comunhão** × **Bosque** | Ver §7. |

---

### 3.5 Monk — "eu construo e eu descarrego"

**Fantasia real:** ritmo. O Monk é a única vocação de Tibia com um **loop de recurso próprio e visível**, e é por isso que é a mais moderna das cinco.

**Mecânica exata (verificada no código do Canary):**

- **Harmony**: 0 a 5 cargas.
- **Builder spells** (`MonkSpell_Builder`) geram +1 carga: Double Jab, Flurry of Blows, Greater Flurry of Blows, Chained Penance, Mystic Repulse, Forceful Uppercut.
- **Spender spells** (`MonkSpell_Spender`) consomem **todas** as cargas: Greater Tiger Clash, Sweeping Takedown, Devastating Knockout, Mass Spirit Mend, Spiritual Outburst.
- **O bônus é exponencial**: `bonus = base × 2^(harmony−1)`. Gastar com 5 cargas é ordens de grandeza melhor que gastar com 1. Isso cria uma regra de jogo trivial de entender e difícil de executar sob pressão: **nunca gaste cedo**.
- **Gastar reduz cooldowns** em ~2s por carga consumida (`clearCooldowns(..., 2 * 1000 * harmonies)`). O spender **acelera o próprio ciclo** — o loop se auto-realimenta.
- **Gerar e gastar Harmony cura** (`healFromHarmony`). O sustain do Monk *é* a rotação. Ele não tem botão de cura obrigatório no meio da hunt.
- **Virtues** (escolha 1 de 3, exclusivas):
  - *Harmony* — aumenta o bônus de Harmony e **devolve 1 carga** ao gastar.
  - *Justice* — aumenta a skill de Fist Fighting (dano de auto-attack).
  - *Sustain* — aumenta a cura.
- **Serene** — estado que **dobra o efeito da Virtue ativa**. No código: você é Serene a menos que esteja em party com membros visíveis E cercado por muitos monstros.
- **Focus Serenity** (cd longo) — enche Harmony, **zera todos os cooldowns** e força Serene por alguns segundos. É um botão de burst clássico.
- **Focus Harmony** — só enche Harmony.
- **Monk não usa runas.** Não é proibição: é que runa não gera Harmony, então usar runa é perder tempo de ciclo.

**Núcleo obrigatório**
1. Recurso visível de 0–5 com escalonamento não-linear.
2. Pelo menos 1 builder single target e 1 builder AoE.
3. Pelo menos 1 spender single target e 1 spender AoE.
4. Cura acoplada ao recurso (não um botão de cura separado).
5. As três posturas (Virtues).
6. Um botão de burst que enche o recurso e reseta cooldowns.

**Pode ser descartado**
- Swift Jab / Tiger Clash base (level 0) e Lesser Mystic Repulse — existem só como escada de tutorial.
- Mentor Other, Enlighten Party, familiar.
- **Serene como está.** Em single-player a condição nunca dispara. Ver §9 (Riscos).
- A duplicação builder pequeno/grande (Flurry of Blows vs Greater Flurry of Blows) — em Huntbound é uma spell que evolui.

**Kit enxuto proposto (5 ações + postura)**

| Slot | Conceito | Papel |
|---|---|---|
| 1 | **Sequência** | Builder single target, cooldown muito curto. Spam. |
| 2 | **Rajada** | Builder AoE ao redor. Spam em pack. |
| 3 | **Golpe Decisivo** | Spender single target. Escala com cargas. |
| 4 | **Varredura** | Spender AoE. Escala com cargas. |
| 5 | **Foco** | Enche cargas + zera cooldowns. Cooldown longo. Burst. |
| Postura | **Harmonia** / **Justiça** / **Sustento** | Ver §7. |

---

## 4. Runas — o que realmente importa

Runas são a camada mais fácil de trazer para Huntbound porque são **consumíveis com identidade**, e consumível casa perfeitamente com dungeon curta + preparação de sessão.

### 4.1 Taxonomia real das runas de Tibia

| Categoria | Exemplos | Vale a pena? |
|---|---|---|
| **Dano AoE centrado no alvo** | Avalanche (gelo, druid), Great Fireball (fogo, sorc), Thunderstorm, Stone Shower, Energy Bomb | **Sim — é o coração do sistema.** São as runas efetivamente usadas em hunt. |
| **Dano single target** | Sudden Death (morte), Icicle, Heavy Magic Missile | **Sim**, principalmente para boss. |
| **Cura** | Ultimate Healing Rune, Intense Healing Rune | **Sim.** Cura instantânea sem gastar mana em combate é uma decisão econômica interessante. |
| **Controle / bloqueio** | Magic Wall, Wild Growth, Paralyze | **Sim, e são as mais interessantes.** Transformam runa em ferramenta tática, não em dano. |
| **Campos elementais** | Fire Field, Poison Field, Energy Field, e as walls correspondentes | **Não.** Seis runas fazendo variações da mesma coisa. Guardar no máximo uma. |
| **Utilitário de MMO** | Destroy Field, Blank Rune, Chameleon, Animate Dead, Convince Creature | **Não.** |
| **Obsoletas por progressão** | Explosion, Soulfire, Stalagmite, Light/Lightest Missile | **Não.** São degraus de escada de level, não escolhas. |

### 4.2 O que copiar para Huntbound

**Copiar:**
- Runa como **consumível carregado com N cargas**, comprado ou fabricado antes da dungeon.
- Runa que **qualquer classe pode usar** (a runa é o grande equalizador de Tibia: dá AoE ao Knight, dá burst ao Paladin).
- **Fabricação** como atividade de preparação fora do combate, consumindo um recurso próprio (o "soul point" de Tibia). Isso encaixa direto na filosofia de "gestão de conta" do projeto.
- As quatro categorias que sobrevivem: **AoE no alvo**, **nuke single**, **cura instantânea**, **controle/bloqueio**.

**Não copiar:**
- Escadas de tier (light → heavy → great). Uma runa que sobe de qualidade, não cinco runas.
- Runa como fonte principal de dano de uma classe. Se runa for obrigatória para o Sorcerer funcionar, ela deixa de ser escolha.
- Blank rune → runa como duas etapas de inventário.

**Ponto de atenção:** o Monk foi explicitamente desenhado para **não** usar runas. Se em Huntbound a runa for universal e forte, ela compete com o ciclo de Harmony. Duas saídas: (a) runas não quebram o ciclo (não consomem GCD do recurso), ou (b) o Monk tem uma interação própria — ex.: usar runa **gera** 1 carga em vez de desperdiçar o turno.

---

## 5. Rotação prática típica (por vocação)

Rotações reais, como praticadas, não como listadas na wiki:

**Knight**
```
Pré-pull:  Postura Fúria
Pull:      correr, juntar 4–8 monstros em um espaço fechado
Loop:      AoE grande (cd médio) → AoE pequeno (spam) → AoE grande
Fecho:     nuke single target no último monstro
Emergência: Postura Guarda + cura + potion
```

**Paladin**
```
Contínuo: ataque à distância, sempre andando para trás
Loop:     projétil single target sempre que sair do cd
Se 2+ alvos encostam: AoE ao redor, depois recuar
Boss:     Postura Precisão + marca no alvo + projéteis
Fuga:     Postura Evasão
```

**Sorcerer**
```
Pré-pull:  Égide (mana como escudo)
Pull:      juntar pack alinhado com o cone
Loop:      Onda → runa AoE → Onda → single target no restante
Boss:      debuff → nuke single target → runas de nuke
```

**Druid**
```
Pré-pull:  Égide
Pull:      juntar pack
Loop:      Raízes (segurar o pack no lugar) → AoE → AoE → limpar
Boss:      lentidão/controle + AoE grande + cura
```

**Monk**
```
Loop:      builder → builder → builder → builder → builder (5 cargas) → SPENDER
           (o spender reduz cooldowns, então o próximo ciclo é mais rápido)
Pack:      builder AoE ×5 → spender AoE
Boss:      builder single ×5 → spender single → Foco (reset) → repetir
Nunca:     gastar com 1–2 cargas
```

**Padrão comum:** todas as cinco rotações são **"prepara → mantém → descarrega"**. Isso é uma boa notícia: um único modelo de UI/telemetria (recurso, cooldowns, postura) serve para as cinco classes.

---

## 6. Interações com **dash**

Tibia **não tem dash**. O que ela tem são buffs de velocidade (Haste, Strong Haste, Charge, Swift Foot) e um único deslocamento instantâneo, no Monk (Mystic Repulse, alcance 7). Ou seja: **dash é nosso, não é herdado** — e por isso é a maior oportunidade de modernizar sem descaracterizar.

### 6.1 Princípio de design

O dash deve ser **universal e igual para todos** na sua função básica (sair de perigo), e **diferenciado no rider** (o que acontece quando você usa). Se o dash de uma classe for muito melhor que o de outra, ele deixa de ser sistema e vira spell.

### 6.2 Riders por classe

| Classe | Rider proposto | Justificativa em Tibia |
|---|---|---|
| **Knight** | Dash **para frente atravessando inimigos**, puxando aggro de quem for atravessado. Curto alcance. | Herdeiro do Charge + Challenge. O Knight usa dash para *entrar*, não para sair. |
| **Paladin** | Dash **para trás/lateral mais longo**, e o ataque automático não quebra durante o dash. Cooldown menor que os demais. | É a vocação de kite. Swift Foot vira o "dash contínuo"; o dash discreto é o "pulinho" que mantém a distância. |
| **Sorcerer** | Dash **curto** (é a classe mais lenta), mas o próximo cast após o dash tem cast time/cooldown reduzido. | Compensa a fragilidade sem dar mobilidade que ele nunca teve. "Blink e detona". |
| **Druid** | Dash deixa um **rastro de terreno lento** por 2–3 s no caminho percorrido. | Herdeiro de Wild Growth / campos. Fugir *é* controlar. |
| **Monk** | Dash **em direção ao alvo** com alcance maior (herdeiro direto do Mystic Repulse) e **gera 1 carga de Harmony** se terminar adjacente a um inimigo. | Único que já tinha deslocamento. Integra o dash ao ciclo de recurso. |

### 6.3 Cuidados

- **Dash não pode substituir a postura de mobilidade.** Se o dash resolve tudo, Swift Foot / Evasão perde razão de existir. Sugestão: dash = **reposicionamento pontual**; postura de mobilidade = **estado sustentado**.
- **Tile-based:** o dash precisa de regra clara de colisão (atravessa inimigo? atravessa parede? para no primeiro obstáculo?). Isso muda completamente o valor da mecânica e deve ser decidido **cedo**, não durante o balanceamento.
- **O dash não deve cancelar o AoE do Knight.** Se o Knight puder dashar e girar no mesmo instante, ele vira a melhor classe do jogo. Considerar um pequeno delay de "aterrissagem" antes de spells de área.
- **Helper e dash:** ver §8 — dash automático é o recurso mais perigoso de automatizar.

---

## 7. Interações com **postura**

### 7.1 A descoberta central

Postura **não é um sistema estranho a Tibia — é um sistema que Tibia já tem, mal formalizado**:

| Vocação | O que já existe hoje |
|---|---|
| Knight | **Blood Rage** (+melee, +dano recebido, defesa desligada) × **Protector** (++shielding, −dano causado, −dano recebido). No código compartilham o mesmo `SubId`: **um substitui o outro**. |
| Paladin | **Sharpshooter** (++distance, defesa desligada, −velocidade) × **Swift Foot** (++velocidade, −50% dano, bloqueia grupo de ataque). |
| Monk | **Virtue of Harmony / Justice / Sustain** — três posturas explícitas, exclusivas, com um estado (Serene) que dobra o efeito. |
| Sorcerer / Druid | **Magic Shield** — não é postura formal, mas é um toggle de longa duração que muda o modelo de sobrevivência (mana vira vida). |

**Conclusão:** formalizar postura como sistema de primeira classe em Huntbound é *mais* fiel ao Tibia atual do que manter esses buffs espalhados como spells soltas.

### 7.2 Modelo proposto

- Cada classe tem **2 ou 3 posturas mutuamente exclusivas**.
- Trocar de postura tem **custo** (cooldown curto, ou uma janela de ramp-up de 1–2 s), para que não seja spam.
- Postura **modifica as spells existentes**, não adiciona spells novas. É isso que mantém o kit em 4–6 ações.
- Toda postura tem **um ganho e uma perda explícitos**. Postura sem downside é buff, não postura.

| Classe | Postura A (ofensiva) | Postura B (defensiva/utilitária) | Postura C |
|---|---|---|---|
| **Knight** | **Fúria** — mais dano melee, mais dano recebido, sem bloqueio | **Guarda** — muito mais mitigação, menos dano, taunt mais forte | — |
| **Paladin** | **Precisão** — mais dano à distância, mais lento, sem defesa | **Evasão** — mais velocidade e esquiva, dano reduzido, munição não é consumida | — |
| **Sorcerer** | **Condução** — mais dano de spell, mais custo de mana | **Égide** — mana absorve dano (Magic Shield), dano reduzido | — |
| **Druid** | **Comunhão** — mais cura e controle | **Bosque** — spells aplicam lentidão/raiz, dano menor | — |
| **Monk** | **Justiça** — mais dano de ataque básico | **Sustento** — mais cura do ciclo | **Harmonia** — mais bônus de recurso e devolve carga ao gastar |

### 7.3 Interação postura × dash × recurso

Três sistemas transversais precisam de uma **regra clara de composição**, senão viram sopa:

- **Postura** = estado de longa duração, decisão estratégica (segundos a minutos).
- **Dash** = ação instantânea, decisão tática (fração de segundo).
- **Recurso de classe** (Harmony, munição, mana, cooldowns) = ritmo do loop.

Regra sugerida: **a postura pode modificar o dash** (ex.: Evasão dá dash extra; Guarda dá dash que puxa aggro), mas **o dash nunca troca postura**. Um sistema modifica o outro em uma direção só.

---

## 8. Configurações de helper

O helper vai usar skills automaticamente. Isso muda o design: **uma spell que o helper aperta sozinho não é uma decisão do jogador**. Se todo o kit for automatizável, o jogador vira espectador.

### 8.1 Classificação obrigatória de cada ação

Toda ação do kit deveria carregar uma tag:

| Tag | Significado | Exemplo |
|---|---|---|
| `AUTO_SEMPRE` | Helper aperta sem pensar quando sai do cooldown | Spam AoE do Knight, projétil do Paladin, builder do Monk |
| `AUTO_CONDICIONAL` | Helper aperta se uma condição for satisfeita | AoE grande se ≥3 alvos; cura se HP < X%; spender se cargas = 5 |
| `AUTO_OPCIONAL` | Desligado por padrão, jogador pode ligar | Postura, ultimate, runa cara |
| `MANUAL` | Helper nunca aperta | Dash, e idealmente 1 skill "assinatura" por classe |

**Recomendação forte:** manter **pelo menos 2 slots por classe fora do alcance do helper** — normalmente o dash e o burst. É o que preserva a sensação de jogar.

### 8.2 Perfis sugeridos por classe

| Classe | Regras naturais do helper |
|---|---|
| **Knight** | Manter postura ofensiva; trocar para defensiva se HP < 50% ou ≥6 inimigos adjacentes. Spam de AoE pequeno. AoE grande se ≥3 alvos. Nuke single quando restar 1 alvo ou contra boss. Taunt quando inimigo mudar de alvo. |
| **Paladin** | Nunca parar o tiro automático. Recarregar munição abaixo de X%. Projétil sempre que sair do cd. AoE só se ≥2 alvos adjacentes. **Kiting automático é a decisão mais perigosa** — sugerir como opção separada e desligada por padrão. |
| **Sorcerer** | Manter Égide ativa acima de X% de mana. Onda quando ≥3 alvos alinhados no cone. Ultimate só se ≥5 alvos (evitar desperdício). Cura em HP < 40%. Runa AoE com cluster grande. |
| **Druid** | Raízes automaticamente quando ≥3 inimigos se aproximam. Cura em limiar. AoE em cluster. Priorizar controle sobre dano quando HP baixo. |
| **Monk** | **Regra dominante: builder até 5 cargas, depois spender.** Trivial de automatizar e é exatamente por isso que o Monk é a classe que mais se beneficia de um helper. Escolher spender AoE vs single pela contagem de alvos. Trocar Virtue por contexto (Sustain se HP baixo, Justiça caso contrário). Foco/reset como `AUTO_OPCIONAL`. |

### 8.3 Consequência de design

O kit precisa ser **legível por máquina**. Isso empurra para uma boa direção: cada ação deve ter um **gatilho objetivo** (contagem de alvos, % de recurso, % de HP, cargas). Se uma ação não tem gatilho objetivo, provavelmente ela é situacional demais e cai na lista de "pode ser descartado".

**Efeito colateral positivo:** essa mesma classificação é o que permite fazer auto-play/roguelite recorrente no endgame sem retrabalho.

---

## 9. Riscos de descaracterização

Riscos ordenados por gravidade.

### 9.1 Alto — homogeneizar Sorcerer e Druid

No Tibia atual eles já são quase a mesma vocação. Ao cortar o kit para 5 ações e remover a cura de party (que em single-player não existe), o risco de virarem **skins um do outro** é altíssimo.

**Mitigação:** dar ao Druid um pilar **mecânico** distinto — controle de movimento (raiz, lentidão, terreno) — em vez de apenas trocar fogo por gelo.

### 9.2 Alto — matar o Knight ao dar dano single target

O Knight é bom em pack e ruim contra alvo único. Isso não é bug: é a razão de o Paladin e o Monk existirem. Se em Huntbound o conteúdo for majoritariamente **boss** (e o dossiê indica que boss será um pilar), o Knight fica sem função.

**Mitigação:** o valor do Knight em boss deve vir de **mitigação e controle**, não de DPS. Se o jogo não recompensar tanking (porque não há party para proteger), o Knight precisa de outro payoff — ex.: postura defensiva que converte mitigação em dano acumulado, ou mecânicas de boss que punem quem não consegue absorver.

### 9.3 Alto — Serene do Monk vira "sempre ligado"

Serene existe hoje para punir o Monk em party lotada. Em single-player a condição nunca dispara, então o Monk andaria permanentemente no modo forte.

**Mitigação:** reinterpretar Serene como algo que o jogador **conquista e perde durante o combate** — por exemplo: perde Serene ao tomar dano pesado, ou ao ficar cercado por N inimigos, e recupera após alguns segundos sem ser atingido. Mantém o nome e a fantasia, muda o gatilho.

### 9.4 Médio — o helper esvaziar o gameplay

Se o helper aperta tudo, as cinco classes viram a mesma experiência: assistir. Especialmente grave no Monk, cuja rotação é **trivialmente automatizável**.

**Mitigação:** §8.1 — tags obrigatórias e 2 slots manuais por classe.

### 9.5 Médio — dash apagar as identidades de mobilidade

Se todo mundo tem dash bom, o Paladin perde o que o torna Paladin (ser o único que consegue não ser alcançado).

**Mitigação:** dash universal e *fraco* como escape; a diferença de mobilidade real continua na postura e na velocidade base.

### 9.6 Médio — runa universal apagar as identidades de AoE

Runa AoE forte em qualquer classe transforma o Knight em mago e o Paladin em Sorcerer. Em Tibia isso é contido pelo magic level (Knight simplesmente não consegue usar bem).

**Mitigação:** eficácia da runa escala com um atributo em que cada classe é diferente, ou runas fortes têm cargas muito limitadas por dungeon.

### 9.7 Baixo — perder a "textura" de Tibia ao cortar demais

Parte do charme de Tibia é o excesso: palavras mágicas em latim macarrônico, spells inúteis que existem por razões históricas, luz, corda mágica. Cortar tudo deixa o jogo funcional e sem alma.

**Mitigação:** manter a **textura** onde ela é barata — nomes/palavras de comando, efeitos visuais, descrições — e cortar apenas onde ela custa **slots de ação** e **atenção do jogador**.

### 9.8 Baixo — copiar a Wheel of Destiny cedo demais

A Wheel é um sistema enorme (4 domínios, dedication/conviction/revelation, gems, 3 grades por spell, avatares por vocação, milhares de pontos). É conteúdo de endgame de um MMO de 28 anos.

**Mitigação:** ver §10.

---

## 10. Wheel of Destiny — o que aproveitar

**Estrutura real** (confirmada em `wheel_definitions.hpp` e na TibiaWiki):

- Pontos ganhos por level a partir de determinado ponto da progressão, gastos numa roda dividida em **4 domínios**.
- **Dedication** — bônus pequenos e incrementais (HP, mana, capacidade).
- **Conviction** — bônus médios, desbloqueados ao encher uma fatia; efeitos que **modificam spells existentes** ou dão passivas.
- **Revelation** — 4 perks poderosos, um por domínio, cada um com **3 estágios** (250 / 500 / 1000 pontos). Concedem spells novas ou passivas grandes.
- **Spell grades** — no código, `WheelSpellGrade_t { NONE, REGULAR, UPGRADED, MAX }`. Ou seja: a mesma spell existe em **3 qualidades**.
- **Gems** com modificadores supremos que afetam spells nomeadas (ex.: reduzir o cooldown de Focus Harmony).
- Cada vocação tem sua própria roda, com **Avatar** próprio (Steel / Light / Storm / Nature / Balance) e revelações próprias.

**O que vale copiar para Huntbound:**

| Ideia da Wheel | Por que serve | Como usar |
|---|---|---|
| **Spell grades (Regular / Upgraded / Max)** | Resolve o problema central: como dar progressão a longo prazo com apenas 5 spells | Cada uma das 5 ações tem 3 graus. 5 ações × 3 graus = progressão longa sem inflação de botões |
| **Conviction: perks que modificam spells existentes** | Mantém o kit enxuto e ainda dá escolha de build | "Sua Onda agora atravessa inimigos", "seu spender devolve 1 carga" |
| **Revelation com estágios** | Marcos claros de progressão de conta, alinhados a "semanas e meses" | 1 perk grande por classe, 3 estágios, marcos visíveis |
| **Avatar por vocação** | Ultimate de longa duração que reforça a fantasia da classe | Se houver ultimate, deve ser 1 por classe e claramente temática |
| **Domínios** | Dá formato à escolha (não é lista plana de talentos) | Mesmo que sejam só 2–3 domínios |

**O que NÃO copiar:**
- A escala (milhares de pontos, dezenas de fatias). Isso pressupõe anos de jogo.
- Gems e modificadores supremos — camada de RNG/coleção em cima de uma camada já complexa.
- Dedication perks (+1 HP por ponto). É preenchimento; em Huntbound isso deveria ser progressão automática de level, não escolha.
- Perks que só funcionam em party (Healing Link, Guiding Presence, Positional Tactics).

---

## 11. Síntese — a proposta em uma tabela

| Classe | Recurso | Range | Ação de spam | Ação de burst | Diferencial preservado | Diferencial reinventado |
|---|---|---|---|---|---|---|
| **Knight** | Cooldowns + potions | 1 | AoE ao redor | Execução single | AoE centrado em si + taunt | Payoff de tanking em single-player |
| **Paladin** | Munição | 4–7 | Projétil | Marca que detona | Dano vindo do auto-attack em movimento | Marca (Divine Grenade) como pilar, não como topo de progressão |
| **Sorcerer** | Mana | 3–8 | Onda (cone) | Cataclismo | Geometria de AoE + mana como vida | Elemento como build, não como 15 spells |
| **Druid** | Mana | 3–8 | Vendaval | Inverno | Gelo/terra + runas | **Controle** substitui cura de party |
| **Monk** | Harmony 0–5 | 1 (+7 no dash) | Builder | Spender + Foco | Builder/spender exponencial + Virtues + cura acoplada | Serene com gatilho de combate, não de party |

**Regra transversal:** 5 ações + 1 dash + 1 postura por classe = **7 inputs**, dos quais 2 são sistemas compartilhados. Fica dentro da hipótese de 4–6 ações do dossiê e mantém as cinco classes distinguíveis.

---

## 12. Fontes

### 12.1 Fonte técnica primária — lida diretamente (alta confiança)

Repositório Canary já clonado em `references/canary` (servidor open-source que implementa o Tibia moderno, incluindo o Monk):

- `data/scripts/spells/attack/*.lua` — ~68 spells de ataque
- `data/scripts/spells/healing/*.lua` — 28 spells de cura
- `data/scripts/spells/support/*.lua` — 39 spells de suporte
- `data/scripts/spells/conjuring/*.lua` — 49 runas e conjurações
- `data/XML/vocations.xml` — ganhos por level e regeneração das 10 vocações + Monk/Exalted Monk
- `src/creatures/players/player.cpp` — `buildHarmony`, `spendHarmony`, `getHarmonyBonus`, `setSerene`, `updateSerenityState`
- `src/creatures/combat/spells.cpp` — `postCastSpell` (lógica builder/spender e redução de cooldown), `applySanctuaryEffect`
- `src/creatures/combat/combat.cpp` — bônus de Virtue of Sustain e Serene
- `src/creatures/players/components/wheel/wheel_definitions.hpp` — enums de estágios, instants e grades da Wheel of Destiny

> Ressalva: Canary é uma reimplementação da comunidade. Fórmulas e constantes podem divergir do servidor oficial (o próprio código tem comentários `TODO: Use New Real Formula`). Foi usado como referência de **estrutura e mecanismo**, não de números exatos.

### 12.2 Fontes públicas — consultadas (confiança média)

Vocações e mecânicas gerais:
- [Tibia — Game Guides: Characters (oficial)](https://www.tibia.com/gameguides/?subtopic=manual&section=characters)
- [Tibia/Vocations — StrategyWiki](https://strategywiki.org/wiki/Tibia/Vocations)
- [Tibia Vocations Guide — TibiaMobile](https://tibiamobile.com/wiki/vocations/)
- [Tibia Vocations Overview — TibiaBosses.pl](https://tibiabosses.pl/article_2)

Monk:
- [Monk — TibiaWiki](https://tibia.fandom.com/wiki/Monk)
- [Monk Vocation Guide — TibiaBuddy](https://www.tibiabuddy.com/blog/monk-vocation-guide) *(lida)*
- [Virtue Spells Complete Guide — TibiaBuddy](https://www.tibiabuddy.com/blog/virtue-spells-complete-guide)
- [Monk Harmony Guide / Serene & Spells — TibiaMonk](https://www.tibiamonk.com/en/abilities)
- [Virtue of Harmony — TibiaWiki](https://tibia.fandom.com/wiki/Virtue_of_Harmony)
- [Virtue of Sustain — TibiaWiki](https://tibia.fandom.com/wiki/Virtue_of_Sustain)
- [Tibia Finally Introduces New Monk Vocation After Three Decades — TheGamer](https://www.thegamer.com/tibia-mmo-update-new-vocation-monk-after-28-years/)
- [5th Vocation Revealed: Monk is coming — TibiaGoals](https://www.tibiagoals.com/2025/04/5th-vocation-revealed-monk-is-coming.html)

Wheel of Destiny:
- [Wheel of Destiny — TibiaWiki](https://tibia.fandom.com/wiki/Wheel_of_Destiny)
- [Wheel of Destiny/Conviction Perks — TibiaWiki](https://tibia.fandom.com/wiki/Wheel_of_Destiny/Conviction_Perks)
- [Wheel of Destiny/Revelation Perks — TibiaWiki](https://tibia.fandom.com/wiki/Wheel_of_Destiny/Revelation_Perks)
- [Wheel of Destiny planner — TibiaForge](https://tibiaforge.com/wheel)

Spells e rotações:
- [Knight's spells rotation — TibiaDaily](https://tibiadaily.com/knights-spells-rotation/)
- [Knight Hunting Guide — TibiaBuddy](https://www.tibiabuddy.com/blog/knight-hunting-guide-2026)
- [Executioner's Throw — TibiaWiki](https://tibia.fandom.com/wiki/Executioner's_Throw)
- [Fierce Berserk — TibiaWiki](https://tibia.fandom.com/wiki/Fierce_Berserk)
- [Berserk — TibiaWiki](https://tibia.fandom.com/wiki/Berserk)
- [Paladin — TibiaWiki](https://tibia.fandom.com/wiki/Paladin)
- [Divine Grenade — TibiaWiki](https://tibia.fandom.com/wiki/Divine_Grenade)
- [Divine Missile — TibiaWiki](https://tibia.fandom.com/wiki/Divine_Missile)
- [Ethereal Spear — TibiaWiki](https://tibia.fandom.com/wiki/Ethereal_Spear)
- [Best spell rotations for paladin? — TibiaQA](https://www.tibiaqa.com/14132/best-spell-rotations-for-paladin)

Runas:
- [Attack Runes — TibiaWiki](https://tibia.fandom.com/wiki/Attack_Runes)
- [Rune Making — TibiaWiki](https://tibia.fandom.com/wiki/Rune_Making)
- [Avalanche Rune — TibiaWiki](https://tibia.fandom.com/wiki/Avalanche_Rune)
- [Great Fireball — TibiaWiki](https://tibia.fandom.com/wiki/Great_Fireball)
- [Is the average damage of the main AoE runes equal? — TibiaQA](https://www.tibiaqa.com/9833/is-the-average-damage-of-the-main-aoe-runes-equal)

> Ressalva de método: dentre as fontes públicas, apenas o guia de Monk da TibiaBuddy foi aberto e lido integralmente; o domínio `tibia.fandom.com` bloqueia acesso automatizado (HTTP 402), então as páginas da TibiaWiki entraram via resultados de busca. Sempre que houve conflito entre wiki e código, o documento descreve o **mecanismo** e evita o número.

---

## 13. Perguntas em aberto (para as próximas etapas)

Não resolvidas aqui de propósito — dependem de decisões que ainda não foram tomadas:

1. **Existe party/helper como entidade de combate?** Isso decide se cura em aliado e taunt têm valor, e portanto se Druid e Knight mantêm seus pilares originais.
2. **O jogo é majoritariamente boss ou majoritariamente pack?** Decide a viabilidade do Knight.
3. **Dash atravessa inimigos e paredes?** Muda completamente o valor da mecânica nas 5 classes.
4. **Runa é universal ou restrita por classe?** Decide se runa é equalizador ou identidade.
5. **Postura tem custo de troca?** Decide se postura é decisão estratégica ou micro de combate.
6. **Munição do Paladin é recurso real ou cosmético?** Se regenerar sozinha, o Paladin perde a camada logística que o define.
