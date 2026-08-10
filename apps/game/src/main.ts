import './styles.css';

import Phaser from 'phaser';

import { createSceneBridge } from './bridge/SceneBridge';
import { createGame } from './phaser/createGame';
import { mountAppShell } from './ui/AppShell';

interface ShellHmrData {
  phaserDestroyed?: Promise<void>;
}

const hmrData = import.meta.hot?.data as ShellHmrData | undefined;

// A replacement shell waits until Phaser removes the preceding canvas.
await hmrData?.phaserDestroyed;

const gameRoot = document.querySelector<HTMLElement>('#game-root');
const uiRoot = document.querySelector<HTMLElement>('#ui-root');

if (!gameRoot || !uiRoot) {
  throw new Error('Huntbound shell roots are missing.');
}

const bridge = createSceneBridge({
  phase: 'booting',
  renderer: 'unavailable',
  viewport: {
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
  },
  message: 'Preparing shell',
});
const appShell = mountAppShell(uiRoot, bridge);
const game = createGame(gameRoot, bridge);

let markedActionable = false;
const unsubscribePerformanceMark = bridge.subscribe((snapshot) => {
  if (snapshot.phase === 'ready' && !markedActionable) {
    markedActionable = true;
    performance.mark('huntbound:shell-actionable');
  }
});

function destroyGame() {
  return new Promise<void>((resolve) => {
    game.events.once(Phaser.Core.Events.DESTROY, resolve);
    game.destroy(true);
  });
}

function disposeShell(data: ShellHmrData) {
  unsubscribePerformanceMark();
  appShell.destroy();
  data.phaserDestroyed = destroyGame();
}

if (import.meta.hot) {
  import.meta.hot.dispose(disposeShell);
}
