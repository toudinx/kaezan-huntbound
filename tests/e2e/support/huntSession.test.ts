import { describe, expect, it } from 'vitest';

import {
  buildHuntSession,
  HUNT_SESSION_SCENARIO_ID,
  HUNT_SESSION_TICK_COUNT,
  huntSessionCoverage,
} from './huntSession';

/**
 * The browser parity test compares Node against Chromium, so it stays green
 * even if the route degenerates into "stand still for 600 ticks". These are the
 * assertions that keep the session worth comparing.
 */
describe('huntSessionCoverage', () => {
  const coverage = huntSessionCoverage();

  it('runs the full declared tick count', () => {
    expect(coverage.finalTick).toBe(HUNT_SESSION_TICK_COUNT);
  });

  it('drives the player across many accepted steps', () => {
    expect(coverage.playerMoves).toBeGreaterThanOrEqual(20);
  });

  it('walks the player through a floor transition', () => {
    expect(coverage.playerTransitions).toBeGreaterThanOrEqual(1);
  });

  it('bumps the player into terrain and into a creature', () => {
    expect(coverage.playerBlockedReasons).toContain('terrain');
    expect(coverage.playerBlockedReasons).toContain('occupied');
  });

  it('keeps every accepted player step to a single tile', () => {
    expect(coverage.largestPlayerStep).toBe(1);
  });

  it('spawns the whole creature table', () => {
    expect(coverage.spawnedActors).toBeGreaterThanOrEqual(12);
  });
});

describe('buildHuntSession', () => {
  const session = buildHuntSession();

  it('targets the generated hunt scenario', () => {
    expect(session.scenarioId).toBe(HUNT_SESSION_SCENARIO_ID);
  });

  it('is reproducible inside Node itself', () => {
    expect(buildHuntSession().node).toEqual(session.node);
  });

  it('ends the canonical snapshot with a single newline', () => {
    expect(session.node.canonicalSnapshot.endsWith('}\n')).toBe(true);
  });

  it('hashes the canonical snapshot it reports', () => {
    expect(session.node.snapshotSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
