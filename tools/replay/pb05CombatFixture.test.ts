import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  CharacterDefinitionSchema,
  createEntityId,
  createSeed,
  createTickIndex,
  type Direction,
  type GridPosition,
  type KernelScenario,
  RuntimeContentBundleSchema,
  SIMULATION_RULES_VERSION,
  type SimulationEvent,
  validateKernelScenario,
} from '../../packages/contracts/src/index.ts';
import {
  createSimulationKernel,
  decodeCommandLog,
  encodeCanonicalJson,
} from '../../packages/simulation/src/index.ts';
import {
  buildPb05HuntScenario,
  characterFromPb05Selection,
  composePb05CombatSession,
  PB05_COMBAT_SEED,
  PB05_COMBAT_TICK_COUNT,
  sessionCoverage,
} from './generatePb05CombatFixture.ts';
import { buildReplayArtifacts } from './replayArtifacts.ts';

const fixtureRoot = resolve(
  import.meta.dirname,
  '../../packages/test-fixtures/hunt/pb05',
);

/** Ticks between sampled resume points when the sweep is not exhaustive. */
const CONVERGENCE_STRIDE_TICKS = 150;

/**
 * Resume points the convergence sweep checks.
 *
 * The sweep is quadratic: every boundary replays the whole session. That was
 * affordable while the fixture was stale — on `c23c819`, with the fixture as
 * committed, the entire `tools/replay` suite including the exhaustive sweep
 * ran in 73 s against a 360 s ceiling.
 *
 * Recomposing the fixture is what changed the arithmetic, and recomposing was
 * not optional: the PB-06 save golden derives its session snapshot from this
 * scenario, and it was referencing spawn slot `(4, 1)`, which the denser cave
 * no longer declares, so every resume test failed. Recomposition also picks up
 * `rotworm.aggroRadius` 11, the value the game has composed since `db04d9d`,
 * so every rotworm now chases. Measured on an idle machine, the exhaustive
 * sweep then runs past 600 s and blows the ceiling.
 *
 * So the trade is not "sample the sweep to afford a denser cave" — the denser
 * cave alone left the sweep comfortably green. It is "sample the sweep as the
 * price of a fixture that matches the game", which is the honest framing and
 * the worse-sounding one.
 *
 * What the sweep proves is that a snapshot round-trip loses nothing, and the
 * boundaries that can expose a loss sit next to state transitions: a death, a
 * spawn, the ends of the run. Those are checked exhaustively with their
 * neighbours, plus a fixed stride so long quiet stretches are not skipped.
 * That is 117 boundaries, and it found the same zero divergences a partial
 * exhaustive run had found before it was cut short.
 *
 * Set `HUNTBOUND_EXHAUSTIVE_REPLAY=1` to restore the every-tick sweep before
 * closing a playbook, when the wall time is affordable.
 */
function convergenceBoundaries(
  events: readonly SimulationEvent[],
): readonly number[] {
  if (process.env.HUNTBOUND_EXHAUSTIVE_REPLAY === '1') {
    return Array.from({ length: PB05_COMBAT_TICK_COUNT + 1 }, (_, i) => i);
  }

  const boundaries = new Set<number>([
    0,
    1,
    PB05_COMBAT_TICK_COUNT - 1,
    PB05_COMBAT_TICK_COUNT,
  ]);

  for (const event of events) {
    if (
      event.payload.type !== 'actor/died' &&
      event.payload.type !== 'actor/spawned'
    ) {
      continue;
    }
    for (const offset of [-1, 0, 1]) {
      const tick = event.tick + offset;
      if (tick >= 0 && tick <= PB05_COMBAT_TICK_COUNT) boundaries.add(tick);
    }
  }

  for (
    let tick = 0;
    tick <= PB05_COMBAT_TICK_COUNT;
    tick += CONVERGENCE_STRIDE_TICKS
  ) {
    boundaries.add(tick);
  }

  return [...boundaries].sort((left, right) => left - right);
}

const REQUIRED_COVERAGE = {
  attacked: true,
  damagedAttack: true,
  damagedAbility: true,
  playerReceivedDamage: true,
  healed: true,
  castBerserk: true,
  castBrutalStrike: true,
  castWoundCleansing: true,
  targetChanged: true,
  died: true,
  lootGranted: true,
  respawnAfterDeath: true,
  combatRejected: true,
} as const;

interface Fixture {
  readonly scenarioText: string;
  readonly logText: string;
  readonly snapshotText: string;
  readonly eventsText: string;
}

async function readFixture(): Promise<Fixture> {
  const [scenarioText, logText, snapshotText, eventsText] = await Promise.all([
    readFile(resolve(fixtureRoot, 'scenario.json'), 'utf8'),
    readFile(resolve(fixtureRoot, 'commands.jsonl'), 'utf8'),
    readFile(resolve(fixtureRoot, 'snapshot.golden.json'), 'utf8'),
    readFile(resolve(fixtureRoot, 'events.golden.jsonl'), 'utf8'),
  ]);
  return { scenarioText, logText, snapshotText, eventsText };
}

function parsedEvents(text: string): readonly SimulationEvent[] {
  return text
    .trimEnd()
    .split('\n')
    .map((line) => JSON.parse(line) as SimulationEvent);
}

function castAbility(abilityIndex: number, targetEntityId: number | null) {
  return {
    tick: createTickIndex(0),
    issuer: 'player' as const,
    command: {
      type: 'actor/cast-ability' as const,
      entityId: createEntityId(1),
      abilityIndex,
      targetEntityId:
        targetEntityId === null ? null : createEntityId(targetEntityId),
    },
  };
}

function targetPositionAtDistance(
  scenario: KernelScenario,
  distance: number,
): GridPosition {
  const player = scenario.initialActors.find(
    (actor) => actor.blueprintId === 'player',
  );
  if (player === undefined) throw new Error('Scenario is missing its player');
  const floor = scenario.floors.find((entry) => entry.z === player.position.z);
  if (floor === undefined) throw new Error('Scenario is missing player floor');
  const blocked = new Set(floor.blockedTiles.map(([x, y]) => `${x}:${y}`));
  const candidates: GridPosition[] = [];
  for (
    let y = player.position.y - distance;
    y <= player.position.y + distance;
    y += 1
  ) {
    for (
      let x = player.position.x - distance;
      x <= player.position.x + distance;
      x += 1
    ) {
      if (
        Math.max(
          Math.abs(x - player.position.x),
          Math.abs(y - player.position.y),
        ) === distance
      ) {
        candidates.push({ x, y });
      }
    }
  }
  const candidate = candidates.find(
    ({ x, y }) =>
      x >= 0 &&
      x < scenario.width &&
      y >= 0 &&
      y < scenario.height &&
      !blocked.has(`${x}:${y}`),
  );
  if (candidate === undefined) {
    throw new Error(`No open target at distance ${distance}`);
  }
  return { ...candidate, z: player.position.z };
}

function scenarioWithInertTarget(
  scenario: KernelScenario,
  targetPosition: GridPosition,
): KernelScenario {
  const player = scenario.initialActors.find(
    (actor) => actor.blueprintId === 'player',
  );
  if (player === undefined) throw new Error('Scenario is missing its player');
  return {
    ...scenario,
    spawnGroups: [],
    blueprints: scenario.blueprints.map((blueprint) =>
      blueprint.blueprintId === 'rotworm'
        ? { ...blueprint, behavior: 'inert' as const }
        : blueprint,
    ),
    initialActors: [
      player,
      { blueprintId: 'rotworm', position: targetPosition, facing: 'w' },
    ],
  };
}

function solitaryPlayer(scenario: KernelScenario): KernelScenario {
  const player = scenario.initialActors.find(
    (actor) => actor.blueprintId === 'player',
  );
  if (player === undefined) throw new Error('Scenario is missing its player');
  return {
    ...scenario,
    spawnGroups: [],
    initialActors: [player],
  };
}

function playerOf(kernel: ReturnType<typeof createSimulationKernel>) {
  const player = kernel
    .state()
    .actors.find((actor) => actor.blueprintId === 'player');
  if (player === undefined) throw new Error('Player actor missing');
  return player;
}

function openStepDirection(
  scenario: KernelScenario,
  kernel: ReturnType<typeof createSimulationKernel>,
): Direction {
  const player = playerOf(kernel);
  const floor = scenario.floors.find((entry) => entry.z === player.position.z);
  if (floor === undefined) throw new Error('Scenario is missing player floor');
  const blocked = new Set(floor.blockedTiles.map(([x, y]) => `${x}:${y}`));
  const occupied = new Set(
    kernel
      .state()
      .actors.map((actor) => `${actor.position.x}:${actor.position.y}`),
  );
  const candidates: readonly (readonly [Direction, number, number])[] = [
    ['e', 1, 0],
    ['w', -1, 0],
    ['s', 0, 1],
    ['n', 0, -1],
  ];
  const open = candidates.find(([_, dx, dy]) => {
    const x = player.position.x + dx;
    const y = player.position.y + dy;
    return (
      x >= 0 &&
      x < scenario.width &&
      y >= 0 &&
      y < scenario.height &&
      !blocked.has(`${x}:${y}`) &&
      !occupied.has(`${x}:${y}`)
    );
  });
  if (open === undefined) {
    throw new Error('No open cardinal step from the player');
  }
  return open[0];
}

function movePlayer(direction: Direction, tick = 0) {
  return {
    tick: createTickIndex(tick),
    issuer: 'player' as const,
    command: {
      type: 'actor/move-step' as const,
      entityId: createEntityId(1),
      direction,
    },
  };
}

function targetDamaged(events: readonly SimulationEvent[]): boolean {
  return events.some(
    (event) =>
      event.payload.type === 'combat/damaged' &&
      event.payload.entityId === createEntityId(2),
  );
}

describe('PB-08-04 Knight damage rotation', () => {
  it('composes the five spell abilities plus the two knight postures and Challenge', async () => {
    const session = await composePb05CombatSession();
    const player = session.scenario.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );

    expect(
      session.scenario.abilities.map((ability) => ability.abilityId),
    ).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
      'blood-rage',
      'protector',
      'challenge',
      'haste',
    ]);
    expect(player?.abilityIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(player?.attackSkillIndex).toBe(2);
    expect(session.scenario.conditions).toEqual([
      {
        conditionId: 'blood-rage',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: 2,
        skillModifierPermille: 250,
        damageDealtPermille: 0,
        damageReceivedPermille: 150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
      {
        conditionId: 'protector',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: null,
        skillModifierPermille: 0,
        damageDealtPermille: -150,
        damageReceivedPermille: -150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
      {
        conditionId: 'haste',
        exclusivityGroup: null,
        durationTicks: 600,
        skillIndex: null,
        skillModifierPermille: 0,
        damageDealtPermille: 0,
        damageReceivedPermille: 0,
        speedPermille: 191,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
    ]);
  });

  it('lets Groundshaker hit three tiles while Berserk stops at one', async () => {
    const scenario = await buildPb05HuntScenario();
    const target = targetPositionAtDistance(scenario, 3);
    const testScenario = scenarioWithInertTarget(scenario, target);

    const berserk = createSimulationKernel(
      testScenario,
      createSeed('b8080400000001aa'),
    );
    berserk.enqueue(castAbility(0, null));
    expect(targetDamaged(berserk.advanceOne())).toBe(false);

    const groundshaker = createSimulationKernel(
      testScenario,
      createSeed('b8080400000001bb'),
    );
    groundshaker.enqueue(castAbility(3, null));
    expect(targetDamaged(groundshaker.advanceOne())).toBe(true);
  });

  it('lets Whirlwind Throw hit a target five tiles away', async () => {
    const scenario = await buildPb05HuntScenario();
    const target = targetPositionAtDistance(scenario, 5);
    const kernel = createSimulationKernel(
      scenarioWithInertTarget(scenario, target),
      createSeed('b8080400000001cc'),
    );

    kernel.enqueue(castAbility(4, 2));

    expect(targetDamaged(kernel.advanceOne())).toBe(true);
  });
});

describe('PB-08-07 Haste', () => {
  const HASTE_DURATION_TICKS = 600;
  const HASTE_STEP_TICKS = 9;
  const BASE_STEP_TICKS = 11;

  async function solitaryHasteKernel() {
    const scenario = solitaryPlayer(await buildPb05HuntScenario());
    const hasteIndex = scenario.abilities.findIndex(
      (ability) => ability.abilityId === 'haste',
    );
    const hasteConditionIndex = scenario.conditions.findIndex(
      (condition) => condition.conditionId === 'haste',
    );
    const kernel = createSimulationKernel(
      scenario,
      createSeed('b8080700000001aa'),
    );
    return { scenario, kernel, hasteIndex, hasteConditionIndex };
  }

  it('shortens the player step cooldown while Haste is active', async () => {
    const { scenario, kernel, hasteIndex, hasteConditionIndex } =
      await solitaryHasteKernel();
    expect(hasteIndex).toBe(8);
    expect(hasteConditionIndex).toBe(2);
    expect(
      scenario.blueprints.find(
        (blueprint) => blueprint.blueprintId === 'player',
      )?.stepCooldownTicks,
    ).toBe(BASE_STEP_TICKS);

    kernel.enqueue(castAbility(hasteIndex, null));
    kernel.advanceOne();
    expect(playerOf(kernel).activeConditions).toEqual([
      {
        conditionIndex: hasteConditionIndex,
        expiresAtTick: HASTE_DURATION_TICKS,
        exclusivityGroup: null,
      },
    ]);

    const direction = openStepDirection(scenario, kernel);
    kernel.enqueue(movePlayer(direction, kernel.tick));
    const events = kernel.advanceOne();
    const moved = events.find((event) => event.payload.type === 'actor/moved');
    expect(moved).toBeDefined();
    expect(playerOf(kernel).readyAtTick).toBe(
      (moved?.tick ?? 0) + HASTE_STEP_TICKS,
    );
  });

  it('expires Haste on the absolute tick, living on the tick before and gone on it', async () => {
    const { kernel, hasteIndex, hasteConditionIndex } =
      await solitaryHasteKernel();
    expect(hasteIndex).not.toBe(-1);

    kernel.enqueue(castAbility(hasteIndex, null));
    kernel.advanceOne();
    expect(playerOf(kernel).activeConditions).toEqual([
      {
        conditionIndex: hasteConditionIndex,
        expiresAtTick: HASTE_DURATION_TICKS,
        exclusivityGroup: null,
      },
    ]);

    kernel.advance(HASTE_DURATION_TICKS - 1);
    expect(playerOf(kernel).activeConditions).toHaveLength(1);

    kernel.advanceOne();
    expect(playerOf(kernel).activeConditions).toEqual([]);
  });

  it('keeps the original step for an actor that never received Haste', async () => {
    const { scenario, kernel } = await solitaryHasteKernel();
    expect(
      scenario.blueprints.find(
        (blueprint) => blueprint.blueprintId === 'rotworm',
      )?.stepCooldownTicks,
    ).toBe(21);

    const direction = openStepDirection(scenario, kernel);
    kernel.enqueue(movePlayer(direction));
    const events = kernel.advanceOne();
    const moved = events.find((event) => event.payload.type === 'actor/moved');
    expect(moved).toBeDefined();
    expect(playerOf(kernel).readyAtTick).toBe(
      (moved?.tick ?? 0) + BASE_STEP_TICKS,
    );
    expect(playerOf(kernel).activeConditions).toEqual([]);
  });
});

describe('PB-05 combat session coverage', () => {
  it('feeds the PB-05 character kit into the combat composer', async () => {
    const [catalogText, selectionText] = await Promise.all([
      readFile(
        resolve(
          fixtureRoot,
          '../../../content/src/generated/pb-01-contract-coverage.json',
        ),
        'utf8',
      ),
      readFile(
        resolve(
          fixtureRoot,
          '../../../content/src/selections/pb-05-knight-combat.json',
        ),
        'utf8',
      ),
    ]);
    const runtime = RuntimeContentBundleSchema.parse(
      JSON.parse(catalogText) as unknown,
    );
    const selection = JSON.parse(selectionText) as unknown;
    const character = characterFromPb05Selection(runtime, selection);

    expect(CharacterDefinitionSchema.safeParse(character).success).toBe(true);
    expect(character.spellKeys).toBeUndefined();
    expect(character.kit).toEqual([
      {
        minLevel: 1,
        maxLevel: null,
        spellKeys: [
          'spell:tibia:berserk',
          'spell:tibia:brutal-strike',
          'spell:tibia:wound-cleansing',
          'spell:tibia:groundshaker',
          'spell:tibia:whirlwind-throw',
          'spell:tibia:challenge',
          'spell:tibia:haste',
        ],
      },
    ]);
  });

  it('exercises every required combat event on the real hunt scenario', async () => {
    const session = await composePb05CombatSession();
    const scenario = validateKernelScenario(
      JSON.parse(session.scenarioText) as unknown,
    );
    const log = decodeCommandLog(session.logText);

    expect(scenario.ok).toBe(true);
    expect(log.ok).toBe(true);
    if (!scenario.ok || !log.ok) {
      return;
    }

    expect(log.value.header).toMatchObject({
      scenarioId: 'scenario:hunt:tibia:venore-rotworm-cave',
      seed: PB05_COMBAT_SEED,
      tickCount: PB05_COMBAT_TICK_COUNT,
    });
    expect(
      log.value.commands.every((command) => command.issuer === 'player'),
    ).toBe(true);
    expect(session.coverage).toEqual(REQUIRED_COVERAGE);
  }, 30_000);
});

describe('PB-05 combat replay fixture', () => {
  it('freezes the composed hunt scenario and the 2700-tick command header', async () => {
    const fixture = await readFixture();
    const scenario = validateKernelScenario(
      JSON.parse(fixture.scenarioText) as unknown,
    );
    const log = decodeCommandLog(fixture.logText);

    expect(scenario.ok).toBe(true);
    expect(log.ok).toBe(true);
    if (!scenario.ok || !log.ok) {
      return;
    }

    expect(log.value.header).toMatchObject({
      scenarioId: 'scenario:hunt:tibia:venore-rotworm-cave',
      seed: PB05_COMBAT_SEED,
      tickCount: PB05_COMBAT_TICK_COUNT,
      scenarioRevision: 2,
    });
    expect(
      scenario.value.abilities.map((ability) => ability.abilityId),
    ).toEqual([
      'berserk',
      'brutal-strike',
      'wound-cleansing',
      'groundshaker',
      'whirlwind-throw',
      'blood-rage',
      'protector',
      'challenge',
      'haste',
    ]);
    const player = scenario.value.blueprints.find(
      (blueprint) => blueprint.blueprintId === 'player',
    );
    expect(player?.abilityIndices).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(player?.attackSkillIndex).toBe(2);
    expect(scenario.value.conditions).toEqual([
      {
        conditionId: 'blood-rage',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: 2,
        skillModifierPermille: 250,
        damageDealtPermille: 0,
        damageReceivedPermille: 150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
      {
        conditionId: 'protector',
        exclusivityGroup: 1,
        durationTicks: 0,
        skillIndex: null,
        skillModifierPermille: 0,
        damageDealtPermille: -150,
        damageReceivedPermille: -150,
        speedPermille: 0,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
      {
        conditionId: 'haste',
        exclusivityGroup: null,
        durationTicks: 600,
        skillIndex: null,
        skillModifierPermille: 0,
        damageDealtPermille: 0,
        damageReceivedPermille: 0,
        speedPermille: 191,
        manaShield: false,
        tickDamageAmount: 0,
        tickDamageIntervalTicks: 0,
        elementBonusPermille: 0,
        convertNextAbilityElement: false,
        bonusElement: null,
      },
    ]);
    expect(
      log.value.commands.every((command) => command.issuer === 'player'),
    ).toBe(true);
    expect(
      log.value.commands
        .filter((command) => command.command.type === 'actor/cast-ability')
        .map((command) => command.command.abilityIndex),
    ).not.toContain(5);
    expect(
      log.value.commands
        .filter((command) => command.command.type === 'actor/cast-ability')
        .map((command) => command.command.abilityIndex),
    ).not.toContain(6);
    expect(
      log.value.commands
        .filter((command) => command.command.type === 'actor/cast-ability')
        .map((command) => command.command.abilityIndex),
    ).not.toContain(8);
    // `CANARY_VIEW_RANGE_TILES`, which is what `composeCreature` gives any
    // creature that has an attack. This asserted `1` until 2026-08-23, frozen
    // from before `db04d9d` raised acquisition to Canary's view range; the
    // committed fixture kept the stale `1` because `combat:check` compares
    // bytes to published hashes and never recomposes.
    expect(
      scenario.value.blueprints.find(
        (blueprint) => blueprint.blueprintId === 'rotworm',
      )?.aggroRadius,
    ).toBe(11);
  });

  it('proves combat coverage on the committed journal before trusting the golden', async () => {
    const fixture = await readFixture();
    const built = buildReplayArtifacts(fixture.scenarioText, fixture.logText);
    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    const events = parsedEvents(built.value.eventsText);
    expect(JSON.parse(built.value.snapshotText).tick).toBe(
      PB05_COMBAT_TICK_COUNT,
    );
    expect(sessionCoverage(events)).toEqual(REQUIRED_COVERAGE);
  });

  // Cold main took >191 s without diverging; the worktree finished in 53–108 s.
  it('reproduces the committed goldens and converges at every boundary', async () => {
    const fixture = await readFixture();
    const straight = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText,
    );
    expect(straight.ok).toBe(true);
    if (!straight.ok) {
      return;
    }
    expect(straight.value.snapshotText).toBe(fixture.snapshotText);
    expect(straight.value.eventsText).toBe(fixture.eventsText);

    const divergent: number[] = [];
    for (const boundary of convergenceBoundaries(
      parsedEvents(straight.value.eventsText),
    )) {
      const split = buildReplayArtifacts(
        fixture.scenarioText,
        fixture.logText,
        {
          resumeAtTick: boundary,
        },
      );
      if (
        !split.ok ||
        split.value.snapshotText !== straight.value.snapshotText ||
        split.value.eventsText !== straight.value.eventsText
      ) {
        divergent.push(boundary);
      }
    }
    expect(divergent).toEqual([]);
  }, 360_000);

  it('distinguishes seed, command, and rules-version changes', async () => {
    const fixture = await readFixture();
    const baseline = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText,
    );
    expect(baseline.ok).toBe(true);
    if (!baseline.ok) {
      return;
    }

    const changedSeed = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(PB05_COMBAT_SEED, '2c3d4e5f60718294'),
    );
    expect(changedSeed.ok).toBe(true);
    if (changedSeed.ok) {
      expect(changedSeed.value.snapshotText).not.toBe(
        baseline.value.snapshotText,
      );
      expect(changedSeed.value.eventsText).not.toBe(baseline.value.eventsText);
    }

    const changedCommand = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(
        '"direction":"sw","entityId":1},"sequence":2,"tick":1',
        '"direction":"se","entityId":1},"sequence":2,"tick":1',
      ),
    );
    expect(changedCommand.ok).toBe(true);
    if (changedCommand.ok) {
      expect(changedCommand.value.snapshotText).not.toBe(
        baseline.value.snapshotText,
      );
      expect(changedCommand.value.eventsText).not.toBe(
        baseline.value.eventsText,
      );
    }

    const changedRules = buildReplayArtifacts(
      fixture.scenarioText,
      fixture.logText.replace(
        `"rulesVersion":${SIMULATION_RULES_VERSION}`,
        `"rulesVersion":${SIMULATION_RULES_VERSION + 1}`,
      ),
    );
    expect(changedRules.ok).toBe(false);
  });

  it('keeps scenario JSON canonical', async () => {
    const fixture = await readFixture();
    expect(fixture.scenarioText).toBe(
      `${encodeCanonicalJson(JSON.parse(fixture.scenarioText))}\n`,
    );
  });
});
