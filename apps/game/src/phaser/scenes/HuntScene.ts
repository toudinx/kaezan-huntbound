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
  EntityId,
  HuntDefinition,
  SimulationCommandInput,
  SimulationEvent,
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
  type CameraFraming,
  calculateCameraFraming,
} from '../../hunt/CameraFraming';
import { type CellAnchor, cellAnchor } from '../../hunt/CellAnchor';
import {
  type CombatDecoration,
  createCombatDecorations,
} from '../../hunt/CombatDecorations';
import {
  type CombatTargetActor,
  type CombatTargetSelection,
  createCombatTargetSelection,
} from '../../hunt/CombatTargeting';
import { DEFAULT_COMBAT_ABILITIES } from '../../hunt/CombatViewModel';
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
  type HuntProbeLayerCounts,
  type HuntProbeState,
  installHuntProbe,
} from '../../hunt/HuntProbe';
import { actorDepth, tileDepth } from '../../hunt/TileDepth';
import { createUnresolvedHuntAssetTracker } from '../../hunt/UnresolvedHuntAssets';
import type { InputMap } from '../../input/InputMap';
import { createTickInputGate } from '../../input/TickInputGate';

export const HUNT_TILE_SIZE = 32;

export interface HuntSimulationDriver {
  readonly tick: TickIndex;
  readonly alpha: number;
  enqueue(input: SimulationCommandInput): CommandAcceptance;
  advanceTo(nowMs: number): readonly SimulationEvent[];
  restart?(nowMs?: number): void;
}

export interface HuntSceneOptions {
  readonly bridge: SceneBridge;
  readonly hunt: HuntDefinition;
  readonly assets: readonly ResolvedAsset[];
  readonly input: InputMap;
  readonly driver: HuntSimulationDriver;
  readonly abilities?: readonly AbilityDefinition[];
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
    case 'combat/attacked':
    case 'combat/damaged':
    case 'combat/healed':
    case 'ability/cast':
    case 'combat/target-changed':
    case 'loot/granted':
      return false;
    case 'actor/died':
      return true;
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
  private readonly decorationObjects = new Map<
    number,
    Phaser.GameObjects.Sprite | Phaser.GameObjects.Text
  >();
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private readonly combatDecorations = createCombatDecorations();
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
      onDiagnostic: (message) => {
        console.warn(message);
      },
    });
    for (const key of HUNT_PACK_COMBAT_KEYS) {
      this.unresolvedAssets.noteMissing(key);
    }
    this.renderClock = 0;
    this.inputCommands = [];
    this.targetSelection.reset();
    this.inputGate.reset();
    this.applyCameraFraming();
    this.cameraController = this.makeCameraController();
    this.cameras.main.roundPixels = true;

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
      const playerBefore = presentation
        .actors()
        .find(
          (actor) => actor.blueprintId === this.options.hunt.playerBlueprintId,
        )?.position;
      const floorBefore = presentation.floor();
      presentation.handle(events);
      this.combatDecorations.handle({
        events,
        actorPositions,
        playerPosition: playerBefore === undefined ? null : { ...playerBefore },
      });
      this.targetSelection.handle(events);
      this.options.bridge.publishTargetSelected(
        this.targetSelection.targetId(),
      );
      if (
        floorBefore !== presentation.floor() ||
        events.some(isStructuralEvent)
      ) {
        this.renderFloor();
      }
      this.syncActorSprites(this.options.driver.alpha);
      this.renderCombatDecorations();
    });

    this.unsubscribeRestart = this.options.bridge.subscribeRestart(() => {
      this.options.input.releaseHeld();
      this.targetSelection.reset();
      this.options.bridge.publishTargetSelected(null);
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
      this.combatDecorations.reset();
    });

    this.publishReady();
    this.options.bridge.publishTick(this.options.driver.tick);
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
        this.options.bridge.publishTargetSelected(
          this.targetSelection.targetId(),
        );
      } else if (action?.kind === 'step') {
        this.enqueuePlayerCommand({
          type: 'actor/move-step',
          entityId: player.entityId,
          direction: action.direction,
        });
      } else if (action?.kind === 'attack' || action?.kind === 'cast-ability') {
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

    const events = this.options.driver.advanceTo(time);
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

  huntProbeUnresolvedCombatAssetKeys(): readonly string[] {
    return this.unresolvedAssets.unresolvedCombatKeys();
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

  private destroyCombatDecorations(): void {
    for (const object of this.decorationObjects.values()) {
      object.destroy();
    }
    this.decorationObjects.clear();
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
        sprite.setInteractive({ useHandCursor: true });
        sprite.on('pointerdown', () => {
          if (
            this.targetSelection.select(
              command.entityId,
              this.combatTargetActors(),
            )
          ) {
            this.options.bridge.publishTargetSelected(
              this.targetSelection.targetId(),
            );
            this.syncTargetHighlight();
          }
        });
      }
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

    this.syncTargetHighlight();
    this.followPlayer(alpha);
  }

  private renderCombatDecorations(): void {
    const renderTimeMs = this.renderClock * TICK_DURATION_MS;
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
      object.destroy();
      this.decorationObjects.delete(id);
    }
  }

  private createDecorationObject(
    decoration: CombatDecoration,
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Text | undefined {
    if (decoration.kind === 'damage-number') {
      const text = this.add.text(0, 0, '', {
        color: '#ffcf66',
        fontFamily: 'ui-monospace, monospace',
        fontSize: '18px',
        fontStyle: 'bold',
        stroke: '#32140d',
        strokeThickness: 3,
      });
      text.setOrigin(0.5, 1);
      this.decorationObjects.set(decoration.id, text);
      return text;
    }

    if (decoration.key === undefined) return undefined;
    const asset = this.assetByKey.get(decoration.key);
    if (asset === undefined) {
      this.unresolvedAssets.noteMissing(decoration.key);
      return undefined;
    }
    const sprite = this.add.sprite(0, 0, decoration.key);
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
    if (decoration.kind === 'damage-number') {
      const text = object as Phaser.GameObjects.Text;
      const position = decoration.position;
      if (position === undefined) return;
      const progress = Math.min(
        Math.max((renderTimeMs - decoration.createdAtMs) / 300, 0),
        1,
      );
      text
        .setText(`-${decoration.amount ?? 0}`)
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
    if (decoration.kind === 'autoloot-arc') {
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
        .setRotation(progress * Math.PI * 2)
        .setAlpha(1 - progress * 0.25)
        .setDepth(
          actorDepth({
            from,
            to,
            regionWidth: this.options.hunt.region.width,
          }) + 10,
        );
      return;
    }

    const position = decoration.position;
    if (position === undefined) return;
    sprite
      .setPosition(
        (position.x + 0.5) * this.tileSize,
        (position.y + 0.5) * this.tileSize,
      )
      .setDepth(
        actorDepth({
          from: position,
          to: position,
          regionWidth: this.options.hunt.region.width,
        }),
      );
  }

  private combatTargetActors(): readonly CombatTargetActor[] {
    return (this.presentation?.actors() ?? []).map((actor) => ({
      entityId: actor.entityId,
      blueprintId: actor.blueprintId,
      position: { ...actor.position },
    }));
  }

  private syncTargetHighlight(): void {
    const targetEntityId = this.targetSelection.targetId();
    for (const [entityId, sprite] of this.actorSprites) {
      if (entityId === targetEntityId) {
        sprite.setTint(0xffd166);
      } else {
        sprite.clearTint();
      }
      sprite.setData('hunt-targeted', entityId === targetEntityId);
    }
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
