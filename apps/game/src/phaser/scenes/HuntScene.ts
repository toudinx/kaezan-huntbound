import Phaser from 'phaser';

import {
  type AssetKey,
  createAssetKey,
  HUNT_PACK_OUTFIT_KEY,
  type ResolvedAsset,
} from '../../../../../packages/assets/src/index.ts';
import type {
  EntityId,
  GridPosition,
  HuntDefinition,
  SimulationCommandInput,
  SimulationEvent,
  TickIndex,
} from '../../../../../packages/contracts/src/index.ts';
import type { CommandAcceptance } from '../../../../../packages/simulation/src/index.ts';

import type { SceneBridge } from '../../bridge/SceneBridge';
import {
  type CameraController,
  createCameraController,
  interpolate,
} from '../../hunt/CameraController';
import {
  createHuntPresentation,
  type HuntPresentation,
} from '../../hunt/HuntPresentation';
import type { InputMap } from '../../input/InputMap';

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

function cellCenter(position: GridPosition, tileSize: number) {
  return {
    x: (position.x + 0.5) * tileSize,
    y: (position.y + 0.5) * tileSize,
  };
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
  private readonly actorSprites = new Map<
    EntityId,
    Phaser.GameObjects.Sprite
  >();
  private sprites: Phaser.GameObjects.Sprite[] = [];
  private presentation?: HuntPresentation;
  private cameraController?: CameraController;
  private unsubscribeEvents: (() => void) | undefined;

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
    });
    this.cameraController = this.makeCameraController();
    this.cameras.main.setBounds(
      0,
      0,
      this.options.hunt.region.width * this.tileSize,
      this.options.hunt.region.height * this.tileSize,
    );
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

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeEvents?.();
      this.unsubscribeEvents = undefined;
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
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

    if (player) {
      for (const action of this.options.input.drain()) {
        if (action.kind !== 'step') continue;
        this.options.driver.enqueue({
          tick: this.options.driver.tick,
          issuer: 'player',
          command: {
            type: 'actor/move-step',
            entityId: player.entityId,
            direction: action.direction,
          },
        });
      }
    }

    const events = this.options.driver.advanceTo(time);
    if (events.length > 0) {
      this.options.bridge.publishEvents(events);
    }

    this.syncActorSprites(this.options.driver.alpha);
  }

  private makeCameraController(): CameraController {
    const width = this.scale.width;
    const height = this.scale.height;
    return createCameraController({
      viewportWidth: width,
      viewportHeight: height,
      deadzoneWidth: Math.min(width * 0.55, this.tileSize * 13),
      deadzoneHeight: Math.min(height * 0.55, this.tileSize * 9),
      worldWidth: this.options.hunt.region.width * this.tileSize,
      worldHeight: this.options.hunt.region.height * this.tileSize,
    });
  }

  private readonly handleResize = (gameSize: Phaser.Structs.Size): void => {
    this.cameraController = this.makeCameraController();
    this.followPlayer(this.options.driver.alpha);
    this.publishReady(gameSize.width, gameSize.height);
  };

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

  private renderFloor(): void {
    const presentation = this.presentation;
    if (!presentation) return;

    this.destroySprites();
    for (const command of presentation.drawCommands()) {
      const asset = this.assetByKey.get(command.key);
      if (!asset) continue;

      const sprite = this.add.sprite(0, 0, command.key);
      const position = cellCenter(command, this.tileSize);
      sprite
        .setOrigin(asset.pivot.x, asset.pivot.y)
        .setPosition(position.x, position.y + this.tileSize / 2)
        .setDisplaySize(
          this.tileSize * asset.scale,
          this.tileSize * asset.scale,
        )
        .setDepth(
          this.depthFor(
            command.layer,
            command.y,
            command.kind === 'tile' ? command.stackIndex : 0,
          ),
        );
      sprite.setData('hunt-layer', command.layer);
      this.sprites.push(sprite);

      if (command.kind === 'actor') {
        this.actorSprites.set(command.entityId, sprite);
        sprite.setFlipX(
          command.facing === 'w' ||
            command.facing === 'nw' ||
            command.facing === 'sw',
        );
      }
    }
  }

  private depthFor(
    layer: 'ground' | 'objectsBelow' | 'actors' | 'objectsAbove',
    y: number,
    stackIndex: number,
  ): number {
    const base =
      layer === 'ground'
        ? 0
        : layer === 'objectsBelow'
          ? 1_000
          : layer === 'actors'
            ? 2_000
            : 3_000;
    return base + y + stackIndex / 100;
  }

  private syncActorSprites(alpha: number): void {
    const presentation = this.presentation;
    if (!presentation) return;

    const visible = new Set<EntityId>();
    for (const actor of presentation.actors()) {
      const sprite = this.actorSprites.get(actor.entityId);
      if (!sprite || actor.position.z !== presentation.floor()) continue;

      const x = interpolate(actor.previous.x, actor.target.x, alpha);
      const y = interpolate(actor.previous.y, actor.target.y, alpha);
      sprite.setPosition((x + 0.5) * this.tileSize, (y + 1) * this.tileSize);
      sprite.setFlipX(
        actor.facing === 'w' || actor.facing === 'nw' || actor.facing === 'sw',
      );
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
      ? {
          x: interpolate(player.previous.x, player.target.x, alpha) + 0.5,
          y: interpolate(player.previous.y, player.target.y, alpha) + 0.5,
        }
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
