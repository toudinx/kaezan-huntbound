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

const streamLabels = ['ai', 'movement', 'scenario'] as const;
type KernelStreamLabel = (typeof streamLabels)[number];

export interface KernelRandomStreams {
  readonly movement: RandomSource;
  readonly ai: RandomSource;
  readonly scenario: RandomSource;
  serialize(): readonly RandomStreamState[];
}

function isKernelStreamLabel(label: string): label is KernelStreamLabel {
  return (streamLabels as readonly string[]).includes(label);
}

function createStreams(
  ai: RandomSource,
  movement: RandomSource,
  scenario: RandomSource,
): KernelRandomStreams {
  return {
    ai,
    movement,
    scenario,
    serialize() {
      return streamLabels.map((label) => {
        if (label === 'ai') {
          return ai.serialize();
        }
        if (label === 'movement') {
          return movement.serialize();
        }
        return scenario.serialize();
      });
    },
  };
}

export function createKernelRandomStreams(seed: Seed): KernelRandomStreams {
  return createStreams(
    createSeededRandom(seed, 'ai' as StreamLabel),
    createSeededRandom(seed, 'movement' as StreamLabel),
    createSeededRandom(seed, 'scenario' as StreamLabel),
  );
}

export function restoreKernelRandomStreams(
  states: readonly RandomStreamState[],
): KernelRandomStreams {
  if (!Array.isArray(states)) {
    throw new TypeError('Random stream states must be an array.');
  }
  if (states.length !== streamLabels.length) {
    throw new RangeError(
      'Kernel random streams must contain exactly three states.',
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

  for (const label of streamLabels) {
    if (!restored.has(label)) {
      throw new RangeError(`Missing kernel random stream label: ${label}.`);
    }
  }

  const ai = restored.get('ai');
  const movement = restored.get('movement');
  const scenario = restored.get('scenario');
  if (ai === undefined || movement === undefined || scenario === undefined) {
    throw new Error('Kernel random streams were not restored completely.');
  }

  return createStreams(ai, movement, scenario);
}
