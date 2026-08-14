import { afterEach, describe, expect, it, vi } from 'vitest';

import commandsJson from '../../../../packages/test-fixtures/simulation/pb03/commands.jsonl?raw';
import scenarioJson from '../../../../packages/test-fixtures/simulation/pb03/scenario.json?raw';
import expectedSnapshot from '../../../../packages/test-fixtures/simulation/pb03/snapshot.golden.json?raw';
import expectedHash from '../../../../packages/test-fixtures/simulation/pb03/snapshot.golden.sha256?raw';

import {
  installKernelProbe,
  type KernelProbe,
  KernelProbeError,
} from './KernelProbe';

type HuntboundKernelGlobal = typeof globalThis & {
  __huntboundKernelProbe?: KernelProbe;
};

const target = globalThis as HuntboundKernelGlobal;

describe('KernelProbe', () => {
  afterEach(() => {
    delete target.__huntboundKernelProbe;
    vi.unstubAllEnvs();
  });

  it('does not install outside the test mode', () => {
    vi.stubEnv('MODE', 'personal');
    installKernelProbe();
    expect(target.__huntboundKernelProbe).toBeUndefined();

    vi.stubEnv('MODE', 'product');
    installKernelProbe();
    expect(target.__huntboundKernelProbe).toBeUndefined();
  });

  it('installs idempotently and reproduces the frozen fixture', async () => {
    vi.stubEnv('MODE', 'test');
    installKernelProbe();
    const first = target.__huntboundKernelProbe;
    installKernelProbe();

    expect(first).toBeDefined();
    expect(target.__huntboundKernelProbe).toBe(first);

    const result = await first?.replay(scenarioJson, commandsJson);

    expect(result).toEqual({
      canonicalSnapshot: expectedSnapshot,
      snapshotSha256: expectedHash.trim(),
      eventCount: 59,
      finalTick: 200,
    });
  });

  it('rejects invalid input with structured diagnostics', async () => {
    vi.stubEnv('MODE', 'test');
    installKernelProbe();
    const probe = target.__huntboundKernelProbe;

    expect(probe).toBeDefined();
    if (!probe) {
      throw new Error('Expected a test kernel probe.');
    }

    await expect(probe.replay('{', '')).rejects.toBeInstanceOf(
      KernelProbeError,
    );

    try {
      await probe.replay('{', '');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'SIM_SCHEMA_INVALID',
        diagnostics: [
          expect.objectContaining({
            code: 'SIM_SCHEMA_INVALID',
            path: ['scenario'],
          }),
        ],
      });
    }
  });

  it('reports malformed command logs with structured diagnostics', async () => {
    vi.stubEnv('MODE', 'test');
    installKernelProbe();
    const probe = target.__huntboundKernelProbe;

    expect(probe).toBeDefined();
    if (!probe) {
      throw new Error('Expected a test kernel probe.');
    }

    await expect(probe.replay(scenarioJson, '')).rejects.toMatchObject({
      code: 'SIM_SCHEMA_INVALID',
      diagnostics: [
        expect.objectContaining({
          code: 'SIM_SCHEMA_INVALID',
          path: ['text'],
        }),
      ],
    });
  });
});
