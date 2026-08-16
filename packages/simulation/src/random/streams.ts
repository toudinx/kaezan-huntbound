import type {
  RandomStreamState,
  Seed,
  StreamLabel,
} from '@huntbound/contracts';

import {
  createSeededRandom,
  type RandomSource,
  restoreSeededRandom,
} from './source.ts';

const streamLabels = [
  'ai',
  'combat',
  'loot',
  'movement',
  'scenario',
  'spawn',
] as const;
type KernelStreamLabel = (typeof streamLabels)[number];

export interface KernelRandomStreams {
  readonly movement: RandomSource;
  readonly ai: RandomSource;
  readonly scenario: RandomSource;
  readonly spawn: RandomSource;
  readonly combat: RandomSource;
  readonly loot: RandomSource;
  serialize(): readonly RandomStreamState[];
}

function isKernelStreamLabel(label: string): label is KernelStreamLabel {
  return (streamLabels as readonly string[]).includes(label);
}

function createStreams(
  sources: Readonly<Record<KernelStreamLabel, RandomSource>>,
): KernelRandomStreams {
  return {
    ai: sources.ai,
    combat: sources.combat,
    loot: sources.loot,
    movement: sources.movement,
    scenario: sources.scenario,
    spawn: sources.spawn,
    serialize() {
      return streamLabels.map((label) => sources[label].serialize());
    },
  };
}

export function createKernelRandomStreams(seed: Seed): KernelRandomStreams {
  return createStreams({
    ai: createSeededRandom(seed, 'ai' as StreamLabel),
    combat: createSeededRandom(seed, 'combat' as StreamLabel),
    loot: createSeededRandom(seed, 'loot' as StreamLabel),
    movement: createSeededRandom(seed, 'movement' as StreamLabel),
    scenario: createSeededRandom(seed, 'scenario' as StreamLabel),
    spawn: createSeededRandom(seed, 'spawn' as StreamLabel),
  });
}

export function restoreKernelRandomStreams(
  states: readonly RandomStreamState[],
): KernelRandomStreams {
  if (!Array.isArray(states)) {
    throw new TypeError('Random stream states must be an array.');
  }
  if (states.length !== streamLabels.length) {
    throw new RangeError(
      `Kernel random streams must contain exactly ${streamLabels.length} states.`,
    );
  }

  const restored = new Map<KernelStreamLabel, RandomSource>();
  for (const state of states) {
    if (
      !state ||
      typeof state.label !== 'string' ||
      !isKernelStreamLabel(state.label)
    ) {
      throw new RangeError(
        `Unknown kernel random stream label: ${String(state?.label)}.`,
      );
    }
    if (restored.has(state.label)) {
      throw new RangeError(
        `Duplicate kernel random stream label: ${state.label}.`,
      );
    }
    restored.set(state.label, restoreSeededRandom(state));
  }

  const sources: Partial<Record<KernelStreamLabel, RandomSource>> = {};
  for (const label of streamLabels) {
    const source = restored.get(label);
    if (source === undefined) {
      throw new RangeError(`Missing kernel random stream label: ${label}.`);
    }
    sources[label] = source;
  }

  return createStreams(sources as Record<KernelStreamLabel, RandomSource>);
}
