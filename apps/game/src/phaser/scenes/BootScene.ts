import Phaser from 'phaser';

import type { SceneBridge } from '../../bridge/SceneBridge';
import { canvasViewportBox } from '../ViewportBox';

export class BootScene extends Phaser.Scene {
  constructor(
    private readonly bridge: SceneBridge,
    private readonly nextScene: 'shell' | 'hunt' = 'shell',
  ) {
    super('boot');
  }

  create() {
    this.bridge.publish({
      phase: 'booting',
      renderer: 'unavailable',
      viewport: {
        ...canvasViewportBox(this.game.canvas, {
          width: this.scale.width,
          height: this.scale.height,
        }),
        devicePixelRatio: window.devicePixelRatio,
      },
      message: 'Starting renderer',
    });

    this.scene.start(this.nextScene);
  }
}
