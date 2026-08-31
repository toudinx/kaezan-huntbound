import {
  projectRunBag,
  type RunBagEntry,
} from '../../../../packages/content/src/index.ts';
import type {
  AbilityDefinition,
  ActiveConditionState,
  ActorBlueprint,
  CharacterDefinition,
  Direction,
  ElementResistance,
  EntityId,
  GridPosition,
  RuntimeContentBundle,
  ScenarioConditionDefinition,
  SimulationEvent,
  SimulationSnapshot,
} from '../../../../packages/contracts/src/index.ts';

import {
  type CombatCommandRejection,
  type CombatTargetActor,
  createCombatTargetSelection,
} from './CombatTargeting';

export interface CombatViewModelOptions {
  readonly playerEntityId: EntityId;
  readonly playerBlueprintId: string;
  readonly abilities: readonly AbilityDefinition[];
  readonly conditions?: readonly ScenarioConditionDefinition[];
  readonly itemKeys: readonly string[];
  readonly maxHealthByBlueprint: ReadonlyMap<string, number>;
  readonly maxResourceByBlueprint: ReadonlyMap<string, number>;
  readonly targetDetailsByBlueprint?: ReadonlyMap<string, CombatTargetDetails>;
  readonly initialFloor?: number;
}

export interface CombatVitalsView {
  readonly entityId: EntityId;
  readonly health: number;
  readonly maxHealth: number;
  readonly resource: number;
  readonly maxResource: number;
}

export interface CombatTargetDetails {
  readonly blueprintId: string;
  readonly displayName: string;
  readonly assetKey: string | null;
  readonly corpseAssetKey?: string | null;
  readonly resistances: readonly ElementResistance[];
}

export interface CombatMapActorView {
  readonly entityId: EntityId;
  readonly blueprintId: string;
  readonly position: GridPosition;
  readonly isPlayer: boolean;
  /** Where the actor is looking, so the minimap can draw a heading. */
  readonly facing: Direction | null;
}

export interface CombatMinimapView {
  readonly floor: number;
  readonly actors: readonly CombatMapActorView[];
}

export interface CombatAbilityView {
  readonly index: number;
  readonly abilityId: string;
  readonly label: string;
  readonly resourceCost: number;
  readonly cooldownTicks: number;
  readonly remainingCooldownTicks: number;
  readonly available: boolean;
  readonly active: boolean;
  /** The shared cooldown this ability spends when it is cast. */
  readonly primaryCooldownGroup: number;
  /** A second shared cooldown it also spends, or `null` when it spends none. */
  readonly secondaryCooldownGroup: number | null;
  /**
   * What its own groups still owe, with its personal cooldown left out.
   *
   * The HUD needs this separately from `remainingCooldownTicks` so a cell can
   * darken for the reason the rules actually give. Challenge and Haste run in
   * the support group and are untouched by the attack group; a HUD that dimmed
   * them alongside the spells that *are* on the attack cooldown would be
   * lying about the rule the player is trying to learn.
   */
  readonly remainingGroupCooldownTicks: number;
}

/** What one shared cooldown group still owes, in ticks. */
export interface CombatCooldownGroupView {
  readonly group: number;
  readonly remainingTicks: number;
}

export interface CombatLootLogEntry {
  readonly itemKey: string;
  readonly count: number;
  readonly tick: number;
}

export interface CombatViewState {
  readonly tick: number;
  readonly player: CombatVitalsView | null;
  readonly targetEntityId: EntityId | null;
  readonly target: CombatVitalsView | null;
  readonly targetDetails: CombatTargetDetails | null;
  readonly minimap: CombatMinimapView;
  readonly abilities: readonly CombatAbilityView[];
  /** Every group the ability catalog references, with what it still owes. */
  readonly cooldownGroups: readonly CombatCooldownGroupView[];
  readonly playerPosture: {
    readonly abilityId: string;
    readonly label: string;
  } | null;
  readonly playerHaste: {
    readonly remainingTicks: number;
  } | null;
  readonly lootLog: readonly CombatLootLogEntry[];
  readonly bag: readonly RunBagEntry[];
  readonly playerDead: boolean;
  readonly lastRejection: CombatCommandRejection | null;
}

export interface CombatViewModel {
  readonly targetDetailsByBlueprint: ReadonlyMap<string, CombatTargetDetails>;
  handle(events: readonly SimulationEvent[]): void;
  restoreBag(bag: readonly RunBagEntry[]): void;
  restoreSnapshot(snapshot: SimulationSnapshot): void;
  setTick(tick: number): void;
  setTarget(entityId: EntityId | null): void;
  selectTarget(
    entityId: EntityId,
    actors: readonly CombatTargetActor[],
  ): boolean;
  cycleTarget(actors: readonly CombatTargetActor[]): void;
  reset(): void;
  snapshot(): CombatViewState;
}

interface MutableVitals {
  entityId: EntityId;
  blueprintId: string;
  health: number;
  maxHealth: number;
  resource: number;
  maxResource: number;
  position: GridPosition | null;
  facing: Direction | null;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function titleFromAbilityId(abilityId: string): string {
  return abilityId
    .split('-')
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function titleFromBlueprintId(blueprintId: string): string {
  return blueprintId
    .split(/[-_]/u)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function copyPosition(position: GridPosition): GridPosition {
  return { x: position.x, y: position.y, z: position.z };
}

function copyVitals(actor: MutableVitals): CombatVitalsView {
  return {
    entityId: actor.entityId,
    health: actor.health,
    maxHealth: actor.maxHealth,
    resource: actor.resource,
    maxResource: actor.maxResource,
  };
}

const EMPTY_CONDITIONS: readonly ScenarioConditionDefinition[] = Object.freeze(
  [],
);

export function createCombatViewModel(
  options: CombatViewModelOptions,
): CombatViewModel {
  const conditions = options.conditions ?? EMPTY_CONDITIONS;
  const targetDetailsByBlueprint = new Map(
    options.targetDetailsByBlueprint ?? [],
  );
  const actorsById = new Map<EntityId, MutableVitals>();
  const targetSelection = createCombatTargetSelection({
    playerEntityId: options.playerEntityId,
  });
  const abilityReadyAtTick = new Map<number, number>();
  const groupReadyAtTick = new Map<number, number>();
  let activeConditions: readonly ActiveConditionState[] = [];
  let currentTick = 0;
  let playerDead = false;
  /**
   * Whether any roster has been seen yet. A resumed run is bootstrapped with a
   * spawn for every actor its snapshot holds, and a fresh one spawns its
   * initial actors on the first tick, so once one spawn has arrived the roster
   * is complete for that moment.
   */
  let sawRoster = false;
  let bag: readonly RunBagEntry[] = [];
  let lootLog: readonly CombatLootLogEntry[] = [];
  let lastRejection: CombatCommandRejection | null = null;
  let minimapRevision = 0;
  let cachedMinimapRevision = -1;
  let cachedMinimap: CombatMinimapView = {
    floor: options.initialFloor ?? 0,
    actors: [],
  };

  const maxHealthFor = (blueprintId: string, fallback: number): number =>
    options.maxHealthByBlueprint.get(blueprintId) ?? Math.max(fallback, 1);

  const maxResourceFor = (blueprintId: string): number =>
    options.maxResourceByBlueprint.get(blueprintId) ?? 0;

  const actorFor = (entityId: EntityId): MutableVitals | undefined =>
    actorsById.get(entityId);

  const invalidateMinimap = (): void => {
    minimapRevision += 1;
  };

  const actorFromEvent = (
    entityId: EntityId,
    blueprintId: string | undefined,
    fallbackHealth: number,
    position?: GridPosition,
    facing?: Direction,
  ): MutableVitals => {
    const existing = actorFor(entityId);
    if (existing !== undefined) {
      if (position !== undefined) existing.position = copyPosition(position);
      if (facing !== undefined) existing.facing = facing;
      return existing;
    }

    const resolvedBlueprintId =
      blueprintId ??
      (entityId === options.playerEntityId
        ? options.playerBlueprintId
        : 'unknown');
    const maxHealth = maxHealthFor(resolvedBlueprintId, fallbackHealth);
    const maxResource = maxResourceFor(resolvedBlueprintId);
    const actor: MutableVitals = {
      entityId,
      blueprintId: resolvedBlueprintId,
      health: maxHealth,
      maxHealth,
      resource: maxResource,
      maxResource,
      position: position === undefined ? null : copyPosition(position),
      facing: facing ?? null,
    };
    actorsById.set(entityId, actor);
    return actor;
  };

  const abilityFor = (index: number): AbilityDefinition | undefined =>
    options.abilities[index];

  const conditionFor = (
    index: number,
  ): ScenarioConditionDefinition | undefined => conditions[index];

  const activePosture = (): {
    readonly abilityId: string;
    readonly label: string;
  } | null => {
    for (const ability of options.abilities) {
      if (!ability.toggle) {
        continue;
      }
      if (ability.appliedConditionIndex === null) {
        continue;
      }
      if (
        activeConditions.some(
          (entry) => entry.conditionIndex === ability.appliedConditionIndex,
        )
      ) {
        return {
          abilityId: ability.abilityId,
          label: titleFromAbilityId(ability.abilityId),
        };
      }
    }
    return null;
  };

  const restoreCooldownsFromSnapshot = (snapshot: SimulationSnapshot): void => {
    abilityReadyAtTick.clear();
    groupReadyAtTick.clear();
    const player = snapshot.actors.find(
      (actor) => actor.entityId === options.playerEntityId,
    );
    if (player === undefined) {
      return;
    }

    for (const entry of player.abilityCooldowns) {
      abilityReadyAtTick.set(entry.abilityIndex, entry.readyAtTick);
    }
    for (const entry of player.groupCooldowns) {
      groupReadyAtTick.set(entry.groupIndex, entry.readyAtTick);
    }
  };

  const applyPlayerPosture = (
    ability: AbilityDefinition,
    tick: number,
  ): boolean => {
    if (ability.appliedConditionIndex === null) {
      return false;
    }

    const activeConditionIndex = ability.appliedConditionIndex;
    const alreadyActive = activeConditions.some(
      (entry) => entry.conditionIndex === activeConditionIndex,
    );
    if (ability.toggle && alreadyActive) {
      activeConditions = activeConditions.filter(
        (entry) => entry.conditionIndex !== activeConditionIndex,
      );
      return true;
    }

    const definition = conditionFor(activeConditionIndex);
    activeConditions = activeConditions.filter((entry) => {
      if (entry.conditionIndex === activeConditionIndex) {
        return false;
      }
      if (definition?.exclusivityGroup === null || definition === undefined) {
        return true;
      }
      return entry.exclusivityGroup !== definition.exclusivityGroup;
    });
    activeConditions = [
      ...activeConditions,
      {
        conditionIndex: activeConditionIndex,
        exclusivityGroup: definition?.exclusivityGroup ?? null,
        expiresAtTick:
          definition === undefined || definition.durationTicks === 0
            ? 0
            : tick + definition.durationTicks,
      },
    ];
    return false;
  };

  const clearProjectionState = (preserveBag: boolean): void => {
    actorsById.clear();
    abilityReadyAtTick.clear();
    groupReadyAtTick.clear();
    activeConditions = [];
    currentTick = 0;
    playerDead = false;
    sawRoster = false;
    if (!preserveBag) {
      bag = [];
    }
    lootLog = [];
    lastRejection = null;
    targetSelection.reset();
    invalidateMinimap();
  };

  const handle = (events: readonly SimulationEvent[]): void => {
    for (const event of events) {
      currentTick = event.tick;
      targetSelection.handle([event]);
      switch (event.payload.type) {
        case 'actor/spawned': {
          sawRoster = true;
          actorFromEvent(
            event.payload.entityId,
            event.payload.blueprintId,
            maxHealthFor(event.payload.blueprintId, 1),
            event.payload.position,
            event.payload.facing,
          );
          invalidateMinimap();
          break;
        }
        case 'actor/moved': {
          const actor = actorFromEvent(event.payload.entityId, undefined, 1);
          actor.position = copyPosition(event.payload.to);
          actor.facing = event.payload.facing;
          invalidateMinimap();
          break;
        }
        case 'actor/transitioned': {
          const actor = actorFromEvent(event.payload.entityId, undefined, 1);
          actor.position = copyPosition(event.payload.to);
          invalidateMinimap();
          break;
        }
        case 'actor/faced': {
          const actor = actorFromEvent(event.payload.entityId, undefined, 1);
          actor.facing = event.payload.facing;
          // Turning in place moves nothing, but the minimap arrow is a heading:
          // without this the player faces one way and the marker another.
          invalidateMinimap();
          break;
        }
        case 'actor/despawned':
          actorsById.delete(event.payload.entityId);
          invalidateMinimap();
          break;
        case 'combat/damaged': {
          const actor = actorFromEvent(
            event.payload.entityId,
            undefined,
            event.payload.remainingHealth + event.payload.amount,
          );
          actor.health = clamp(
            event.payload.remainingHealth,
            0,
            actor.maxHealth,
          );
          break;
        }
        case 'combat/healed': {
          const actor = actorFromEvent(
            event.payload.entityId,
            undefined,
            event.payload.health,
          );
          actor.health = clamp(event.payload.health, 0, actor.maxHealth);
          break;
        }
        case 'combat/regenerated': {
          const actor = actorFromEvent(
            event.payload.entityId,
            undefined,
            event.payload.health,
          );
          actor.health = clamp(event.payload.health, 0, actor.maxHealth);
          actor.resource = clamp(event.payload.resource, 0, actor.maxResource);
          break;
        }
        case 'combat/leeched': {
          const actor = actorFromEvent(
            event.payload.entityId,
            undefined,
            event.payload.health,
          );
          actor.health = clamp(event.payload.health, 0, actor.maxHealth);
          actor.resource = clamp(event.payload.resource, 0, actor.maxResource);
          break;
        }
        case 'ability/cast': {
          const ability = abilityFor(event.payload.abilityIndex);
          if (event.payload.entityId === options.playerEntityId && ability) {
            const caster = actorFromEvent(
              event.payload.entityId,
              options.playerBlueprintId,
              1,
            );
            const toggledOff = applyPlayerPosture(ability, event.tick);
            if (!toggledOff) {
              caster.resource = clamp(
                caster.resource - ability.resourceCost,
                0,
                caster.maxResource,
              );
            }
            abilityReadyAtTick.set(
              event.payload.abilityIndex,
              event.tick + ability.cooldownTicks,
            );
            groupReadyAtTick.set(
              ability.primaryCooldownGroup,
              Math.max(
                groupReadyAtTick.get(ability.primaryCooldownGroup) ?? 0,
                event.tick + ability.groupCooldownTicks,
              ),
            );
            if (ability.secondaryCooldownGroup !== null) {
              groupReadyAtTick.set(
                ability.secondaryCooldownGroup,
                Math.max(
                  groupReadyAtTick.get(ability.secondaryCooldownGroup) ?? 0,
                  event.tick + ability.secondaryGroupCooldownTicks,
                ),
              );
            }
          }
          break;
        }
        case 'loot/granted': {
          bag = projectRunBag([event], options.itemKeys, bag);
          const itemKey = options.itemKeys[event.payload.itemIndex];
          if (itemKey === undefined) {
            throw new RangeError(
              `Unknown itemIndex ${event.payload.itemIndex} in loot/granted event`,
            );
          }
          lootLog = [
            ...lootLog,
            {
              itemKey,
              count: event.payload.count,
              tick: event.tick,
            },
          ];
          break;
        }
        case 'actor/died':
          if (event.payload.entityId === options.playerEntityId) {
            playerDead = true;
          } else {
            actorsById.delete(event.payload.entityId);
            invalidateMinimap();
          }
          break;
        case 'command/rejected':
          lastRejection = {
            commandType: event.payload.commandType,
            code: event.payload.code,
            tick: event.tick,
          };
          break;
        default:
          break;
      }
    }
  };

  const vitalsFor = (entityId: EntityId | null): CombatVitalsView | null => {
    if (entityId === null) return null;
    const actor = actorFor(entityId);
    return actor === undefined ? null : copyVitals(actor);
  };

  /**
   * Every group the catalog names, in ascending order, with what it still owes.
   * Read from the catalog rather than from the groups that happen to have been
   * cast, so a group nobody has spent yet is still reported -- at zero, which
   * is the honest answer, instead of missing.
   */
  const cooldownGroupViews = (): CombatCooldownGroupView[] => {
    const groups = new Set<number>();

    for (const ability of options.abilities) {
      groups.add(ability.primaryCooldownGroup);
      if (ability.secondaryCooldownGroup !== null) {
        groups.add(ability.secondaryCooldownGroup);
      }
    }

    return [...groups]
      .sort((left, right) => left - right)
      .map((group) => ({
        group,
        remainingTicks: Math.max(
          0,
          (groupReadyAtTick.get(group) ?? 0) - currentTick,
        ),
      }));
  };

  const targetDetailsFor = (
    entityId: EntityId | null,
  ): CombatTargetDetails | null => {
    if (entityId === null) return null;
    const actor = actorFor(entityId);
    if (actor === undefined) return null;
    const authored = targetDetailsByBlueprint.get(actor.blueprintId);
    if (authored !== undefined) {
      return {
        ...authored,
        resistances: authored.resistances.map((entry) => ({ ...entry })),
      };
    }
    return {
      blueprintId: actor.blueprintId,
      displayName: titleFromBlueprintId(actor.blueprintId),
      assetKey: null,
      resistances: [],
    };
  };

  const minimapView = (): CombatMinimapView => {
    if (cachedMinimapRevision === minimapRevision) {
      return cachedMinimap;
    }

    const playerPosition = actorFor(options.playerEntityId)?.position;
    const firstPosition = [...actorsById.values()].find(
      (actor) => actor.position !== null,
    )?.position;
    const floor =
      playerPosition?.z ?? firstPosition?.z ?? options.initialFloor ?? 0;
    cachedMinimap = {
      floor,
      actors: [...actorsById.values()]
        .filter(
          (actor): actor is MutableVitals & { position: GridPosition } =>
            actor.position !== null,
        )
        .map((actor) => ({
          entityId: actor.entityId,
          blueprintId: actor.blueprintId,
          position: copyPosition(actor.position),
          isPlayer: actor.entityId === options.playerEntityId,
          facing: actor.facing,
        })),
    };
    cachedMinimapRevision = minimapRevision;
    return cachedMinimap;
  };

  const snapshot = (): CombatViewState => {
    const selectedTargetId = targetSelection.targetId();
    const playerPosture = activePosture();
    const hasteConditionIndex = conditions.findIndex(
      (condition) => condition.conditionId === 'haste',
    );
    const hasteEntry =
      hasteConditionIndex === -1
        ? undefined
        : activeConditions.find(
            (entry) => entry.conditionIndex === hasteConditionIndex,
          );
    const playerHaste =
      hasteEntry === undefined
        ? null
        : {
            remainingTicks:
              hasteEntry.expiresAtTick === 0
                ? 0
                : Math.max(0, hasteEntry.expiresAtTick - currentTick),
          };
    return {
      tick: currentTick,
      player: vitalsFor(options.playerEntityId),
      targetEntityId: selectedTargetId,
      target: vitalsFor(selectedTargetId),
      targetDetails: targetDetailsFor(selectedTargetId),
      minimap: minimapView(),
      abilities: Object.freeze(
        options.abilities.map((ability, index) => {
          const groupReadyAtTick_ = Math.max(
            groupReadyAtTick.get(ability.primaryCooldownGroup) ?? 0,
            ability.secondaryCooldownGroup === null
              ? 0
              : (groupReadyAtTick.get(ability.secondaryCooldownGroup) ?? 0),
          );
          const readyAtTick = Math.max(
            abilityReadyAtTick.get(index) ?? 0,
            groupReadyAtTick_,
          );
          const remainingCooldownTicks = Math.max(0, readyAtTick - currentTick);
          const player = actorFor(options.playerEntityId);
          return {
            index,
            abilityId: ability.abilityId,
            label: titleFromAbilityId(ability.abilityId),
            resourceCost: ability.resourceCost,
            cooldownTicks: ability.cooldownTicks,
            remainingCooldownTicks,
            primaryCooldownGroup: ability.primaryCooldownGroup,
            secondaryCooldownGroup: ability.secondaryCooldownGroup,
            remainingGroupCooldownTicks: Math.max(
              0,
              groupReadyAtTick_ - currentTick,
            ),
            available:
              !playerDead &&
              remainingCooldownTicks === 0 &&
              (player?.resource ?? 0) >= ability.resourceCost,
            active:
              ability.appliedConditionIndex !== null &&
              activeConditions.some(
                (entry) =>
                  entry.conditionIndex === ability.appliedConditionIndex,
              ),
          };
        }),
      ),
      cooldownGroups: Object.freeze(cooldownGroupViews()),
      playerPosture,
      playerHaste,
      lootLog: Object.freeze(lootLog.map((entry) => ({ ...entry }))),
      bag: Object.freeze(bag.map((entry) => ({ ...entry }))),
      // A run resumed from a save written after the player died never replays
      // his `actor/died`, so the absence of him from the roster is the only
      // evidence left that he is gone. Without this the hunt came back
      // reporting him alive and merely missing: no vitals, no sprite, and no
      // death overlay to reach the restart button through.
      playerDead:
        playerDead ||
        (sawRoster && actorFor(options.playerEntityId) === undefined),
      lastRejection: lastRejection === null ? null : { ...lastRejection },
    };
  };

  return {
    targetDetailsByBlueprint,
    handle,
    restoreBag: (entries) => {
      bag = entries.map((entry) => ({ ...entry }));
    },
    restoreSnapshot: (state) => {
      clearProjectionState(true);
      currentTick = state.tick;
      sawRoster = state.actors.length > 0;
      for (const actorState of state.actors) {
        const actor = actorFromEvent(
          actorState.entityId,
          actorState.blueprintId,
          actorState.health,
          actorState.position,
          actorState.facing,
        );
        actor.health = clamp(actorState.health, 0, actor.maxHealth);
        actor.resource = clamp(actorState.resource, 0, actor.maxResource);
      }
      const player = state.actors.find(
        (actor) => actor.entityId === options.playerEntityId,
      );
      activeConditions =
        player?.activeConditions.map((entry) => ({ ...entry })) ?? [];
      restoreCooldownsFromSnapshot(state);
      targetSelection.setTarget(player?.targetEntityId ?? null);
    },
    setTick: (tick) => {
      currentTick = tick;
    },
    setTarget: (entityId) => targetSelection.setTarget(entityId),
    selectTarget: (entityId, actors) =>
      targetSelection.select(entityId, actors),
    cycleTarget: (actors) => targetSelection.cycle(actors),
    reset: () => {
      clearProjectionState(false);
    },
    snapshot,
  };
}

export const DEFAULT_COMBAT_ITEM_KEYS: readonly string[] = Object.freeze([
  'item:tibia:gold-coin',
  'item:tibia:ham',
  'item:tibia:legion-helmet',
  'item:tibia:lump-of-dirt',
  'item:tibia:mace',
  'item:tibia:meat',
  'item:tibia:sword',
  'item:tibia:worm',
]);

export const DEFAULT_COMBAT_ABILITIES: readonly AbilityDefinition[] =
  Object.freeze([
    {
      abilityId: 'berserk',
      effect: 'damage',
      shape: 'area',
      radius: 1,
      rangeTiles: 0,
      resourceCost: 115,
      cooldownTicks: 80,
      groupCooldownTicks: 40,
      minPower: 48,
      maxPower: 129,
      element: 'physical',
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
    },
    {
      abilityId: 'brutal-strike',
      effect: 'damage',
      shape: 'target',
      radius: 0,
      rangeTiles: 1,
      resourceCost: 30,
      cooldownTicks: 120,
      groupCooldownTicks: 40,
      minPower: 35,
      maxPower: 63,
      element: 'physical',
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
    },
    {
      abilityId: 'wound-cleansing',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 40,
      cooldownTicks: 20,
      groupCooldownTicks: 20,
      minPower: 32,
      maxPower: 58,
      element: 'physical',
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
    },
    {
      abilityId: 'groundshaker',
      effect: 'damage',
      shape: 'area',
      radius: 3,
      rangeTiles: 0,
      resourceCost: 160,
      cooldownTicks: 160,
      groupCooldownTicks: 40,
      minPower: 56,
      maxPower: 113,
      element: 'physical',
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
    },
    {
      abilityId: 'whirlwind-throw',
      effect: 'damage',
      shape: 'target',
      radius: 0,
      rangeTiles: 5,
      resourceCost: 40,
      cooldownTicks: 120,
      groupCooldownTicks: 40,
      minPower: 40,
      maxPower: 103,
      element: 'physical',
      primaryCooldownGroup: 0,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
    },
    {
      abilityId: 'blood-rage',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      // A stance is free: see the divergence note on the PB-05 selection.
      resourceCost: 0,
      cooldownTicks: 0,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      element: 'physical',
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: 2,
      secondaryGroupCooldownTicks: 40,
      appliedConditionIndex: 0,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: true,
      forcedTargetDurationTicks: 0,
    },
    {
      abilityId: 'protector',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      // A stance is free: see the divergence note on the PB-05 selection.
      resourceCost: 0,
      cooldownTicks: 0,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      element: 'physical',
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: 2,
      secondaryGroupCooldownTicks: 40,
      appliedConditionIndex: 1,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: true,
      forcedTargetDurationTicks: 0,
    },
    {
      abilityId: 'challenge',
      effect: 'damage',
      shape: 'area',
      radius: 1,
      rangeTiles: 0,
      resourceCost: 30,
      cooldownTicks: 40,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      element: 'physical',
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: null,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 40,
    },
    {
      abilityId: 'haste',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 60,
      cooldownTicks: 40,
      groupCooldownTicks: 40,
      minPower: 0,
      maxPower: 0,
      element: 'physical',
      primaryCooldownGroup: 1,
      secondaryCooldownGroup: null,
      secondaryGroupCooldownTicks: 0,
      appliedConditionIndex: 2,
      maxCharges: null,
      rechargeKind: 'none',
      toggle: false,
      forcedTargetDurationTicks: 0,
    },
  ]);

/**
 * Compatibility fallback for local/default view-model fixtures until the hunt
 * boot path passes scenario-authored conditions through `createHuntCombatViewModel`.
 * Keep this aligned with the approved PB-05 posture content; it is not a new
 * production source of truth.
 */
export const DEFAULT_COMBAT_FALLBACK_CONDITIONS: readonly ScenarioConditionDefinition[] =
  Object.freeze([
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
      speedPermille: 600,
      manaShield: false,
      tickDamageAmount: 0,
      tickDamageIntervalTicks: 0,
      elementBonusPermille: 0,
      convertNextAbilityElement: false,
      bonusElement: null,
    },
  ]);

/**
 * The HUD needs the caps the kernel was built with. Events only carry current
 * health, so a hard-coded ceiling here shows the wrong bar the moment the
 * character sheet changes -- which is exactly what happened when the knight
 * went from 185 HP to 590.
 */
export function createHuntCombatViewModel(
  runtime: RuntimeContentBundle,
  playerEntityId: EntityId = 1 as EntityId,
  playerBlueprintId = 'player',
  abilitiesOrConditions:
    | readonly AbilityDefinition[]
    | readonly ScenarioConditionDefinition[] = DEFAULT_COMBAT_ABILITIES,
  conditions: readonly ScenarioConditionDefinition[] = DEFAULT_COMBAT_FALLBACK_CONDITIONS,
  blueprints: readonly ActorBlueprint[] = [],
  character?: CharacterDefinition,
  itemKeys: readonly string[] = DEFAULT_COMBAT_ITEM_KEYS,
): CombatViewModel {
  const receivedConditions =
    abilitiesOrConditions[0] !== undefined &&
    'conditionId' in abilitiesOrConditions[0];
  const abilities = receivedConditions
    ? DEFAULT_COMBAT_ABILITIES
    : (abilitiesOrConditions as readonly AbilityDefinition[]);
  const scenarioConditions = receivedConditions
    ? (abilitiesOrConditions as readonly ScenarioConditionDefinition[])
    : conditions;
  const maxHealthByBlueprint = new Map<string, number>();
  const maxResourceByBlueprint = new Map<string, number>();
  const blueprintById = new Map(
    blueprints.map((blueprint) => [blueprint.blueprintId, blueprint]),
  );
  const targetDetailsByBlueprint = new Map<string, CombatTargetDetails>();

  if (character !== undefined) {
    maxHealthByBlueprint.set(playerBlueprintId, character.maxHealth);
    maxResourceByBlueprint.set(playerBlueprintId, character.maxMana);
  }
  for (const creature of runtime.creatures) {
    // `buildHuntScenario` names a blueprint after the tail of its content key.
    const blueprintId = creature.stableKey.split(':').at(-1);
    if (blueprintId === undefined) continue;
    maxHealthByBlueprint.set(blueprintId, creature.stats.health);
    maxResourceByBlueprint.set(blueprintId, 0);
    targetDetailsByBlueprint.set(blueprintId, {
      blueprintId,
      displayName: creature.displayName,
      assetKey: creature.stableKey,
      corpseAssetKey:
        creature.corpseItemId === undefined
          ? null
          : `item:tibia:dead-${blueprintId}`,
      resistances: blueprintById.get(blueprintId)?.resistances ?? [],
    });
  }

  return createCombatViewModel({
    playerEntityId,
    playerBlueprintId,
    abilities,
    conditions: scenarioConditions,
    itemKeys,
    maxHealthByBlueprint,
    maxResourceByBlueprint,
    targetDetailsByBlueprint,
  });
}

export function createDefaultCombatViewModel(
  playerEntityId: EntityId = 1 as EntityId,
): CombatViewModel {
  return createCombatViewModel({
    playerEntityId,
    playerBlueprintId: 'player',
    abilities: DEFAULT_COMBAT_ABILITIES,
    conditions: DEFAULT_COMBAT_FALLBACK_CONDITIONS,
    itemKeys: DEFAULT_COMBAT_ITEM_KEYS,
    maxHealthByBlueprint: new Map([
      ['player', 185],
      ['rotworm', 65],
    ]),
    maxResourceByBlueprint: new Map([['player', 185]]),
    targetDetailsByBlueprint: new Map([
      [
        'rotworm',
        {
          blueprintId: 'rotworm',
          displayName: 'Rotworm',
          assetKey: 'creature:tibia:rotworm',
          corpseAssetKey: 'item:tibia:dead-rotworm',
          resistances: [],
        },
      ],
    ]),
  });
}
