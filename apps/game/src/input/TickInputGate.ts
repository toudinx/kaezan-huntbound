export interface TickInputGate {
  take(tick: number): boolean;
  reset(): void;
}

export function createTickInputGate(): TickInputGate {
  let lastTick: number | undefined;

  return {
    take: (tick) => {
      if (lastTick === tick) return false;
      lastTick = tick;
      return true;
    },
    reset: () => {
      lastTick = undefined;
    },
  };
}
