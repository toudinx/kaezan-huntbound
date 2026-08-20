import Phaser from 'phaser';

import type { SceneBridge } from '../bridge/SceneBridge';
import type { RuntimeLifecyclePort } from '../runtime/RuntimeLifecycle';
import type { ShellSnapshot } from '../runtime/ShellSnapshot';
import {
  cappedRenderSize,
  type RenderSize,
  renderHeightCap,
} from './RenderResolution';
import { BootScene } from './scenes/BootScene';
import {
  HUNT_TILE_SIZE,
  HuntScene,
  type HuntSceneOptions,
} from './scenes/HuntScene';
import { ShellScene } from './scenes/ShellScene';

export interface GameRuntime {
  readonly game: Phaser.Game;
  readonly lifecycle: RuntimeLifecyclePort;
}

function firstPositive(...candidates: readonly number[]): number {
  for (const candidate of candidates) {
    if (Number.isFinite(candidate) && candidate > 0) {
      return candidate;
    }
  }

  return renderHeightCap(HUNT_TILE_SIZE);
}

/**
 * The backing store the renderer should allocate for the current window.
 *
 * `getBoundingClientRect` is the same box the `ViewportController` reports, so
 * the HUD readout and the render size agree on what "the window" means. It can
 * still be zero before the shell lays out, which is why the window and the cap
 * back it up.
 */
function measureRenderSize(
  parent: HTMLElement,
  browserWindow: Window,
): RenderSize {
  const rect = parent.getBoundingClientRect();

  return cappedRenderSize({
    width: firstPositive(rect.width, browserWindow.innerWidth),
    height: firstPositive(rect.height, browserWindow.innerHeight),
    tileSize: HUNT_TILE_SIZE,
  });
}

export function createGame(
  parent: HTMLElement,
  bridge: SceneBridge,
  huntOptions?: Omit<HuntSceneOptions, 'bridge'>,
): GameRuntime {
  let phaseBeforePause: Pick<ShellSnapshot, 'phase' | 'message'> | undefined;
  const huntSceneOptions = huntOptions ? { ...huntOptions, bridge } : undefined;
  const initialSize = measureRenderSize(parent, window);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#060b16',
    scene: huntSceneOptions
      ? [new BootScene(bridge, 'hunt'), new HuntScene(huntSceneOptions)]
      : [new BootScene(bridge), new ShellScene(bridge)],
    /**
     * `NONE` is the only mode that leaves the backing store to us. `RESIZE`
     * forces `canvas.width` to the parent every refresh, and `FIT`/`EXPAND`
     * treat the configured size as a fixed base, which would *grow* the
     * backing store on a viewport smaller than that base. Under `NONE`,
     * Phaser still stretches the canvas CSS box over the parent, so the frame
     * reaches the window edges as one composited blit.
     */
    scale: {
      mode: Phaser.Scale.NONE,
      width: initialSize.width,
      height: initialSize.height,
    },
    /**
     * Nearest-neighbour filtering. The default is `antialias: true`, which
     * bilinear-filtered every tile and every damage number on the way to a
     * camera zoom above 1. `pixelArt` also turns on `roundPixels` and marks
     * the canvas `image-rendering: pixelated`, so the upscale stays crisp.
     */
    render: {
      pixelArt: true,
    },
  });

  const applyRenderSize = (): void => {
    const size = measureRenderSize(parent, window);

    if (size.width !== game.scale.width || size.height !== game.scale.height) {
      game.scale.resize(size.width, size.height);
    }
  };

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(applyRenderSize);

    observer.observe(parent);
    game.events.once(Phaser.Core.Events.DESTROY, () => {
      observer.disconnect();
    });
  }

  return {
    game,
    lifecycle: {
      pause: () => {
        game.loop.sleep();
        const snapshot = bridge.getSnapshot();
        phaseBeforePause ??= {
          phase: snapshot.phase,
          message: snapshot.message,
        };
        bridge.publish({
          ...snapshot,
          phase: 'paused',
          message: 'Presentation paused',
        });
      },
      resume: () => {
        game.loop.wake();
        const snapshot = bridge.getSnapshot();
        const resumeSnapshot = phaseBeforePause;
        phaseBeforePause = undefined;

        if (!resumeSnapshot) {
          return;
        }

        bridge.publish({
          ...snapshot,
          ...resumeSnapshot,
        });
      },
    },
  };
}
