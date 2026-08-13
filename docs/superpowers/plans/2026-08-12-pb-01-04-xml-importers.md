# PB-01-04 XML Importers Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add pure, strict and selective XML adapters for Knight and the explicitly requested Canary items.

**Architecture:** Keep parsing inside packages/content/src/importers/canary/xml/. A small shared module will handle parser setup, normalized names, strict numeric conversion and deterministic diagnostics. Separate vocation and item adapters will validate their own XML shapes, resolve only requested entities, map to DTOs and never touch filesystem, SQLite or the runtime entrypoint.

**Tech Stack:** TypeScript, fast-xml-parser 5.10.1, Vitest, existing CanaryParseResult and ContentDiagnostic contracts.

## Global Constraints

- Parser receives a string; the Node boundary reads files only in PB-01-06.
- Knight is selected by source ID 4, not by name.
- Items are selected by explicit ID sets and normalized names.
- fromid/toid resolves only one requested ID inside the range; it never expands the whole range.
- A name ambiguous across two IDs is an error and requires ID selection.
- Unknown required attributes block; allowlisted attributes without a consumer are ignored by a tested rule and are not copied to generic metadata.
- DTOs are sorted by sourceId.
- No filesystem, source lock, SQLite, CLI, generated JSON, Lua parser, creatures, loot resolution, gameplay or runtime adapter export.
- No Canary XML source is copied into Git; only synthetic fixtures and mapping documentation are versioned.

---

### Task 1: Create isolated implementation worktree and vocation RED tests

Files:

- Create worktree: C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers
- Create: packages/content/src/importers/canary/xml/parseVocationsXml.test.ts
- Read: packages/test-fixtures/canary/pb01/vocations.xml

Interfaces:

- Consumes: existing synthetic vocation fixture and the planned public parser signature.
- Produces: failing tests defining parseCanaryVocationsXml(xml, sourceIds) and the vocation DTO shape.

- [ ] Step 1: Verify the base worktree is clean and create the requested branch/worktree.

Run:

    git -C C:\Kaezan\kaezan-huntbound status --short
    git -C C:\Kaezan\kaezan-huntbound worktree add C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers -b codex/pb01-04-xml-importers main

Expected: the first command has no output and the second creates the worktree on codex/pb01-04-xml-importers.

- [ ] Step 2: Write the failing vocation tests before production code.

Use the fixture through a file URL. Cover selected entry, unselected entry exclusion, missing ID, duplicate ID, invalid required number and unknown semantic attribute.

    import { readFile } from 'node:fs/promises';
    import { fileURLToPath } from 'node:url';
    import { describe, expect, it } from 'vitest';
    import { parseCanaryVocationsXml } from './parseVocationsXml';

    const fixture = await readFile(
      fileURLToPath(
        new URL('../../../../../../test-fixtures/canary/pb01/vocations.xml', import.meta.url),
      ),
      'utf8',
    );

    describe('parseCanaryVocationsXml', () => {
      it('selects one vocation and maps explicit progression units', () => {
        expect(parseCanaryVocationsXml(fixture, ['9004'])).toEqual({
          ok: true,
          value: [{
            sourceId: '9004',
            displayName: 'Fixture Knight',
            gainHp: 9,
            gainMana: 6,
            gainCapacity: 17,
            baseSpeed: 125,
            attackSpeedMs: 1800,
            manaMultiplier: 2.4,
            skillMultipliers: { 'skill:0': 1.4, 'skill:1': 1.2 },
          }],
        });
      });

      it('does not import an unrequested vocation', () => {
        const result = parseCanaryVocationsXml(fixture, ['9004']);
        expect(result.ok && result.value.map((vocation) => vocation.sourceId)).toEqual(['9004']);
      });

      it('reports a requested vocation that is absent', () => {
        const result = parseCanaryVocationsXml(fixture, ['4']);
        expect(result).toMatchObject({ ok: false });
        expect(result.ok ? [] : result.diagnostics).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'xml.entity-not-found' })]),
        );
      });

      it('reports duplicate IDs', () => {
        const duplicate = fixture.replace(
          '</vocations>',
          '<vocation id="9004" name="Duplicate" gaincap="1" gainhp="1" gainmana="1" manamultiplier="1" attackspeed="1" basespeed="1" /></vocations>',
        );
        const result = parseCanaryVocationsXml(duplicate, ['9004']);
        expect(result.ok ? [] : result.diagnostics).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'xml.duplicate-id' })]),
        );
      });

      it('reports invalid required numeric attributes', () => {
        const result = parseCanaryVocationsXml(
          fixture.replace('gainhp="9"', 'gainhp="nine"'),
          ['9004'],
        );
        expect(result.ok ? [] : result.diagnostics).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'xml.invalid-number' })]),
        );
      });

      it('blocks unknown semantic attributes', () => {
        const result = parseCanaryVocationsXml(
          fixture.replace('gainhp="9"', 'gainhp="9" manaShield="1"'),
          ['9004'],
        );
        expect(result.ok ? [] : result.diagnostics).toEqual(
          expect.arrayContaining([expect.objectContaining({ code: 'xml.unsupported-attribute' })]),
        );
      });
    });

- [ ] Step 3: Run the vocation test file and verify the expected RED failure.

Run from the new worktree:

    corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml/parseVocationsXml.test.ts

Expected: FAIL because parseVocationsXml.ts does not exist yet, not because of a test syntax error.

---

### Task 2: Implement shared XML helpers and the vocation adapter

Files:

- Create: packages/content/src/importers/canary/xml/xmlTypes.ts
- Create: packages/content/src/importers/canary/xml/xmlDiagnostics.ts
- Create: packages/content/src/importers/canary/xml/parseVocationsXml.ts
- Modify: packages/content/src/importers/canary/xml/parseVocationsXml.test.ts

Interfaces:

- Consumes: CanaryParseResult and CanarySourceLocation from ../sourceTypes plus ContentDiagnostic from @huntbound/contracts.
- Produces:

    export interface CanaryVocationDto {
      readonly sourceId: string;
      readonly displayName: string;
      readonly gainHp: number;
      readonly gainMana: number;
      readonly gainCapacity: number;
      readonly baseSpeed: number;
      readonly attackSpeedMs: number;
      readonly manaMultiplier: number;
      readonly skillMultipliers: Readonly<Record<string, number>>;
    }

    export function parseCanaryVocationsXml(
      xml: string,
      sourceIds: readonly string[],
    ): CanaryParseResult<readonly CanaryVocationDto[]>;

- [ ] Step 1: Implement the minimum XML value helpers needed by the failing tests.

xmlTypes.ts defines parsed attribute/element records as narrow Record<string, unknown> helpers and scalar value types. xmlDiagnostics.ts exposes deterministic helpers equivalent to:

    normalizeXmlName(value: string): string
    createXmlDiagnostic(code: string, message: string): ContentDiagnostic
    parseRequiredInteger(value: unknown, field: string)
    parseRequiredNumber(value: unknown, field: string)

Use XMLParser with ignoreAttributes false, attributeNamePrefix '@_', and explicit array handling for vocation, skill, formula, mitigation, pvp, gem and vocations. Catch parser errors and return xml.malformed diagnostics.

- [ ] Step 2: Run the vocation tests and confirm the adapter is still RED.

Run the focused Vitest command. Expected: FAIL with the adapter missing or returning no matching DTOs; do not change the tests to make them pass.

- [ ] Step 3: Implement the minimal vocation parser to make focused tests GREEN.

Validate the vocations root and index every vocation by unique id. Required attributes are id, name, gaincap, gainhp, gainmana, manamultiplier, attackspeed and basespeed.

Allowlisted ignored vocation attributes are clientid, baseid, description, magicshield, gainhpticks, gainhpamount, gainmanaticks, gainmanaamount, soulmax, gainsoulticks, fromvoc and avatarlooktype. Allowlisted ignored child elements are formula, mitigation, pvp and gem with their documented attributes; skill consumes only id and multiplier.

Any unknown attribute on a selected supported element returns xml.unsupported-attribute. A malformed skill ID or multiplier returns xml.invalid-number. Missing requested IDs return xml.entity-not-found. Duplicate IDs return xml.duplicate-id.

Map skills to skill:<id>, reject duplicate skill IDs, and sort DTOs by numeric sourceId with the canonical string as tie-breaker. Return one failure result containing all diagnostics found during validation, or the sorted DTO array on success.

- [ ] Step 4: Run focused and package tests after the vocation adapter is GREEN.

    corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml/parseVocationsXml.test.ts
    corepack pnpm --filter @huntbound/content test

Expected: all focused vocation tests and all existing content tests pass.

---

### Task 3: Add item RED tests and implement selective item resolution

Files:

- Create: packages/content/src/importers/canary/xml/parseItemsXml.test.ts
- Create: packages/content/src/importers/canary/xml/parseItemsXml.ts
- Modify: packages/content/src/importers/canary/xml/xmlDiagnostics.ts
- Modify: packages/content/src/importers/canary/xml/xmlTypes.ts

Interfaces:

- Consumes: CanaryParseResult and shared XML helpers.
- Produces:

    export interface CanaryItemDto {
      readonly sourceId: string;
      readonly displayName: string;
      readonly attributes: Readonly<Record<string, string | number | boolean>>;
    }

    export function parseCanaryItemsXml(
      xml: string,
      selection: { readonly ids: readonly string[]; readonly names: readonly string[] },
    ): CanaryParseResult<readonly CanaryItemDto[]>;

- [ ] Step 1: Write item tests before creating the item adapter.

Use packages/test-fixtures/canary/pb01/items.xml and cover:

    it('selects by concrete ID and maps documented scalar attributes', () => {
      expect(parseCanaryItemsXml(fixture, { ids: ['9301'], names: [] })).toEqual({
        ok: true,
        value: [{
          sourceId: '9301',
          displayName: 'fixture shard',
          attributes: { article: 'a', weight: 0.4 },
        }],
      });
    });

    it('selects by normalized name', () => {
      expect(parseCanaryItemsXml(fixture, { ids: [], names: ['  FIXTURE TONIC  '] })).toMatchObject({
        ok: true,
        value: [{ sourceId: '9302', displayName: 'fixture tonic' }],
      });
    });

    it('resolves one requested ID inside a range without expanding the range', () => {
      const result = parseCanaryItemsXml(fixture, { ids: ['9311'], names: [] });
      expect(result).toMatchObject({
        ok: true,
        value: [{ sourceId: '9311', displayName: 'fixture tile' }],
      });
    });

    it('does not import unrequested IDs from a range', () => {
      const result = parseCanaryItemsXml(fixture, { ids: ['9311'], names: [] });
      expect(result.ok && result.value.map((item) => item.sourceId)).toEqual(['9311']);
    });

    it('rejects ambiguous normalized names', () => {
      const xml = fixture.replace(
        'id="9302" name="fixture tonic"',
        'id="9302" name="fixture shard"',
      );
      const result = parseCanaryItemsXml(xml, { ids: [], names: ['fixture shard'] });
      expect(result.ok ? [] : result.diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'xml.ambiguous-name' })]),
      );
    });

    it('rejects missing items and reversed ranges', () => {
      const missing = parseCanaryItemsXml(fixture, { ids: ['9999'], names: [] });
      expect(missing.ok ? [] : missing.diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'xml.entity-not-found' })]),
      );

      const reversed = parseCanaryItemsXml(
        fixture.replace('fromid="9310" toid="9312"', 'fromid="9312" toid="9310"'),
        { ids: ['9311'], names: [] },
      );
      expect(reversed.ok ? [] : reversed.diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: 'xml.invalid-range' })]),
      );
    });

Add one test that an unknown selected item attribute produces xml.unsupported-attribute, while an unknown attribute on an unselected item does not cause that item to appear in the result.

- [ ] Step 2: Run item tests and confirm the expected RED failure.

    corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml/parseItemsXml.test.ts

Expected: FAIL because parseItemsXml.ts is not defined yet.

- [ ] Step 3: Implement concrete and range indexing locally.

Parse items and validate each item has either id or both fromid/toid, never both forms. Build a local concrete-ID map for requested direct IDs and names, and keep ranges as interval records rather than generated arrays.

Reject duplicate concrete IDs, duplicate identical ranges, invalid integer IDs and reversed ranges. For each requested ID, prefer a concrete item; otherwise find exactly one containing range. For each requested name, normalize with trim, Unicode lowercase and collapsed internal whitespace, then require exactly one concrete ID/range match. If a name maps to more than one concrete ID or range, return xml.ambiguous-name.

- [ ] Step 4: Implement allowlisted item mapping.

Use sourceId as the concrete requested ID even when the source record is a range. Use source name as displayName. Map only documented item-level fields article and plural, plus attribute key weight as numeric weight; map explicit primitive item fields stackable and maxStackSize if present.

The parser may recognize and ignore documented source keys used by the curated item slice: primarytype, weaponType, shootType, maxhitchance, range, attack, defense, extradef, armor, description, showCount, writeable, maxtextlen, stopduration, decayTo, duration, containersize, count, imbuementslot, slot, slotType, showCharges, showduration, showattributes, walkstack, perfectshotrange and nested script metadata. Unknown keys on selected items block with xml.unsupported-attribute and are never copied into attributes.

- [ ] Step 5: Run item and package tests to verify GREEN.

    corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml/parseItemsXml.test.ts
    corepack pnpm --filter @huntbound/content test

Expected: all item tests and all package tests pass.

---

### Task 4: Document the XML mapping and prove the adapter boundary

Files:

- Create: docs/content/CANARY_XML_MAPPING.md
- Modify: packages/content/src/importers/canary/xml/parseVocationsXml.test.ts
- Modify: packages/content/src/importers/canary/xml/parseItemsXml.test.ts

Interfaces:

- Consumes: final DTO fields and allowlists from Tasks 2 and 3.
- Produces: auditable mapping documentation and tests proving packages/content/src/index.ts does not expose XML adapters.

- [ ] Step 1: Write the mapping table.

Document source path, XML field, normalization, unit, DTO destination and consumer rationale for:

    vocation/@id -> CanaryVocationDto.sourceId; canonical decimal string and selection key
    vocation/@name -> displayName; preserve display text
    @gainhp, @gainmana, @gaincap -> gainHp, gainMana, gainCapacity; finite non-negative numbers
    @basespeed -> baseSpeed; non-negative integer game speed units
    @attackspeed -> attackSpeedMs; non-negative integer milliseconds
    @manamultiplier -> manaMultiplier; finite positive multiplier
    skill/@id and skill/@multiplier -> skillMultipliers; key skill:<id> and non-negative multiplier
    item/@id or selected ID in fromid/toid -> sourceId; one concrete requested ID
    item/@name -> displayName; normalized only for lookup
    item/@article and item/@plural -> attributes; string values and allowlisted metadata
    attribute[key=weight]/@value -> attributes.weight; finite non-negative numeric source weight

List ignored vocation and item fields separately and explain why each is allowlisted but not copied. State explicitly that unrequested entities are not validated into DTOs or returned.

- [ ] Step 2: Add boundary assertions.

Import the runtime content entrypoint and assert it does not have parseCanaryVocationsXml or parseCanaryItemsXml. Keep this assertion in the importer test suite so an accidental export fails close to the adapter.

- [ ] Step 3: Run restricted formatting and architecture checks.

    corepack pnpm exec biome check packages/content docs/content/CANARY_XML_MAPPING.md
    corepack pnpm format:check
    corepack pnpm architecture:check

Expected: exit code 0; the new adapter contains no Node, filesystem, SQLite or runtime imports.

---

### Task 5: Run final gates, update PB-01 state, commit, integrate and clean up

Files:

- Modify: docs/playbooks/PB-01/STATE.md
- Commit: all implementation files from Tasks 1–4

Interfaces:

- Consumes: final parser behavior and verification output.
- Produces: commit feat: parse curated Canary XML content, updated operational handoff and a clean integrated main.

- [ ] Step 1: Run the complete task gates in the implementation worktree.

    corepack pnpm --filter @huntbound/content test -- src/importers/canary/xml
    corepack pnpm --filter @huntbound/content typecheck
    corepack pnpm architecture:check
    corepack pnpm exec biome check packages/content docs/content/CANARY_XML_MAPPING.md
    corepack pnpm format:check
    git diff --check

Expected: all commands exit 0; record exact fresh results in docs/playbooks/PB-01/STATE.md.

- [ ] Step 2: Update PB-01 state with the completed task and next eligible task.

Change PB-01-04 to done, record branch codex/pb01-04-xml-importers, the commit hash after committing, fresh test/typecheck/gate evidence, and state that PB-01-05 is next eligible. Record that no escalation trigger occurred and that no Canary source was copied or read by the adapter.

- [ ] Step 3: Commit the implementation.

    git add packages/content docs/content/CANARY_XML_MAPPING.md docs/playbooks/PB-01/STATE.md
    git commit -m "feat: parse curated Canary XML content"
    git status --short

Expected: the commit succeeds and the implementation worktree status is clean.

- [ ] Step 4: Fast-forward the main worktree and re-run integration checks.

    git -C C:\Kaezan\kaezan-huntbound switch main
    git -C C:\Kaezan\kaezan-huntbound merge --ff-only codex/pb01-04-xml-importers
    corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/content test -- src/importers/canary/xml
    corepack pnpm --dir C:\Kaezan\kaezan-huntbound --filter @huntbound/content typecheck

Expected: fast-forward succeeds and both post-integration commands exit 0.

- [ ] Step 5: Remove the clean worktree and prune metadata.

    git -C C:\Kaezan\kaezan-huntbound worktree remove C:\Kaezan\kaezan-huntbound-pb01-04-xml-importers
    git -C C:\Kaezan\kaezan-huntbound worktree prune
    git -C C:\Kaezan\kaezan-huntbound branch -d codex/pb01-04-xml-importers
    git -C C:\Kaezan\kaezan-huntbound status --short --branch

Expected: the worktree is removed, the branch is deleted after fast-forward integration and main is clean.

