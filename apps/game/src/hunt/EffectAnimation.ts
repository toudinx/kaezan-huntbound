import type { AssetAnimationGroup } from '../../../../packages/assets/src/index.ts';

/**
 * Which atlas frame an effect shows after `elapsedMs`, using the durations the
 * asset itself declares. Each `phaseDurationsMs` entry is a `[min, max]` pair
 * that Tibia randomises within; this takes `min` so the presentation stays a
 * pure function of the render clock. The clip plays once and holds the last
 * reached frame — it never loops.
 */
export function effectFrame(
  animation: AssetAnimationGroup,
  elapsedMs: number,
): number {
  if (animation.frameCount === 1) return 0;

  const firstFrame = animation.startFrame;
  const lastFrame = animation.startFrame + animation.frameCount - 1;
  const elapsed = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  if (elapsed <= 0) return firstFrame;

  const durations = animation.phaseDurationsMs;
  if (durations.length === 0) return firstFrame;

  let remaining = elapsed;
  let phaseIndex = 0;

  for (let index = 0; index < durations.length; index += 1) {
    const duration = Math.max(durations[index]?.[0] ?? 0, 0);
    if (duration <= 0) continue;
    if (remaining < duration) {
      phaseIndex = index;
      break;
    }
    remaining -= duration;
    phaseIndex = index;
  }

  return Math.min(Math.max(firstFrame + phaseIndex, firstFrame), lastFrame);
}
