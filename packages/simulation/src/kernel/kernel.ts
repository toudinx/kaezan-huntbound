import type {
  ActorBlueprint,
  ActorState,
  Direction,
  EntityId,
  GridPosition,
  KernelScenario,
  PendingIntentState,
  Seed,
  SimulationCommandInput,
  SimulationCommandRecord,
  SimulationCommandType,
  SimulationDiagnosticCode,
  SimulationEvent,
  TickIndex,
} from '@huntbound/contracts';

import {
  type CommandAcceptance,
  createCommandBuffer,
  restoreCommandBuffer,
} from '../commands/commandBuffer.ts';
import { createEventJournal } from '../events/journal.ts';
import {
  createOccupancyIndex,
  createStaticGrid,
  DIRECTIONS,
  resolveStep,
  translate,
} from '../grid/index.ts';
import {
  createKernelRandomStreams,
  restoreKernelRandomStreams,
} from '../random/index.ts';
import {
  KERNEL_STATE,
  type KernelRestoreState,
  type KernelStateCarrier,
} from '../state/kernelState.ts';
import {
  createActorState,
  createWorld,
  restoreWorld,
  type WorldState,
} from '../state/worldState.ts';
import {
  applyUpkeep,
  type CombatIntent,
  resolveCombat,
  resolveDeath,
} from './combat.ts';
import { KernelInvariantError } from './errors.ts';
import {
  createSpawnTable,
  restoreSpawnTable,
  serializeSpawnTable,
} from './spawnTable.ts';

export interface SimulationKernel {
  readonly tick: TickIndex;
  advanceOne(): readonly SimulationEvent[];
  advance(ticks: number): readonly SimulationEvent[];
  enqueue(command: SimulationCommandInput): CommandAcceptance;
  state(): WorldState;
}

type PendingLifecycle =
  | {
      readonly kind: 'spawn';
      readonly sequence: number;
      readonly blueprintId: string;
      readonly position: GridPosition;
      readonly facing: Direction;
    }
  | {
      readonly kind: 'despawn';
      readonly sequence: number;
      readonly entityId: EntityId;
    };

interface MoveIntent {
  readonly kind: 'move';
  readonly entityId: EntityId;
  readonly direction: Direction;
  readonly sourceRank: number;
  readonly order: number;
}

interface AttackIntent {
  readonly kind: 'attack';
  readonly entityId: EntityId;
  readonly targetEntityId: EntityId;
  readonly sourceRank: number;
  readonly order: number;
}

type InternalIntent = MoveIntent | AttackIntent;

function tileKey(position: GridPosition): string {
  return `${position.x}:${position.y}:${position.z}`;
}

function samePosition(
  left: GridPosition | null,
  right: GridPosition | null,
): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function compareIntents(left: MoveIntent, right: MoveIntent): number {
  if (left.entityId !== right.entityId) {
    return left.entityId < right.entityId ? -1 : 1;
  }
  if (left.sourceRank !== right.sourceRank) {
    return left.sourceRank < right.sourceRank ? -1 : 1;
  }
  if (left.order !== right.order) {
    return left.order < right.order ? -1 : 1;
  }
  return 0;
}

export function createSimulationKernel(
  scenario: KernelScenario,
  seed: Seed,
  restore?: KernelRestoreState,
): SimulationKernel {
  const world =
    restore === undefined
      ? createWorld(scenario)
      : restoreWorld(restore.actors, restore.nextEntityId, restore.tick);
  const journal = createEventJournal(restore?.nextEventSequence);
  const buffer =
    restore === undefined
      ? createCommandBuffer()
      : restoreCommandBuffer(
          restore.pendingCommands,
          restore.nextCommandSequence,
        );
  const grid = createStaticGrid(scenario);
  const streams =
    restore === undefined
      ? createKernelRandomStreams(seed)
      : restoreKernelRandomStreams(restore.randomStreams);
  const blueprints = new Map<string, ActorBlueprint>(
    scenario.blueprints.map((blueprint) => [blueprint.blueprintId, blueprint]),
  );

  /**
   * The boot events belong to tick `0` and are emitted by tick `0`, not by the
   * constructor: a kernel snapshotted before its first tick would otherwise
   * strand them in an undrained journal, and no snapshot field carries those.
   * `world.tick === 0` is exact, because tick `0` emits them and no later tick
   * can, so a kernel resumed at tick `0` still owes them and one resumed later
   * never does.
   */
  let bootPending = world.tick === 0;

  const emitBootEvents = (): void => {
    if (!bootPending) {
      return;
    }
    bootPending = false;
    for (const actor of world.actors()) {
      journal.emit(world.tick, {
        type: 'actor/spawned',
        entityId: actor.entityId,
        blueprintId: actor.blueprintId,
        position: actor.position,
        facing: actor.facing,
      });
    }
  };

  const reject = (
    tick: TickIndex,
    commandType: SimulationCommandType,
    commandSequence: number,
    code: SimulationDiagnosticCode,
  ): void => {
    journal.emit(tick, {
      type: 'command/rejected',
      commandType,
      commandSequence,
      code,
    });
  };

  const baseStepTicks = (actor: ActorState): number =>
    blueprints.get(actor.blueprintId)?.stepCooldownTicks ?? 0;

  const wanders = (actor: ActorState): boolean =>
    blueprints.get(actor.blueprintId)?.behavior === 'wander';

  const internalIntents = new Map<number, InternalIntent[]>();
  let internalOrder = 0;

  const queueInternalIntent = (
    tick: number,
    entityId: EntityId,
    direction: Direction,
  ): void => {
    const queued = internalIntents.get(tick) ?? [];
    queued.push({
      kind: 'move',
      entityId,
      direction,
      sourceRank: 1,
      order: internalOrder,
    });
    internalOrder += 1;
    internalIntents.set(tick, queued);
  };

  const queueInternalAttack = (
    tick: number,
    entityId: EntityId,
    targetEntityId: EntityId,
  ): void => {
    const queued = internalIntents.get(tick) ?? [];
    queued.push({
      kind: 'attack',
      entityId,
      targetEntityId,
      sourceRank: 1,
      order: internalOrder,
    });
    internalOrder += 1;
    internalIntents.set(tick, queued);
  };

  for (const intent of restore?.pendingIntents ?? []) {
    if (intent.kind === 'move') {
      queueInternalIntent(intent.tick, intent.entityId, intent.direction);
    } else {
      queueInternalAttack(intent.tick, intent.entityId, intent.targetEntityId);
    }
  }

  const spawnTable = createSpawnTable(scenario);
  if (restore !== undefined) {
    restoreSpawnTable(spawnTable, restore.spawnSlots);
  }

  /** A despawned creature empties its seat and starts the respawn countdown. */
  const releaseSpawnSlot = (entityId: EntityId, tick: number): void => {
    for (const slot of spawnTable) {
      if (slot.entityId === entityId) {
        slot.entityId = null;
        slot.readyAtTick = tick + slot.respawnTicks;
      }
    }
  };

  const runTick = (): readonly SimulationEvent[] => {
    emitBootEvents();
    const currentTick = world.tick;
    const lifecycle: PendingLifecycle[] = [];
    const queuedInternal = internalIntents.get(currentTick) ?? [];
    internalIntents.delete(currentTick);
    const intents: MoveIntent[] = queuedInternal.filter(
      (intent): intent is MoveIntent => intent.kind === 'move',
    );
    const combatIntents: CombatIntent[] = queuedInternal
      .filter((intent): intent is AttackIntent => intent.kind === 'attack')
      .map((intent) => ({
        kind: 'attack' as const,
        entityId: intent.entityId,
        targetEntityId: intent.targetEntityId,
        sourceRank: intent.sourceRank,
        order: intent.order,
        sequence: null,
      }));
    const despawning = new Set<number>();
    const reservedTiles = new Set<string>();

    const addressable = (entityId: EntityId): ActorState | undefined =>
      despawning.has(entityId) ? undefined : world.actor(entityId);

    const spawnTileAvailable = (position: GridPosition): boolean =>
      grid.isInside(position) &&
      !grid.isBlockedTerrain(position) &&
      !reservedTiles.has(tileKey(position)) &&
      !createOccupancyIndex(world.actors()).isOccupied(position);

    const applyCommand = (record: SimulationCommandRecord): void => {
      const { command, sequence } = record;

      if (command.type === 'scenario/spawn-actor') {
        if (!blueprints.has(command.blueprintId)) {
          reject(currentTick, command.type, sequence, 'SIM_SCHEMA_INVALID');
          return;
        }
        if (!spawnTileAvailable(command.position)) {
          reject(
            currentTick,
            command.type,
            sequence,
            'SIM_SPAWN_TILE_UNAVAILABLE',
          );
          return;
        }
        reservedTiles.add(tileKey(command.position));
        lifecycle.push({
          kind: 'spawn',
          sequence,
          blueprintId: command.blueprintId,
          position: command.position,
          facing: command.facing,
        });
        return;
      }

      const actor = addressable(command.entityId);
      if (actor === undefined) {
        reject(
          currentTick,
          command.type,
          sequence,
          'SIM_COMMAND_UNKNOWN_ENTITY',
        );
        return;
      }

      if (command.type === 'scenario/despawn-actor') {
        despawning.add(command.entityId);
        lifecycle.push({
          kind: 'despawn',
          sequence,
          entityId: command.entityId,
        });
        return;
      }

      if (command.type === 'actor/face') {
        world.update({ ...actor, facing: command.direction });
        journal.emit(currentTick, {
          type: 'actor/faced',
          entityId: command.entityId,
          facing: command.direction,
        });
        return;
      }

      if (command.type === 'actor/move-step') {
        intents.push({
          kind: 'move',
          entityId: command.entityId,
          direction: command.direction,
          sourceRank: 0,
          order: sequence,
        });
        return;
      }

      if (command.type === 'actor/attack') {
        combatIntents.push({
          kind: 'attack',
          entityId: command.entityId,
          targetEntityId: command.targetEntityId,
          sourceRank: 0,
          order: sequence,
          sequence,
        });
        return;
      }

      if (command.type === 'actor/cast-ability') {
        combatIntents.push({
          kind: 'cast',
          entityId: command.entityId,
          abilityIndex: command.abilityIndex,
          targetEntityId: command.targetEntityId,
          sourceRank: 0,
          order: sequence,
          sequence,
        });
      }
    };

    const runLifecycle = (): void => {
      for (const entry of [...lifecycle].sort(
        (left, right) => left.sequence - right.sequence,
      )) {
        if (entry.kind === 'spawn') {
          const blueprint = blueprints.get(entry.blueprintId);
          if (blueprint === undefined) {
            continue;
          }
          const entityId = world.allocateEntityId();
          world.insert(
            createActorState(
              entityId,
              blueprint,
              entry.position,
              entry.facing,
              currentTick,
              currentTick,
            ),
          );
          journal.emit(currentTick, {
            type: 'actor/spawned',
            entityId,
            blueprintId: entry.blueprintId,
            position: entry.position,
            facing: entry.facing,
          });
          continue;
        }

        if (world.remove(entry.entityId)) {
          releaseSpawnSlot(entry.entityId, currentTick);
          journal.emit(currentTick, {
            type: 'actor/despawned',
            entityId: entry.entityId,
          });
        }
      }
    };

    const runMovement = (): void => {
      for (const intent of [...intents].sort(compareIntents)) {
        const actor = world.actor(intent.entityId);
        if (actor === undefined) {
          continue;
        }

        if (currentTick < actor.readyAtTick) {
          journal.emit(currentTick, {
            type: 'actor/move-blocked',
            entityId: actor.entityId,
            attempted: translate(actor.position, intent.direction),
            reason: 'cooldown',
          });
          continue;
        }

        const outcome = resolveStep(
          grid,
          createOccupancyIndex(world.actors()),
          actor,
          intent.direction,
          baseStepTicks(actor),
        );

        if (!outcome.ok) {
          journal.emit(currentTick, {
            type: 'actor/move-blocked',
            entityId: actor.entityId,
            attempted: outcome.attempted,
            reason: outcome.reason,
          });
          continue;
        }

        const guard = actor.transitionGuard;
        // A guard is released by the step that walks off the guarded cell, and
        // that same step may not fire a transition: an actor "may fire again
        // only after leaving that cell", so the leaving step is still covered.
        const leavingGuardedCell = samePosition(guard, actor.position);

        if (guard !== null && !leavingGuardedCell) {
          throw new KernelInvariantError(
            'SIM_TRANSITION_CHAINED',
            `Entity ${actor.entityId} is guarded at (${guard.x}, ${guard.y}, ${guard.z}) but stands at (${actor.position.x}, ${actor.position.y}, ${actor.position.z})`,
          );
        }

        world.update({
          ...actor,
          position: outcome.to,
          facing: intent.direction,
          readyAtTick: currentTick + outcome.costTicks,
          transitionGuard: null,
        });
        journal.emit(currentTick, {
          type: 'actor/moved',
          entityId: actor.entityId,
          from: actor.position,
          to: outcome.to,
          facing: intent.direction,
        });

        if (outcome.transitionedTo === undefined) {
          continue;
        }

        const moved = world.actor(actor.entityId);
        if (moved === undefined) {
          continue;
        }

        world.update({
          ...moved,
          position: outcome.transitionedTo,
          transitionGuard: outcome.transitionedTo,
        });
        journal.emit(currentTick, {
          type: 'actor/transitioned',
          entityId: actor.entityId,
          from: outcome.to,
          to: outcome.transitionedTo,
        });
      }
    };

    const runAi = (): void => {
      const nextTick = currentTick + 1;
      for (const actor of world.actors()) {
        if (!wanders(actor) || currentTick < actor.readyAtTick) {
          continue;
        }

        const direction = DIRECTIONS[streams.ai.nextBelow(DIRECTIONS.length)];
        if (direction === undefined) {
          continue;
        }

        queueInternalIntent(nextTick, actor.entityId, direction);
      }
    };

    /**
     * `S7` is last so a birth of tick `T` is only observable from `T` on, and
     * so it can never race a step of the same tick for a cell.
     */
    const runSpawn = (): void => {
      const cellFree = (position: GridPosition): boolean =>
        grid.isInside(position) &&
        !grid.isBlockedTerrain(position) &&
        !createOccupancyIndex(world.actors()).isOccupied(position);

      for (const slot of spawnTable) {
        if (slot.entityId !== null || currentTick < slot.readyAtTick) {
          continue;
        }

        if (world.actors().length >= scenario.maxLiveActors) {
          journal.emit(currentTick, {
            type: 'spawn/capped',
            groupIndex: slot.groupIndex,
            slotIndex: slot.slotIndex,
          });
          journal.emit(currentTick, {
            type: 'spawn/deferred',
            groupIndex: slot.groupIndex,
            slotIndex: slot.slotIndex,
            reason: 'cap-reached',
          });
          continue;
        }

        let position: GridPosition | undefined;
        if (cellFree(slot.position)) {
          position = slot.position;
        } else {
          const candidates = slot.radiusCells.filter(cellFree);
          if (candidates.length > 0) {
            position = candidates[streams.spawn.nextBelow(candidates.length)];
          }
        }

        if (position === undefined) {
          journal.emit(currentTick, {
            type: 'spawn/deferred',
            groupIndex: slot.groupIndex,
            slotIndex: slot.slotIndex,
            reason: 'no-free-cell',
          });
          continue;
        }

        const blueprint = blueprints.get(slot.blueprintId);
        if (blueprint === undefined) {
          continue;
        }
        const entityId = world.allocateEntityId();
        world.insert(
          createActorState(
            entityId,
            blueprint,
            position,
            's',
            currentTick,
            currentTick,
          ),
        );
        slot.entityId = entityId;
        journal.emit(currentTick, {
          type: 'actor/spawned',
          entityId,
          blueprintId: slot.blueprintId,
          position,
          facing: 's',
        });
      }
    };

    for (const record of buffer.drain(currentTick)) {
      applyCommand(record);
    }

    runLifecycle();
    runMovement();
    applyUpkeep(world, blueprints, currentTick);
    const killers = new Map<number, EntityId | null>();
    resolveCombat(
      world,
      journal,
      streams,
      blueprints,
      scenario.abilities,
      currentTick,
      combatIntents,
      killers,
    );
    resolveDeath(world, journal, currentTick, killers, releaseSpawnSlot);
    runAi();
    runSpawn();

    const events = journal.drain();
    world.tick = (currentTick + 1) as TickIndex;
    return events;
  };

  const kernel: SimulationKernel & KernelStateCarrier = {
    get tick() {
      return world.tick;
    },
    [KERNEL_STATE]: () => ({
      seed,
      scenarioId: scenario.scenarioId,
      scenarioRevision: scenario.scenarioRevision,
      tick: world.tick,
      nextEntityId: world.nextEntityId,
      nextEventSequence: journal.nextSequence,
      nextCommandSequence: buffer.nextSequence,
      actors: world.state().actors,
      randomStreams: streams.serialize(),
      pendingCommands: buffer.pending(),
      spawnSlots: serializeSpawnTable(spawnTable),
      pendingInternalIntents: [...internalIntents.entries()].flatMap(
        ([tick, queued]) =>
          queued.map((intent): PendingIntentState => {
            if (intent.kind === 'attack') {
              return {
                kind: 'attack',
                tick: tick as TickIndex,
                entityId: intent.entityId,
                targetEntityId: intent.targetEntityId,
              };
            }
            return {
              kind: 'move',
              tick: tick as TickIndex,
              entityId: intent.entityId,
              direction: intent.direction,
            };
          }),
      ),
    }),
    advanceOne: runTick,
    advance(ticks) {
      if (!Number.isSafeInteger(ticks) || ticks < 0) {
        throw new RangeError('ticks must be a non-negative safe integer');
      }

      const events: SimulationEvent[] = [];
      for (let index = 0; index < ticks; index += 1) {
        events.push(...runTick());
      }
      return events;
    },
    enqueue: (command) => buffer.enqueue(command, world.tick),
    state: () => world.state(),
  };

  return kernel;
}
