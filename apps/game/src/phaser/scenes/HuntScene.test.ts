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
import { combatPostureAuraForAbility } from '../../hunt/CombatFxTable';
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

describe('HuntScene posture aura', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { devicePixelRatio: 1 });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('restores a persistent aura from the snapshot, keeps it on the player through movement and flash, then removes it when the condition clears', () => {
    const { scene, driver } = createHarness(
      snapshot({
        activeConditionIndices: [0],
      }),
    );

    scene.create();
    scene.update(250);

    const aura = combatPostureAuraForAbility('blood-rage');
    expect(aura).toBeDefined();
    expect(scene.huntProbeState().player?.sprite).toEqual({ x: 32, y: 32 });
    expect(scene.huntProbeState().postureAura).toEqual({
      abilityId: 'blood-rage',
      visible: true,
      shape: aura?.shape,
      color: aura?.color,
      x: 32,
      y: 32,
    });

    driver.setSnapshot(
      snapshot({
        tick: 6,
        position: position(1, 0),
        activeConditionIndices: [0],
      }),
    );
    driver.pushEvents([
      event(6, {
        type: 'actor/moved',
        entityId: 1 as EntityId,
        from: position(0, 0),
        to: position(1, 0),
        facing: 'e',
      }),
    ]);
    driver.alpha = 1;

    scene.update(300);
    driver.setSnapshot(
      snapshot({
        tick: 7,
        position: position(1, 0),
        activeConditionIndices: [0],
      }),
    );
    scene.update(350);

    expect(scene.huntProbeState().player?.sprite).toEqual({ x: 64, y: 32 });
    expect(scene.huntProbeState().postureAura).toEqual({
      abilityId: 'blood-rage',
      visible: true,
      shape: aura?.shape,
      color: aura?.color,
      x: 64,
      y: 32,
    });

    driver.setSnapshot(
      snapshot({
        tick: 8,
        position: position(1, 0),
        activeConditionIndices: [0],
      }),
    );
    driver.pushEvents([
      event(8, {
        type: 'combat/damaged',
        entityId: 1 as EntityId,
        sourceEntityId: 99 as EntityId,
        amount: 4,
        remainingHealth: 181,
        cause: 'attack',
      }),
    ]);

    scene.update(400);

    expect(scene.huntProbeState().postureAura).toEqual({
      abilityId: 'blood-rage',
      visible: true,
      shape: aura?.shape,
      color: aura?.color,
      x: 64,
      y: 32,
    });

    driver.setSnapshot(
      snapshot({
        tick: 9,
        position: position(1, 0),
        activeConditionIndices: [],
      }),
    );

    scene.update(450);

    expect(scene.huntProbeState().postureAura).toBeNull();
  });

  it('keeps a single aura graphics object across floor rebuilds and destroys it on shutdown without counting it as floor art', () => {
    const { scene, driver } = createHarness(
      snapshot({
        activeConditionIndices: [1],
      }),
    );

    scene.create();
    scene.update(250);

    const firstAura = (
      scene as unknown as { postureAura?: { destroyed: boolean } }
    ).postureAura;
    expect(firstAura).toBeDefined();
    expect(scene.huntProbeState().drawn.total).toBe(3);

    driver.setSnapshot(
      snapshot({
        tick: 6,
        position: position(0, 0, 9),
        activeConditionIndices: [1],
      }),
    );
    driver.pushEvents([
      event(6, {
        type: 'actor/transitioned',
        entityId: 1 as EntityId,
        from: position(0, 0, 8),
        to: position(0, 0, 9),
      }),
    ]);

    scene.update(300);
    scene.update(350);

    expect((scene as unknown as { postureAura?: unknown }).postureAura).toBe(
      firstAura,
    );
    expect(scene.huntProbeState().floorRebuilds).toBe(2);
    expect(scene.huntProbeState().drawn.total).toBe(3);

    (scene as { __shutdown?: () => void }).__shutdown?.();

    expect(firstAura?.destroyed).toBe(true);
    expect(
      (scene as unknown as { postureAura?: unknown }).postureAura,
    ).toBeUndefined();
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
