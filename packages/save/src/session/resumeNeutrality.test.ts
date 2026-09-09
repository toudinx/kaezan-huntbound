import { createSimulationKernel } from '@huntbound/simulation/src/kernel/index.ts';
import { encodeCanonicalJson } from '@huntbound/simulation/src/state/canonicalJson.ts';
import {
  restoreSimulationKernel,
  snapshotKernel,
} from '@huntbound/simulation/src/state/snapshot.ts';
import { describe, expect, it } from 'vitest';

import { createMemorySaveDriver } from '../drivers/memory.ts';
import { createSaveRepository } from '../repository/SaveRepository.ts';
import { decideResume } from './decideResume.ts';
import { TEST_IDENTITY, TEST_SEED, testScenario } from './sessionTestUtils.ts';

describe('save resume neutrality', () => {
  it('a kernel resumed from a persisted snapshot matches a run that never went through save', async () => {
    const scenario = testScenario();
    const checkpointTicks = 8;
    const remainingTicks = 12;

    const uninterrupted = createSimulationKernel(scenario, TEST_SEED);
    uninterrupted.advance(checkpointTicks + remainingTicks);
    const expectedFinal = snapshotKernel(uninterrupted);

    const firstLeg = createSimulationKernel(scenario, TEST_SEED);
    firstLeg.advance(checkpointTicks);
    const repository = createSaveRepository(createMemorySaveDriver());
    await repository.transact((draft) => {
      draft.session = {
        huntId: TEST_IDENTITY.huntId,
        vocationKey: TEST_IDENTITY.vocationKey,
        scenarioId: scenario.scenarioId,
        scenarioRevision: scenario.scenarioRevision,
        seed: TEST_SEED,
        snapshot: snapshotKernel(firstLeg),
        bag: [{ itemKey: 'item:tibia:gold-coin', count: 2 }],
        lastBestiaryEventSequence: 0,
      };
    });

    const loaded = await repository.load();
    const decision = decideResume(loaded, TEST_IDENTITY);
    expect(decision).toMatchObject({ kind: 'resume' });
    if (decision.kind !== 'resume') {
      throw new Error('Expected the persisted session to be resumable');
    }

    const restored = restoreSimulationKernel(
      scenario,
      decision.session.snapshot,
    );
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      throw new Error(
        'Expected restoreSimulationKernel to accept the snapshot',
      );
    }

    restored.value.advance(remainingTicks);
    const resumedFinal = snapshotKernel(restored.value);

    expect(encodeCanonicalJson(resumedFinal)).toBe(
      encodeCanonicalJson(expectedFinal),
    );
    expect(decision.session.bag).toEqual([
      { itemKey: 'item:tibia:gold-coin', count: 2 },
    ]);
  });
});
