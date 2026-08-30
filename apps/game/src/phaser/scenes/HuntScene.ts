import Phaser from 'phaser';

import {
  type AssetKey,
  createAssetKey,
  HUNT_PACK_COMBAT_KEYS,
  HUNT_PACK_OUTFIT_KEY,
  type ResolvedAsset,
} from '../../../../../packages/assets/src/index.ts';
import type {
  AbilityDefinition,
  ActorBlueprint,
  EntityId,
  HuntDefinition,
  ScenarioConditionDefinition,
  SimulationCommandInput,
  SimulationEvent,
  SimulationSnapshot,
  TickIndex,
} from '../../../../../packages/contracts/src/index.ts';
import { TICK_DURATION_MS } from '../../../../../packages/contracts/src/index.ts';
import type { CommandAcceptance } from '../../../../../packages/simulation/src/index.ts';

import type { SceneBridge } from '../../bridge/SceneBridge';
import { actorFrameAtTick } from '../../hunt/ActorFrame';
import { advanceRenderTick, sampleActorMotion } from '../../hunt/ActorMotion';
import {
  type CameraController,
  createCameraController,
} from '../../hunt/CameraController';
import {
  type CameraBounds,
  type CameraFraming,
  calculateCameraFraming,
  clampCameraScroll,
} from '../../hunt/CameraFraming';
import { type CellAnchor, cellAnchor } from '../../hunt/CellAnchor';
import {
  type CombatDecoration,
  type CombatDecorations,
  createCombatDecorations,
  createDecorationObjectPool,
} from '../../hunt/CombatDecorations';
import { combatFxForCause, combatFxForHeal } from '../../hunt/CombatFxTable';
import {
  type CombatImpulses,
  createCombatImpulses,
} from '../../hunt/CombatImpulses';
import {
  type CombatTargetActor,
  type CombatTargetSelection,
  createCombatTargetSelection,
} from '../../hunt/CombatTargeting';
import {
  type CombatTargetDetails,
  DEFAULT_COMBAT_ABILITIES,
} from '../../hunt/CombatViewModel';
import {
  CREATURE_HEALTH_BAR_BACKDROP_ALPHA,
  CREATURE_HEALTH_BAR_BACKDROP_COLOR,
  CREATURE_HEALTH_BAR_DEPTH_OFFSET,
  type CreatureHealthBar,
  type CreatureHealthBarGeometry,
  creatureHealthBarGeometry,
  resolveCreatureHealthBars,
} from '../../hunt/CreatureHealthBar';
import { effectFrame } from '../../hunt/EffectAnimation';
import {
  groundBounds,
  groundEdgeCells,
  unresolvedGroundCells,
} from '../../hunt/GroundCompositor';
import {
  type CombatInputContext,
  combatCommandForAction,
} from '../../hunt/HuntCombatInput';
import {
  createHuntPresentation,
  type HuntDrawLayer,
  type HuntPresentation,
} from '../../hunt/HuntPresentation';
import {
  type HuntProbeActor,
  type HuntProbeCommand,
  type HuntProbeDecoration,
  type HuntProbeImpulse,
  type HuntProbeLayerCounts,
  type HuntProbeState,
  installHuntProbe,
} from '../../hunt/HuntProbe';
import { huntFloorSync } from '../../hunt/huntFloorSync';
import { playfieldCameraOffset } from '../../hunt/playfieldViewport';
import { presentationStepCooldownTicks } from '../../hunt/presentationStepCooldown';
import {
  resolveTargetRing,
  TARGET_RING_COLOR,
  TARGET_RING_DEPTH_LAYER,
  type TargetRingState,
} from '../../hunt/TargetRing';
import { actorDepth, tileDepth } from '../../hunt/TileDepth';
import { createUnresolvedHuntAssetTracker } from '../../hunt/UnresolvedHuntAssets';
import type { InputMap } from '../../input/InputMap';
import { createTickInputGate } from '../../input/TickInputGate';
import { canvasViewportBox } from '../ViewportBox';

export const HUNT_TILE_SIZE = 32;

/**
 * Under everything. `tileDepth` starts at 0 for the ground of the first cell,
 * so a negative depth is the only place the treatment can sit and still be
 * covered by every tile, actor and decoration painted over it.
 */
export const WORLD_EDGE_DEPTH = -1;

/**
 * Unlit rock, from the same warm family as the cave floor rather than from the
 * canvas blue-black. It has to be plainly darker than the lit floor and just as
 * plainly not black: a near-black fill next to a walkable tile reads as a hole
 * punched in the page, which is the complaint the canvas colour earned.
 */
export const WORLD_EDGE_COLOR = 0x241812;

/**
 * The face of that rock where it meets the floor.
 *
 * One flat tone still ends the map on a hard line. Lifting the ring of empty
 * cells that touch ground reads as the light on the floor falling on the wall
 * beside it, so the boundary becomes a surface instead of an edge.
 */
export const WORLD_EDGE_RIM_COLOR = 0x3a281c;

export interface HuntSimulationDriver {
  readonly tick: TickIndex;
  readonly alpha: number;
  snapshot(): SimulationSnapshot;
  enqueue(input: SimulationCommandInput): CommandAcceptance;
  advanceTo(nowMs: number): readonly SimulationEvent[];
  resyncClock?(): void;
  restart?(nowMs?: number): void;
}

export interface HuntSceneOptions {
  readonly bridge: SceneBridge;
  readonly hunt: HuntDefinition;
  /**
   * The blueprints the kernel was actually built with.
   *
   * `hunt.blueprints` is the movement-era definition and carries `maxHealth: 1`
   * placeholders for every actor -- combat stats live in the content catalog
   * and only reach the kernel through `buildHuntScenario`. Reading a ceiling
   * from the hunt file gave every creature a bar that stayed full until the
   * moment it died, which is the same trap the combat view model documents.
   */
  readonly blueprints?: readonly ActorBlueprint[];
  readonly assets: readonly ResolvedAsset[];
  readonly input: InputMap;
  readonly driver: HuntSimulationDriver;
  readonly abilities?: readonly AbilityDefinition[];
  readonly conditions?: readonly ScenarioConditionDefinition[];
  readonly targetDetailsByBlueprint?: ReadonlyMap<string, CombatTargetDetails>;
  readonly tileSize?: number;
}

function rendererKind(
  rendererType: number,
): 'webgl' | 'canvas' | 'unavailable' {
  if (rendererType === Phaser.WEBGL) return 'webgl';
  if (rendererType === Phaser.CANVAS) return 'canvas';
  return 'unavailable';
}

function actorKeyMap(hunt: HuntDefinition): ReadonlyMap<string, AssetKey> {
  const keys = new Map<string, AssetKey>([
    [hunt.playerBlueprintId, createAssetKey(HUNT_PACK_OUTFIT_KEY)],
  ]);

  for (const group of hunt.spawns.groups) {
    for (const slot of group.slots) {
      keys.set(slot.blueprintId, createAssetKey(slot.creatureKey));
    }
  }

  return keys;
}

export class HuntScene extends Phaser.Scene {
  private readonly assetByKey: ReadonlyMap<AssetKey, ResolvedAsset>;
  private readonly tileSize: number;
  private renderClock = 0;
  private floorRebuilds = 0;
  private cachedDriverSnapshot: SimulationSnapshot | undefined;
  private cachedDriverSnapshotTick: TickIndex | undefined;
  private readonly actorSprites = new Map<
    EntityId,
    Phaser.GameObjects.Sprite
  >();
  private readonly healthBars = new Map<
    EntityId,
    Phaser.GameObjects.Graphics
  >();
  /** What each bar is currently painted as, so a still one is never redrawn. */
  private readonly healthBarPaint = new Map<EntityId, CreatureHealthBar>();
  private healthBarRedraws = 0;
  private readonly maxHealthByBlueprint = new Map<string, number>();
  private targetRing: Phaser.GameObjects.Graphics | undefined;
  private worldEdge: Phaser.GameObjects.Graphics | undefined;
  private worldEdgeCreations = 0;
  private readonly worldEdgeCells = new Set<number>();
  private readonly drawnGroundCells = new Set<number>();
  private cameraBounds: CameraBounds | undefined;
  private readonly decorationObjects = new Map<
    number,
    Phaser.GameObjects.Sprite | Phaser.GameObjects.Text
  >();
  private readonly decorationSpritePool =
    createDecorationObjectPool<Phaser.GameObjects.Sprite>({
      reset: (sprite) => {
        sprite.setVisible(false);
        sprite.setAlpha(1);
        sprite.setRotation(0);
        sprite.setScale(1);
      },
    });
  private readonly decorationTextPool =
    createDecorationObjectPool<Phaser.GameObjects.Text>({
      reset: (text) => {
        text.setVisible(false);
        text.setAlpha(1);
        text.setRotation(0);
        text.setScale(1);
        text.setText('');
        text.setColor('#ffcf66');
      },
    });
  private readonly decorationTextValues = new Map<
    number,
    { text: string; color: string }
  >();
  private decorationTextWrites = 0;
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private readonly combatDecorations: CombatDecorations;
  private readonly combatImpulses: CombatImpulses = createCombatImpulses();
  private readonly combatNumberColors = new Map<number, string>();
  private presentation?: HuntPresentation;
  private cameraController?: CameraController;
  private cameraFraming?: CameraFraming;
  private readonly inputGate = createTickInputGate();
  private inputCommands: HuntProbeCommand[] = [];
  private readonly targetSelection: CombatTargetSelection =
    createCombatTargetSelection({ playerEntityId: 1 as EntityId });
  private unsubscribeEvents: (() => void) | undefined;
  private unsubscribeRestart: (() => void) | undefined;
  private uninstallProbe: (() => void) | undefined;
  private readonly unresolvedAssets;

  constructor(private readonly options: HuntSceneOptions) {
    super('hunt');
    this.combatDecorations = createCombatDecorations(
      options.abilities ?? DEFAULT_COMBAT_ABILITIES,
    );
    this.assetByKey = new Map(
      options.assets.map((asset) => [asset.key, asset]),
    );
    this.tileSize = options.tileSize ?? HUNT_TILE_SIZE;
    this.unresolvedAssets = createUnresolvedHuntAssetTracker({
      resolvedKeys: new Set(options.assets.map((asset) => asset.key)),
      onDiagnostic: (message) => {
        console.warn(message);
      },
    });
  }

  preload() {
    for (const asset of this.options.assets) {
      if (this.textures.exists(asset.key)) continue;

      if (asset.atlasFrameCount > 1 || asset.columns > 1) {
        this.load.spritesheet(asset.key, asset.mediaUrl, {
          frameWidth: asset.cellWidth,
          frameHeight: asset.cellHeight,
        });
      } else {
        this.load.image(asset.key, asset.mediaUrl);
      }
    }
  }

  create() {
    const stepCooldownTicksByBlueprint = new Map(
      this.options.hunt.blueprints.map((blueprint) => [
        blueprint.blueprintId,
        blueprint.stepCooldownTicks,
      ]),
    );
    this.presentation = createHuntPresentation({
      region: this.options.hunt.region,
      actorKeys: actorKeyMap(this.options.hunt),
      playerBlueprintId: this.options.hunt.playerBlueprintId,
      stepCooldownTicksByBlueprint,
      stepCooldownTicksFor: (actor) => {
        const snapshot = this.currentDriverSnapshot();
        return presentationStepCooldownTicks({
          baseTicks: stepCooldownTicksByBlueprint.get(actor.blueprintId) ?? 1,
          actor: snapshot.actors.find(
            (entry) => entry.entityId === actor.entityId,
          ),
          conditions: this.options.conditions ?? [],
          tick: snapshot.tick,
        });
      },
      onDiagnostic: (message) => {
        console.warn(message);
      },
    });
    for (const key of HUNT_PACK_COMBAT_KEYS) {
      this.unresolvedAssets.noteMissing(key);
    }
    this.maxHealthByBlueprint.clear();
    for (const blueprint of this.options.blueprints ??
      this.options.hunt.blueprints) {
      this.maxHealthByBlueprint.set(blueprint.blueprintId, blueprint.maxHealth);
    }
    this.renderClock = 0;
    this.floorRebuilds = 0;
    this.worldEdgeCreations = 0;
    this.decorationTextWrites = 0;
    this.healthBarRedraws = 0;
    this.decorationTextValues.clear();
    this.inputCommands = [];
    this.invalidateDriverSnapshotCache();
    this.targetSelection.reset();
    this.inputGate.reset();
    this.applyCameraFraming();
    this.cameraController = this.makeCameraController();
    // Rounding is per Game Object, not per camera: Phaser snaps each textured
    // object to a whole screen pixel on its own. The zoom is
    // `viewportHeight / (11 * 32)` and almost never lands on an integer, so
    // neighbouring tiles rounded away from each other, opening and closing
    // one-pixel seams as the camera scrolled, and the actor jittered against
    // the floor he was standing on. Sub-pixel positions cost a little softness
    // on a texture that is already filtered; they buy back continuous motion.
    this.cameras.main.roundPixels = false;

    this.renderFloor();
    this.followPlayer(this.options.driver.alpha);

    this.unsubscribeEvents = this.options.bridge.subscribeEvents((events) => {
      const presentation = this.presentation;
      if (!presentation) return;

      const actorPositions = new Map(
        presentation
          .actors()
          .map((actor) => [actor.entityId, { ...actor.position }] as const),
      );
      const actorBlueprintIds = new Map(
        presentation
          .actors()
          .map((actor) => [actor.entityId, actor.blueprintId] as const),
      );
      const playerBeforeActor = presentation
        .actors()
        .find(
          (actor) => actor.blueprintId === this.options.hunt.playerBlueprintId,
        );
      const playerBefore = playerBeforeActor?.position;
      const previousDecorationIds = new Set(
        this.combatDecorations.current().map((decoration) => decoration.id),
      );
      const floorBefore = presentation.floor();
      presentation.handle(events);
      this.combatDecorations.handle({
        events,
        actorPositions,
        actorBlueprintIds,
        ...(this.options.targetDetailsByBlueprint === undefined
          ? {}
          : {
              targetDetailsByBlueprint: this.options.targetDetailsByBlueprint,
            }),
        onUnresolvedAsset: (key) => this.unresolvedAssets.noteMissing(key),
        playerPosition: playerBefore === undefined ? null : { ...playerBefore },
      });
      this.combatImpulses.handle({
        events,
        actorPositions,
        playerEntityId: playerBeforeActor?.entityId ?? null,
        playerMaximumHealth:
          this.options.hunt.blueprints.find(
            (blueprint) =>
              blueprint.blueprintId === this.options.hunt.playerBlueprintId,
          )?.maxHealth ?? null,
      });
      this.assignCombatNumberColors(
        events,
        actorPositions,
        previousDecorationIds,
      );
      this.targetSelection.handle(events);
      this.clearTargetIfOffFloor();
      this.options.bridge.publishTargetSelected(
        this.targetSelection.targetId(),
      );
      const floorSync = huntFloorSync(
        floorBefore,
        presentation.floor(),
        events,
      );
      if (floorSync === 'rebuild') {
        this.renderFloor();
      } else if (floorSync === 'sync-roster') {
        this.syncActorRoster();
      }
      this.syncActorSprites(this.options.driver.alpha);
      this.renderCombatDecorations();
    });

    this.unsubscribeRestart = this.options.bridge.subscribeRestart(() => {
      this.options.input.releaseHeld();
      this.targetSelection.reset();
      this.options.bridge.publishTargetSelected(null);
      this.invalidateDriverSnapshotCache();
      this.options.driver.restart?.(performance.now());
      this.scene.restart();
    });

    this.uninstallProbe = installHuntProbe(this, (listener) =>
      this.options.bridge.subscribeEvents(listener),
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeEvents?.();
      this.unsubscribeEvents = undefined;
      this.unsubscribeRestart?.();
      this.unsubscribeRestart = undefined;
      this.uninstallProbe?.();
      this.uninstallProbe = undefined;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.inputGate.reset();
      this.destroySprites();
      this.destroyCombatDecorations();
      this.invalidateDriverSnapshotCache();
      this.targetRing?.destroy();
      this.targetRing = undefined;
      this.destroyCreatureHealthBars();
      this.worldEdge?.destroy();
      this.worldEdge = undefined;
      this.worldEdgeCells.clear();
      this.drawnGroundCells.clear();
      this.combatDecorations.reset();
      this.combatImpulses.reset();
      this.combatNumberColors.clear();
    });

    this.publishReady();
    this.options.bridge.publishTick(this.options.driver.tick);
    // Phaser's `time` includes HuntScene.preload. The driver is started at 0,
    // so the first update would otherwise dump the catch-up budget as hunt
    // ticks and let hunters close the only two-step corridor from spawn
    // before the player can walk.
    this.options.driver.resyncClock?.();
  }

  update(time: number) {
    const presentation = this.presentation;
    if (!presentation) return;

    const player = presentation
      .actors()
      .find(
        (actor) => actor.blueprintId === this.options.hunt.playerBlueprintId,
      );

    if (this.inputGate.take(this.options.driver.tick) && player) {
      const action = this.options.input.drain(this.options.driver.tick)[0];
      if (action?.kind === 'cycle-target') {
        this.targetSelection.cycle(this.combatTargetActors());
        this.commandTarget(this.targetSelection.targetId());
      } else if (action?.kind === 'clear-target') {
        this.commandTarget(null);
      } else if (action?.kind === 'step') {
        this.enqueuePlayerCommand({
          type: 'actor/move-step',
          entityId: player.entityId,
          direction: action.direction,
        });
      } else if (action?.kind === 'attack') {
        // Attack engages rather than swings: it keeps the current target and
        // picks the nearest creature when there is none, so the button always
        // does something even before the player has clicked anything.
        this.commandTarget(
          this.targetSelection.targetId() ??
            this.nearestHostileEntityId(player.entityId),
        );
      } else if (action?.kind === 'cast-ability') {
        const command = combatCommandForAction(action, {
          playerEntityId: player.entityId,
          targetEntityId: this.targetSelection.targetId(),
          abilities: this.options.abilities ?? DEFAULT_COMBAT_ABILITIES,
        } satisfies CombatInputContext);
        if (command !== undefined) {
          this.enqueuePlayerCommand(command);
        }
      }
    }

    const tickBeforeAdvance = this.options.driver.tick;
    const events = this.options.driver.advanceTo(time);
    if (events.length > 0 || this.options.driver.tick !== tickBeforeAdvance) {
      this.invalidateDriverSnapshotCache();
    }
    if (events.length > 0) {
      this.options.bridge.publishEvents(events);
    }
    this.options.bridge.publishTick(this.options.driver.tick);

    this.syncActorSprites(this.options.driver.alpha);
    this.renderCombatDecorations();
  }

  /**
   * Reads back what this scene is presenting right now. It is only reachable
   * through the test-only probe, and it never mutates the scene: PB-04-09
   * proves the chain input -> command -> event -> pixel, so the assertions have
   * to observe the drawn state rather than the kernel.
   */
  huntProbeState(): HuntProbeState {
    const presentation = this.presentation;
    const playerBlueprintId = this.options.hunt.playerBlueprintId;
    const actors: HuntProbeActor[] = (presentation?.actors() ?? []).map(
      (actor) => {
        const sprite = this.actorSprites.get(actor.entityId);

        return {
          entityId: actor.entityId,
          blueprintId: actor.blueprintId,
          key: actor.key,
          position: { ...actor.position },
          facing: actor.facing,
          sprite: sprite ? { x: sprite.x, y: sprite.y } : null,
          frame: sprite ? sprite.frame.name : null,
          flipX: sprite?.flipX ?? false,
          visible: sprite?.visible ?? false,
        };
      },
    );
    const layers: Record<keyof HuntProbeLayerCounts, number> = {
      ground: 0,
      objectsBelow: 0,
      actors: 0,
      objectsAbove: 0,
    };

    for (const sprite of this.sprites) {
      const layer = sprite.getData('hunt-layer') as
        | keyof HuntProbeLayerCounts
        | undefined;
      if (layer !== undefined && layer in layers) layers[layer] += 1;
    }

    return {
      tick: this.options.driver.tick,
      floor: presentation?.floor() ?? this.options.hunt.playerStart.z,
      floorRebuilds: this.floorRebuilds,
      decorationTextWrites: this.decorationTextWrites,
      healthBars: [...this.healthBars].map(([entityId, graphics]) => ({
        entityId,
        fraction: this.healthBarPaint.get(entityId)?.fraction ?? 0,
        color: this.healthBarPaint.get(entityId)?.color ?? 0,
        visible: graphics.visible,
        x: graphics.x,
        y: graphics.y,
        depth: graphics.depth,
      })),
      healthBarRedraws: this.healthBarRedraws,
      player:
        actors.find((actor) => actor.blueprintId === playerBlueprintId) ?? null,
      actors,
      targetRing: this.targetRingState(),
      camera: {
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
        width: this.scale.width,
        height: this.scale.height,
        zoom: this.cameras.main.zoom,
        visibleRows:
          this.scale.height / (this.tileSize * this.cameras.main.zoom),
        roundPixels: this.cameras.main.roundPixels,
        bounds: this.cameraBounds ?? null,
      },
      drawn: {
        total: this.sprites.length,
        layers,
        composedGroundCells:
          presentation?.groundComposition().composedGroundCells ?? 0,
        unresolvedGroundCells:
          presentation?.groundComposition().unresolvedGroundCells ?? 0,
      },
      worldEdge: {
        treatedCells: this.worldEdgeCells.size,
        depth: this.worldEdge?.depth ?? Number.NaN,
        visible: this.worldEdge?.visible ?? false,
        objectCreations: this.worldEdgeCreations,
        untreatedVisibleCells: this.untreatedVisibleCells(),
      },
    };
  }

  huntProbeCommands(): readonly HuntProbeCommand[] {
    return Object.freeze(this.inputCommands.map((command) => ({ ...command })));
  }

  huntProbeUnresolvedCombatAssetKeys(): readonly string[] {
    return this.unresolvedAssets.unresolvedCombatKeys();
  }

  huntProbeVisibleDecorations(): readonly HuntProbeDecoration[] {
    // Two views of the same decoration. The Phaser object carries where it was
    // actually drawn; the domain record carries what it means — which cue, at
    // which tile, for how much. A spec proving a cue needs the second, and the
    // damage-number sampler in combat-play.spec.ts needs the first, so both are
    // reported. The domain half is null for an object the model no longer
    // holds, rather than dropping the entry and hiding it from that sampler.
    const decorations = new Map(
      this.combatDecorations
        .current()
        .map((decoration) => [decoration.id, decoration] as const),
    );

    return Object.freeze(
      [...this.decorationObjects.entries()].map(([id, object]) => {
        const decoration = decorations.get(id);
        const kind = object.getData('hunt-decoration');
        const frame =
          object instanceof Phaser.GameObjects.Sprite
            ? object.frame.name
            : null;
        return {
          id,
          kind:
            decoration?.kind ?? (typeof kind === 'string' ? kind : 'unknown'),
          key: decoration?.key ?? null,
          position:
            decoration?.position === undefined
              ? null
              : { ...decoration.position },
          from: decoration?.from === undefined ? null : { ...decoration.from },
          to: decoration?.to === undefined ? null : { ...decoration.to },
          amount: decoration?.amount ?? null,
          stronger: decoration?.stronger === true,
          createdAtMs: decoration?.createdAtMs ?? null,
          expiresAtMs: decoration?.expiresAtMs ?? null,
          frame,
          visible: object.visible,
          x: object.x,
          y: object.y,
          alpha: object.alpha,
        };
      }),
    );
  }

  huntProbeActiveImpulses(): readonly HuntProbeImpulse[] {
    const renderTimeMs = this.renderClock * TICK_DURATION_MS;
    return Object.freeze(
      this.combatImpulses.active(renderTimeMs).map((impulse) => ({
        id: impulse.id,
        type: impulse.kind,
        entityId: Number(impulse.entityId),
        remainingMs: Math.max(0, impulse.expiresAtMs - renderTimeMs),
      })),
    );
  }

  resetHuntProbe(): void {
    this.inputCommands = [];
  }

  releaseHeldInput(): void {
    this.options.input.releaseHeld();
  }

  private makeCameraController(): CameraController {
    const width = this.scale.width;
    const height = this.scale.height;
    const framing =
      this.cameraFraming ??
      calculateCameraFraming({
        viewportHeight: height,
        tileSize: this.tileSize,
      });
    return createCameraController({
      viewportWidth: width,
      viewportHeight: height,
      zoom: framing.zoom,
      ...(this.cameraBounds === undefined ? {} : { bounds: this.cameraBounds }),
    });
  }

  private readonly handleResize = (): void => {
    this.applyCameraFraming();
    this.cameraController = this.makeCameraController();
    this.followPlayer(this.options.driver.alpha);
    this.publishReady();
  };

  private applyCameraFraming(): void {
    this.cameraFraming = calculateCameraFraming({
      viewportHeight: this.scale.height,
      tileSize: this.tileSize,
    });
    this.cameras.main.setZoom(this.cameraFraming.zoom);
    // The same tone the treatment paints, so a viewport wider than the whole
    // region — where the clamp centres the box and leaves real slack — carries
    // on in the same rock instead of showing a different colour at the seam.
    this.cameras.main.setBackgroundColor(WORLD_EDGE_COLOR);
  }

  /**
   * `viewport` is the CSS box the page occupies, not the backing store the
   * renderer allocates for it. Those were the same number until the render
   * resolution gained a cap; reporting `scale.width` here would make the HUD
   * readout disagree with `ViewportController`, which writes the same field.
   */
  private publishReady() {
    const { width, height } = canvasViewportBox(this.game.canvas, {
      width: this.scale.width,
      height: this.scale.height,
    });

    this.options.bridge.publish({
      phase: 'ready',
      renderer: rendererKind(this.game.renderer.type),
      viewport: {
        width,
        height,
        devicePixelRatio: window.devicePixelRatio,
      },
      message: 'Shell ready',
    });
  }

  private destroySprites(): void {
    for (const sprite of this.sprites) {
      sprite.destroy();
    }
    this.sprites = [];
    this.actorSprites.clear();
    this.destroyCreatureHealthBars();
  }

  private destroyCreatureHealthBars(): void {
    for (const bar of this.healthBars.values()) {
      bar.destroy();
    }
    this.healthBars.clear();
    this.healthBarPaint.clear();
  }

  private targetRingState(): TargetRingState {
    const presentation = this.presentation;
    const actors = presentation?.actors() ?? [];
    return resolveTargetRing(
      this.targetSelection.targetId(),
      actors.map((actor) => ({
        entityId: actor.entityId,
        position: actor.position,
        visible:
          actor.position.z === presentation?.floor() &&
          (this.actorSprites.get(actor.entityId)?.visible ?? false),
      })),
    );
  }

  private ensureTargetRing(): Phaser.GameObjects.Graphics {
    if (this.targetRing !== undefined) return this.targetRing;

    const ring = this.add.graphics();
    const anchor = cellAnchor({
      cell: { x: 0, y: 0 },
      cellWidth: 32,
      cellHeight: 32,
      scale: 1,
      tileSize: this.tileSize,
    });
    ring
      .lineStyle(Math.max(2, this.tileSize / 16), TARGET_RING_COLOR, 0.95)
      .strokeCircle(
        -anchor.width / 2,
        -anchor.height / 2,
        Math.min(anchor.width, anchor.height) * 0.36,
      )
      .setVisible(false)
      .setData('hunt-target-ring', true);
    this.targetRing = ring;
    return ring;
  }

  private invalidateDriverSnapshotCache(): void {
    this.cachedDriverSnapshot = undefined;
    this.cachedDriverSnapshotTick = undefined;
  }

  private currentDriverSnapshot(): SimulationSnapshot {
    const tick = this.options.driver.tick;
    if (
      this.cachedDriverSnapshot !== undefined &&
      this.cachedDriverSnapshotTick === tick
    ) {
      return this.cachedDriverSnapshot;
    }

    const snapshot = this.options.driver.snapshot();
    this.cachedDriverSnapshot = snapshot;
    this.cachedDriverSnapshotTick = tick;
    return snapshot;
  }

  private syncTargetRing(): void {
    const state = this.targetRingState();
    const ring = this.ensureTargetRing();
    const position = state.position;
    if (!state.visible || position === null) {
      ring.setVisible(false);
      return;
    }

    const anchor = cellAnchor({
      cell: position,
      cellWidth: 32,
      cellHeight: 32,
      scale: 1,
      tileSize: this.tileSize,
    });
    ring
      .setPosition(anchor.x, anchor.y)
      .setDepth(this.depthFor(TARGET_RING_DEPTH_LAYER, position, 0))
      .setVisible(true);
  }

  private destroyCombatDecorations(): void {
    for (const object of this.decorationObjects.values()) {
      object.destroy();
    }
    this.decorationObjects.clear();
    this.decorationSpritePool.drain((sprite) => {
      sprite.destroy();
    });
    this.decorationTextPool.drain((text) => {
      text.destroy();
    });
    this.decorationTextValues.clear();
  }

  /** The presentation clock, read once per sync so it never runs backwards. */
  private advanceClock(alpha: number): number {
    this.renderClock = advanceRenderTick(
      this.renderClock,
      this.options.driver.tick,
      alpha,
    );
    return this.renderClock;
  }

  /** Where this asset's cell hangs on a tile, at the scene's tile size. */
  private anchorFor(
    asset: ResolvedAsset,
    cell: { readonly x: number; readonly y: number },
  ): CellAnchor {
    return cellAnchor({
      cell,
      cellWidth: asset.cellWidth,
      cellHeight: asset.cellHeight,
      scale: asset.scale,
      tileSize: this.tileSize,
    });
  }

  private renderFloor(): void {
    const presentation = this.presentation;
    if (!presentation) return;

    this.floorRebuilds += 1;
    this.destroySprites();
    this.drawnGroundCells.clear();
    this.syncCameraBounds();
    for (const command of presentation.drawCommands()) {
      const asset = this.assetByKey.get(command.key);
      if (!asset) continue;

      const sprite = this.add.sprite(0, 0, command.key);
      const anchor = this.anchorFor(asset, command);
      sprite
        .setOrigin(anchor.originX, anchor.originY)
        .setPosition(anchor.x, anchor.y)
        .setDisplaySize(anchor.width, anchor.height)
        .setDepth(
          this.depthFor(
            command.layer,
            command,
            command.kind === 'tile' ? command.stackIndex : 0,
          ),
        );
      sprite.setData('hunt-layer', command.layer);
      this.sprites.push(sprite);

      if (command.layer === 'ground') {
        this.drawnGroundCells.add(this.cellIndex(command.x, command.y));
      }

      if (command.kind === 'actor') {
        this.bindActorSprite(sprite, command.entityId);
      }
    }
    this.renderWorldEdge();
    this.syncTargetHighlight();
  }

  private cellIndex(x: number, y: number): number {
    return y * this.options.hunt.region.width + x;
  }

  /**
   * Reframes the camera on the ground of the floor now being presented.
   *
   * The two floors of the hunt do not carry ground in the same cells, so the
   * box has to be recomputed whenever the floor is rebuilt; the controller
   * holds its bounds by value and is cheap enough to replace.
   */
  private syncCameraBounds(): void {
    const presentation = this.presentation;
    const region = this.options.hunt.region;
    const cells = groundBounds(
      region,
      presentation?.floor() ?? this.options.hunt.playerStart.z,
    );
    this.cameraBounds =
      cells === undefined
        ? undefined
        : {
            minX: cells.minX * this.tileSize,
            minY: cells.minY * this.tileSize,
            maxX: (cells.maxX + 1) * this.tileSize,
            maxY: (cells.maxY + 1) * this.tileSize,
          };
    this.cameraController = this.makeCameraController();
  }

  private ensureWorldEdge(): Phaser.GameObjects.Graphics {
    if (this.worldEdge !== undefined) return this.worldEdge;

    const edge = this.add
      .graphics()
      .setDepth(WORLD_EDGE_DEPTH)
      .setData('hunt-world-edge', true);
    this.worldEdgeCreations += 1;
    this.worldEdge = edge;
    return edge;
  }

  /**
   * Paints every cell the compositor cannot put ground under.
   *
   * One Graphics carries the whole floor and is redrawn only when the floor is
   * rebuilt, so a hunt at 60 fps creates nothing per frame: a sprite per empty
   * cell would have been 152 objects on the lower floor and 201 on the upper
   * one. The cells come from `unresolvedGroundCells` rather than from a second
   * reading of the palette, so the treatment and the floor can never disagree
   * about which cell is empty.
   */
  private renderWorldEdge(): void {
    const presentation = this.presentation;
    if (!presentation) return;

    const region = this.options.hunt.region;
    const floor = presentation.floor();
    const edge = this.ensureWorldEdge();
    edge.clear();
    this.worldEdgeCells.clear();

    const fillCell = (index: number): void => {
      const x = index % region.width;
      const y = Math.floor(index / region.width);
      edge.fillRect(
        x * this.tileSize,
        y * this.tileSize,
        this.tileSize,
        this.tileSize,
      );
    };

    edge.fillStyle(WORLD_EDGE_COLOR, 1);
    for (const index of unresolvedGroundCells(region, floor)) {
      fillCell(index);
      this.worldEdgeCells.add(index);
    }

    // Painted over the base, never instead of it, so the rim can never be the
    // only thing covering a cell and leave a gap if the two lists disagree.
    edge.fillStyle(WORLD_EDGE_RIM_COLOR, 1);
    for (const index of groundEdgeCells(region, floor)) {
      fillCell(index);
    }

    edge.setVisible(true);
  }

  /** Every creature on screen is a click target: that is how Tibia aims. */
  private bindActorSprite(
    sprite: Phaser.GameObjects.Sprite,
    entityId: EntityId,
  ): void {
    this.actorSprites.set(entityId, sprite);
    sprite.setInteractive({ useHandCursor: true });
    sprite.on('pointerdown', () => {
      this.commandTarget(entityId);
    });
  }

  /**
   * Adds the sprites for actors that just spawned and drops the ones that just
   * died, leaving the floor untouched.
   */
  private syncActorRoster(): void {
    const presentation = this.presentation;
    if (!presentation) return;

    const live = new Set<EntityId>();
    for (const command of presentation.drawCommands()) {
      if (command.kind !== 'actor') continue;
      live.add(command.entityId);
      if (this.actorSprites.has(command.entityId)) continue;

      const asset = this.assetByKey.get(command.key);
      if (!asset) continue;

      const sprite = this.add.sprite(0, 0, command.key);
      const anchor = this.anchorFor(asset, command);
      sprite
        .setOrigin(anchor.originX, anchor.originY)
        .setPosition(anchor.x, anchor.y)
        .setDisplaySize(anchor.width, anchor.height)
        .setDepth(this.depthFor(command.layer, command, 0));
      sprite.setData('hunt-layer', command.layer);
      this.sprites.push(sprite);
      this.bindActorSprite(sprite, command.entityId);
    }

    for (const [entityId, sprite] of [...this.actorSprites]) {
      if (live.has(entityId)) continue;
      this.actorSprites.delete(entityId);
      const index = this.sprites.indexOf(sprite);
      if (index >= 0) this.sprites.splice(index, 1);
      sprite.destroy();
    }

    this.syncTargetHighlight();
  }

  private depthFor(
    layer: HuntDrawLayer,
    cell: { readonly x: number; readonly y: number },
    stackIndex: number,
  ): number {
    return tileDepth({
      // A cell straddles two tiles mid-step; it belongs to the one it is mostly
      // standing on, so the paint order flips halfway rather than drifting.
      x: Math.round(cell.x),
      y: Math.round(cell.y),
      layer,
      stackIndex,
      regionWidth: this.options.hunt.region.width,
    });
  }

  private syncActorSprites(alpha: number): void {
    const presentation = this.presentation;
    if (!presentation) return;

    const visible = new Set<EntityId>();
    const currentRenderTick = this.advanceClock(alpha);
    const renderTimeMs = currentRenderTick * TICK_DURATION_MS;
    this.combatImpulses.advance(renderTimeMs);
    for (const actor of presentation.actors()) {
      const sprite = this.actorSprites.get(actor.entityId);
      const asset = this.assetByKey.get(actor.key);
      if (!sprite || !asset || actor.position.z !== presentation.floor()) {
        continue;
      }

      const actorRenderTick = this.combatImpulses.renderTickFor(
        actor.entityId,
        currentRenderTick,
      );
      const motion = actor.motion;
      const stepping =
        motion !== undefined &&
        actorRenderTick < motion.startTick + motion.durationTicks;
      const position = stepping
        ? sampleActorMotion(motion, actorRenderTick)
        : actor.position;
      const anchor = this.anchorFor(asset, position);
      const lungeOffset = this.combatImpulses.lungeOffset(
        actor.entityId,
        renderTimeMs,
      );
      sprite.setPosition(anchor.x + lungeOffset.x, anchor.y + lungeOffset.y);
      // The floor is only rebuilt when it changes, so an actor that keeps its
      // boot-time depth sorts against the tile it spawned on for the rest of
      // the hunt: it would walk in front of every wall it ever passes.
      sprite.setDepth(
        actorDepth({
          from: stepping ? motion.from : actor.position,
          to: stepping ? motion.to : actor.position,
          regionWidth: this.options.hunt.region.width,
        }),
      );
      if (asset.atlasFrameCount > 1) {
        sprite.setFrame(
          actorFrameAtTick({
            asset,
            facing: actor.facing,
            motion: actor.motion,
            renderTick: actorRenderTick,
          }),
          false,
          false,
        );
      }
      sprite.setVisible(true);
      visible.add(actor.entityId);
    }

    for (const [entityId, sprite] of this.actorSprites) {
      if (!visible.has(entityId)) sprite.setVisible(false);
    }

    this.syncCreatureHealthBars();
    this.syncTargetHighlight(renderTimeMs);
    this.followPlayer(alpha);
  }

  /**
   * The bar over each creature's head, the way Tibia does it.
   *
   * Hung off the sprite rather than off the tile so it rides the walk cycle and
   * the lunge with the creature it belongs to: a bar that stayed on the tile
   * detached from the monster every time either of them moved.
   *
   * Repainted only when the reading changes. Position and depth are transforms
   * and cost nothing per frame; the fill is geometry, and redrawing nine of
   * them every frame for creatures nobody is hitting is the same waste the
   * action deck was just cured of.
   */
  private syncCreatureHealthBars(): void {
    const presentation = this.presentation;
    if (!presentation) return;

    const snapshot = this.currentDriverSnapshot();
    const healthByEntity = new Map<EntityId, number>(
      snapshot.actors.map((actor) => [actor.entityId, actor.health]),
    );
    const bars = resolveCreatureHealthBars(
      presentation.actors().map((actor) => ({
        entityId: actor.entityId,
        health: healthByEntity.get(actor.entityId) ?? 0,
        maxHealth: this.maxHealthByBlueprint.get(actor.blueprintId) ?? 0,
        onScreen: this.actorSprites.get(actor.entityId)?.visible ?? false,
        isPlayer: actor.blueprintId === this.options.hunt.playerBlueprintId,
      })),
    );

    const geometry = creatureHealthBarGeometry(this.tileSize);
    const drawn = new Set<EntityId>();

    for (const bar of bars) {
      const sprite = this.actorSprites.get(bar.entityId);
      if (sprite === undefined) continue;

      drawn.add(bar.entityId);
      this.paintCreatureHealthBar(bar, geometry)
        .setPosition(
          // The cell hangs from the bottom-right of the tile, so the sprite's
          // own position is that tile's far corner whatever the creature's cell
          // size -- and the tile, not the cell, is what the bar hangs over. A
          // rotworm is a 32px figure in a 64px cell, so measuring from the top
          // of the cell floated its bar a whole tile above its head.
          sprite.x - this.tileSize / 2,
          sprite.y - this.tileSize - geometry.gap,
        )
        .setDepth(sprite.depth + CREATURE_HEALTH_BAR_DEPTH_OFFSET)
        .setVisible(true);
    }

    for (const [entityId, graphics] of this.healthBars) {
      if (drawn.has(entityId)) continue;
      // A creature that stepped to another floor keeps its bar, hidden: it is
      // coming back. One whose sprite is gone is dead, and so is its bar.
      if (this.actorSprites.has(entityId)) {
        graphics.setVisible(false);
        continue;
      }
      graphics.destroy();
      this.healthBars.delete(entityId);
      this.healthBarPaint.delete(entityId);
    }
  }

  private paintCreatureHealthBar(
    bar: CreatureHealthBar,
    geometry: CreatureHealthBarGeometry,
  ): Phaser.GameObjects.Graphics {
    let graphics = this.healthBars.get(bar.entityId);
    if (graphics === undefined) {
      graphics = this.add.graphics();
      graphics.setData('hunt-health-bar', true);
      this.healthBars.set(bar.entityId, graphics);
    }

    const painted = this.healthBarPaint.get(bar.entityId);
    if (painted?.fraction === bar.fraction && painted.color === bar.color) {
      return graphics;
    }

    const left = -geometry.width / 2;
    const top = -geometry.height;
    graphics
      .clear()
      .fillStyle(
        CREATURE_HEALTH_BAR_BACKDROP_COLOR,
        CREATURE_HEALTH_BAR_BACKDROP_ALPHA,
      )
      .fillRect(left, top, geometry.width, geometry.height)
      .fillStyle(bar.color, 1)
      .fillRect(
        left + geometry.inset,
        top + geometry.inset,
        (geometry.width - geometry.inset * 2) * bar.fraction,
        geometry.height - geometry.inset * 2,
      );

    this.healthBarPaint.set(bar.entityId, bar);
    this.healthBarRedraws += 1;
    return graphics;
  }

  private renderCombatDecorations(): void {
    const renderTimeMs = this.renderClock * TICK_DURATION_MS;
    this.combatImpulses.advance(renderTimeMs);
    this.combatDecorations.advance(renderTimeMs);
    const visible = new Set<number>();

    for (const decoration of this.combatDecorations.current()) {
      const object =
        this.decorationObjects.get(decoration.id) ??
        this.createDecorationObject(decoration);
      if (object === undefined) continue;

      this.updateDecorationObject(object, decoration, renderTimeMs);
      object.setData('hunt-decoration', decoration.kind);
      object.setVisible(true);
      visible.add(decoration.id);
    }

    for (const [id, object] of this.decorationObjects) {
      if (visible.has(id)) continue;
      this.decorationObjects.delete(id);
      this.combatNumberColors.delete(id);
      this.decorationTextValues.delete(id);
      object.setVisible(false);
      if (object instanceof Phaser.GameObjects.Sprite) {
        this.decorationSpritePool.release(object);
      } else {
        this.decorationTextPool.release(object);
      }
    }
  }

  private createDecorationObject(
    decoration: CombatDecoration,
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Text | undefined {
    if (
      decoration.kind === 'damage-number' ||
      decoration.kind === 'heal-number'
    ) {
      const text = this.decorationTextPool.acquire(() =>
        this.add.text(0, 0, '', {
          color: '#ffcf66',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '18px',
          fontStyle: 'bold',
          stroke: '#32140d',
          strokeThickness: 3,
        }),
      );
      text.setOrigin(0.5, 1);
      this.decorationObjects.set(decoration.id, text);
      this.decorationTextValues.set(decoration.id, { text: '', color: '' });
      return text;
    }

    if (decoration.key === undefined) return undefined;
    const key = decoration.key;
    const asset = this.assetByKey.get(key);
    if (asset === undefined) {
      this.unresolvedAssets.noteMissing(key);
      return undefined;
    }
    const sprite = this.decorationSpritePool.acquire(() =>
      this.add.sprite(0, 0, key),
    );
    sprite.setTexture(key);
    sprite
      .setOrigin(0.5, 0.5)
      .setDisplaySize(
        asset.cellWidth * asset.scale,
        asset.cellHeight * asset.scale,
      );
    this.decorationObjects.set(decoration.id, sprite);
    return sprite;
  }

  private updateDecorationObject(
    object: Phaser.GameObjects.Sprite | Phaser.GameObjects.Text,
    decoration: CombatDecoration,
    renderTimeMs: number,
  ): void {
    if (
      decoration.kind === 'damage-number' ||
      decoration.kind === 'heal-number'
    ) {
      const text = object as Phaser.GameObjects.Text;
      const position = decoration.position;
      if (position === undefined) return;
      const progress = Math.min(
        Math.max((renderTimeMs - decoration.createdAtMs) / 300, 0),
        1,
      );
      const nextText = `${decoration.kind === 'heal-number' ? '+' : '-'}${decoration.amount ?? 0}`;
      const nextColor =
        this.combatNumberColors.get(decoration.id) ??
        combatFxForCause('attack').numberColor;
      const applied = this.decorationTextValues.get(decoration.id) ?? {
        text: '',
        color: '',
      };
      if (applied.text !== nextText) {
        text.setText(nextText);
        applied.text = nextText;
        this.decorationTextWrites += 1;
      }
      if (applied.color !== nextColor) {
        text.setColor(nextColor);
        applied.color = nextColor;
        this.decorationTextWrites += 1;
      }
      this.decorationTextValues.set(decoration.id, applied);
      text
        .setPosition(
          (position.x + 0.5) * this.tileSize,
          (position.y + 0.5 - progress * 0.75) * this.tileSize,
        )
        .setDepth(
          actorDepth({
            from: position,
            to: position,
            regionWidth: this.options.hunt.region.width,
          }) + 20,
        )
        .setAlpha(1 - progress * 0.35);
      return;
    }

    const sprite = object as Phaser.GameObjects.Sprite;
    if (
      decoration.kind === 'autoloot-arc' ||
      decoration.kind === 'projectile'
    ) {
      const from = decoration.from;
      const to = decoration.to;
      if (from === undefined || to === undefined) return;
      const duration = Math.max(
        decoration.expiresAtMs - decoration.createdAtMs,
        1,
      );
      const progress = Math.min(
        Math.max((renderTimeMs - decoration.createdAtMs) / duration, 0),
        1,
      );
      sprite
        .setPosition(
          (from.x + (to.x - from.x) * progress + 0.5) * this.tileSize,
          (from.y + (to.y - from.y) * progress + 0.5) * this.tileSize,
        )
        .setRotation(
          decoration.kind === 'projectile'
            ? Math.atan2(to.y - from.y, to.x - from.x)
            : progress * Math.PI * 2,
        )
        .setAlpha(1 - progress * 0.25)
        .setDepth(
          actorDepth({
            from,
            to,
            regionWidth: this.options.hunt.region.width,
          }) + 10,
        );
      this.applyDecorationFrame(sprite, decoration, renderTimeMs);
      return;
    }

    const position = decoration.position;
    if (position === undefined) return;
    sprite
      .setPosition(
        (position.x + 0.5) * this.tileSize,
        (position.y + 0.5) * this.tileSize,
      )
      .setRotation(0)
      .setAlpha(renderTimeMs < decoration.createdAtMs ? 0 : 1)
      .setScale(decoration.stronger === true ? 1.35 : 1)
      .setDepth(
        actorDepth({
          from: position,
          to: position,
          regionWidth: this.options.hunt.region.width,
        }),
      );
    this.applyDecorationFrame(sprite, decoration, renderTimeMs);
  }

  private applyDecorationFrame(
    sprite: Phaser.GameObjects.Sprite,
    decoration: CombatDecoration,
    renderTimeMs: number,
  ): void {
    if (decoration.key === undefined) return;
    const asset = this.assetByKey.get(decoration.key);
    const animation = asset?.animations[0];
    if (asset === undefined || animation === undefined) return;
    if (asset.atlasFrameCount <= 1) return;
    sprite.setFrame(
      effectFrame(
        animation,
        Math.max(renderTimeMs - decoration.createdAtMs, 0),
      ),
      false,
      false,
    );
  }

  /**
   * Points the player at `entityId` -- or at nothing, when it is `null`. The
   * local selection drives the highlight this frame; the kernel command is what
   * actually makes the player swing, every attack cooldown, until it changes.
   */
  private commandTarget(entityId: EntityId | null): void {
    const player = this.presentation
      ?.actors()
      .find(
        (actor) => actor.blueprintId === this.options.hunt.playerBlueprintId,
      );
    if (!player || entityId === player.entityId) return;

    if (entityId === null) {
      this.targetSelection.setTarget(null);
    } else if (
      !this.targetSelection.select(entityId, this.combatTargetActors())
    ) {
      return;
    }

    this.enqueuePlayerCommand({
      type: 'actor/set-target',
      entityId: player.entityId,
      targetEntityId: entityId,
    });
    this.options.bridge.publishTargetSelected(entityId);
    this.syncTargetHighlight();
  }

  private clearTargetIfOffFloor(): void {
    const targetEntityId = this.targetSelection.targetId();
    if (
      targetEntityId === null ||
      this.combatTargetActors().some(
        (actor) => actor.entityId === targetEntityId,
      )
    ) {
      return;
    }

    this.targetSelection.setTarget(null);
    const player = this.presentation
      ?.actors()
      .find(
        (actor) => actor.blueprintId === this.options.hunt.playerBlueprintId,
      );
    if (player === undefined) return;

    this.enqueuePlayerCommand({
      type: 'actor/set-target',
      entityId: player.entityId,
      targetEntityId: null,
    });
  }

  /** The closest creature the player could reach, for the bare attack button. */
  private nearestHostileEntityId(playerEntityId: EntityId): EntityId | null {
    const player = this.presentation
      ?.actors()
      .find((actor) => actor.entityId === playerEntityId);
    if (!player) return null;

    let bestId: EntityId | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const actor of this.presentation?.actors() ?? []) {
      if (
        actor.entityId === playerEntityId ||
        actor.blueprintId === this.options.hunt.playerBlueprintId ||
        actor.position.z !== player.position.z
      ) {
        continue;
      }
      const distance = Math.max(
        Math.abs(actor.position.x - player.position.x),
        Math.abs(actor.position.y - player.position.y),
      );
      // Ties go to the lower id so the same board always picks the same
      // creature, however the actor list happens to be ordered.
      if (
        distance < bestDistance ||
        (distance === bestDistance &&
          bestId !== null &&
          actor.entityId < bestId)
      ) {
        bestDistance = distance;
        bestId = actor.entityId;
      }
    }
    return bestId;
  }

  private combatTargetActors(): readonly CombatTargetActor[] {
    const presentation = this.presentation;
    if (!presentation) return [];

    // Melee and every spell in the kit require the same floor, so a creature
    // one level down is not a target -- cycling onto it just left the player
    // swinging at nothing.
    const floor = presentation.floor();
    return presentation
      .actors()
      .filter((actor) => actor.position.z === floor)
      .map((actor) => ({
        entityId: actor.entityId,
        blueprintId: actor.blueprintId,
        position: { ...actor.position },
      }));
  }

  private syncTargetHighlight(
    renderTimeMs = this.renderClock * TICK_DURATION_MS,
  ): void {
    const targetEntityId = this.targetSelection.targetId();
    for (const [entityId, sprite] of this.actorSprites) {
      if (this.combatImpulses.isActive('flash', entityId, renderTimeMs)) {
        sprite.setTint(0xffffff);
      } else {
        sprite.clearTint();
      }
      sprite.setData('hunt-targeted', entityId === targetEntityId);
    }
    this.syncTargetRing();
  }

  private assignCombatNumberColors(
    events: readonly SimulationEvent[],
    actorPositions: ReadonlyMap<
      EntityId,
      { readonly x: number; readonly y: number; readonly z: number }
    >,
    previousDecorationIds: ReadonlySet<number>,
  ): void {
    const colors = events.flatMap((event) => {
      switch (event.payload.type) {
        case 'combat/damaged':
          return actorPositions.has(event.payload.entityId)
            ? [combatFxForCause(event.payload.cause).numberColor]
            : [];
        case 'combat/healed':
          return actorPositions.has(event.payload.entityId)
            ? [combatFxForHeal().numberColor]
            : [];
        default:
          return [];
      }
    });
    if (colors.length === 0) return;

    const newNumbers = this.combatDecorations
      .current()
      .filter(
        (decoration) =>
          !previousDecorationIds.has(decoration.id) &&
          (decoration.kind === 'damage-number' ||
            decoration.kind === 'heal-number'),
      );
    newNumbers.forEach((decoration, index) => {
      const color = colors[index];
      if (color !== undefined)
        this.combatNumberColors.set(decoration.id, color);
    });
  }

  private enqueuePlayerCommand(
    command: SimulationCommandInput['command'],
  ): void {
    const player = this.presentation
      ?.actors()
      .find(
        (actor) => actor.blueprintId === this.options.hunt.playerBlueprintId,
      );
    if (player === undefined) return;

    const tick = this.options.driver.tick;
    const acceptance = this.options.driver.enqueue({
      tick,
      issuer: 'player',
      command,
    });
    if (!acceptance.ok) return;

    switch (command.type) {
      case 'actor/move-step':
        this.inputCommands.push({
          tick,
          sequence: acceptance.sequence,
          entityId: player.entityId,
          direction: command.direction,
        });
        break;
      case 'actor/attack':
        this.inputCommands.push({
          tick,
          sequence: acceptance.sequence,
          entityId: player.entityId,
          type: command.type,
          targetEntityId: command.targetEntityId,
        });
        break;
      case 'actor/cast-ability':
        this.inputCommands.push({
          tick,
          sequence: acceptance.sequence,
          entityId: player.entityId,
          type: command.type,
          abilityIndex: command.abilityIndex,
          targetEntityId: command.targetEntityId,
        });
        break;
      default:
        break;
    }
  }

  private followPlayer(alpha: number): void {
    const controller = this.cameraController;
    const presentation = this.presentation;
    if (!controller || !presentation) return;

    const player = presentation
      .actors()
      .find(
        (actor) =>
          actor.blueprintId === this.options.hunt.playerBlueprintId &&
          actor.position.z === presentation.floor(),
      );
    const currentRenderTick = this.advanceClock(alpha);
    const renderTimeMs = currentRenderTick * TICK_DURATION_MS;
    this.combatImpulses.advance(renderTimeMs);
    const position = player
      ? (() => {
          const playerRenderTick = this.combatImpulses.renderTickFor(
            player.entityId,
            currentRenderTick,
          );
          const sampled =
            player.motion === undefined
              ? player.position
              : sampleActorMotion(player.motion, playerRenderTick);
          return { x: sampled.x + 0.5, y: sampled.y + 0.5 };
        })()
      : {
          x: this.options.hunt.playerStart.x + 0.5,
          y: this.options.hunt.playerStart.y + 0.5,
        };

    // ADR-001 keeps the centre and lower middle of the *playfield* clear, and
    // the playfield is the visible play area, not the canvas: the cockpit frame
    // is what says where it ends. Centring on the canvas would leave the knight
    // behind the deck. The offset moves the followed point instead of the
    // scroll so the ground-box clamp still runs on the view that is actually
    // shown.
    const framing = this.playfieldOffset();
    controller.follow({
      x: position.x * this.tileSize - framing.x,
      y: position.y * this.tileSize - framing.y,
    });
    // The shake is added before the clamp, not after it: an impulse that
    // nudged the camera past the edge would expose the void for exactly the
    // frames the player is being hit, which is when he is least able to
    // explain what he saw.
    const shake = this.combatImpulses.cameraOffset(renderTimeMs);
    const scroll = this.framedScroll(
      controller.scrollX + shake.x,
      controller.scrollY + shake.y,
    );
    this.cameras.main.setScroll(scroll.scrollX, scroll.scrollY);
  }

  /**
   * World pixels between the canvas centre and the centre of the free area.
   *
   * The frame is measured in CSS pixels while the camera scrolls in the
   * renderer's own, which the resolution cap can make smaller, so the offset is
   * converted rather than copied. A zero-sized canvas -- the first frames
   * before layout -- has no free area to speak of and gets no offset.
   */
  private playfieldOffset(): { readonly x: number; readonly y: number } {
    const zoom = this.cameras.main.zoom;
    const render = { width: this.scale.width, height: this.scale.height };
    const viewport = canvasViewportBox(this.game.canvas, render);

    if (
      !(zoom > 0) ||
      !(viewport.width > 0) ||
      !(viewport.height > 0) ||
      !(render.width > 0) ||
      !(render.height > 0)
    ) {
      return { x: 0, y: 0 };
    }

    return playfieldCameraOffset({ viewport, render, zoom });
  }

  private framedScroll(
    scrollX: number,
    scrollY: number,
  ): { readonly scrollX: number; readonly scrollY: number } {
    const bounds = this.cameraBounds;
    const zoom = this.cameras.main.zoom;
    if (bounds === undefined || !(zoom > 0)) return { scrollX, scrollY };

    return clampCameraScroll({
      scrollX,
      scrollY,
      viewportWidth: this.scale.width,
      viewportHeight: this.scale.height,
      zoom,
      bounds,
    });
  }

  /** What the camera is showing right now, in world pixels. */
  private visibleWorldRect(): {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
  } {
    const camera = this.cameras.main;
    const zoom = camera.zoom > 0 ? camera.zoom : 1;
    const halfWidth = this.scale.width / (2 * zoom);
    const halfHeight = this.scale.height / (2 * zoom);
    const centreX = camera.scrollX + this.scale.width / 2;
    const centreY = camera.scrollY + this.scale.height / 2;

    return {
      left: centreX - halfWidth,
      right: centreX + halfWidth,
      top: centreY - halfHeight,
      bottom: centreY + halfHeight,
    };
  }

  /**
   * Visible cells showing neither ground nor treatment — the canvas, in other
   * words. It counts what was actually drawn rather than recomputing the
   * compositor's answer, so a missing tile asset, a stale treatment and a
   * camera that walked off the map all show up here as the same number.
   */
  private untreatedVisibleCells(): number {
    const region = this.options.hunt.region;
    const rect = this.visibleWorldRect();
    const firstX = Math.floor(rect.left / this.tileSize);
    const lastX = Math.ceil(rect.right / this.tileSize) - 1;
    const firstY = Math.floor(rect.top / this.tileSize);
    const lastY = Math.ceil(rect.bottom / this.tileSize) - 1;
    let untreated = 0;

    for (let y = firstY; y <= lastY; y += 1) {
      for (let x = firstX; x <= lastX; x += 1) {
        if (x < 0 || y < 0 || x >= region.width || y >= region.height) {
          untreated += 1;
          continue;
        }
        const index = this.cellIndex(x, y);
        if (
          !this.drawnGroundCells.has(index) &&
          !this.worldEdgeCells.has(index)
        ) {
          untreated += 1;
        }
      }
    }

    return untreated;
  }
}
