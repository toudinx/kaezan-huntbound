import Phaser from 'phaser';

import type { SceneBridge } from '../bridge/SceneBridge';
import type { RuntimeLifecyclePort } from '../runtime/RuntimeLifecycle';
import type { ShellSnapshot } from '../runtime/ShellSnapshot';
import { BootScene } from './scenes/BootScene';
import { ShellScene } from './scenes/ShellScene';

export interface GameRuntime {
  readonly game: Phaser.Game;
  readonly lifecycle: RuntimeLifecyclePort;
}

export function createGame(
  parent: HTMLElement,
  bridge: SceneBridge,
): GameRuntime {
  let phaseBeforePause: Pick<ShellSnapshot, 'phase' | 'message'> | undefined;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#060b16',
    scene: [new BootScene(bridge), new ShellScene(bridge)],
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
