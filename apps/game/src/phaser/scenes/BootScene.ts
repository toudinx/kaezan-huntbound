import Phaser from 'phaser';

import type { SceneBridge } from '../../bridge/SceneBridge';

export class BootScene extends Phaser.Scene {
  constructor(private readonly bridge: SceneBridge) {
    super('boot');
  }

  create() {
    this.bridge.publish({
      phase: 'booting',
      renderer: 'unavailable',
      viewport: {
        width: this.scale.width,
        height: this.scale.height,
        devicePixelRatio: window.devicePixelRatio,
      },
      message: 'Starting renderer',
    });

    this.scene.start('shell');
  }
}
