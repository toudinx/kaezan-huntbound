import { describe, expect, it } from 'vitest';

import { createSimulationKernel } from './index.ts';
import {
  at,
  despawnActor,
  face,
  kernelScenario,
  moveStep,
  payloads,
  singleFloor,
  spawnActor,
  TEST_SEED,
  wait,
} from './testScenarios.ts';

const scenario = kernelScenario({
  floors: singleFloor([[2, 0]]),
  initialActors: [
    { blueprintId: 'walker', position: at(1, 1), facing: 's' },
    { blueprintId: 'statue', position: at(1, 2), facing: 'n' },
  ],
});

function bootedKernel(overrides: Parameters<typeof kernelScenario>[0] = {}) {
  const kernel = createSimulationKernel(
    { ...scenario, ...overrides },
    TEST_SEED,
  );
  kernel.advanceOne();
  return kernel;
}

function worldOf(kernel: ReturnType<typeof createSimulationKernel>) {
  const state = kernel.state();
  return { actors: state.actors, nextEntityId: state.nextEntityId };
}

describe('kernel command application', () => {
  it('turns an actor and emits actor/faced', () => {
    const kernel = bootedKernel();

    kernel.enqueue(face(1, 'e', 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      { type: 'actor/faced', entityId: 1, facing: 'e' },
    ]);
    expect(kernel.state().actors[0]?.facing).toBe('e');
  });

  it('leaves position and cooldown untouched on actor/wait', () => {
    const kernel = bootedKernel();
    const before = worldOf(kernel);

    kernel.enqueue(wait(1, 1));
    const events = kernel.advanceOne();

    expect(events).toEqual([]);
    expect(worldOf(kernel)).toEqual(before);
  });

  it('moves an actor and reports from and to', () => {
    const kernel = bootedKernel();

    kernel.enqueue(moveStep(1, 'e', 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'actor/moved',
        entityId: 1,
        from: at(1, 1),
        to: at(2, 1),
        facing: 'e',
      },
    ]);
    expect(kernel.state().actors[0]?.position).toEqual(at(2, 1));
  });

  it('blocks a move while the actor is on cooldown', () => {
    const kernel = bootedKernel();

    kernel.enqueue(moveStep(1, 'e', 1));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'e', 2));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: at(3, 1),
        reason: 'cooldown',
      },
    ]);
    expect(kernel.state().actors[0]?.position).toEqual(at(2, 1));
  });

  it('reports the blocking cause coming from the grid', () => {
    const kernel = bootedKernel();

    kernel.enqueue(moveStep(1, 's', 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: at(1, 2),
        reason: 'occupied',
      },
    ]);
  });

  it('reports terrain, bounds and diagonal-corner causes from the grid', () => {
    const kernel = bootedKernel({
      floors: singleFloor([
        [2, 0],
        [1, 2],
      ]),
      initialActors: [
        { blueprintId: 'statue', position: at(1, 1), facing: 's' },
      ],
    });

    kernel.enqueue(moveStep(1, 'ne', 1));
    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: at(2, 0),
        reason: 'terrain',
      },
    ]);

    kernel.enqueue(moveStep(1, 'se', 2));
    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: at(2, 2),
        reason: 'diagonal-corner',
      },
    ]);

    kernel.enqueue(moveStep(1, 'w', 3));
    kernel.advanceOne();
    kernel.enqueue(moveStep(1, 'w', 4));
    expect(payloads(kernel.advanceOne())).toEqual([
      {
        type: 'actor/move-blocked',
        entityId: 1,
        attempted: { x: -1, y: 1, z: 7 },
        reason: 'bounds',
      },
    ]);
  });

  it('rejects an actor command aimed at an unknown entity', () => {
    const kernel = bootedKernel();
    const before = worldOf(kernel);

    const acceptance = kernel.enqueue(moveStep(99, 'e', 1));
    const events = kernel.advanceOne();

    expect(acceptance).toEqual({ ok: true, sequence: 1 });
    expect(payloads(events)).toEqual([
      {
        type: 'command/rejected',
        commandType: 'actor/move-step',
        commandSequence: 1,
        code: 'SIM_COMMAND_UNKNOWN_ENTITY',
      },
    ]);
    expect(worldOf(kernel)).toEqual(before);
  });

  it('rejects face, wait and despawn aimed at an unknown entity', () => {
    const kernel = bootedKernel();
    const before = worldOf(kernel);

    kernel.enqueue(face(99, 'e', 1));
    kernel.enqueue(wait(99, 1));
    kernel.enqueue(despawnActor(99, 1));
    const events = kernel.advanceOne();

    expect(
      payloads(events).map((payload) =>
        payload.type === 'command/rejected'
          ? payload.commandType
          : payload.type,
      ),
    ).toEqual(['scenario/despawn-actor', 'actor/face', 'actor/wait']);
    for (const payload of payloads(events)) {
      expect(payload.type).toBe('command/rejected');
      if (payload.type === 'command/rejected') {
        expect(payload.code).toBe('SIM_COMMAND_UNKNOWN_ENTITY');
      }
    }
    expect(worldOf(kernel)).toEqual(before);
  });

  it('spawns an actor on a free tile', () => {
    const kernel = bootedKernel();

    kernel.enqueue(spawnActor('walker', at(4, 4), 'w', 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'actor/spawned',
        entityId: 3,
        blueprintId: 'walker',
        position: at(4, 4),
        facing: 'w',
      },
    ]);
    expect(kernel.state().nextEntityId).toBe(4);
  });

  it('despawns an existing actor', () => {
    const kernel = bootedKernel();

    kernel.enqueue(despawnActor(2, 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      { type: 'actor/despawned', entityId: 2 },
    ]);
    expect(kernel.state().actors.map((actor) => actor.entityId)).toEqual([1]);
  });

  it('rejects a spawn on an occupied tile without mutating state', () => {
    const kernel = bootedKernel();
    const before = worldOf(kernel);

    kernel.enqueue(spawnActor('walker', at(1, 1), 's', 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'command/rejected',
        commandType: 'scenario/spawn-actor',
        commandSequence: 1,
        code: 'SIM_SPAWN_TILE_UNAVAILABLE',
      },
    ]);
    expect(worldOf(kernel)).toEqual(before);
  });

  it('rejects a spawn outside the grid or on blocked terrain', () => {
    const kernel = bootedKernel();
    const before = worldOf(kernel);

    kernel.enqueue(spawnActor('walker', at(2, 0), 's', 1));
    kernel.enqueue(spawnActor('walker', { x: 99, y: 0, z: 7 }, 's', 1));
    const events = kernel.advanceOne();

    expect(
      payloads(events).map((payload) =>
        payload.type === 'command/rejected' ? payload.code : payload.type,
      ),
    ).toEqual(['SIM_SPAWN_TILE_UNAVAILABLE', 'SIM_SPAWN_TILE_UNAVAILABLE']);
    expect(worldOf(kernel)).toEqual(before);
  });

  it('rejects a spawn for an unknown blueprint without mutating state', () => {
    const kernel = bootedKernel();
    const before = worldOf(kernel);

    kernel.enqueue(spawnActor('ghost', at(4, 4), 's', 1));
    const events = kernel.advanceOne();

    expect(payloads(events)).toEqual([
      {
        type: 'command/rejected',
        commandType: 'scenario/spawn-actor',
        commandSequence: 1,
        code: 'SIM_SCHEMA_INVALID',
      },
    ]);
    expect(worldOf(kernel)).toEqual(before);
  });

  it('faces during apply, materialises lifecycle in S1 and moves in S2', () => {
    const kernel = bootedKernel();

    kernel.enqueue(wait(1, 1));
    kernel.enqueue(moveStep(1, 'e', 1, 'ai'));
    kernel.enqueue(face(1, 'n', 1));
    kernel.enqueue(spawnActor('walker', at(4, 4), 's', 1));
    const events = kernel.advanceOne();

    expect(payloads(events).map((payload) => payload.type)).toEqual([
      'actor/faced',
      'actor/spawned',
      'actor/moved',
    ]);
  });
});
