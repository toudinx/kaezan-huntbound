import { expect, type Page, test } from '@playwright/test';

import type { GridPosition } from '../../packages/contracts/src/index.ts';
import {
  type CombatPlayEvidence,
  type CombatProbeDecoration,
  runCombatSession,
} from './support/combatDriver';

const viewport = { name: 'desktop', width: 1366, height: 768 } as const;

interface PageWatch {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
  readonly failedRequests: string[];
  readonly badResponses: string[];
}

function watchPage(page: Page): PageWatch {
  const watch: PageWatch = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    badResponses: [],
  };

  page.on('console', (message) => {
    if (message.type() === 'error') watch.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => watch.pageErrors.push(error.message));
  page.on('requestfailed', (request) =>
    watch.failedRequests.push(request.url()),
  );
  page.on('response', (response) => {
    if (response.status() >= 400) {
      watch.badResponses.push(`${response.url()} (${response.status()})`);
    }
  });

  return watch;
}

function positionEquals(
  left: GridPosition | null,
  right: GridPosition | null | undefined,
): boolean {
  return (
    left !== null &&
    right !== null &&
    right !== undefined &&
    left.x === right.x &&
    left.y === right.y &&
    left.z === right.z
  );
}

function firstDecoration(
  decorations: readonly CombatProbeDecoration[],
  predicate: (decoration: CombatProbeDecoration) => boolean,
  description: string,
): CombatProbeDecoration {
  const decoration = decorations.find(predicate);
  if (decoration === undefined) {
    throw new Error(
      `Expected ${description} in the combat probe. Saw: ${JSON.stringify(
        decorations.map((entry) => ({
          kind: entry.kind,
          key: entry.key,
          stronger: entry.stronger,
        })),
      )}`,
    );
  }
  return decoration;
}

/**
 * The cues of one phase are the decorations that phase added.
 *
 * Decorations accumulate and outlive the moment that spawned them, so a phase
 * read on its own would also see everything still standing from the phases
 * before it. Each phase is therefore diffed against the one that precedes it in
 * the session, by id — ids only grow.
 */
function newDecorations(
  current: readonly CombatProbeDecoration[],
  previous: readonly CombatProbeDecoration[],
): readonly CombatProbeDecoration[] {
  const previousIds = new Set(previous.map((decoration) => decoration.id));
  return current.filter((decoration) => !previousIds.has(decoration.id));
}

type CombatCues = NonNullable<CombatPlayEvidence['cues']>;

function phase(cues: CombatCues, name: keyof CombatCues) {
  return cues[name].active;
}

test.describe.configure({ retries: 0 });

test('proves the planned combat cues reach the browser', async ({ page }) => {
  test.setTimeout(180_000);
  const watch = watchPage(page);
  const evidence = await runCombatSession(page, viewport, {
    captureCues: true,
  });
  const cues = evidence.cues;
  if (cues === undefined) {
    throw new Error('The session returned no cue evidence.');
  }

  // The session's real order: the first creature is engaged and killed by the
  // auto-attack loop, and only then are the three abilities cast on the pile
  // that gathers afterwards. Each phase is diffed against that predecessor.
  const attack = phase(cues, 'attack');
  const death = phase(cues, 'death');
  const berserk = phase(cues, 'berserk');
  const woundCleansing = phase(cues, 'woundCleansing');
  const brutalStrike = phase(cues, 'brutalStrike');

  const player = attack.state.player;
  if (player === null) throw new Error('The attack probe has no player actor.');

  // --- basic attack -------------------------------------------------------
  // The swing that lands can be the fatal one, and the kernel removes an actor
  // at zero health in the same tick it emits the damage event — so the target
  // may already be off `state.actors` while its cues are still on screen. The
  // cues carry the tile themselves, so they are what these assertions hang on
  // rather than the roster.
  //
  // The tile also has to be matched rather than taken first: the rotworm is
  // biting back, and its own hit-area impact lands on the player in the very
  // same frame.
  const attackImpact = firstDecoration(
    attack.decorations,
    (decoration) =>
      decoration.kind === 'impact' &&
      decoration.key === 'effect:tibia:hit-area' &&
      decoration.position !== null &&
      !positionEquals(decoration.position, player.position),
    'the basic-attack impact away from the player tile',
  );
  const strike = attackImpact.position;
  expect(strike).not.toBeNull();
  // Melee: the struck tile is one of the eight around the knight.
  expect(
    strike !== null &&
      strike.z === player.position.z &&
      Math.max(
        Math.abs(strike.x - player.position.x),
        Math.abs(strike.y - player.position.y),
      ) === 1,
    `Strike at ${JSON.stringify(strike)}, player at ${JSON.stringify(
      player.position,
    )}`,
  ).toBe(true);

  expect(
    attack.decorations.some(
      (decoration) =>
        decoration.kind === 'blood' &&
        positionEquals(decoration.position, strike),
    ),
  ).toBe(true);

  const attackDamage = firstDecoration(
    attack.decorations,
    (decoration) =>
      decoration.kind === 'damage-number' &&
      positionEquals(decoration.position, strike),
    'the basic-attack damage number over the struck tile',
  );
  expect(attackDamage.amount).toBeGreaterThan(0);

  // `flash` marks whoever was struck and `lunge` whoever swung, so this pair is
  // what says the knight hit the creature and not the other way round.
  const attackImpulses = attack.impulses;
  expect(
    attackImpulses.some(
      (impulse) =>
        impulse.type === 'flash' &&
        impulse.entityId === evidence.killedTargetId,
    ),
    `Attack impulses at tick ${attack.state.tick}: ${JSON.stringify(
      attackImpulses,
    )}`,
  ).toBe(true);
  expect(
    attackImpulses.some(
      (impulse) =>
        impulse.type === 'lunge' && impulse.entityId === player.entityId,
    ),
  ).toBe(true);
  expect(attackImpulses.some((impulse) => impulse.type === 'hit-stop')).toBe(
    true,
  );

  // Impulses are meant to be transient. Past their TTL not one of the ids seen
  // mid-swing may still be driving the scene.
  const attackImpulseIds = new Set(attackImpulses.map((impulse) => impulse.id));
  expect(
    cues.attack.after?.impulses.some((impulse) =>
      attackImpulseIds.has(impulse.id),
    ),
  ).toBe(false);

  // --- the creature dies --------------------------------------------------
  // Not diffed against the attack phase: the swing captured above was the
  // fatal one, so the corpse and its arc were already on screen in that same
  // snapshot and a diff would come back empty. `corpse` and `autoloot-arc`
  // occur nowhere else in the session, so they need no diff to be unambiguous.
  const corpse = firstDecoration(
    death.decorations,
    (decoration) => decoration.kind === 'corpse',
    'the corpse cue',
  );
  const autoloot = firstDecoration(
    death.decorations,
    (decoration) => decoration.kind === 'autoloot-arc',
    'the autoloot arc cue',
  );
  const deathBlood = firstDecoration(
    death.decorations,
    (decoration) =>
      decoration.kind === 'blood' &&
      positionEquals(decoration.position, corpse.position),
    'the blood under the corpse',
  );
  expect(corpse.position).not.toBeNull();
  expect(deathBlood.position).toEqual(corpse.position);
  // The loot flies from the body to the knight.
  expect(autoloot.from).toEqual(corpse.position);
  expect(autoloot.to).toEqual(death.state.player?.position);

  // These three do not animate by frame — they report Phaser's `__BASE`, the
  // name a single-texture image carries, which is right for a corpse item and a
  // blood stain. The arc is the one that moves, and it moves by position: it
  // travels from the body to the knight, so its drawn point has to have shifted
  // two ticks on while the body and the stain stay exactly where they fell.
  const deathAfter = cues.death.after;
  if (deathAfter === undefined) {
    throw new Error('Death frame probe is missing.');
  }
  const deathAfterById = new Map(
    deathAfter.decorations.map((decoration) => [decoration.id, decoration]),
  );

  const autolootLater = deathAfterById.get(autoloot.id);
  expect(
    autolootLater !== undefined &&
      (autolootLater.x !== autoloot.x || autolootLater.y !== autoloot.y),
    `Autoloot arc at ${JSON.stringify([
      autoloot.x,
      autoloot.y,
    ])} then ${JSON.stringify([autolootLater?.x, autolootLater?.y])}`,
  ).toBe(true);

  for (const decoration of [corpse, deathBlood]) {
    const later = deathAfterById.get(decoration.id);
    expect(later?.x, `${decoration.kind} drifted`).toBe(decoration.x);
    expect(later?.y, `${decoration.kind} drifted`).toBe(decoration.y);
  }

  // --- berserk ------------------------------------------------------------
  const berserkCues = newDecorations(berserk.decorations, death.decorations);
  const berserkPlayer = berserk.state.player;
  if (berserkPlayer === null) {
    throw new Error('The berserk probe has no player.');
  }
  // Berserk is `shape: 'area'` with radius 1 centred on the caster, so its cues
  // are physical `hit-area` impacts — not a magic effect — and they should
  // cover all nine tiles of the 3x3 the knight stands in. Coverage is the
  // assertion rather than a count: the auto-attack loop keeps swinging through
  // this window and drops hit-area impacts of its own on those same tiles.
  const berserkImpacts = berserkCues.filter(
    (decoration) =>
      decoration.kind === 'impact' &&
      decoration.key === 'effect:tibia:hit-area' &&
      decoration.position !== null,
  );
  const struckTiles = new Set(
    berserkImpacts.map((decoration) =>
      [
        decoration.position?.x,
        decoration.position?.y,
        decoration.position?.z,
      ].join(','),
    ),
  );
  const expectedTiles: string[] = [];
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      expectedTiles.push(
        [
          berserkPlayer.position.x + dx,
          berserkPlayer.position.y + dy,
          berserkPlayer.position.z,
        ].join(','),
      );
    }
  }
  expect(
    expectedTiles.filter((tile) => !struckTiles.has(tile)),
    `Berserk covered ${JSON.stringify([...struckTiles])} around ${JSON.stringify(
      berserkPlayer.position,
    )}`,
  ).toEqual([]);
  expect(
    berserk.commands.some(
      (command) =>
        command.type === 'actor/cast-ability' && command.abilityIndex === 0,
    ),
  ).toBe(true);

  // --- wound cleansing ----------------------------------------------------
  const woundCues = newDecorations(
    woundCleansing.decorations,
    berserk.decorations,
  );
  expect(
    woundCleansing.commands.some(
      (command) =>
        command.type === 'actor/cast-ability' &&
        command.abilityIndex === 2 &&
        command.entityId === woundCleansing.state.player?.entityId,
    ),
  ).toBe(true);
  const healNumber = firstDecoration(
    woundCues,
    (decoration) => decoration.kind === 'heal-number',
    'the wound-cleansing heal number',
  );
  expect(healNumber.amount).toBeGreaterThan(0);

  // --- brutal strike ------------------------------------------------------
  const brutalCues = newDecorations(
    brutalStrike.decorations,
    woundCleansing.decorations,
  );
  const brutalImpact = firstDecoration(
    brutalCues,
    (decoration) =>
      decoration.kind === 'impact' &&
      decoration.key === 'effect:tibia:hit-area' &&
      decoration.stronger === true,
    'the brutal-strike impact',
  );
  expect(brutalImpact.position).not.toBeNull();
  expect(
    brutalStrike.commands.some(
      (command) =>
        command.type === 'actor/cast-ability' && command.abilityIndex === 1,
    ),
  ).toBe(true);
  // `stronger` is what separates the empowered strike from an ordinary swing,
  // and the contrast is with the basic attack rather than with the same tile:
  // the auto-attack loop keeps hitting that creature throughout, so a plain
  // impact landing there too is the system working, not a missing distinction.
  expect(brutalImpact.stronger).toBe(true);
  expect(attackImpact.stronger).toBe(false);

  // --- nothing was drawn from a missing asset, and nothing errored ---------
  for (const snapshot of [
    attack,
    death,
    berserk,
    woundCleansing,
    brutalStrike,
  ]) {
    expect(snapshot.unresolvedCombatAssetKeys).toEqual([]);
  }
  expect(watch.consoleErrors).toEqual([]);
  expect(watch.pageErrors).toEqual([]);
  expect(watch.failedRequests).toEqual([]);
  expect(watch.badResponses).toEqual([]);
});
