# PB-03-04 — Commands and Command Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the deterministic command buffer and JSONL command log boundary for `@huntbound/simulation`.

**Architecture:** `commands/commandBuffer.ts` owns in-memory external command intake, sequence allocation, duplicate detection, deterministic ordering, draining, and restoration. `commands/commandLog.ts` owns the flattened JSONL representation and transactional decode, reusing the strict schemas and diagnostics from `@huntbound/contracts`. `src/index.ts` exposes only the frozen public functions/types; no world state, tick loop, event system, clock, randomness, filesystem, or Node APIs are introduced.

**Tech Stack:** TypeScript 7.0.2 strict mode, Vitest 4.1.10, `@huntbound/contracts`, native `JSON.parse`/`JSON.stringify` with recursive key sorting.

## Global Constraints

- `sequence` is assigned by the buffer, starts at `1`, is monotonic, and rejected commands never consume it.
- Output ordering is `(tick, commandPriority(type), sequence)`; snapshot-facing `pending()` ordering is `(tick, sequence)`.
- `tick < currentTick` returns `SIM_TICK_IN_PAST`; forbidden issuer/type pairs return `SIM_COMMAND_FORBIDDEN`.
- Duplicate actions are the same issuer, entity, tick, and concurrent action type in `actor/move-step` or `actor/wait`; `actor/face` does not conflict.
- Command logs contain external commands only, use a header plus flattened command lines, and end with LF.
- Decoder acceptance is transactional: malformed or semantically invalid input returns diagnostics and never a partial log.
- `packages/simulation/src/**` must not import Node, DOM, timers, clocks, randomness, filesystem, or undeclared dependencies.

---

### Task 1: Command buffer, ordering, and restoration

**Files:**
- Create: `packages/simulation/src/commands/commandBuffer.ts`
- Create: `packages/simulation/src/commands/commandBuffer.test.ts`
- Modify: `packages/simulation/src/index.ts`
- Modify: `packages/simulation/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: `SimulationCommandInput`, `SimulationCommandRecord`, `TickIndex`, `SimulationDiagnosticCode`, `SimulationCommandInputSchema`, and `commandPriority` from `@huntbound/contracts`.
- Produces:
  ```ts
  export type CommandAcceptance =
    | { readonly ok: true; readonly sequence: number }
    | { readonly ok: false; readonly code: SimulationDiagnosticCode };

  export interface CommandBuffer {
    readonly nextSequence: number;
    enqueue(input: SimulationCommandInput, currentTick: TickIndex): CommandAcceptance;
    drain(tick: TickIndex): readonly SimulationCommandRecord[];
    pending(): readonly SimulationCommandRecord[];
  }

  export function createCommandBuffer(startSequence?: number): CommandBuffer;
  export function restoreCommandBuffer(
    pending: readonly SimulationCommandRecord[],
    nextSequence: number,
  ): CommandBuffer;
  export function orderCommands(
    records: readonly SimulationCommandRecord[],
  ): readonly SimulationCommandRecord[];
  ```

- [ ] **Step 1: Add the failing intake tests.** Create reusable branded test inputs with `createEntityId` and `createTickIndex`, then prove sequence allocation, current/future tick acceptance, past-tick rejection, forbidden issuer rejection, and sequence preservation after rejection:

  ```ts
  it('allocates monotonic sequences and does not consume one on rejection', () => {
    const buffer = createCommandBuffer();
    expect(buffer.enqueue(wait(0, 'player', 1), createTickIndex(0))).toEqual({ ok: true, sequence: 1 });
    expect(buffer.enqueue(wait(1, 'player', 1), createTickIndex(0))).toEqual({ ok: true, sequence: 2 });
    expect(buffer.enqueue(wait(0, 'player', 1), createTickIndex(1))).toEqual({ ok: false, code: 'SIM_TICK_IN_PAST' });
    expect(buffer.enqueue(wait(2, 'player', 1), createTickIndex(1))).toEqual({ ok: true, sequence: 3 });
  });

  it('rejects forbidden issuers without entering pending', () => {
    const buffer = createCommandBuffer();
    expect(buffer.enqueue({ tick: createTickIndex(0), issuer: 'player', command: spawn() }, createTickIndex(0))).toEqual({ ok: false, code: 'SIM_COMMAND_FORBIDDEN' });
    expect(buffer.pending()).toEqual([]);
    expect(buffer.nextSequence).toBe(1);
  });
  ```

- [ ] **Step 2: Run the focused test to verify RED.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands/commandBuffer.test.ts`

  Expected: FAIL because `commands/commandBuffer.ts` and the public exports do not exist.

- [ ] **Step 3: Add the simulation dependency and implement minimal intake.** Add `"@huntbound/contracts": "0.0.0"` to `packages/simulation/package.json`, refresh the workspace lockfile, validate with `SimulationCommandInputSchema.safeParse`, map the first sorted validation diagnostic to the acceptance code, reject `input.tick < currentTick`, and allocate the current `nextSequence` only after all checks pass.

- [ ] **Step 4: Run the focused intake test to verify GREEN.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands/commandBuffer.test.ts`

  Expected: all intake assertions PASS.

- [ ] **Step 5: Add the failing ordering and duplicate tests.** Prove shuffled inputs drain by `(tick, priority, sequence)`, same-priority commands retain sequence order, scenario commands precede actor commands, the second same-issuer action for one actor/tick returns `SIM_COMMAND_DUPLICATE`, face plus move is allowed, and different issuers are allowed.

- [ ] **Step 6: Run the focused ordering test to verify RED.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands/commandBuffer.test.ts`

  Expected: FAIL on the not-yet-implemented ordering and duplicate assertions.

- [ ] **Step 7: Implement ordering, drain, pending, and restore.** Keep the input immutable; use explicit three-way numeric comparisons; remove a drained tick from both the records and duplicate index; return `[]` for a drained/missing tick; sort `pending()` by `(tick, sequence)`; and have `restoreCommandBuffer` validate records, duplicate keys, unique sequences, and `nextSequence > max(sequence)` before rebuilding the buffer.

- [ ] **Step 8: Run the focused command-buffer tests to verify GREEN.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands/commandBuffer.test.ts`

  Expected: all intake, ordering, drain, pending, and restore assertions PASS.

- [ ] **Step 9: Export the command-buffer API.** Re-export `CommandAcceptance`, `CommandBuffer`, `createCommandBuffer`, `restoreCommandBuffer`, and `orderCommands` from `packages/simulation/src/index.ts` using the package's `.ts` import convention.

- [ ] **Step 10: Commit the independently testable buffer.**

  ```powershell
  git add packages/simulation/package.json pnpm-lock.yaml packages/simulation/src/commands/commandBuffer.ts packages/simulation/src/commands/commandBuffer.test.ts packages/simulation/src/index.ts
  git commit -m "feat: add deterministic command buffer"
  ```

### Task 2: Canonical JSONL command log

**Files:**
- Create: `packages/simulation/src/commands/commandLog.ts`
- Create: `packages/simulation/src/commands/commandLog.test.ts`
- Modify: `packages/simulation/src/index.ts`

**Interfaces:**
- Consumes: `SimulationCommandLog`, `SimulationCommandRecord`, `SimulationValidationResult`, `SimulationCommandLogHeaderSchema`, `SimulationCommandRecordSchema`, `validateSimulationCommandLog`, and `simulationDiagnosticsFromZodError` from `@huntbound/contracts`.
- Produces:
  ```ts
  export function encodeCommandLog(log: SimulationCommandLog): string;
  export function decodeCommandLog(
    text: string,
  ): SimulationValidationResult<SimulationCommandLog>;
  ```

- [ ] **Step 1: Add the failing round-trip and canonicality tests.** Build a valid header and records, assert the encoder emits a header line followed by flattened `kind/type/payload` command lines, each line has recursively sorted keys, the text ends in `\n`, and `decodeCommandLog(encodeCommandLog(log))` returns the original nested log.

- [ ] **Step 2: Run the focused log test to verify RED.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands/commandLog.test.ts`

  Expected: FAIL because the encoder/decoder module does not exist.

- [ ] **Step 3: Implement recursive canonical JSON and encoding.** Sort object keys with JavaScript's default code-unit ordering, recurse through arrays and objects, serialize without whitespace, append exactly one LF to the joined lines, and throw a `TypeError` when `validateSimulationCommandLog` rejects the input. Flatten each record as `{ kind: 'command', tick, sequence, issuer, type: command.type, payload: command without type }`.

- [ ] **Step 4: Run the round-trip test to verify GREEN.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands/commandLog.test.ts`

  Expected: round-trip and canonical output assertions PASS.

- [ ] **Step 5: Add failing decoder diagnostics tests.** Feed headerless input, an empty middle line, invalid JSON, unknown `kind`, a decreasing tick, a non-increasing sequence, and a header with divergent schema/rules versions. Assert the result is `ok: false`, includes the expected code (`SIM_SCHEMA_INVALID`, `SIM_COMMAND_DUPLICATE`, or `SIM_VERSION_MISMATCH`), and never returns a partially parsed command list.

- [ ] **Step 6: Run the decoder diagnostics test to verify RED.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands/commandLog.test.ts`

  Expected: FAIL for the missing decoder validation behavior.

- [ ] **Step 7: Implement transactional decoding.** Require a non-empty LF-terminated text, parse every non-empty line, require line 0 to be `kind: 'header'`, require subsequent lines to be `kind: 'command'`, reconstruct each nested record from `type` and `payload`, validate record/header shapes, then call `validateSimulationCommandLog` once all lines are structurally valid. Prefix line diagnostics with `lines[index]`; return one failure result with sorted diagnostics and never return commands from a failing parse.

- [ ] **Step 8: Run all command tests to verify GREEN.**

  Run: `corepack pnpm --filter @huntbound/simulation test -- src/commands`

  Expected: all buffer and log tests PASS with no warnings.

- [ ] **Step 9: Export the command-log API.** Re-export `encodeCommandLog` and `decodeCommandLog` from `packages/simulation/src/index.ts`.

- [ ] **Step 10: Commit the log independently.**

  ```powershell
  git add packages/simulation/src/commands/commandLog.ts packages/simulation/src/commands/commandLog.test.ts packages/simulation/src/index.ts
  git commit -m "feat: encode and decode kernel command logs"
  ```

### Task 3: Contract documentation and verification

**Files:**
- Modify: `docs/simulation/KERNEL_CONTRACT.md`

- [ ] **Step 1: Document the implemented command boundary.** Add the buffer sequence rules, acceptance diagnostics, priority table, duplicate definition, `drain`/`pending` ordering, flattened JSONL line shape, canonical LF requirements, transactional decoder rule, and external-command-only policy.

- [ ] **Step 2: Run the package gates.**

  ```powershell
  corepack pnpm --filter @huntbound/simulation test
  corepack pnpm --filter @huntbound/simulation typecheck
  corepack pnpm architecture:check
  corepack pnpm exec biome check packages/simulation
  corepack pnpm format:check
  git diff --check
  ```

  Expected: every command exits `0`; Vitest reports zero failures; no formatter or boundary diagnostics.

- [ ] **Step 3: Run the workspace regression gates.**

  ```powershell
  corepack pnpm typecheck
  corepack pnpm test
  ```

  Expected: every workspace package and existing test remains green.

- [ ] **Step 4: Review the diff against the PB-03-04 scope.** Confirm no files implement RNG, grid, world application, events, tick loop, snapshot, replay, CLI, browser behavior, or filesystem access.

- [ ] **Step 5: Commit documentation and record the handoff.** Update `docs/playbooks/PB-03/STATE.md` only if running in serial integration mode, then commit:

  ```powershell
  git add docs/simulation/KERNEL_CONTRACT.md docs/playbooks/PB-03/STATE.md
  git commit -m "docs: close PB-03-04 command boundary"
  ```

