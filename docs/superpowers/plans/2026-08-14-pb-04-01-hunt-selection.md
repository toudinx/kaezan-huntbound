# PB-04-01 Hunt Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze `hunt:tibia:venore-rotworm-cave` as a machine-readable selection backed by measured spawn data and a deterministic validator.

**Architecture:** Keep the selection contract in `tools/hunt-selection` as a pure TypeScript API. The validator parses only the monster XML, converts group-relative `x/y` plus slot `z` to absolute spawn coordinates, filters catalogued and explicitly excluded creatures, converts `spawntime` to 50 ms ticks, and returns stable diagnostics. A thin CLI resolves the selection, catalog, and canary source root, then prints JSON and maps validation/input failures to exit codes.

**Tech Stack:** TypeScript executed by Node's experimental type stripping, `fast-xml-parser`, Vitest, Biome, pnpm workspace scripts, JSON/Markdown artifacts.

## Global Constraints

- Hunt key remains `hunt:tibia:venore-rotworm-cave`.
- Region budget is at most 3 floors and 96 × 96 inclusive-coordinate tiles per floor.
- `references/` is read-only input and no byte from it is committed.
- Do not parse OTBM, `appearances.dat`, or any binary; do not change contracts, kernel, assets, app, or browser code.
- Unknown creatures are excluded only when recorded with name, reason `absent from PB-01 catalog`, and measured count.
- `expectedDroppedTransitions` is frozen as `0` in PB-04-01 and is reconciled by PB-04-04.
- `hunt:selection:check` remains outside aggregate `check` and `verify` because it requires a local snapshot.

---

### Task 1: Build the pure selection validator with synthetic RED/GREEN tests

**Files:**
- Create: `tools/hunt-selection/types.ts`
- Create: `tools/hunt-selection/validateHuntSelection.ts`
- Create: `tools/hunt-selection/validateHuntSelection.test.ts`

**Interfaces:**
- `types.ts` exports `HuntSelection`, `HuntSelectionRegion`, `HuntSelectionDiagnostic`, and `HuntSelectionReport` exactly as specified in `docs/playbooks/PB-04/tasks/PB-04-01-selecionar-e-congelar-a-hunt.md`.
- `validateHuntSelection.ts` exports `validateHuntSelection(selection: unknown, monsterXml: string, catalogCreatureKeys: readonly string[]): HuntSelectionReport`.
- XML group coordinates use `centerx + slot.x`, `centery + slot.y`, and the slot's declared `z`; each selected creature slot contributes to the measured group/slot counts.
- `creatureNames` contains only included catalog creatures found in the region; explicitly excluded names are omitted.

- [ ] **Step 1: Write the synthetic failing tests.** Use inline XML with `<monsters><monster centerx=...>` groups and a helper that builds a valid selection. Cover: valid selection and counts; width 97; four floors; unknown creature; explicit exclusion; `90` seconds to `1800` ticks; `0.03` and `abc` spawntime diagnostics; a second integer conversion; empty region; and same-path diagnostics sorted by code.

```ts
const xml = `<monsters>
  <monster centerx="100" centery="200" centerz="8" radius="2">
    <monster name="Rotworm" x="0" y="0" z="8" spawntime="90" />
  </monster>
</monsters>`;

const result = validateHuntSelection(selection, xml, ['creature:tibia:rotworm']);
expect(result).toMatchObject({
  ok: true,
  width: 1,
  height: 1,
  spawnGroups: 1,
  spawnSlots: 1,
  creatureNames: ['Rotworm'],
});
```

- [ ] **Step 2: Run the focused tests to prove RED.**

Run: `corepack pnpm exec vitest run tools/hunt-selection/validateHuntSelection.test.ts`

Expected: FAIL because `tools/hunt-selection/validateHuntSelection.ts` does not exist yet, not because of a malformed fixture.

- [ ] **Step 3: Implement the smallest validator that makes the tests pass.** Parse the XML with `XMLParser` configured for attributes and repeated `monster` elements; normalize creature names to case-insensitive catalog keys; count only included slots; report the required codes at stable paths; convert seconds using integer milliseconds divided by `50`; and sort diagnostics by `path` then `code`.

- [ ] **Step 4: Run focused tests to prove GREEN and refactor only after GREEN.**

Run: `corepack pnpm exec vitest run tools/hunt-selection/validateHuntSelection.test.ts`

Expected: all validator tests pass with no warnings.

- [ ] **Step 5: Commit the validator cycle.**

```powershell
git add tools/hunt-selection
git commit -m "feat: validate frozen hunt selections"
```

### Task 2: Add the source-root-aware CLI and root script

**Files:**
- Create: `tools/hunt-selection/cli.ts`
- Create: `tools/hunt-selection/cli.test.ts`
- Modify: `package.json`

**Interfaces:**
- CLI syntax is `node tools/hunt-selection/cli.ts check --selection <path> --source-root <path>` or the equivalent `--source-root-env HUNTBOUND_CANARY_SOURCE`.
- `check` returns `0` for a valid report, `1` for validation diagnostics, and `2` for invalid usage or unreadable/malformed input.
- The CLI derives catalog creature keys from the PB-01 generated catalog, not from `references/`.
- The root script invokes the frozen selection with `--source-root-env HUNTBOUND_CANARY_SOURCE` and is not included in `check` or `verify`.

- [ ] **Step 1: Write failing CLI tests.** Spawn the TypeScript CLI with a temporary XML source root and temporary selection; assert valid exit `0`, invalid selection exit `1` with ordered diagnostics, and missing source root/invalid usage exit `2`.
- [ ] **Step 2: Run the CLI tests to prove RED.**

Run: `corepack pnpm exec vitest run tools/hunt-selection/cli.test.ts`

Expected: FAIL because the CLI module and root script do not exist.

- [ ] **Step 3: Implement the CLI and package script.** Use safe option parsing, `HUNTBOUND_CANARY_SOURCE` only when explicitly requested, paths relative to the supplied source root, JSON stdout for success, JSON stderr for diagnostics, and no literal machine-specific source path.
- [ ] **Step 4: Run the CLI tests and focused suite to prove GREEN.**

Run: `corepack pnpm exec vitest run tools/hunt-selection`

Expected: all validator and CLI tests pass.

- [ ] **Step 5: Commit the CLI cycle.**

```powershell
git add tools/hunt-selection package.json
git commit -m "feat: check the frozen hunt selection from the canary snapshot"
```

### Task 3: Freeze measured data, report the checklist, and hand off PB-04-01

**Files:**
- Create: `packages/content/src/selections/pb-04-venore-rotworm-cave.json`
- Create: `docs/content/PB-04-SELECTION.md`
- Modify: `docs/playbooks/PB-04/STATE.md`

**Measured input:** The local XML has 51,896 spawn groups, 83,286 slots, 1,134 Rotworm groups, and 1,575 Rotworm slots. The broad candidate window `(32800, 33150) × (31950, 32300)` contains 72 Rotworm groups and 95 Rotworm slots, split 48 on `z = 8` and 47 on `z = 9`. The final box must be selected from a contiguous playable cluster within the 96 × 96 budget and then rechecked with the implementation.

- [ ] **Step 1: Choose and record the smallest practical contiguous Rotworm box.** Use the measured XML coordinates, keep both `z = 8` and `z = 9`, minimize unrelated species while retaining a meaningful cluster, and record included/excluded counts. Use source URL `https://tibiaroute.com/br/hunting-places/Venore-Rotworm-Cave`, level `8`, and solo vocation `vocation:tibia:knight`.
- [ ] **Step 2: Run the CLI against the real local snapshot before finalizing the report.**

Run: `node tools/hunt-selection/cli.ts check --selection packages/content/src/selections/pb-04-venore-rotworm-cave.json --source-root C:\Kaezan\kaezan-huntbound\references\canary`

Expected: exit `0`; use its width, height, floors, group/slot counts, species, and diagnostics as the authoritative numbers.

- [ ] **Step 3: Write the checklist report.** Cite the individual URL, level, Knight solo compatibility, measured XML existence/counts, source map/config pairing, the local presence of tile/object/outfit/effect inputs, no party/quest/world-event/service dependency, and budget proof. State that `references/` remains local and the selection check is intentionally opt-in.
- [ ] **Step 4: Update `STATE.md`.** Mark PB-04-01 `done`, record the branch/commit/evidence, commands and exit codes, selection measurements, model/effort/skills, validator, and next eligible task PB-04-02. Preserve the `expectedDroppedTransitions = 0` PB-04-04 reconciliation note.
- [ ] **Step 5: Run all required verification gates.**

```powershell
corepack pnpm exec vitest run tools/hunt-selection
corepack pnpm exec biome check tools/hunt-selection packages/content
corepack pnpm format:check
corepack pnpm typecheck
corepack pnpm verify
git diff --check
```

- [ ] **Step 6: Commit and integrate with fast-forward.** Commit the implementation on `codex/pb04-01-hunt-selection`, fast-forward `main`, rerun `corepack pnpm verify` on `main`, then remove the worktree and delete the temporary branch only after capturing the final commit hash.
