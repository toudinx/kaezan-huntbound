import type {
  AbilityDefinition,
  EntityId,
  GridPosition,
  SimulationCommand,
  SimulationEvent,
} from '../../../../packages/contracts/src/index.ts';
import type { InputAction } from '../input/InputMap';

/**
 * The helper the ADR-05 lists as a permitted extension, *"inicialmente
 * limitado a cura, alvo, acoes e loot"*.
 *
 * Three things here follow from that sentence and are not free to change:
 *
 * - **It is four modules, each one switchable on its own**, never a mode the
 *   run is in. A module that is off costs nothing and says nothing.
 * - **It speaks through the same commands the player does.** Cost, range and
 *   cooldown apply to it exactly as they do to a keypress, so a refusal is a
 *   line to write in the cockpit rather than a rule to route around. That is
 *   also why nothing here consults the kernel directly: it reads the same
 *   projection the HUD reads and enqueues an ordinary player command.
 * - **The player always wins the tick.** The scene only asks for a decision on
 *   a tick where no manual action was drained, and a manual action stands the
 *   touched modules down for `HELPER_MANUAL_HOLD_TICKS` on top of that. Taking
 *   control back is immediate: the hold is a comparison against the current
 *   tick, so nothing is waiting for an action to finish.
 *
 * Loot is the one module with nothing to command -- the kernel grants it to
 * the killer the moment a creature dies. What it does own is the report: it is
 * the module that turns `loot/granted` into the line that says what the fight
 * was worth, and turning it off silences that line.
 */
export const HELPER_MODULES = ['heal', 'target', 'actions', 'loot'] as const;

export type HelperModule = (typeof HELPER_MODULES)[number];

export type HelperModuleFlags = Readonly<Record<HelperModule, boolean>>;

export const HELPER_MODULE_LABELS: Readonly<Record<HelperModule, string>> =
  Object.freeze({
    heal: 'Heal',
    target: 'Target',
    actions: 'Actions',
    loot: 'Loot',
  });

/**
 * Health fraction, in permille, at or below which the heal module spends a
 * cast. Wound Cleansing is cheap and short, so healing early is what a player
 * does; waiting for a Tibia-style emergency would just be a worse player.
 */
export const HELPER_HEAL_HEALTH_PERMILLE = 700;

/** Three seconds: enough to finish what you started, short enough to forget. */
export const HELPER_MANUAL_HOLD_TICKS = 60;

/**
 * An area spell centred on the caster is worth its mana against a crowd, not
 * against the one creature a single-target spell already covers.
 */
export const HELPER_AREA_MINIMUM_TARGETS = 2;

/** What the cockpit feed holds. Older lines fall off the top. */
export const HELPER_LOG_LIMIT = 8;

export type HelperLogKind = 'acted' | 'refused' | 'gained';

export interface HelperLogEntry {
  readonly tick: number;
  readonly module: HelperModule;
  readonly kind: HelperLogKind;
  readonly message: string;
}

export interface HelperHostile {
  readonly entityId: EntityId;
  readonly position: GridPosition;
  readonly displayName: string;
}

/**
 * Everything a decision reads, projected by the scene from the driver snapshot
 * it already keeps for the health bars.
 */
export interface HelperSituation {
  readonly tick: number;
  readonly playerEntityId: EntityId;
  readonly playerPosition: GridPosition;
  readonly health: number;
  readonly maxHealth: number;
  readonly resource: number;
  readonly targetEntityId: EntityId | null;
  readonly hostiles: readonly HelperHostile[];
  readonly abilities: readonly AbilityDefinition[];
  /** The kit the player's blueprint declares -- the kernel rejects the rest. */
  readonly abilityIndices: readonly number[];
  readonly abilityReadyAtTick: ReadonlyMap<number, number>;
  readonly groupReadyAtTick: ReadonlyMap<number, number>;
}

export type HelperDecision =
  | {
      readonly kind: 'act';
      readonly module: HelperModule;
      readonly command: SimulationCommand;
      readonly message: string;
    }
  | {
      readonly kind: 'refuse';
      readonly module: HelperModule;
      readonly message: string;
    }
  | { readonly kind: 'idle' };

export interface HelperPolicyInput {
  readonly situation: HelperSituation;
  readonly modules: HelperModuleFlags;
  /** Absolute tick each module is free again from. `0` means free now. */
  readonly holdUntilTick: Readonly<Record<HelperModule, number>>;
}

export interface HelperReport {
  readonly modules: HelperModuleFlags;
  readonly held: readonly HelperModule[];
  readonly log: readonly HelperLogEntry[];
}

export interface HuntHelperOptions {
  readonly itemKeys?: readonly string[];
  readonly modules?: Partial<HelperModuleFlags>;
}

export interface HuntHelper {
  report(): HelperReport;
  setModule(module: HelperModule, enabled: boolean): void;
  /** Stands the modules a manual action touches down, from `tick`. */
  noteManualAction(action: InputAction, tick: number): void;
  decide(situation: HelperSituation): HelperDecision;
  handle(events: readonly SimulationEvent[], playerEntityId: EntityId): void;
  reset(): void;
}

/** Every module starts off: a helper nobody asked for is not a helper. */
export const HELPER_MODULES_OFF: HelperModuleFlags = Object.freeze({
  heal: false,
  target: false,
  actions: false,
  loot: false,
});

const NO_HOLDS: Readonly<Record<HelperModule, number>> = Object.freeze({
  heal: 0,
  target: 0,
  actions: 0,
  loot: 0,
});

/**
 * Which modules a manual action stands down.
 *
 * A step is deliberately absent: walking is the one thing the helper never
 * does, so holding it there would only mean a player who kites never gets
 * healed. Casting spends the cooldown groups both combat modules draw on, so
 * it holds them together; anything that picks a creature holds the targeting.
 */
function heldByAction(action: InputAction): readonly HelperModule[] {
  switch (action.kind) {
    case 'cast-ability':
      return ['heal', 'actions'];
    case 'attack':
    case 'cycle-target':
    case 'clear-target':
      return ['target'];
    default:
      return [];
  }
}

function abilityLabel(abilityId: string): string {
  return abilityId
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function chebyshevDistance(left: GridPosition, right: GridPosition): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function onSameFloor(left: GridPosition, right: GridPosition): boolean {
  return left.z === right.z;
}

/**
 * Closest first, ties to the lower id, so the same board always picks the same
 * creature however the actor list happens to be ordered.
 */
function nearestHostile(
  hostiles: readonly HelperHostile[],
  from: GridPosition,
): HelperHostile | undefined {
  let best: HelperHostile | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const hostile of hostiles) {
    if (!onSameFloor(hostile.position, from)) continue;
    const distance = chebyshevDistance(hostile.position, from);
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        best !== undefined &&
        hostile.entityId < best.entityId)
    ) {
      best = hostile;
      bestDistance = distance;
    }
  }
  return best;
}

function readyAtTickFor(
  situation: HelperSituation,
  index: number,
  ability: AbilityDefinition,
): number {
  const groupReadyAtTick = Math.max(
    situation.groupReadyAtTick.get(ability.primaryCooldownGroup) ?? 0,
    ability.secondaryCooldownGroup === null
      ? 0
      : (situation.groupReadyAtTick.get(ability.secondaryCooldownGroup) ?? 0),
  );
  return Math.max(
    situation.abilityReadyAtTick.get(index) ?? 0,
    groupReadyAtTick,
  );
}

function remainingSeconds(remainingTicks: number): number {
  // 50 ms a tick; the cockpit reads seconds everywhere else.
  return Math.max(1, Math.ceil(remainingTicks / 20));
}

interface KitEntry {
  readonly index: number;
  readonly ability: AbilityDefinition;
}

/** The player's own kit, in catalog order -- the order the deck prints. */
function playerKit(situation: HelperSituation): readonly KitEntry[] {
  const allowed = new Set(situation.abilityIndices);
  return situation.abilities.flatMap((ability, index) =>
    allowed.has(index) ? [{ index, ability }] : [],
  );
}

function castCommand(
  situation: HelperSituation,
  index: number,
  targetEntityId: EntityId | null,
): SimulationCommand {
  return {
    type: 'actor/cast-ability',
    entityId: situation.playerEntityId,
    abilityIndex: index,
    targetEntityId,
  };
}

function decideHeal(situation: HelperSituation): HelperDecision {
  if (situation.maxHealth <= 0 || situation.health <= 0) {
    return { kind: 'idle' };
  }
  if (
    situation.health * 1000 >
    situation.maxHealth * HELPER_HEAL_HEALTH_PERMILLE
  ) {
    return { kind: 'idle' };
  }

  const entry = playerKit(situation).find(
    ({ ability }) =>
      ability.effect === 'heal' && ability.shape === 'self' && !ability.toggle,
  );
  if (entry === undefined) return { kind: 'idle' };

  const label = abilityLabel(entry.ability.abilityId);
  const percent = Math.round((situation.health / situation.maxHealth) * 100);
  const remainingTicks = Math.max(
    0,
    readyAtTickFor(situation, entry.index, entry.ability) - situation.tick,
  );
  if (remainingTicks > 0) {
    return {
      kind: 'refuse',
      module: 'heal',
      message: `${label} held at ${String(percent)}% health: ${String(remainingSeconds(remainingTicks))}s of cooldown left`,
    };
  }
  if (situation.resource < entry.ability.resourceCost) {
    return {
      kind: 'refuse',
      module: 'heal',
      message: `${label} held at ${String(percent)}% health: ${String(situation.resource)} of ${String(entry.ability.resourceCost)} mana`,
    };
  }

  return {
    kind: 'act',
    module: 'heal',
    command: castCommand(situation, entry.index, null),
    message: `${label} at ${String(percent)}% health`,
  };
}

function decideTarget(situation: HelperSituation): HelperDecision {
  const reachable = situation.hostiles.filter((hostile) =>
    onSameFloor(hostile.position, situation.playerPosition),
  );
  const keptTarget = reachable.some(
    (hostile) => hostile.entityId === situation.targetEntityId,
  );
  if (keptTarget) return { kind: 'idle' };

  const next = nearestHostile(reachable, situation.playerPosition);
  if (next === undefined) {
    return situation.targetEntityId === null
      ? { kind: 'idle' }
      : {
          kind: 'act',
          module: 'target',
          command: {
            type: 'actor/set-target',
            entityId: situation.playerEntityId,
            targetEntityId: null,
          },
          message: 'Nothing left in reach',
        };
  }

  return {
    kind: 'act',
    module: 'target',
    command: {
      type: 'actor/set-target',
      entityId: situation.playerEntityId,
      targetEntityId: next.entityId,
    },
    message: `Engaged ${next.displayName}`,
  };
}

function decideActions(situation: HelperSituation): HelperDecision {
  const target = situation.hostiles.find(
    (hostile) => hostile.entityId === situation.targetEntityId,
  );
  if (target === undefined) return { kind: 'idle' };
  if (!onSameFloor(target.position, situation.playerPosition)) {
    return { kind: 'idle' };
  }

  const crowd = situation.hostiles.filter((hostile) =>
    onSameFloor(hostile.position, situation.playerPosition),
  );
  let refusal: HelperDecision | undefined;

  for (const { index, ability } of playerKit(situation)) {
    if (ability.effect !== 'damage' || ability.toggle) continue;

    if (ability.shape === 'target') {
      if (
        chebyshevDistance(situation.playerPosition, target.position) >
        ability.rangeTiles
      ) {
        continue;
      }
    } else if (ability.shape === 'area') {
      const covered = crowd.filter(
        (hostile) =>
          chebyshevDistance(situation.playerPosition, hostile.position) <=
          ability.radius,
      ).length;
      if (covered < HELPER_AREA_MINIMUM_TARGETS) continue;
    } else {
      continue;
    }

    if (readyAtTickFor(situation, index, ability) > situation.tick) continue;
    if (situation.resource < ability.resourceCost) {
      refusal ??= {
        kind: 'refuse',
        module: 'actions',
        message: `${abilityLabel(ability.abilityId)} held: ${String(situation.resource)} of ${String(ability.resourceCost)} mana`,
      };
      continue;
    }

    return {
      kind: 'act',
      module: 'actions',
      command: castCommand(
        situation,
        index,
        ability.shape === 'target' ? target.entityId : null,
      ),
      message: `${abilityLabel(ability.abilityId)} on ${target.displayName}`,
    };
  }

  return refusal ?? { kind: 'idle' };
}

/**
 * One decision for one tick, in module order: staying alive comes before
 * having something to hit, which comes before hitting it.
 *
 * A refusal never ends the pass. Wound Cleansing spends the same cooldown group
 * the attack spells do, so a helper that stopped at the first "held" would go
 * quiet for the rest of the fight every time the player dipped under the heal
 * threshold. The refusal is kept and reported only if nothing else acted.
 */
export function decideHelperAction(input: HelperPolicyInput): HelperDecision {
  const { situation, modules, holdUntilTick } = input;
  const active = (module: HelperModule): boolean =>
    modules[module] && situation.tick >= holdUntilTick[module];

  let refusal: HelperDecision | undefined;

  for (const module of HELPER_MODULES) {
    if (!active(module)) continue;

    let decision: HelperDecision = { kind: 'idle' };
    switch (module) {
      case 'heal':
        decision = decideHeal(situation);
        break;
      case 'target':
        decision = decideTarget(situation);
        break;
      case 'actions':
        decision = decideActions(situation);
        break;
      case 'loot':
        // The kernel grants loot to the killer. This module only reports it,
        // which `handle` does off the event stream.
        break;
    }

    if (decision.kind === 'act') return decision;
    if (decision.kind === 'refuse') refusal ??= decision;
  }

  return refusal ?? { kind: 'idle' };
}

function itemLabel(itemKey: string): string {
  return (itemKey.split(':').at(-1) ?? itemKey).replaceAll('-', ' ');
}

export function createHuntHelper(options: HuntHelperOptions = {}): HuntHelper {
  const itemKeys = options.itemKeys ?? [];
  let modules: HelperModuleFlags = {
    ...HELPER_MODULES_OFF,
    ...options.modules,
  };
  let holdUntilTick: Record<HelperModule, number> = { ...NO_HOLDS };
  let log: readonly HelperLogEntry[] = [];

  /**
   * Appends unless the newest line already says the same thing, in which case
   * it is the same standing fact and only its tick moves. Without this a
   * cooldown the helper is waiting on would push everything else out of an
   * eight-line feed inside half a second.
   */
  const record = (entry: HelperLogEntry): void => {
    const newest = log.at(-1);
    if (
      newest !== undefined &&
      newest.module === entry.module &&
      newest.kind === entry.kind &&
      newest.message === entry.message
    ) {
      log = [...log.slice(0, -1), entry];
      return;
    }
    log = [...log, entry].slice(-HELPER_LOG_LIMIT);
  };

  return {
    report: () => ({
      modules,
      held: HELPER_MODULES.filter((module) => holdUntilTick[module] > 0),
      log,
    }),
    setModule: (module, enabled) => {
      if (modules[module] === enabled) return;
      const next: Record<HelperModule, boolean> = { ...modules };
      next[module] = enabled;
      modules = next;
      // A module switched off drops its hold with it: the hold only exists to
      // keep it out of the player's way while it is running.
      if (!enabled) {
        const holds = { ...holdUntilTick };
        holds[module] = 0;
        holdUntilTick = holds;
      }
    },
    noteManualAction: (action, tick) => {
      const held = heldByAction(action);
      if (held.length === 0) return;
      const until = tick + HELPER_MANUAL_HOLD_TICKS;
      const next = { ...holdUntilTick };
      for (const module of held) next[module] = until;
      holdUntilTick = next;
    },
    decide: (situation) => {
      // Expired holds are cleared here rather than on a timer, so `held` in the
      // report is the answer to "is the helper standing down right now".
      const next = { ...holdUntilTick };
      for (const module of HELPER_MODULES) {
        if (next[module] !== 0 && situation.tick >= next[module]) {
          next[module] = 0;
        }
      }
      holdUntilTick = next;

      const decision = decideHelperAction({
        situation,
        modules,
        holdUntilTick,
      });
      if (decision.kind !== 'idle') {
        record({
          tick: situation.tick,
          module: decision.module,
          kind: decision.kind === 'act' ? 'acted' : 'refused',
          message: decision.message,
        });
      }
      return decision;
    },
    handle: (events, playerEntityId) => {
      for (const event of events) {
        if (
          event.payload.type !== 'loot/granted' ||
          !modules.loot ||
          event.payload.entityId !== playerEntityId
        ) {
          continue;
        }
        const itemKey = itemKeys[event.payload.itemIndex];
        if (itemKey === undefined) continue;
        record({
          tick: event.tick,
          module: 'loot',
          kind: 'gained',
          message: `${itemLabel(itemKey)} × ${String(event.payload.count)}`,
        });
      }
    },
    reset: () => {
      holdUntilTick = { ...NO_HOLDS };
      log = [];
    },
  };
}
