import {
  createEntityId,
  type KernelScenario,
  type SimulationSnapshot,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { encodeCanonicalJson } from '../state/canonicalJson.ts';
import { restoreSimulationKernel, snapshotKernel } from '../state/snapshot.ts';
import { createSimulationKernel } from './index.ts';
import {
  at,
  combatNeutralBlueprint,
  despawnActor,
  kernelScenario,
  moveStep,
  payloadsOfType,
  singleFloor,
  TEST_SEED,
  TEST_Z_BELOW,
  twoFloors,
} from './testScenarios.ts';

function streamDrawCount(snapshot: SimulationSnapshot, label: string): number {
  return (
    snapshot.randomStreams.find((stream) => stream.label === label)
      ?.drawCount ?? -1
  );
}

function restoredOrThrow(
  scenario: KernelScenario,
  snapshot: SimulationSnapshot,
) {
  const restored = restoreSimulationKernel(scenario, snapshot);
  if (!restored.ok) {
    throw new Error(
      `restore failed: ${restored.diagnostics.map((item) => item.code).join(', ')}`,
    );
  }
  return restored.value;
}

function hunterBlueprint(
  overrides: Parameters<typeof combatNeutralBlueprint>[3] = {},
) {
  return combatNeutralBlueprint('hunter', 3, 'hunter', {
    factionId: 2,
    aggroRadius: 5,
    maxHealth: 20,
    attackCooldownTicks: 3,
    attackMinDamage: 4,
    attackMaxDamage: 4,
    ...overrides,
  });
}

function preyBlueprint(blueprintId = 'prey') {
  return combatNeutralBlueprint(blueprintId, 2, 'inert', {
    factionId: 1,
    maxHealth: 20,
  });
}

function hunterScenario(overrides: Partial<KernelScenario> = {}) {
  return kernelScenario({
    scenarioId: 'hunter-ai-test',
    blueprints: [
      hunterBlueprint(),
      preyBlueprint(),
      combatNeutralBlueprint('ally', 2, 'inert', {
        factionId: 2,
        maxHealth: 10,
      }),
      preyBlueprint('prey-b'),
    ],
    ...overrides,
  });
}

function hunterOf(kernel: ReturnType<typeof createSimulationKernel>) {
  return kernel.state().actors.find((actor) => actor.blueprintId === 'hunter');
}

describe('S6 hunter target acquisition', () => {
  it('acquires the nearest living actor of another faction by Chebyshev distance', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(3, 3), facing: 'n' },
        { blueprintId: 'prey', position: at(3, 6), facing: 's' },
        { blueprintId: 'prey-b', position: at(5, 3), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const events = kernel.advanceOne();

    expect(hunterOf(kernel)?.targetEntityId).toBe(3);
    expect(payloadsOfType(events, 'combat/target-changed')).toEqual([
      { type: 'combat/target-changed', entityId: 1, targetEntityId: 3 },
    ]);
  });

  it('breaks a Chebyshev tie by choosing the smaller EntityId', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(3, 3), facing: 'n' },
        { blueprintId: 'prey', position: at(5, 3), facing: 'w' },
        { blueprintId: 'prey-b', position: at(3, 1), facing: 's' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(hunterOf(kernel)?.targetEntityId).toBe(2);
  });

  it('ignores an actor of the same faction even when closer', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(3, 3), facing: 'n' },
        { blueprintId: 'ally', position: at(4, 3), facing: 'w' },
        { blueprintId: 'prey', position: at(6, 3), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(hunterOf(kernel)?.targetEntityId).toBe(3);
  });

  it('ignores an actor on another floor even when (x, y) is inside the radius', () => {
    const scenario = hunterScenario({
      floors: twoFloors(),
      initialActors: [
        { blueprintId: 'hunter', position: at(3, 3), facing: 'n' },
        {
          blueprintId: 'prey',
          position: at(3, 3, TEST_Z_BELOW),
          facing: 's',
        },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(hunterOf(kernel)?.targetEntityId).toBeNull();
  });

  it('ignores an actor outside the Chebyshev aggro radius', () => {
    const scenario = hunterScenario({
      blueprints: [hunterBlueprint({ aggroRadius: 2 }), preyBlueprint()],
      initialActors: [
        { blueprintId: 'hunter', position: at(1, 1), facing: 'n' },
        { blueprintId: 'prey', position: at(5, 1), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(hunterOf(kernel)?.targetEntityId).toBeNull();
  });

  it('never acquires a target when aggroRadius is 0', () => {
    const scenario = hunterScenario({
      blueprints: [hunterBlueprint({ aggroRadius: 0 }), preyBlueprint()],
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const events = kernel.advanceOne();

    expect(hunterOf(kernel)?.targetEntityId).toBeNull();
    expect(payloadsOfType(events, 'combat/target-changed')).toEqual([]);
  });

  it('does not consume the ai stream when it acquires a target', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(5, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(hunterOf(kernel)?.targetEntityId).toBe(2);
    expect(streamDrawCount(snapshotKernel(kernel), 'ai')).toBe(0);
  });

  it('emits combat/target-changed when the current target leaves the radius', () => {
    const scenario = hunterScenario({
      blueprints: [hunterBlueprint({ aggroRadius: 3 }), preyBlueprint()],
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(4, 2), facing: 'e' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    expect(hunterOf(kernel)?.targetEntityId).toBe(2);

    const snapshot = snapshotKernel(kernel);
    const restored = restoredOrThrow(scenario, {
      ...snapshot,
      pendingIntents: [],
      actors: snapshot.actors.map((actor) =>
        actor.entityId === 2 ? { ...actor, position: at(7, 2) } : actor,
      ),
    });
    const dropped = restored.advanceOne();

    expect(hunterOf(restored)?.targetEntityId).toBeNull();
    expect(payloadsOfType(dropped, 'combat/target-changed')).toEqual([
      { type: 'combat/target-changed', entityId: 1, targetEntityId: null },
    ]);
  });
});

describe('S6 hunter chase', () => {
  it('queues a north-east greedy step for a target to the north-east', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 3), facing: 'n' },
        { blueprintId: 'prey', position: at(4, 1), facing: 's' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const firstTick = kernel.advanceOne();

    expect(payloadsOfType(firstTick, 'actor/moved')).toEqual([]);
    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { kind: 'move', tick: 1, entityId: 1, direction: 'ne' },
    ]);

    const secondTick = kernel.advanceOne();
    expect(payloadsOfType(secondTick, 'actor/moved')).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(2, 3),
        to: at(3, 2),
        facing: 'ne',
      },
    ]);
  });

  it('queues a north greedy step when the target is exactly north', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 3), facing: 'n' },
        { blueprintId: 'prey', position: at(2, 1), facing: 's' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { kind: 'move', tick: 1, entityId: 1, direction: 'n' },
    ]);
  });

  it('walks around a wall that sits on the greedy path', () => {
    const scenario = hunterScenario({
      floors: singleFloor([[2, 2]]),
      initialActors: [
        { blueprintId: 'hunter', position: at(1, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(4, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { kind: 'move', tick: 1, entityId: 1, direction: 'n' },
    ]);

    const secondTick = kernel.advanceOne();
    expect(payloadsOfType(secondTick, 'actor/moved')).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(1, 2),
        to: at(1, 1),
        facing: 'n',
      },
    ]);
    expect(payloadsOfType(secondTick, 'actor/move-blocked')).toEqual([]);

    kernel.advance(20);
    expect(hunterOf(kernel)?.position).not.toEqual(at(1, 2));
  });

  it('falls back to a greedy step when BFS finds no path', () => {
    const scenario = hunterScenario({
      floors: singleFloor([
        [0, 1],
        [1, 1],
        [2, 1],
        [0, 2],
        [2, 2],
        [0, 3],
        [1, 3],
        [2, 3],
      ]),
      initialActors: [
        { blueprintId: 'hunter', position: at(1, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(4, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const secondTick = kernel.advanceOne();

    expect(payloadsOfType(secondTick, 'actor/moved')).toEqual([]);
    expect(payloadsOfType(secondTick, 'actor/move-blocked')).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: at(2, 2),
        reason: 'terrain',
      },
    ]);
  });

  it('does not consume the ai stream while chasing', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(1, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(5, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advance(6);

    expect(hunterOf(kernel)?.targetEntityId).toBe(2);
    expect(streamDrawCount(snapshotKernel(kernel), 'ai')).toBe(0);
  });
});

describe('S6 hunter strike', () => {
  it('queues an attack for the next tick when the target is adjacent, not a step', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    const firstTick = kernel.advanceOne();

    expect(payloadsOfType(firstTick, 'actor/moved')).toEqual([]);
    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { kind: 'attack', tick: 1, entityId: 1, targetEntityId: 2 },
    ]);
  });

  it('resolves the queued attack in S4 on the next tick and honours attackReadyAtTick', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();

    const strike = kernel.advanceOne();
    expect(payloadsOfType(strike, 'combat/attacked')).toEqual([
      { type: 'combat/attacked', entityId: 1, targetEntityId: 2 },
    ]);
    expect(payloadsOfType(strike, 'combat/damaged')).toEqual([
      {
        type: 'combat/damaged',
        entityId: 2,
        sourceEntityId: 1,
        amount: 4,
        remainingHealth: 16,
        cause: 'attack',
      },
    ]);
    expect(hunterOf(kernel)?.attackReadyAtTick).toBe(4);

    expect(payloadsOfType(kernel.advanceOne(), 'combat/attacked')).toEqual([]);
    expect(payloadsOfType(kernel.advanceOne(), 'combat/attacked')).toEqual([]);
    expect(payloadsOfType(kernel.advanceOne(), 'combat/attacked')).toEqual([
      { type: 'combat/attacked', entityId: 1, targetEntityId: 2 },
    ]);
  });

  it('does not strike or reject when the target dies before the attack resolves', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { kind: 'attack', tick: 1, entityId: 1, targetEntityId: 2 },
    ]);

    kernel.enqueue(despawnActor(2, 1));
    const events = kernel.advanceOne();

    expect(payloadsOfType(events, 'combat/attacked')).toEqual([]);
    expect(payloadsOfType(events, 'combat/damaged')).toEqual([]);
    expect(payloadsOfType(events, 'command/rejected')).toEqual([]);
    expect(payloadsOfType(events, 'actor/despawned')).toEqual([
      { type: 'actor/despawned', entityId: 2 },
    ]);
  });

  it('resumes chasing when the target steps out of melee', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(3, 2), facing: 'e' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { kind: 'attack', tick: 1, entityId: 1, targetEntityId: 2 },
    ]);

    kernel.advanceOne();
    kernel.enqueue(moveStep(2, 'e', 2));
    kernel.advanceOne();

    expect(snapshotKernel(kernel).pendingIntents).toEqual([
      { kind: 'move', tick: 3, entityId: 1, direction: 'ne' },
    ]);
  });

  it('doubles the step cost while the hunter is already next to its target', () => {
    const scenario = hunterScenario({
      initialActors: [
        { blueprintId: 'hunter', position: at(2, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(3, 2), facing: 'w' },
      ],
    });
    const kernel = createSimulationKernel(scenario, TEST_SEED);
    kernel.advanceOne();
    const snapshot = snapshotKernel(kernel);
    const restored = restoredOrThrow(scenario, {
      ...snapshot,
      pendingIntents: [
        {
          kind: 'move',
          tick: snapshot.tick,
          entityId: createEntityId(1),
          direction: 'w',
        },
      ],
    });

    restored.advanceOne();

    expect(hunterOf(restored)?.position).toEqual(at(1, 2));
    expect(hunterOf(restored)?.readyAtTick).toBe(snapshot.tick + 6);
  });
});

describe('S6 hunter stream isolation', () => {
  const twoWanderers = kernelScenario({
    initialActors: [
      { blueprintId: 'wanderer', position: at(1, 1), facing: 'n' },
      { blueprintId: 'wanderer', position: at(5, 3), facing: 'n' },
    ],
  });

  it('consumes the ai stream exactly as wander when no actor is a hunter', () => {
    const kernel = createSimulationKernel(twoWanderers, TEST_SEED);
    const events = kernel.advance(9);
    const ai = snapshotKernel(kernel).randomStreams.find(
      (stream) => stream.label === 'ai',
    );

    expect(payloadsOfType(events, 'actor/moved')).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(1, 1),
        to: at(0, 0),
        facing: 'nw',
      },
      {
        type: 'actor/moved',
        entityId: 2,
        from: at(5, 3),
        to: at(6, 4),
        facing: 'se',
      },
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(0, 0),
        to: at(0, 1),
        facing: 's',
      },
      {
        type: 'actor/moved',
        entityId: 2,
        from: at(6, 4),
        to: at(5, 5),
        facing: 'sw',
      },
    ]);
    expect(ai?.drawCount).toBe(4);
  });

  it('consumes exactly one nextBelow(8) per decision when a hunter has no target', () => {
    const wandererScenario = kernelScenario({
      initialActors: [
        { blueprintId: 'wanderer', position: at(3, 3), facing: 'n' },
      ],
    });
    const hunterAlone = hunterScenario({
      blueprints: [hunterBlueprint()],
      initialActors: [
        { blueprintId: 'hunter', position: at(3, 3), facing: 'n' },
      ],
    });
    const wanderer = createSimulationKernel(wandererScenario, TEST_SEED);
    const hunter = createSimulationKernel(hunterAlone, TEST_SEED);
    const wandererEvents = wanderer.advance(9);
    const hunterEvents = hunter.advance(9);

    expect(payloadsOfType(hunterEvents, 'actor/moved')).toEqual(
      payloadsOfType(wandererEvents, 'actor/moved'),
    );
    expect(
      snapshotKernel(hunter).randomStreams.find(
        (stream) => stream.label === 'ai',
      ),
    ).toEqual(
      snapshotKernel(wanderer).randomStreams.find(
        (stream) => stream.label === 'ai',
      ),
    );
    expect(streamDrawCount(snapshotKernel(hunter), 'ai')).toBe(
      streamDrawCount(snapshotKernel(wanderer), 'ai'),
    );
    expect(streamDrawCount(snapshotKernel(hunter), 'ai')).toBeGreaterThan(0);
  });
});

describe('hunter restoration fidelity', () => {
  const SWEEP_TICKS = 16;

  function hunterSweepScenario() {
    return hunterScenario({
      scenarioId: 'hunter-restore-sweep',
      blueprints: [
        combatNeutralBlueprint('hunter', 2, 'hunter', {
          factionId: 2,
          aggroRadius: 6,
          maxHealth: 20,
          attackCooldownTicks: 2,
          attackMinDamage: 10,
          attackMaxDamage: 10,
        }),
        combatNeutralBlueprint('prey', 2, 'inert', {
          factionId: 1,
          maxHealth: 10,
        }),
        combatNeutralBlueprint('prey-b', 2, 'inert', {
          factionId: 1,
          maxHealth: 20,
        }),
      ],
      initialActors: [
        { blueprintId: 'hunter', position: at(1, 2), facing: 'e' },
        { blueprintId: 'prey', position: at(3, 2), facing: 'w' },
        { blueprintId: 'prey-b', position: at(6, 2), facing: 'w' },
      ],
    });
  }

  it('resumes every boundary of a run with chase, target switch and an AI strike', () => {
    const scenario = hunterSweepScenario();
    const straight = createSimulationKernel(scenario, TEST_SEED);
    const straightEvents = straight.advance(SWEEP_TICKS);
    const straightSnapshot = encodeCanonicalJson(snapshotKernel(straight));

    const problems: string[] = [];
    for (let boundary = 0; boundary <= SWEEP_TICKS; boundary += 1) {
      const split = createSimulationKernel(scenario, TEST_SEED);
      const head = split.advance(boundary);
      const resumed = restoredOrThrow(scenario, snapshotKernel(split));
      const tail = resumed.advance(SWEEP_TICKS - boundary);
      if (
        encodeCanonicalJson([...head, ...tail]) !==
        encodeCanonicalJson(straightEvents)
      ) {
        problems.push(`tick ${boundary}: event journal differs`);
      }
      if (encodeCanonicalJson(snapshotKernel(resumed)) !== straightSnapshot) {
        problems.push(`tick ${boundary}: final snapshot differs`);
      }
    }

    expect(problems).toEqual([]);
    expect(
      payloadsOfType(straightEvents, 'actor/moved').length,
    ).toBeGreaterThan(0);
    expect(
      payloadsOfType(straightEvents, 'combat/attacked').length,
    ).toBeGreaterThan(0);
    expect(
      payloadsOfType(straightEvents, 'combat/target-changed').length,
    ).toBeGreaterThan(1);
    expect(payloadsOfType(straightEvents, 'actor/died').length).toBeGreaterThan(
      0,
    );
  });
});
