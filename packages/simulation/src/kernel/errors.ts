import type { SimulationDiagnosticCode } from '@huntbound/contracts';

/**
 * An invariant of the kernel itself broke. This is never a rejected command or
 * a blocked step: those are events. It means the live state contradicts the
 * contract, and the tick fails instead of continuing on inconsistent state.
 */
export class KernelInvariantError extends Error {
  readonly code: SimulationDiagnosticCode;

  constructor(code: SimulationDiagnosticCode, message: string) {
    super(`${code}: ${message}`);
    this.name = 'KernelInvariantError';
    this.code = code;
  }
}
