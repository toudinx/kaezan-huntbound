import Phaser from 'phaser';

import type { SceneBridge } from '../../bridge/SceneBridge';
import type { RendererKind } from '../../runtime/ShellSnapshot';

function rendererKind(rendererType: number): RendererKind {
  if (rendererType === Phaser.WEBGL) {
    return 'webgl';
  }

  if (rendererType === Phaser.CANVAS) {
    return 'canvas';
  }

  return 'unavailable';
}

export class ShellScene extends Phaser.Scene {
  constructor(private readonly bridge: SceneBridge) {
    super('shell');
  }

  create() {
    const grid = this.add.graphics();
    const { width, height } = this.scale;

    grid.lineStyle(1, 0x5d81b7, 0.14);

    for (let x = 0; x <= width; x += 48) {
      grid.lineBetween(x, 0, x, height);
    }

    for (let y = 0; y <= height; y += 48) {
      grid.lineBetween(0, y, width, y);
    }

    this.bridge.publish({
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
}
