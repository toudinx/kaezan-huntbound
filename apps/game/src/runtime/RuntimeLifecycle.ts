export type PauseReason = 'window-blur' | 'document-hidden';

export interface RuntimeLifecyclePort {
  pause(reason: PauseReason): void;
  resume(reason: PauseReason): void;
}

export interface DisposableController {
  start(): () => void;
}

interface EventSource {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export interface RuntimeLifecycleBrowser {
  readonly window: EventSource;
  readonly document: EventSource & { readonly hidden: boolean };
}

export function createRuntimeLifecycle(
  port: RuntimeLifecyclePort,
  browser: RuntimeLifecycleBrowser,
): DisposableController {
  const activeReasons = new Set<PauseReason>();
  let disposed = false;
  let started = false;

  const pause = (reason: PauseReason) => {
    if (activeReasons.has(reason)) {
      return;
    }

    const wasRunning = activeReasons.size === 0;
    activeReasons.add(reason);

    if (wasRunning) {
      port.pause(reason);
    }
  };

  const resume = (reason: PauseReason) => {
    if (!activeReasons.delete(reason) || activeReasons.size !== 0) {
      return;
    }

    port.resume(reason);
  };

  const onVisibilityChange = () => {
    if (browser.document.hidden) {
      pause('document-hidden');
      return;
    }

    resume('document-hidden');
  };

  const dispose = () => {
    if (disposed) {
      return;
    }

    disposed = true;
    browser.window.removeEventListener('blur', onWindowBlur);
    browser.window.removeEventListener('focus', onWindowFocus);
    browser.document.removeEventListener(
      'visibilitychange',
      onVisibilityChange,
    );
    activeReasons.clear();
  };

  const onWindowBlur = () => pause('window-blur');
  const onWindowFocus = () => resume('window-blur');

  return {
    start: () => {
      if (started || disposed) {
        return dispose;
      }

      started = true;
      browser.window.addEventListener('blur', onWindowBlur);
      browser.window.addEventListener('focus', onWindowFocus);
      browser.document.addEventListener('visibilitychange', onVisibilityChange);
      onVisibilityChange();

      return dispose;
    },
  };
}
