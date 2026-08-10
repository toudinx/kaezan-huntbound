import Phaser from 'phaser';

import type { SceneBridge } from '../bridge/SceneBridge';
import { BootScene } from './scenes/BootScene';
import { ShellScene } from './scenes/ShellScene';

export function createGame(
  parent: HTMLElement,
  bridge: SceneBridge,
): Phaser.Game {
  return new Phaser.Game({
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
}
