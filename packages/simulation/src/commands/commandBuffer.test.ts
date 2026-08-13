import {
  createEntityId,
  createTickIndex,
  type SimulationCommandInput,
} from '@huntbound/contracts';
import { describe, expect, it } from 'vitest';

import { createCommandBuffer, restoreCommandBuffer } from './commandBuffer.ts';

function wait(
  tick: number,
  issuer: 'player' | 'ai' | 'scenario',
  entityId: number,
): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer,
    command: { type: 'actor/wait', entityId: createEntityId(entityId) },
  };
}

function spawn(
  tick: number,
  issuer: 'player' | 'ai' | 'scenario',
): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer,
    command: {
      type: 'scenario/spawn-actor',
      blueprintId: 'hero',
      position: { x: 0, y: 0, z: 0 },
      facing: 's',
    },
  };
}

function move(
  tick: number,
  issuer: 'player' | 'ai',
  entityId: number,
  direction: 'n' | 'e',
): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer,
    command: {
      type: 'actor/move-step',
      entityId: createEntityId(entityId),
      direction,
    },
  };
}

function face(
  tick: number,
  issuer: 'player' | 'ai',
  entityId: number,
): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer,
    command: {
      type: 'actor/face',
      entityId: createEntityId(entityId),
      direction: 's',
    },
  };
}

function despawn(tick: number, entityId: number): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer: 'scenario',
    command: {
      type: 'scenario/despawn-actor',
      entityId: createEntityId(entityId),
    },
  };
}

describe('command buffer intake', () => {
  it('allocates monotonic sequences and does not consume one on rejection', () => {
    const buffer = createCommandBuffer();

    expect(buffer.enqueue(wait(0, 'player', 1), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 1,
    });
    expect(buffer.enqueue(wait(1, 'player', 1), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 2,
    });
    expect(buffer.enqueue(wait(0, 'player', 1), createTickIndex(1))).toEqual({
      ok: false,
      code: 'SIM_TICK_IN_PAST',
    });
    expect(buffer.enqueue(wait(2, 'player', 1), createTickIndex(1))).toEqual({
      ok: true,
      sequence: 3,
    });
    expect(buffer.nextSequence).toBe(4);
  });

  it('rejects forbidden issuers without entering pending', () => {
    const buffer = createCommandBuffer();

    expect(buffer.enqueue(spawn(0, 'player'), createTickIndex(0))).toEqual({
      ok: false,
      code: 'SIM_COMMAND_FORBIDDEN',
    });
    expect(buffer.enqueue(wait(0, 'scenario', 1), createTickIndex(0))).toEqual({
      ok: false,
      code: 'SIM_COMMAND_FORBIDDEN',
    });
    expect(buffer.pending()).toEqual([]);
    expect(buffer.nextSequence).toBe(1);
  });

  it('accepts the current tick and future ticks while rejecting the past', () => {
    const buffer = createCommandBuffer(7);

    expect(buffer.enqueue(wait(3, 'player', 1), createTickIndex(3))).toEqual({
      ok: true,
      sequence: 7,
    });
    expect(buffer.enqueue(wait(5, 'player', 2), createTickIndex(3))).toEqual({
      ok: true,
      sequence: 8,
    });
    expect(buffer.enqueue(wait(2, 'player', 3), createTickIndex(3))).toEqual({
      ok: false,
      code: 'SIM_TICK_IN_PAST',
    });
    expect(buffer.pending()).toHaveLength(2);
  });

  it('orders drained commands by tick, priority, and sequence', () => {
    const buffer = createCommandBuffer();

    expect(buffer.enqueue(wait(2, 'player', 1), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 1,
    });
    expect(buffer.enqueue(despawn(1, 2), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 2,
    });
    expect(
      buffer.enqueue(move(1, 'player', 3, 'e'), createTickIndex(0)),
    ).toEqual({
      ok: true,
      sequence: 3,
    });
    expect(buffer.enqueue(face(1, 'player', 3), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 4,
    });
    expect(buffer.enqueue(spawn(1, 'scenario'), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 5,
    });
    expect(
      buffer.enqueue(move(1, 'player', 4, 'n'), createTickIndex(0)),
    ).toEqual({
      ok: true,
      sequence: 6,
    });

    expect(buffer.drain(createTickIndex(1))).toEqual([
      expect.objectContaining({ sequence: 2 }),
      expect.objectContaining({ sequence: 5 }),
      expect.objectContaining({ sequence: 4 }),
      expect.objectContaining({ sequence: 3 }),
      expect.objectContaining({ sequence: 6 }),
    ]);
    expect(buffer.drain(createTickIndex(1))).toEqual([]);
    expect(buffer.pending().map((record) => record.sequence)).toEqual([1]);
  });

  it('rejects only conflicting same-issuer actions for the same actor and tick', () => {
    const buffer = createCommandBuffer();

    expect(
      buffer.enqueue(move(0, 'player', 1, 'e'), createTickIndex(0)),
    ).toEqual({
      ok: true,
      sequence: 1,
    });
    expect(buffer.enqueue(wait(0, 'player', 1), createTickIndex(0))).toEqual({
      ok: false,
      code: 'SIM_COMMAND_DUPLICATE',
    });
    expect(buffer.enqueue(move(0, 'ai', 1, 'e'), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 2,
    });
    expect(buffer.enqueue(face(0, 'player', 1), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 3,
    });
    expect(buffer.enqueue(wait(0, 'player', 2), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 4,
    });
  });

  it('restores pending commands without changing their sequences', () => {
    const buffer = restoreCommandBuffer(
      [
        {
          ...wait(4, 'player', 1),
          sequence: 5,
        },
        {
          ...move(2, 'ai', 2, 'n'),
          sequence: 3,
        },
      ],
      6,
    );

    expect(buffer.pending().map((record) => record.sequence)).toEqual([3, 5]);
    expect(buffer.nextSequence).toBe(6);
    expect(buffer.enqueue(wait(6, 'player', 3), createTickIndex(0))).toEqual({
      ok: true,
      sequence: 6,
    });
  });
});
