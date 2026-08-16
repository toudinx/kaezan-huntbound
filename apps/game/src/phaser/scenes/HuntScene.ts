import Phaser from 'phaser';

import {
  type AssetKey,
  createAssetKey,
  HUNT_PACK_OUTFIT_KEY,
  type ResolvedAsset,
} from '../../../../../packages/assets/src/index.ts';
import type {
  EntityId,
  HuntDefinition,
  SimulationCommandInput,
  SimulationEvent,
  TickIndex,
} from '../../../../../packages/contracts/src/index.ts';
import type { CommandAcceptance } from '../../../../../packages/simulation/src/index.ts';

import type { SceneBridge } from '../../bridge/SceneBridge';
import { actorFrameAtTick } from '../../hunt/ActorFrame';
import { advanceRenderTick, sampleActorMotion } from '../../hunt/ActorMotion';
import {
  type CameraController,
  createCameraController,
} from '../../hunt/CameraController';
import {
  type CameraFraming,
  calculateCameraFraming,
} from '../../hunt/CameraFraming';
import { type CellAnchor, cellAnchor } from '../../hunt/CellAnchor';
import {
  createHuntPresentation,
  type HuntDrawLayer,
  type HuntPresentation,
} from '../../hunt/HuntPresentation';
import {
  type HuntProbeActor,
  type HuntProbeCommand,
  type HuntProbeLayerCounts,
  type HuntProbeState,
  installHuntProbe,
} from '../../hunt/HuntProbe';
import { actorDepth, tileDepth } from '../../hunt/TileDepth';
import type { InputMap } from '../../input/InputMap';
import { createTickInputGate } from '../../input/TickInputGate';

export const HUNT_TILE_SIZE = 32;

export interface HuntSimulationDriver {
  readonly tick: TickIndex;
  readonly alpha: number;
  enqueue(input: SimulationCommandInput): CommandAcceptance;
  advanceTo(nowMs: number): readonly SimulationEvent[];
}

export interface HuntSceneOptions {
  readonly bridge: SceneBridge;
  readonly hunt: HuntDefinition;
  readonly assets: readonly ResolvedAsset[];
  readonly input: InputMap;
  readonly driver: HuntSimulationDriver;
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

function isStructuralEvent(event: SimulationEvent): boolean {
  switch (event.payload.type) {
    case 'actor/spawned':
    case 'actor/despawned':
    case 'actor/transitioned':
      return true;
    case 'actor/moved':
    case 'actor/move-blocked':
    case 'actor/faced':
    case 'spawn/deferred':
    case 'spawn/capped':
    case 'command/rejected':
      return false;
  }
}

export class HuntScene extends Phaser.Scene {
  private readonly assetByKey: ReadonlyMap<AssetKey, ResolvedAsset>;
  private readonly tileSize: number;
  private renderClock = 0;
  private readonly actorSprites = new Map<
    EntityId,
    Phaser.GameObjects.Sprite
  >();
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private presentation?: HuntPresentation;
  private cameraController?: CameraController;
  private cameraFraming?: CameraFraming;
  private readonly inputGate = createTickInputGate();
  private inputCommands: HuntProbeCommand[] = [];
  private unsubscribeEvents: (() => void) | undefined;
  private uninstallProbe: (() => void) | undefined;

  constructor(private readonly options: HuntSceneOptions) {
    super('hunt');
    this.assetByKey = new Map(
      options.assets.map((asset) => [asset.key, asset]),
    );
    this.tileSize = options.tileSize ?? HUNT_TILE_SIZE;
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
    this.presentation = createHuntPresentation({
      region: this.options.hunt.region,
      actorKeys: actorKeyMap(this.options.hunt),
      playerBlueprintId: this.options.hunt.playerBlueprintId,
      stepCooldownTicksByBlueprint: new Map(
        this.options.hunt.blueprints.map((blueprint) => [
          blueprint.blueprintId,
          blueprint.stepCooldownTicks,
        ]),
      ),
    });
    this.inputGate.reset();
    this.applyCameraFraming();
    this.cameraController = this.makeCameraController();
    this.cameras.main.roundPixels = true;

    this.renderFloor();
    this.followPlayer(this.options.driver.alpha);

    this.unsubscribeEvents = this.options.bridge.subscribeEvents((events) => {
      const presentation = this.presentation;
      if (!presentation) return;

      const floorBefore = presentation.floor();
      presentation.handle(events);
      if (
        floorBefore !== presentation.floor() ||
        events.some(isStructuralEvent)
      ) {
        this.renderFloor();
      }
      this.syncActorSprites(this.options.driver.alpha);
    });

    this.uninstallProbe = installHuntProbe(this, (listener) =>
      this.options.bridge.subscribeEvents(listener),
    );

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeEvents?.();
      this.unsubscribeEvents = undefined;
      this.uninstallProbe?.();
      this.uninstallProbe = undefined;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.inputGate.reset();
      this.destroySprites();
    });

    this.publishReady();
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
      if (action?.kind === 'step') {
        const acceptance = this.options.driver.enqueue({
          tick: this.options.driver.tick,
          issuer: 'player',
          command: {
            type: 'actor/move-step',
            entityId: player.entityId,
            direction: action.direction,
          },
        });
        if (acceptance.ok) {
          this.inputCommands.push({
            tick: this.options.driver.tick,
            sequence: acceptance.sequence,
            entityId: player.entityId,
            direction: action.direction,
          });
        }
      }
    }

    const events = this.options.driver.advanceTo(time);
    if (events.length > 0) {
      this.options.bridge.publishEvents(events);
    }

    this.syncActorSprites(this.options.driver.alpha);
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
      player:
        actors.find((actor) => actor.blueprintId === playerBlueprintId) ?? null,
      actors,
      camera: {
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
        width: this.scale.width,
        height: this.scale.height,
        zoom: this.cameras.main.zoom,
        visibleRows:
          this.scale.height / (this.tileSize * this.cameras.main.zoom),
      },
      drawn: {
        total: this.sprites.length,
        layers,
        composedGroundCells:
          presentation?.groundComposition().composedGroundCells ?? 0,
        unresolvedGroundCells:
          presentation?.groundComposition().unresolvedGroundCells ?? 0,
      },
    };
  }

  huntProbeCommands(): readonly HuntProbeCommand[] {
    return Object.freeze(this.inputCommands.map((command) => ({ ...command })));
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
    });
  }

  private readonly handleResize = (gameSize: Phaser.Structs.Size): void => {
    this.applyCameraFraming();
    this.cameraController = this.makeCameraController();
    this.followPlayer(this.options.driver.alpha);
    this.publishReady(gameSize.width, gameSize.height);
  };

  private applyCameraFraming(): void {
    this.cameraFraming = calculateCameraFraming({
      viewportHeight: this.scale.height,
      tileSize: this.tileSize,
    });
    this.cameras.main.setZoom(this.cameraFraming.zoom);
    this.cameras.main.setBackgroundColor('#24120e');
  }

  private publishReady(width = this.scale.width, height = this.scale.height) {
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

    this.destroySprites();
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

      if (command.kind === 'actor') {
        this.actorSprites.set(command.entityId, sprite);
      }
    }
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
    for (const actor of presentation.actors()) {
      const sprite = this.actorSprites.get(actor.entityId);
      const asset = this.assetByKey.get(actor.key);
      if (!sprite || !asset || actor.position.z !== presentation.floor()) {
        continue;
      }

      const motion = actor.motion;
      const stepping =
        motion !== undefined &&
        currentRenderTick < motion.startTick + motion.durationTicks;
      const position = stepping
        ? sampleActorMotion(motion, currentRenderTick)
        : actor.position;
      const anchor = this.anchorFor(asset, position);
      sprite.setPosition(anchor.x, anchor.y);
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
            renderTick: currentRenderTick,
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

    this.followPlayer(alpha);
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
    const position = player
      ? (() => {
          const currentRenderTick = this.advanceClock(alpha);
          const sampled =
            player.motion === undefined
              ? player.position
              : sampleActorMotion(player.motion, currentRenderTick);
          return { x: sampled.x + 0.5, y: sampled.y + 0.5 };
        })()
      : {
          x: this.options.hunt.playerStart.x + 0.5,
          y: this.options.hunt.playerStart.y + 0.5,
        };

    controller.follow({
      x: position.x * this.tileSize,
      y: position.y * this.tileSize,
    });
    this.cameras.main.setScroll(controller.scrollX, controller.scrollY);
  }
}
