import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => {
  class FakeBaseGameObject {
    x = 0;
    y = 0;
    depth = 0;
    alpha = 1;
    rotation = 0;
    scale = 1;
    visible = true;
    flipX = false;
    frame: { name: string | number } = { name: 0 };
    destroyed = false;
    tintCleared = true;
    data = new Map<string, unknown>();

    setPosition(x: number, y: number) {
      this.x = x;
      this.y = y;
      return this;
    }

    setDepth(depth: number) {
      this.depth = depth;
      return this;
    }

    setAlpha(alpha: number) {
      this.alpha = alpha;
      return this;
    }

    setRotation(rotation: number) {
      this.rotation = rotation;
      return this;
    }

    setScale(scale: number) {
      this.scale = scale;
      return this;
    }

    setVisible(visible: boolean) {
      this.visible = visible;
      return this;
    }

    setData(key: string, value: unknown) {
      this.data.set(key, value);
      return this;
    }

    getData(key: string) {
      return this.data.get(key);
    }

    clearTint() {
      this.tintCleared = true;
      return this;
    }

    setTint() {
      this.tintCleared = false;
      return this;
    }

    destroy() {
      this.destroyed = true;
      return this;
    }
  }

  class FakeSprite extends FakeBaseGameObject {
    texture: string;
    originX = 0;
    originY = 0;
    displayWidth = 0;
    displayHeight = 0;
    interactive = false;
    handlers = new Map<string, () => void>();

    constructor(texture = '') {
      super();
      this.texture = texture;
    }

    setTexture(texture: string) {
      this.texture = texture;
      return this;
    }

    setOrigin(originX: number, originY: number) {
      this.originX = originX;
      this.originY = originY;
      return this;
    }

    setDisplaySize(displayWidth: number, displayHeight: number) {
      this.displayWidth = displayWidth;
      this.displayHeight = displayHeight;
      return this;
    }

    setInteractive() {
      this.interactive = true;
      return this;
    }

    on(event: string, handler: () => void) {
      this.handlers.set(event, handler);
      return this;
    }

    setFrame(name: number | string) {
      this.frame = { name };
      return this;
    }
  }

  class FakeText extends FakeBaseGameObject {
    text = '';
    color = '#ffcf66';
    originX = 0;
    originY = 0;

    setOrigin(originX: number, originY: number) {
      this.originX = originX;
      this.originY = originY;
      return this;
    }

    setText(text: string) {
      this.text = text;
      return this;
    }

    setColor(color: string) {
      this.color = color;
      return this;
    }
  }

  class FakeGraphics extends FakeBaseGameObject {
    operations: Array<Record<string, unknown>> = [];

    clear() {
      this.operations.push({ type: 'clear' });
      return this;
    }

    lineStyle(width: number, color: number, alpha = 1) {
      this.operations.push({ type: 'lineStyle', width, color, alpha });
      return this;
    }

    strokeCircle(x: number, y: number, radius: number) {
      this.operations.push({ type: 'strokeCircle', x, y, radius });
      return this;
    }

    strokePath() {
      this.operations.push({ type: 'strokePath' });
      return this;
    }

    beginPath() {
      this.operations.push({ type: 'beginPath' });
      return this;
    }

    arc(
      x: number,
      y: number,
      radius: number,
      startAngle: number,
      endAngle: number,
      anticlockwise?: boolean,
    ) {
      this.operations.push({
        type: 'arc',
        x,
        y,
        radius,
        startAngle,
        endAngle,
        anticlockwise: anticlockwise ?? false,
      });
      return this;
    }

    fillStyle(color: number, alpha = 1) {
      this.operations.push({ type: 'fillStyle', color, alpha });
      return this;
    }

    fillRect(x: number, y: number, width: number, height: number) {
      this.operations.push({ type: 'fillRect', x, y, width, height });
      return this;
    }
  }

  class FakeScene {
    add = {
      sprite: (_x: number, _y: number, key: string) => new FakeSprite(key),
      text: (_x: number, _y: number, text: string) =>
        new FakeText().setText(text),
      graphics: () => new FakeGraphics(),
    };
    cameras = {
      main: {
        scrollX: 0,
        scrollY: 0,
        zoom: 1,
        roundPixels: false,
        setZoom(zoom: number) {
          this.zoom = zoom;
          return this;
        },
        setBackgroundColor() {
          return this;
        },
        setScroll(scrollX: number, scrollY: number) {
          this.scrollX = scrollX;
          this.scrollY = scrollY;
          return this;
        },
      },
    };
    scale = {
      width: 352,
      height: 352,
      on: () => {},
      off: () => {},
    };
    events = {
      once: (_event: string, handler: () => void) => {
        this.__shutdown = handler;
      },
    };
    scene = {
      restart: () => {},
    };
    textures = {
      exists: () => true,
    };
    load = {
      spritesheet: () => {},
      image: () => {},
    };
    game = {
      renderer: { type: 1 },
    };
    __shutdown?: () => void;
  }

  return {
    default: {
      WEBGL: 1,
      CANVAS: 2,
      Scene: FakeScene,
      GameObjects: {
        Sprite: FakeSprite,
        Text: FakeText,
        Graphics: FakeGraphics,
      },
      Scale: {
        Events: {
          RESIZE: 'resize',
        },
      },
      Scenes: {
        Events: {
          SHUTDOWN: 'shutdown',
        },
      },
    },
  };
});

import {
  createAssetKey,
  HUNT_PACK_OUTFIT_KEY,
  type ResolvedAsset,
} from '../../../../../packages/assets/src/index.ts';
import type {
  AbilityDefinition,
  EntityId,
  HuntDefinition,
  ScenarioConditionDefinition,
  SimulationEvent,
  SimulationSnapshot,
  TickIndex,
} from '../../../../../packages/contracts/src/index.ts';
import { createSceneBridge } from '../../bridge/SceneBridge';
import { healthRampColor } from '../../hunt/HealthRamp';
import { HuntScene, type HuntSimulationDriver } from './HuntScene';

function resolvedAsset(key: string): ResolvedAsset {
  return {
    key: createAssetKey(key),
    category: 'effect',
    mediaUrl: `memory://${key}.png`,
    mediaSha256: key,
    byteLength: 1,
    cellWidth: 32,
    cellHeight: 32,
    columns: 1,
    atlasFrameCount: 1,
    animations: [],
    pivot: { x: 0.5, y: 0.5 },
    scale: 1,
    filtering: 'nearest',
  };
}

function position(x: number, y: number, z = 8) {
  return { x, y, z };
}

function snapshot(input: {
  tick?: number;
  position?: { x: number; y: number; z: number };
  activeConditionIndices?: readonly number[];
}): SimulationSnapshot {
  const tick = (input.tick ?? 5) as TickIndex;
  return {
    schemaVersion: 5,
    rulesVersion: 5,
    scenarioId: 'hunt-scene-aura',
    scenarioRevision: 1,
    seed: '1122334455667788' as SimulationSnapshot['seed'],
    tick,
    nextEntityId: 2,
    nextEventSequence: 1,
    nextCommandSequence: 1,
    randomStreams: [],
    actors: [
      {
        entityId: 1 as EntityId,
        blueprintId: 'player',
        position: input.position ?? position(0, 0),
        facing: 's',
        readyAtTick: tick,
        transitionGuard: null,
        health: 185,
        resource: 185,
        targetEntityId: null,
        attackReadyAtTick: tick,
        groupCooldowns: [],
        abilityCooldowns: [],
        nextHealthRegenTick: tick,
        nextResourceRegenTick: tick,
        lastDamageReceivedTick: 0,
        activeConditions: (input.activeConditionIndices ?? []).map(
          (conditionIndex) => ({
            conditionIndex,
            expiresAtTick: 0,
            exclusivityGroup: 1,
          }),
        ),
        abilityCharges: [],
        forcedTargetEntityId: null,
        forcedTargetExpiresAtTick: 0,
      },
    ],
    pendingCommands: [],
    pendingIntents: [],
    spawnSlots: [],
  };
}

function event(
  tick: number,
  payload: SimulationEvent['payload'],
): SimulationEvent {
  return {
    tick: tick as TickIndex,
    sequence: tick,
    payload,
  };
}

const postureAbilities: readonly AbilityDefinition[] = [
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
    forcedTargetDurationTicks: 0,
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
    forcedTargetDurationTicks: 0,
  },
];

const postureConditions: readonly ScenarioConditionDefinition[] = [
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
];

const hunt: HuntDefinition = {
  schemaVersion: 1,
  huntId: 'hunt:scene-aura' as HuntDefinition['huntId'],
  huntRevision: 1,
  region: {
    schemaVersion: 1,
    regionId: 'region:scene-aura' as HuntDefinition['region']['regionId'],
    regionRevision: 1,
    origin: { x: 0, y: 0 },
    width: 2,
    height: 1,
    palette: [100],
    floors: [
      {
        z: 8,
        ground: [0, 0],
        objectsBelow: [],
        objectsAbove: [],
        collision: [0, 0],
      },
      {
        z: 9,
        ground: [0, 0],
        objectsBelow: [],
        objectsAbove: [],
        collision: [0, 0],
      },
    ],
  },
  transitions: { entries: [], dropped: 0 },
  spawns: { groups: [], maxLiveActors: 1 },
  blueprints: [
    {
      blueprintId: 'player',
      stepCooldownTicks: 1,
      behavior: 'inert',
      factionId: 1,
      maxHealth: 185,
      maxResource: 185,
      healthRegenTicks: 0,
      healthRegenAmount: 0,
      resourceRegenTicks: 0,
      resourceRegenAmount: 0,
      attackCooldownTicks: 1,
      attackMinDamage: 1,
      attackMaxDamage: 1,
      attackRangeTiles: 1,
      aggroRadius: 0,
      lootTableIndex: null,
      abilityIndices: [0, 1],
      outOfCombatHealthRegenTicks: 0,
      outOfCombatHealthRegenAmount: 0,
      outOfCombatResourceRegenTicks: 0,
      outOfCombatResourceRegenAmount: 0,
      combatWindowTicks: 0,
      lifeLeechPermille: 0,
      manaLeechPermille: 0,
      attackElement: 'physical',
      resistances: [],
      immunities: [],
    },
  ],
  playerStart: position(0, 0),
  playerBlueprintId: 'player',
};

class FakeDriver implements HuntSimulationDriver {
  tick = 0 as TickIndex;
  alpha = 0;
  snapshotCalls = 0;
  private readonly queue: SimulationEvent[][] = [];

  constructor(private currentSnapshot: SimulationSnapshot) {}

  snapshot() {
    this.snapshotCalls += 1;
    return this.currentSnapshot;
  }

  resetSnapshotCalls() {
    this.snapshotCalls = 0;
  }

  setSnapshot(next: SimulationSnapshot) {
    this.currentSnapshot = next;
    this.tick = next.tick;
  }

  pushEvents(events: readonly SimulationEvent[]) {
    this.queue.push([...events]);
  }

  enqueue() {
    return { ok: true, sequence: 1 } as const;
  }

  advanceTo() {
    const events = this.queue.shift() ?? [];
    const last = events.at(-1);
    if (last !== undefined) {
      this.tick = last.tick;
    }
    return events;
  }

  restart() {}
}

function createHarness(initialSnapshot: SimulationSnapshot) {
  const driver = new FakeDriver(initialSnapshot);
  driver.pushEvents([
    event(initialSnapshot.tick, {
      type: 'actor/spawned',
      entityId: 1 as EntityId,
      blueprintId: 'player',
      position: initialSnapshot.actors[0]?.position ?? position(0, 0),
      facing: 's',
    }),
  ]);

  const bridge = createSceneBridge({
    phase: 'booting',
    renderer: 'unavailable',
    viewport: { width: 352, height: 352, devicePixelRatio: 1 },
    message: 'Booting',
  });
  const scene = new HuntScene({
    bridge,
    hunt,
    assets: [
      resolvedAsset(HUNT_PACK_OUTFIT_KEY),
      resolvedAsset('tile:tibia:100'),
    ],
    input: {
      drain: () => [],
      releaseHeld: () => {},
    } as never,
    driver,
    abilities: postureAbilities,
    conditions: postureConditions,
  });

  return { scene, driver };
}

describe('HuntScene driver snapshot', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reuses one snapshot across repeated syncs in the same tick and refreshes it after a tick advance', () => {
    const { scene, driver } = createHarness(
      snapshot({
        activeConditionIndices: [0],
      }),
    );

    scene.create();
    driver.resetSnapshotCalls();

    scene.update(250);
    scene.update(260);

    expect(driver.snapshotCalls).toBe(1);

    driver.setSnapshot(
      snapshot({
        tick: 6,
        activeConditionIndices: [0],
      }),
    );

    scene.update(270);

    expect(driver.snapshotCalls).toBe(2);
  });
});

/** Reads an element the test knows is there, without a non-null assertion. */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new RangeError(`No item at index ${index}`);
  }
  return item;
}

const ROTWORM_KEY = 'creature:tibia:rotworm';

/** A rotworm is a 32px figure authored inside a 64x64 cell, like Tibia's. */
function rotwormAsset(): ResolvedAsset {
  return { ...resolvedAsset(ROTWORM_KEY), cellWidth: 64, cellHeight: 64 };
}

/**
 * The hunt file as it is actually generated: it names the creature, and its
 * blueprint carries the movement-era `maxHealth: 1` placeholder.
 */
const combatHunt: HuntDefinition = {
  ...hunt,
  spawns: {
    groups: [
      {
        center: position(1, 0),
        radius: 1,
        slots: [
          {
            creatureKey: ROTWORM_KEY,
            blueprintId: 'rotworm',
            offsetX: 0,
            offsetY: 0,
            offsetZ: 0,
            respawnTicks: 100,
          },
        ],
      },
    ],
    maxLiveActors: 2,
  },
  blueprints: [
    ...hunt.blueprints,
    { ...at(hunt.blueprints, 0), blueprintId: 'rotworm', maxHealth: 1 },
  ],
};

/** The caps the kernel is really built with, merged in from the catalog. */
const combatBlueprints = combatHunt.blueprints.map((blueprint) =>
  blueprint.blueprintId === 'rotworm'
    ? { ...blueprint, maxHealth: 65 }
    : blueprint,
);

function combatSnapshot(input: {
  tick?: number;
  rotwormHealth: number;
}): SimulationSnapshot {
  const base = snapshot(input.tick === undefined ? {} : { tick: input.tick });
  const player = at(base.actors, 0);

  return {
    ...base,
    actors: [
      player,
      {
        ...player,
        entityId: 2 as EntityId,
        blueprintId: 'rotworm',
        position: position(1, 0),
        health: input.rotwormHealth,
      },
    ],
  };
}

function createCombatHarness(initialSnapshot: SimulationSnapshot) {
  const driver = new FakeDriver(initialSnapshot);
  driver.pushEvents([
    event(initialSnapshot.tick, {
      type: 'actor/spawned',
      entityId: 1 as EntityId,
      blueprintId: 'player',
      position: position(0, 0),
      facing: 's',
    }),
    event(initialSnapshot.tick, {
      type: 'actor/spawned',
      entityId: 2 as EntityId,
      blueprintId: 'rotworm',
      position: position(1, 0),
      facing: 's',
    }),
  ]);

  const bridge = createSceneBridge({
    phase: 'booting',
    renderer: 'unavailable',
    viewport: { width: 352, height: 352, devicePixelRatio: 1 },
    message: 'Booting',
  });
  const scene = new HuntScene({
    bridge,
    hunt: combatHunt,
    blueprints: combatBlueprints,
    assets: [
      resolvedAsset(HUNT_PACK_OUTFIT_KEY),
      resolvedAsset('tile:tibia:100'),
      rotwormAsset(),
    ],
    input: {
      drain: () => [],
      releaseHeld: () => {},
    } as never,
    driver,
    abilities: postureAbilities,
    conditions: postureConditions,
  });

  return { scene, driver };
}

describe('HuntScene creature health bars', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('takes the ceiling from the kernel blueprints, so the bar drains as the creature is hit', () => {
    const { scene, driver } = createCombatHarness(
      combatSnapshot({ rotwormHealth: 65 }),
    );

    scene.create();
    scene.update(250);

    const full = at(scene.huntProbeState().healthBars, 0);
    expect(full.entityId).toBe(2);
    expect(full.fraction).toBe(1);
    expect(full.color).toBe(healthRampColor(1));

    driver.setSnapshot(combatSnapshot({ tick: 6, rotwormHealth: 13 }));
    scene.update(260);

    const hurt = at(scene.huntProbeState().healthBars, 0);
    expect(hurt.fraction).toBeCloseTo(0.2, 5);
    expect(hurt.color).toBe(healthRampColor(0.2));
    expect(hurt.color).not.toBe(full.color);
  });

  it('hangs the bar over the creature tile, not over the top of its cell', () => {
    const { scene } = createCombatHarness(
      combatSnapshot({ rotwormHealth: 65 }),
    );

    scene.create();
    scene.update(250);

    const sprite = at(
      scene.huntProbeState().actors.filter((actor) => actor.entityId === 2),
      0,
    ).sprite;
    const bar = at(scene.huntProbeState().healthBars, 0);

    // The sprite is 64px tall and hangs from the bottom-right of its tile, so
    // measuring from the cell would put the bar a whole tile higher.
    expect(sprite).toEqual({ x: 64, y: 32 });
    expect(bar.x).toBe(48);
    expect(bar.y).toBe(32 - 32 - 2);
    expect(bar.visible).toBe(true);
  });

  it('leaves a bar alone while nothing about it changes', () => {
    const { scene, driver } = createCombatHarness(
      combatSnapshot({ rotwormHealth: 65 }),
    );

    scene.create();
    scene.update(250);

    const afterFirstDraw = scene.huntProbeState().healthBarRedraws;
    scene.update(260);
    expect(scene.huntProbeState().healthBarRedraws).toBe(afterFirstDraw);

    driver.setSnapshot(combatSnapshot({ tick: 6, rotwormHealth: 40 }));
    scene.update(270);
    expect(scene.huntProbeState().healthBarRedraws).toBe(afterFirstDraw + 1);
  });

  it('gives the player no bar of his own', () => {
    const { scene } = createCombatHarness(
      combatSnapshot({ rotwormHealth: 65 }),
    );

    scene.create();
    scene.update(250);

    expect(
      scene.huntProbeState().healthBars.map((bar) => bar.entityId),
    ).toEqual([2]);
  });
});
