import type {
  ActorBlueprint,
  KernelScenario,
  RandomStreamState,
  SimulationSnapshot,
} from '@huntbound/contracts';
import { createStreamLabel } from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  attack,
  combatNeutralBlueprint,
  kernelScenario,
  payloadsOfType,
  TEST_SEED,
} from './testScenarios.ts';

type LootEntry = KernelScenario['lootTables'][number]['entries'][number];

const EQUALITY_LOOT_STATE: RandomStreamState = {
  label: createStreamLabel('loot'),
  s0: 1,
  s1: 1,
  s2: 2,
  s3: 3,
  drawCount: 0,
};

const ZERO_LOOT_STATE: RandomStreamState = {
  label: createStreamLabel('loot'),
  s0: 1,
  s1: 0,
  s2: 2,
  s3: 3,
  drawCount: 0,
};

function lootScenario(
  entries: readonly LootEntry[],
  overrides: {
    readonly player?: Partial<ActorBlueprint>;
    readonly target?: Partial<ActorBlueprint>;
  } = {},
): KernelScenario {
  return kernelScenario({
    scenarioId: 'loot-kernel-test',
    lootTables: [{ entries }],
    blueprints: [
      combatNeutralBlueprint('player', 0, 'inert', {
        factionId: 1,
        maxHealth: 10,
        attackMinDamage: 1,
        attackMaxDamage: 1,
        ...overrides.player,
      }),
      combatNeutralBlueprint('rotworm', 0, 'inert', {
        factionId: 2,
        maxHealth: 1,
        lootTableIndex: 0,
        ...overrides.target,
      }),
    ],
    initialActors: [
      { blueprintId: 'player', position: { x: 1, y: 1, z: 7 }, facing: 'e' },
      { blueprintId: 'rotworm', position: { x: 2, y: 1, z: 7 }, facing: 'w' },
    ],
  });
}

function streamDrawCount(snapshot: SimulationSnapshot, label: string): number {
  return (
    snapshot.randomStreams.find((stream) => stream.label === label)
      ?.drawCount ?? -1
  );
}

function restoreWithLootState(
  scenario: KernelScenario,
  lootState: RandomStreamState,
) {
  const initial = snapshotKernel(createSimulationKernel(scenario, TEST_SEED));
  const restored = restoreSimulationKernel(scenario, {
    ...initial,
    randomStreams: initial.randomStreams.map((stream) =>
      stream.label === 'loot' ? lootState : stream,
    ),
  });
  if (!restored.ok) {
    throw new Error(
      `restore failed: ${restored.diagnostics.map((item) => item.code).join(', ')}`,
    );
  }
  return restored.value;
}

function runAttack(
  scenario: KernelScenario,
  attackerEntityId = 1,
  targetEntityId = 2,
) {
  const kernel = createSimulationKernel(scenario, TEST_SEED);
  kernel.enqueue(attack(attackerEntityId, targetEntityId));
  return { events: kernel.advanceOne(), kernel };
}

describe('S5 loot roll', () => {
  it('always grants chance 100000 entries in declaration order', () => {
    const scenario = lootScenario([
      {
        itemIndex: 7,
        chancePerHundredThousand: 100_000,
        minCount: 1,
        maxCount: 1,
      },
      {
        itemIndex: 3,
        chancePerHundredThousand: 100_000,
        minCount: 2,
        maxCount: 2,
      },
    ]);

    const { events, kernel } = runAttack(scenario);

    expect(payloadsOfType(events, 'loot/granted')).toEqual([
      {
        type: 'loot/granted',
        entityId: 1,
        sourceEntityId: 2,
        itemIndex: 7,
        count: 1,
      },
      {
        type: 'loot/granted',
        entityId: 1,
        sourceEntityId: 2,
        itemIndex: 3,
        count: 2,
      },
    ]);
    expect(streamDrawCount(snapshotKernel(kernel), 'loot')).toBe(2);

    const diedIndex = events.findIndex(
      (event) => event.payload.type === 'actor/died',
    );
    expect(diedIndex).toBeGreaterThanOrEqual(0);
    expect(events[diedIndex + 1]?.payload.type).toBe('loot/granted');
    expect(events.every((event) => event.tick === 0)).toBe(true);
  });

  it('uses a strict comparison at the equality boundary', () => {
    const equal = restoreWithLootState(
      lootScenario([
        {
          itemIndex: 1,
          chancePerHundredThousand: 5_760,
          minCount: 1,
          maxCount: 1,
        },
      ]),
      EQUALITY_LOOT_STATE,
    );
    equal.enqueue(attack(1, 2));
    const equalEvents = equal.advanceOne();

    const greater = restoreWithLootState(
      lootScenario([
        {
          itemIndex: 1,
          chancePerHundredThousand: 5_761,
          minCount: 1,
          maxCount: 1,
        },
      ]),
      EQUALITY_LOOT_STATE,
    );
    greater.enqueue(attack(1, 2));
    const greaterEvents = greater.advanceOne();

    expect(payloadsOfType(equalEvents, 'loot/granted')).toEqual([]);
    expect(payloadsOfType(greaterEvents, 'loot/granted')).toHaveLength(1);
  });

  it('grants a chance-one entry only for its corresponding zero draw', () => {
    const kernel = restoreWithLootState(
      lootScenario([
        {
          itemIndex: 4,
          chancePerHundredThousand: 1,
          minCount: 1,
          maxCount: 1,
        },
        {
          itemIndex: 5,
          chancePerHundredThousand: 1,
          minCount: 1,
          maxCount: 1,
        },
      ]),
      ZERO_LOOT_STATE,
    );
    kernel.enqueue(attack(1, 2));

    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'loot/granted')).toEqual([
      {
        type: 'loot/granted',
        entityId: 1,
        sourceEntityId: 2,
        itemIndex: 4,
        count: 1,
      },
    ]);
    expect(streamDrawCount(snapshotKernel(kernel), 'loot')).toBe(2);
  });

  it('consumes one count draw only for a variable count range', () => {
    const { events, kernel } = runAttack(
      lootScenario([
        {
          itemIndex: 8,
          chancePerHundredThousand: 100_000,
          minCount: 2,
          maxCount: 4,
        },
      ]),
    );

    const grant = payloadsOfType(events, 'loot/granted')[0];
    expect(grant?.count).toBeGreaterThanOrEqual(2);
    expect(grant?.count).toBeLessThanOrEqual(4);
    expect(streamDrawCount(snapshotKernel(kernel), 'loot')).toBe(2);
  });

  it('produces the same grants and stream state for the same seed', () => {
    const scenario = lootScenario([
      {
        itemIndex: 8,
        chancePerHundredThousand: 100_000,
        minCount: 2,
        maxCount: 4,
      },
    ]);
    const first = runAttack(scenario);
    const second = runAttack(scenario);

    expect(encodeCanonicalJson(first.events)).toBe(
      encodeCanonicalJson(second.events),
    );
    expect(encodeCanonicalJson(snapshotKernel(first.kernel))).toBe(
      encodeCanonicalJson(snapshotKernel(second.kernel)),
    );
  });
});

describe('S5 loot recipients and no-roll cases', () => {
  it('does not consume loot randomness when the victim has no loot table', () => {
    const { events, kernel } = runAttack(
      lootScenario(
        [
          {
            itemIndex: 1,
            chancePerHundredThousand: 100_000,
            minCount: 1,
            maxCount: 1,
          },
        ],
        { target: { lootTableIndex: null } },
      ),
    );

    expect(payloadsOfType(events, 'loot/granted')).toEqual([]);
    expect(streamDrawCount(snapshotKernel(kernel), 'loot')).toBe(0);
  });

  it('does not consume loot randomness when the victim has no identifiable killer', () => {
    const scenario = lootScenario([
      {
        itemIndex: 1,
        chancePerHundredThousand: 100_000,
        minCount: 1,
        maxCount: 1,
      },
    ]);
    const initial = snapshotKernel(createSimulationKernel(scenario, TEST_SEED));
    const restored = restoreSimulationKernel(scenario, {
      ...initial,
      actors: initial.actors.map((actor) =>
        actor.entityId === 2 ? { ...actor, health: 0 } : actor,
      ),
    });
    if (!restored.ok) {
      throw new Error(
        `restore failed: ${restored.diagnostics.map((item) => item.code).join(', ')}`,
      );
    }

    const events = restored.value.advanceOne();

    expect(payloadsOfType(events, 'actor/died')).toEqual([
      {
        type: 'actor/died',
        entityId: 2,
        killerEntityId: null,
        position: { x: 2, y: 1, z: 7 },
      },
    ]);
    expect(payloadsOfType(events, 'loot/granted')).toEqual([]);
    expect(streamDrawCount(snapshotKernel(restored.value), 'loot')).toBe(0);
  });

  it('does not grant loot when the player dies, even if its blueprint has a table', () => {
    const scenario = lootScenario(
      [
        {
          itemIndex: 1,
          chancePerHundredThousand: 100_000,
          minCount: 1,
          maxCount: 1,
        },
      ],
      {
        player: { maxHealth: 1, lootTableIndex: 0 },
        target: { attackMinDamage: 1, attackMaxDamage: 1 },
      },
    );
    const { events, kernel } = runAttack(scenario, 2, 1);

    expect(payloadsOfType(events, 'actor/died')).toEqual([
      {
        type: 'actor/died',
        entityId: 1,
        killerEntityId: 2,
        position: { x: 1, y: 1, z: 7 },
      },
    ]);
    expect(payloadsOfType(events, 'loot/granted')).toEqual([]);
    expect(streamDrawCount(snapshotKernel(kernel), 'loot')).toBe(0);
  });
});

describe('S5 loot restoration fidelity', () => {
  it('converges at every boundary without adding loot to the snapshot', () => {
    const scenario = lootScenario([
      {
        itemIndex: 1,
        chancePerHundredThousand: 100_000,
        minCount: 1,
        maxCount: 1,
      },
      {
        itemIndex: 2,
        chancePerHundredThousand: 100_000,
        minCount: 2,
        maxCount: 4,
      },
    ]);
    const totalTicks = 3;
    const straight = createSimulationKernel(scenario, TEST_SEED);
    straight.enqueue(attack(1, 2));
    const straightEvents = straight.advance(totalTicks);
    const straightSnapshot = encodeCanonicalJson(snapshotKernel(straight));

    const problems: string[] = [];
    for (let boundary = 0; boundary <= totalTicks; boundary += 1) {
      const split = createSimulationKernel(scenario, TEST_SEED);
      split.enqueue(attack(1, 2));
      const head = split.advance(boundary);
      const snapshot = snapshotKernel(split);
      const restored = restoreSimulationKernel(scenario, snapshot);
      if (!restored.ok) {
        problems.push(
          `tick ${boundary}: restore failed: ${restored.diagnostics.map((item) => item.code).join(', ')}`,
        );
        continue;
      }
      const tail = restored.value.advance(totalTicks - boundary);

      if (
        encodeCanonicalJson([...head, ...tail]) !==
        encodeCanonicalJson(straightEvents)
      ) {
        problems.push(`tick ${boundary}: event journal differs`);
      }
      if (
        encodeCanonicalJson(snapshotKernel(restored.value)) !== straightSnapshot
      ) {
        problems.push(`tick ${boundary}: final snapshot differs`);
      }
    }

    expect(problems).toEqual([]);
    expect(streamDrawCount(snapshotKernel(straight), 'loot')).toBe(3);
    expect(Object.keys(snapshotKernel(straight)).sort()).not.toContain(
      'runBag',
    );
  });
});
