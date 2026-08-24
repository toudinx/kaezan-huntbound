/**
 * Composer for the frozen PB-05 combat session (`pb-05-hunt-combat`, seed
 * `2c3d4e5f60718293`, 2700 ticks). Rotworm `aggroRadius` is Canary
 * `targetDistance` 1 via `buildHuntScenario`. Tick count is 2700 so a death
 * plus every slot's `respawnTicks` 1800 still fits (B6).
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  buildHuntScenario,
  createContentRegistry,
  loadHuntDefinition,
  parseKnightPostures,
} from '../../packages/content/src/index.ts';
import type {
  ActorState,
  CharacterDefinition,
  Direction,
  GridPosition,
  KernelScenario,
  RuntimeContentBundle,
  SimulationCommandInput,
  SimulationCommandLog,
  SimulationCommandRecord,
  SimulationDiagnosticCode,
  SimulationEvent,
  SimulationEventPayload,
} from '../../packages/contracts/src/index.ts';
import {
  CharacterDefinitionSchema,
  createEntityId,
  createSeed,
  createTickIndex,
  RuntimeContentBundleSchema,
  SIMULATION_RULES_VERSION,
  SIMULATION_SCHEMA_VERSION,
} from '../../packages/contracts/src/index.ts';
import {
  createOccupancyIndex,
  createSimulationKernel,
  createStaticGrid,
  DIRECTIONS,
  encodeCanonicalJson,
  encodeCommandLog,
  resolveStep,
  type StaticGrid,
  translate,
} from '../../packages/simulation/src/index.ts';

export const PB05_COMBAT_SEED = '2c3d4e5f60718293';
export const PB05_COMBAT_TICK_COUNT = 2700;
export const PLAYER_ENTITY_ID = 1;
export const ABILITY_BERSERK = 0;
export const ABILITY_BRUTAL_STRIKE = 1;
export const ABILITY_WOUND_CLEANSING = 2;

const COMBAT_REJECT_CODES = new Set<SimulationDiagnosticCode>([
  'SIM_TARGET_UNKNOWN',
  'SIM_TARGET_SAME_FACTION',
  'SIM_ATTACK_OUT_OF_RANGE',
  'SIM_ATTACK_ON_COOLDOWN',
  'SIM_ABILITY_UNKNOWN',
  'SIM_ABILITY_ON_COOLDOWN',
  'SIM_ABILITY_NO_RESOURCE',
  'SIM_ABILITY_OUT_OF_RANGE',
]);

const repoRoot = resolve(import.meta.dirname, '../..');

export interface SessionCoverage {
  readonly attacked: boolean;
  readonly damagedAttack: boolean;
  readonly damagedAbility: boolean;
  readonly playerReceivedDamage: boolean;
  readonly healed: boolean;
  readonly castBerserk: boolean;
  readonly castBrutalStrike: boolean;
  readonly castWoundCleansing: boolean;
  readonly targetChanged: boolean;
  readonly died: boolean;
  readonly lootGranted: boolean;
  readonly respawnAfterDeath: boolean;
  readonly combatRejected: boolean;
}

export interface ComposedCombatSession {
  readonly scenario: KernelScenario;
  readonly scenarioText: string;
  readonly logText: string;
  readonly events: readonly SimulationEvent[];
  readonly coverage: SessionCoverage;
  readonly blockers: {
    readonly rotwormAggroRadius: number;
    readonly respawnTicks: readonly number[];
    readonly deathTicks: readonly number[];
    readonly spawnTicks: readonly number[];
    readonly maxLiveActors: number;
    readonly deaths: readonly {
      readonly tick: number;
      readonly entityId: number;
      readonly position: GridPosition;
    }[];
    readonly lateSpawns: readonly {
      readonly tick: number;
      readonly entityId: number;
      readonly position: GridPosition;
    }[];
  };
}

function cellKey(position: GridPosition): string {
  return `${position.x}:${position.y}:${position.z}`;
}

function sameCell(left: GridPosition, right: GridPosition): boolean {
  return left.x === right.x && left.y === right.y && left.z === right.z;
}

function chebyshev(left: GridPosition, right: GridPosition): number {
  const dx = left.x < right.x ? right.x - left.x : left.x - right.x;
  const dy = left.y < right.y ? right.y - left.y : left.y - right.y;
  return dx < dy ? dy : dx;
}

function isAdjacent(left: GridPosition, right: GridPosition): boolean {
  return left.z === right.z && chebyshev(left, right) <= 1;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, 'utf8')) as unknown;
}

export async function buildPb05HuntScenario(): Promise<KernelScenario> {
  const huntRaw = await readJson(
    join(
      repoRoot,
      'packages/content/src/generated/hunts/venore-rotworm-cave/hunt.json',
    ),
  );
  const hunt = loadHuntDefinition(huntRaw);
  if (!hunt.ok) {
    throw new Error(
      `Hunt definition is invalid: ${hunt.diagnostics.map((item) => item.message).join('; ')}`,
    );
  }

  const catalogRaw = await readJson(
    join(
      repoRoot,
      'packages/content/src/generated/pb-01-contract-coverage.json',
    ),
  );
  const runtime = RuntimeContentBundleSchema.parse(catalogRaw);
  const selectionRaw = await readJson(
    join(repoRoot, 'packages/content/src/selections/pb-05-knight-combat.json'),
  );
  const character = characterFromPb05Selection(runtime, selectionRaw);
  const postures = posturesFromPb05Selection(selectionRaw);

  const built = buildHuntScenario(
    hunt.value,
    character,
    createContentRegistry(runtime),
    createSeed(PB05_COMBAT_SEED),
    { postures },
  );
  if (!built.ok) {
    throw new Error(
      `Hunt scenario failed: ${built.diagnostics.map((item) => item.message).join('; ')}`,
    );
  }
  return built.value.scenario;
}

export function characterFromPb05Selection(
  runtime: RuntimeContentBundle,
  selection: unknown,
): CharacterDefinition {
  const character = runtime.characters[0];
  if (character === undefined) {
    throw new Error('Catalog is missing the hunt character');
  }
  if (
    typeof selection !== 'object' ||
    selection === null ||
    Array.isArray(selection)
  ) {
    throw new Error('PB-05 selection must be an object');
  }
  const selectedCharacter = (selection as { readonly character?: unknown })
    .character;
  if (
    typeof selectedCharacter !== 'object' ||
    selectedCharacter === null ||
    Array.isArray(selectedCharacter)
  ) {
    throw new Error('PB-05 selection is missing its character');
  }
  const kit = (selectedCharacter as { readonly kit?: unknown }).kit;
  if (kit === undefined) {
    throw new Error('PB-05 selection character is missing its kit');
  }
  return CharacterDefinitionSchema.parse({
    ...character,
    spellKeys: undefined,
    kit,
  });
}

function posturesFromPb05Selection(selection: unknown) {
  if (
    typeof selection !== 'object' ||
    selection === null ||
    Array.isArray(selection)
  ) {
    throw new Error('PB-05 selection must be an object');
  }
  return parseKnightPostures(
    (selection as { readonly postures?: unknown }).postures,
  );
}

function payloadsOfType<T extends SimulationEventPayload['type']>(
  events: readonly SimulationEvent[],
  type: T,
): readonly Extract<SimulationEventPayload, { type: T }>[] {
  return events
    .map((event) => event.payload)
    .filter(
      (payload): payload is Extract<SimulationEventPayload, { type: T }> =>
        payload.type === type,
    );
}

export function sessionCoverage(
  events: readonly SimulationEvent[],
): SessionCoverage {
  const casts = payloadsOfType(events, 'ability/cast');
  const deaths = events.filter((event) => event.payload.type === 'actor/died');
  const respawnAfterDeath = events.some((event) => {
    if (event.payload.type !== 'actor/spawned') {
      return false;
    }
    const spawn = event.payload;
    return deaths.some(
      (death) =>
        death.tick < event.tick &&
        death.payload.type === 'actor/died' &&
        sameCell(death.payload.position, spawn.position),
    );
  });

  const damaged = payloadsOfType(events, 'combat/damaged');
  return {
    attacked: payloadsOfType(events, 'combat/attacked').length > 0,
    damagedAttack: damaged.some((payload) => payload.cause === 'attack'),
    damagedAbility: damaged.some((payload) => payload.cause === 'ability'),
    playerReceivedDamage: damaged.some(
      (payload) => payload.entityId === PLAYER_ENTITY_ID,
    ),
    healed: payloadsOfType(events, 'combat/healed').length > 0,
    castBerserk: casts.some(
      (payload) => payload.abilityIndex === ABILITY_BERSERK,
    ),
    castBrutalStrike: casts.some(
      (payload) => payload.abilityIndex === ABILITY_BRUTAL_STRIKE,
    ),
    castWoundCleansing: casts.some(
      (payload) => payload.abilityIndex === ABILITY_WOUND_CLEANSING,
    ),
    targetChanged: payloadsOfType(events, 'combat/target-changed').length > 0,
    died: deaths.length > 0,
    lootGranted: payloadsOfType(events, 'loot/granted').length > 0,
    respawnAfterDeath,
    combatRejected: payloadsOfType(events, 'command/rejected').some((payload) =>
      COMBAT_REJECT_CODES.has(payload.code),
    ),
  };
}

function playerOf(actors: readonly ActorState[]): ActorState | undefined {
  return actors.find((actor) => actor.entityId === PLAYER_ENTITY_ID);
}

function livingFoes(actors: readonly ActorState[]): readonly ActorState[] {
  return actors.filter(
    (actor) => actor.entityId !== PLAYER_ENTITY_ID && actor.health > 0,
  );
}

function nearestFoe(
  player: ActorState,
  foes: readonly ActorState[],
): ActorState | undefined {
  const sameFloor = foes.filter((foe) => foe.position.z === player.position.z);
  const pool = sameFloor.length > 0 ? sameFloor : foes;
  let best: ActorState | undefined;
  let bestDistance = 0;
  for (const foe of pool) {
    const floorPenalty = foe.position.z === player.position.z ? 0 : 1000;
    const distance = chebyshev(player.position, foe.position) + floorPenalty;
    if (
      best === undefined ||
      distance < bestDistance ||
      (distance === bestDistance && foe.entityId < best.entityId)
    ) {
      best = foe;
      bestDistance = distance;
    }
  }
  return best;
}

function firstStepToward(
  grid: StaticGrid,
  actors: readonly ActorState[],
  player: ActorState,
  target: GridPosition,
  stepCooldownTicks: number,
): Direction | undefined {
  const occupancy = createOccupancyIndex(actors);
  const goal = new Set<string>();
  for (const direction of DIRECTIONS) {
    const neighbor = translate(target, direction);
    if (
      neighbor.z === target.z &&
      grid.isInside(neighbor) &&
      !grid.isBlockedTerrain(neighbor) &&
      !occupancy.isOccupied(neighbor)
    ) {
      goal.add(cellKey(neighbor));
    }
  }
  if (goal.has(cellKey(player.position))) {
    return undefined;
  }

  const origin = cellKey(player.position);
  const visited = new Set<string>([origin]);
  const queue: {
    readonly actor: ActorState;
    readonly first: Direction | undefined;
  }[] = [{ actor: player, first: undefined }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      break;
    }
    for (const direction of DIRECTIONS) {
      const outcome = resolveStep(
        grid,
        occupancy,
        current.actor,
        direction,
        stepCooldownTicks,
      );
      if (!outcome.ok) {
        continue;
      }
      const landing = outcome.transitionedTo ?? outcome.to;
      const key = cellKey(landing);
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      const first = current.first ?? direction;
      if (goal.has(key)) {
        return first;
      }
      queue.push({
        actor: {
          ...current.actor,
          position: landing,
          transitionGuard: outcome.transitionedTo ?? null,
        },
        first,
      });
    }
  }
  return undefined;
}

function moveCommand(
  tick: number,
  direction: Direction,
): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer: 'player',
    command: {
      type: 'actor/move-step',
      entityId: createEntityId(PLAYER_ENTITY_ID),
      direction,
    },
  };
}

function attackCommand(
  tick: number,
  targetEntityId: number,
): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer: 'player',
    command: {
      type: 'actor/attack',
      entityId: createEntityId(PLAYER_ENTITY_ID),
      targetEntityId: createEntityId(targetEntityId),
    },
  };
}

function castCommand(
  tick: number,
  abilityIndex: number,
  targetEntityId: number | null,
): SimulationCommandInput {
  return {
    tick: createTickIndex(tick),
    issuer: 'player',
    command: {
      type: 'actor/cast-ability',
      entityId: createEntityId(PLAYER_ENTITY_ID),
      abilityIndex,
      targetEntityId:
        targetEntityId === null ? null : createEntityId(targetEntityId),
    },
  };
}

/**
 * Chooses the next external player command. Each branch has a declared purpose:
 * walk into melee range, land a melee hit, refuse a cooldown attack, cast the
 * three kit abilities, refuse a resource-starved cast, then finish the kill
 * and wait on the death cell for a seat respawn.
 */
function primaryGroupReadyAt(actor: ActorState): number {
  for (const entry of actor.groupCooldowns) {
    if (entry.groupIndex === 0) {
      return entry.readyAtTick;
    }
  }
  return 0;
}

function nextCommand(
  tick: number,
  player: ActorState,
  foe: ActorState | undefined,
  grid: StaticGrid,
  actors: readonly ActorState[],
  stepCooldownTicks: number,
  seen: SessionCoverage,
): SimulationCommandInput | undefined {
  if (foe !== undefined && isAdjacent(player.position, foe.position)) {
    // S2 movement runs before S4 combat. Wait until the foe is locked so the
    // queued attack still has range when it resolves.
    if (tick >= foe.readyAtTick && !seen.attacked) {
      return undefined;
    }
    if (!seen.attacked) {
      return attackCommand(tick, foe.entityId);
    }
    if (!seen.combatRejected) {
      return attackCommand(tick, foe.entityId);
    }
    if (!seen.castBerserk) {
      return castCommand(tick, ABILITY_BERSERK, null);
    }
    if (!seen.castBrutalStrike && tick >= primaryGroupReadyAt(player)) {
      return castCommand(tick, ABILITY_BRUTAL_STRIKE, foe.entityId);
    }
    if (!seen.castWoundCleansing && tick >= primaryGroupReadyAt(player)) {
      return castCommand(tick, ABILITY_WOUND_CLEANSING, null);
    }
    if (!seen.combatRejected) {
      return castCommand(tick, ABILITY_BERSERK, null);
    }
    if (tick >= player.attackReadyAtTick) {
      return attackCommand(tick, foe.entityId);
    }
    return undefined;
  }

  if (!seen.castWoundCleansing && tick >= primaryGroupReadyAt(player)) {
    return castCommand(tick, ABILITY_WOUND_CLEANSING, null);
  }

  if (foe === undefined || tick < player.readyAtTick) {
    return undefined;
  }
  const direction = firstStepToward(
    grid,
    actors,
    player,
    foe.position,
    stepCooldownTicks,
  );
  if (direction === undefined) {
    return undefined;
  }
  return moveCommand(tick, direction);
}

export async function composePb05CombatSession(): Promise<ComposedCombatSession> {
  const scenario = await buildPb05HuntScenario();
  const seed = createSeed(PB05_COMBAT_SEED);
  const kernel = createSimulationKernel(scenario, seed);
  const grid = createStaticGrid(scenario);
  const playerBlueprint = scenario.blueprints.find(
    (blueprint) => blueprint.blueprintId === 'player',
  );
  if (playerBlueprint === undefined) {
    throw new Error('Scenario is missing the player blueprint');
  }

  const commands: SimulationCommandRecord[] = [];
  const events: SimulationEvent[] = [];

  for (let tick = 0; tick < PB05_COMBAT_TICK_COUNT; tick += 1) {
    const actors = kernel.state().actors;
    const player = playerOf(actors);
    if (player !== undefined) {
      const command = nextCommand(
        tick,
        player,
        nearestFoe(player, livingFoes(actors)),
        grid,
        actors,
        playerBlueprint.stepCooldownTicks,
        sessionCoverage(events),
      );
      if (command !== undefined) {
        const accepted = kernel.enqueue(command);
        if (accepted.ok) {
          commands.push({
            tick: command.tick,
            sequence: accepted.sequence,
            issuer: command.issuer,
            command: command.command,
          });
        }
      }
    }
    events.push(...kernel.advanceOne());
  }

  const log: SimulationCommandLog = {
    header: {
      kind: 'header',
      schemaVersion: SIMULATION_SCHEMA_VERSION,
      rulesVersion: SIMULATION_RULES_VERSION,
      scenarioId: scenario.scenarioId,
      scenarioRevision: scenario.scenarioRevision,
      seed,
      tickCount: PB05_COMBAT_TICK_COUNT,
    },
    commands,
  };

  return {
    scenario,
    scenarioText: `${encodeCanonicalJson(scenario)}\n`,
    logText: encodeCommandLog(log),
    events,
    coverage: sessionCoverage(events),
    blockers: {
      rotwormAggroRadius:
        scenario.blueprints.find(
          (blueprint) => blueprint.blueprintId === 'rotworm',
        )?.aggroRadius ?? -1,
      respawnTicks: [
        ...new Set(
          scenario.spawnGroups.flatMap((group) =>
            group.slots.map((slot) => slot.respawnTicks),
          ),
        ),
      ],
      deathTicks: events
        .filter((event) => event.payload.type === 'actor/died')
        .map((event) => event.tick),
      spawnTicks: events
        .filter((event) => event.payload.type === 'actor/spawned')
        .map((event) => event.tick),
      maxLiveActors: scenario.maxLiveActors,
      deaths: events
        .filter(
          (
            event,
          ): event is SimulationEvent & {
            payload: Extract<SimulationEventPayload, { type: 'actor/died' }>;
          } => event.payload.type === 'actor/died',
        )
        .map((event) => ({
          tick: event.tick,
          entityId: event.payload.entityId,
          position: event.payload.position,
        })),
      lateSpawns: events
        .filter(
          (
            event,
          ): event is SimulationEvent & {
            payload: Extract<SimulationEventPayload, { type: 'actor/spawned' }>;
          } => event.payload.type === 'actor/spawned' && event.tick > 0,
        )
        .map((event) => ({
          tick: event.tick,
          entityId: event.payload.entityId,
          position: event.payload.position,
        })),
    },
  };
}

export async function writePb05CombatSources(
  outDir: string,
): Promise<ComposedCombatSession> {
  const session = await composePb05CombatSession();
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'scenario.json'), session.scenarioText, 'utf8');
  await writeFile(join(outDir, 'commands.jsonl'), session.logText, 'utf8');
  return session;
}

if (import.meta.main) {
  const outIndex = process.argv.indexOf('--out');
  const outDir = outIndex >= 0 ? process.argv[outIndex + 1] : undefined;
  const session =
    outDir === undefined
      ? await composePb05CombatSession()
      : await writePb05CombatSources(outDir);
  process.stdout.write(
    `${JSON.stringify(
      { coverage: session.coverage, blockers: session.blockers },
      null,
      2,
    )}\n`,
  );
}
