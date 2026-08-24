import {
  projectRunBag,
  type RunBagEntry,
} from '../../../../packages/content/src/index.ts';
import type {
  AbilityDefinition,
  ActiveConditionState,
  EntityId,
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
}

export interface CombatVitalsView {
  readonly entityId: EntityId;
  readonly health: number;
  readonly maxHealth: number;
  readonly resource: number;
  readonly maxResource: number;
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
  readonly abilities: readonly CombatAbilityView[];
  readonly playerPosture: {
    readonly abilityId: string;
    readonly label: string;
  } | null;
  readonly lootLog: readonly CombatLootLogEntry[];
  readonly bag: readonly RunBagEntry[];
  readonly playerDead: boolean;
  readonly lastRejection: CombatCommandRejection | null;
}

export interface CombatViewModel {
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

  const maxHealthFor = (blueprintId: string, fallback: number): number =>
    options.maxHealthByBlueprint.get(blueprintId) ?? Math.max(fallback, 1);

  const maxResourceFor = (blueprintId: string): number =>
    options.maxResourceByBlueprint.get(blueprintId) ?? 0;

  const actorFor = (entityId: EntityId): MutableVitals | undefined =>
    actorsById.get(entityId);

  const actorFromEvent = (
    entityId: EntityId,
    blueprintId: string | undefined,
    fallbackHealth: number,
  ): MutableVitals => {
    const existing = actorFor(entityId);
    if (existing !== undefined) return existing;

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
          );
          break;
        }
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

  const snapshot = (): CombatViewState => {
    const selectedTargetId = targetSelection.targetId();
    const playerPosture = activePosture();
    return {
      tick: currentTick,
      player: vitalsFor(options.playerEntityId),
      targetEntityId: selectedTargetId,
      target: vitalsFor(selectedTargetId),
      abilities: Object.freeze(
        options.abilities.map((ability, index) => {
          const readyAtTick = Math.max(
            abilityReadyAtTick.get(index) ?? 0,
            groupReadyAtTick.get(ability.primaryCooldownGroup) ?? 0,
            ability.secondaryCooldownGroup === null
              ? 0
              : (groupReadyAtTick.get(ability.secondaryCooldownGroup) ?? 0),
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
      playerPosture,
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
    },
    {
      abilityId: 'blood-rage',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 20,
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
    },
    {
      abilityId: 'protector',
      effect: 'heal',
      shape: 'self',
      radius: 0,
      rangeTiles: 0,
      resourceCost: 20,
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
    },
  ]);

export const DEFAULT_COMBAT_CONDITIONS: readonly ScenarioConditionDefinition[] =
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
      damageDealtPermille: 0,
      damageReceivedPermille: -200,
      speedPermille: 0,
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
): CombatViewModel {
  const character = runtime.characters[0];
  const maxHealthByBlueprint = new Map<string, number>();
  const maxResourceByBlueprint = new Map<string, number>();

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
  }

  return createCombatViewModel({
    playerEntityId,
    playerBlueprintId,
    abilities: DEFAULT_COMBAT_ABILITIES,
    conditions: DEFAULT_COMBAT_CONDITIONS,
    itemKeys: DEFAULT_COMBAT_ITEM_KEYS,
    maxHealthByBlueprint,
    maxResourceByBlueprint,
  });
}

export function createDefaultCombatViewModel(
  playerEntityId: EntityId = 1 as EntityId,
): CombatViewModel {
  return createCombatViewModel({
    playerEntityId,
    playerBlueprintId: 'player',
    abilities: DEFAULT_COMBAT_ABILITIES,
    conditions: DEFAULT_COMBAT_CONDITIONS,
    itemKeys: DEFAULT_COMBAT_ITEM_KEYS,
    maxHealthByBlueprint: new Map([
      ['player', 185],
      ['rotworm', 65],
    ]),
    maxResourceByBlueprint: new Map([['player', 185]]),
  });
}
