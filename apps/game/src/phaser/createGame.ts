import Phaser from 'phaser';

import type { SceneBridge } from '../bridge/SceneBridge';
import type { RuntimeLifecyclePort } from '../runtime/RuntimeLifecycle';
import type { ShellSnapshot } from '../runtime/ShellSnapshot';
import { BootScene } from './scenes/BootScene';
import { HuntScene, type HuntSceneOptions } from './scenes/HuntScene';
import { ShellScene } from './scenes/ShellScene';

export interface GameRuntime {
  readonly game: Phaser.Game;
  readonly lifecycle: RuntimeLifecyclePort;
}

export function createGame(
  parent: HTMLElement,
  bridge: SceneBridge,
  huntOptions?: Omit<HuntSceneOptions, 'bridge'>,
): GameRuntime {
  let phaseBeforePause: Pick<ShellSnapshot, 'phase' | 'message'> | undefined;
  const huntSceneOptions = huntOptions ? { ...huntOptions, bridge } : undefined;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#060b16',
    scene: huntSceneOptions
      ? [new BootScene(bridge, 'hunt'), new HuntScene(huntSceneOptions)]
      : [new BootScene(bridge), new ShellScene(bridge)],
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
  });

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
        // The loop slept while the window was away, but wall time did not, and
        // Phaser rebases its own clock on focus. Without this the first frame
        // back hands the simulation the whole away-duration at once and the
        // hunt fast-forwards through it in a single visible jump.
        huntSceneOptions?.driver.resyncClock?.();
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
