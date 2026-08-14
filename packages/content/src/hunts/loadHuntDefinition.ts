import {
  type HuntDefinition,
  type SimulationValidationResult,
  validateHuntDefinition,
} from '@huntbound/contracts';

export function loadHuntDefinition(
  raw: unknown,
): SimulationValidationResult<HuntDefinition> {
  return validateHuntDefinition(raw);
}
