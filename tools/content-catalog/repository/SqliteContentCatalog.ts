import { fileURLToPath } from 'node:url';
import type {
  CatalogContentBundle,
  ContentFacet,
  ContentGuid,
  ContentKey,
  EntityKind,
} from '@huntbound/contracts';
import type Database from 'better-sqlite3';

import { CatalogError } from '../database/catalogErrors.ts';
import { openDatabase } from '../database/openDatabase.ts';
import { applyMigrations } from '../migrations/MigrationRunner.ts';
import {
  canonicalizeCatalogBundle,
  canonicalJson,
  facetPayloadHash,
  validatePersistableBundle,
} from './canonicalCatalog.ts';

const defaultMigrationsDirectory = fileURLToPath(
  new URL('../migrations', import.meta.url),
);

interface ContentCatalogReadPort {
  readCatalogBundle(sliceKey: string): CatalogContentBundle;
  countRows(): Readonly<Record<string, number>>;
}

interface CatalogMutationTransaction {
  replaceCatalogBundle(bundle: CatalogContentBundle): void;
  listOrphanEntities(): readonly ContentGuid[];
}

interface CatalogMutationRunner {
  transaction<Operation extends (tx: CatalogMutationTransaction) => unknown>(
    operation: Operation &
      (Extract<ReturnType<Operation>, PromiseLike<unknown>> extends never
        ? unknown
        : never),
  ): ReturnType<Operation>;
}

export interface OpenContentCatalog extends ContentCatalogReadPort {
  migrate(): void;
  close(): void;
}

export interface OpenMutableContentCatalog
  extends OpenContentCatalog,
    CatalogMutationRunner {}

type CatalogEntity =
  | CatalogContentBundle['vocations'][number]
  | CatalogContentBundle['creatures'][number]
  | CatalogContentBundle['items'][number]
  | CatalogContentBundle['spells'][number];

const facetOrder: readonly ContentFacet[] = [
  'identity',
  'stats',
  'appearance',
  'combat',
  'conditions',
  'loot',
  'item',
  'progression',
  'spell',
];

function entityKind(entity: CatalogEntity): EntityKind {
  if ('familyKey' in entity) return 'vocation';
  if ('stats' in entity) return 'creature';
  if ('words' in entity) return 'spell';
  return 'item';
}

function allEntities(bundle: CatalogContentBundle): readonly CatalogEntity[] {
  return [
    ...bundle.vocations,
    ...bundle.creatures,
    ...bundle.items,
    ...bundle.spells,
  ];
}

export class SqliteContentCatalog
  implements OpenContentCatalog, CatalogMutationRunner
{
  private readonly database: Database.Database;
  private readonly migrationsDirectory: string;
  private closed = false;
  private migrated = false;
  private transactionActive = false;

  constructor(path: string, migrationsDirectory = defaultMigrationsDirectory) {
    this.database = openDatabase(path);
    this.migrationsDirectory = migrationsDirectory;
  }

  migrate(): void {
    this.assertOpen();
    if (this.migrated) return;
    applyMigrations(this.database, this.migrationsDirectory);
    this.migrated = true;
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.database.close();
  }

  countRows(): Readonly<Record<string, number>> {
    this.assertReady();
    const tables = this.database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as Array<{ readonly name: string }>;
    return Object.fromEntries(
      tables.map(({ name }) => {
        const row = this.database
          .prepare(
            `SELECT COUNT(*) AS count FROM "${name.replaceAll('"', '""')}"`,
          )
          .get() as { readonly count: number };
        return [name, row.count];
      }),
    );
  }

  readCatalogBundle(sliceKey: string): CatalogContentBundle {
    this.assertReady();
    const slice = this.database
      .prepare('SELECT * FROM content_slices WHERE slice_key = ?')
      .get(sliceKey) as
      | {
          readonly slice_key: string;
          readonly schema_version: string;
          readonly content_version: string;
          readonly objective: string;
          readonly consumer: string;
          readonly snapshot: string;
          readonly dependency_mode: 'reachable-only';
          readonly curation_state: 'draft' | 'accepted';
          readonly export_version: string;
        }
      | undefined;
    if (!slice) {
      throw new CatalogError(
        'catalog-missing-slice',
        `Missing slice: ${sliceKey}`,
      );
    }

    const entityRows = this.database
      .prepare(
        'SELECT cse.* FROM content_slice_entities cse JOIN content_entities ce ON ce.guid = cse.entity_guid WHERE cse.slice_key = ? ORDER BY ce.stable_key',
      )
      .all(sliceKey) as Array<{
      readonly entity_guid: ContentGuid;
      readonly entity_kind: EntityKind;
      readonly display_name: string;
      readonly source_system: 'canary';
      readonly snapshot: string;
      readonly source_path: string;
      readonly source_id: string;
      readonly source_sha256: string;
    }>;
    const identityRows = new Map(
      (
        this.database
          .prepare('SELECT guid, stable_key FROM content_entities')
          .all() as Array<{
          readonly guid: ContentGuid;
          readonly stable_key: ContentKey;
        }>
      ).map((row) => [row.guid, row.stable_key]),
    );
    const entityRowsByGuid = new Map(
      entityRows.map((row) => [row.entity_guid, row]),
    );
    const metadataFor = (guid: ContentGuid) => {
      const row = entityRowsByGuid.get(guid);
      if (!row) throw new Error(`Missing entity metadata for ${guid}`);
      const aliases = this.database
        .prepare(
          'SELECT alias, source_system FROM content_aliases WHERE slice_key = ? AND entity_guid = ? ORDER BY source_system, alias',
        )
        .all(sliceKey, guid) as Array<{
        readonly alias: string;
        readonly source_system: 'tibia';
      }>;
      return {
        source: {
          system: row.source_system,
          snapshot: row.snapshot,
          sourceId: row.source_id,
          sourcePath: row.source_path,
          sourceSha256: row.source_sha256,
        },
        aliases: aliases.map((alias) => ({
          alias: alias.alias,
          sourceSystem: alias.source_system,
          entityKey: identityRows.get(guid) as ContentKey,
        })),
      };
    };
    const facetsFor = (guid: ContentGuid) => {
      const rows = this.database
        .prepare(
          'SELECT facet, consumer, rationale FROM content_entity_facets WHERE slice_key = ? AND entity_guid = ?',
        )
        .all(sliceKey, guid) as Array<{
        readonly facet: ContentFacet;
        readonly consumer: string;
        readonly rationale: string;
      }>;
      return rows
        .map((row) => row.facet)
        .sort(
          (left, right) => facetOrder.indexOf(left) - facetOrder.indexOf(right),
        );
    };
    const projectionFor = (guid: ContentGuid) => {
      const row = this.database
        .prepare(
          'SELECT consumer, rationale FROM content_entity_facets WHERE slice_key = ? AND entity_guid = ? ORDER BY facet LIMIT 1',
        )
        .get(sliceKey, guid) as {
        readonly consumer: string;
        readonly rationale: string;
      };
      return {
        entityKey: identityRows.get(guid) as ContentKey,
        facets: facetsFor(guid),
        consumer: row.consumer,
        rationale: row.rationale,
      };
    };

    const vocations = entityRows
      .filter((row) => row.entity_kind === 'vocation')
      .map((row) => {
        const vocation = this.database
          .prepare(
            'SELECT * FROM vocations WHERE slice_key = ? AND entity_guid = ?',
          )
          .get(sliceKey, row.entity_guid) as {
          readonly family_key: string;
          readonly gain_hp: number;
          readonly gain_mana: number;
          readonly gain_capacity: number;
          readonly base_speed: number;
          readonly attack_speed_ms: number;
          readonly mana_multiplier: number;
        };
        const skills = this.database
          .prepare(
            'SELECT skill, multiplier FROM vocation_skill_multipliers WHERE slice_key = ? AND vocation_guid = ? ORDER BY skill',
          )
          .all(sliceKey, row.entity_guid) as Array<{
          readonly skill: string;
          readonly multiplier: number;
        }>;
        return {
          guid: row.entity_guid,
          stableKey: identityRows.get(row.entity_guid) as ContentKey,
          displayName: row.display_name,
          includedFacets: facetsFor(row.entity_guid),
          ...metadataFor(row.entity_guid),
          familyKey: vocation.family_key,
          gainHp: vocation.gain_hp,
          gainMana: vocation.gain_mana,
          gainCapacity: vocation.gain_capacity,
          baseSpeed: vocation.base_speed,
          attackSpeedMs: vocation.attack_speed_ms,
          manaMultiplier: vocation.mana_multiplier,
          skillMultipliers: Object.fromEntries(
            skills.map((skill) => [skill.skill, skill.multiplier]),
          ),
        };
      });

    const creatures = entityRows
      .filter((row) => row.entity_kind === 'creature')
      .map((row) => {
        const creature = this.database
          .prepare(
            'SELECT * FROM creatures WHERE slice_key = ? AND entity_guid = ?',
          )
          .get(sliceKey, row.entity_guid) as {
          readonly health: number;
          readonly experience: number;
          readonly speed: number;
          readonly look_type: number;
        };
        const attacks = this.database
          .prepare(
            'SELECT * FROM creature_attacks WHERE slice_key = ? AND creature_guid = ? ORDER BY ordinal',
          )
          .all(sliceKey, row.entity_guid) as Array<Record<string, unknown>>;
        const defenses = this.database
          .prepare(
            'SELECT * FROM creature_defenses WHERE slice_key = ? AND creature_guid = ? ORDER BY ordinal',
          )
          .all(sliceKey, row.entity_guid) as Array<Record<string, unknown>>;
        const conditions = this.database
          .prepare(
            'SELECT * FROM creature_conditions WHERE slice_key = ? AND creature_guid = ? ORDER BY ordinal',
          )
          .all(sliceKey, row.entity_guid) as Array<Record<string, unknown>>;
        const summons = this.database
          .prepare(
            'SELECT target_guid, count, chance_basis_points FROM creature_summons WHERE slice_key = ? AND creature_guid = ? ORDER BY ordinal',
          )
          .all(sliceKey, row.entity_guid) as Array<{
          readonly target_guid: ContentGuid;
          readonly count: number;
          readonly chance_basis_points: number;
        }>;
        const resistances = this.database
          .prepare(
            'SELECT damage_type, value FROM creature_resistances WHERE slice_key = ? AND creature_guid = ? ORDER BY damage_type',
          )
          .all(sliceKey, row.entity_guid) as Array<{
          readonly damage_type: string;
          readonly value: number;
        }>;
        const immunities = this.database
          .prepare(
            'SELECT immunity FROM creature_immunities WHERE slice_key = ? AND creature_guid = ? ORDER BY ordinal',
          )
          .all(sliceKey, row.entity_guid) as Array<{
          readonly immunity: string;
        }>;
        const loot = this.database
          .prepare(
            'SELECT item_guid, chance_per_hundred_thousand, min_count, max_count FROM loot_entries WHERE slice_key = ? AND creature_guid = ? ORDER BY ordinal',
          )
          .all(sliceKey, row.entity_guid) as Array<{
          readonly item_guid: ContentGuid;
          readonly chance_per_hundred_thousand: number;
          readonly min_count: number;
          readonly max_count: number;
        }>;
        return {
          guid: row.entity_guid,
          stableKey: identityRows.get(row.entity_guid) as ContentKey,
          displayName: row.display_name,
          includedFacets: facetsFor(row.entity_guid),
          ...metadataFor(row.entity_guid),
          stats: {
            health: creature.health,
            experience: creature.experience,
            speed: creature.speed,
          },
          lookType: creature.look_type,
          attacks: attacks.map((attack) => {
            const base = {
              kind: attack.kind,
              name: attack.name,
              intervalMs: attack.interval_ms,
              chanceBasisPoints: attack.chance_basis_points,
              damageType: attack.damage_type,
              minDamage: attack.min_damage,
              maxDamage: attack.max_damage,
            };
            if (attack.kind === 'ranged') {
              return {
                ...base,
                kind: 'ranged' as const,
                rangeTiles: attack.range_tiles,
                projectile: attack.projectile,
              };
            }
            if (attack.kind === 'area') {
              return {
                ...base,
                kind: 'area' as const,
                shape: attack.shape,
                radiusTiles: attack.radius_tiles,
              };
            }
            return { ...base, kind: 'melee' as const };
          }),
          defenses: defenses.map((defense) => ({
            kind: 'heal' as const,
            intervalMs: defense.interval_ms as number,
            chanceBasisPoints: defense.chance_basis_points as number,
            minAmount: defense.min_amount as number,
            maxAmount: defense.max_amount as number,
          })),
          conditions: conditions.map((condition) => ({
            kind: 'poison' as const,
            totalDamage: condition.total_damage as number,
            intervalMs: condition.interval_ms as number,
          })),
          summons: summons.map((summon) => ({
            creatureKey: identityRows.get(summon.target_guid) as ContentKey,
            count: summon.count,
            chanceBasisPoints: summon.chance_basis_points,
          })),
          resistances: Object.fromEntries(
            resistances.map((resistance) => [
              resistance.damage_type,
              resistance.value,
            ]),
          ),
          immunities: immunities.map((immunity) => immunity.immunity),
          loot: loot.map((entry) => ({
            itemKey: identityRows.get(entry.item_guid) as ContentKey,
            chancePerHundredThousand: entry.chance_per_hundred_thousand,
            minCount: entry.min_count,
            maxCount: entry.max_count,
          })),
        };
      });

    const items = entityRows
      .filter((row) => row.entity_kind === 'item')
      .map((row) => {
        const item = this.database
          .prepare(
            'SELECT * FROM items WHERE slice_key = ? AND entity_guid = ?',
          )
          .get(sliceKey, row.entity_guid) as {
          readonly stackable: 0 | 1 | null;
          readonly max_stack_size: number | null;
          readonly weight: number | null;
        };
        return {
          guid: row.entity_guid,
          stableKey: identityRows.get(row.entity_guid) as ContentKey,
          displayName: row.display_name,
          includedFacets: facetsFor(row.entity_guid),
          ...metadataFor(row.entity_guid),
          ...(item.stackable === null
            ? {}
            : { stackable: item.stackable === 1 }),
          ...(item.max_stack_size === null
            ? {}
            : { maxStackSize: item.max_stack_size }),
          ...(item.weight === null ? {} : { weight: item.weight }),
        };
      });

    const spells = entityRows
      .filter((row) => row.entity_kind === 'spell')
      .map((row) => {
        const spell = this.database
          .prepare(
            'SELECT * FROM spells WHERE slice_key = ? AND entity_guid = ?',
          )
          .get(sliceKey, row.entity_guid) as Record<string, unknown>;
        const families = this.database
          .prepare(
            'SELECT family_key FROM spell_vocation_families WHERE slice_key = ? AND spell_guid = ? ORDER BY family_key',
          )
          .all(sliceKey, row.entity_guid) as Array<{
          readonly family_key: string;
        }>;
        return {
          guid: row.entity_guid,
          stableKey: identityRows.get(row.entity_guid) as ContentKey,
          displayName: row.display_name,
          includedFacets: facetsFor(row.entity_guid),
          ...metadataFor(row.entity_guid),
          words: spell.words as string,
          level: spell.level as number,
          mana: spell.mana as number,
          cooldownMs: spell.cooldown_ms as number,
          groupCooldownMs: spell.group_cooldown_ms as number,
          damageType:
            spell.damage_type as CatalogContentBundle['spells'][number]['damageType'],
          ...(spell.area_shape === null
            ? {}
            : {
                area: {
                  shape: 'square' as const,
                  radiusTiles: spell.area_radius_tiles as number,
                },
              }),
          allowedVocationFamilies: families.map(
            (family) =>
              family.family_key as CatalogContentBundle['vocationFamilies'][number]['key'],
          ),
          formula: JSON.parse(
            spell.formula_json as string,
          ) as CatalogContentBundle['spells'][number]['formula'],
        };
      });

    const rootRows = this.database
      .prepare(
        'SELECT entity_guid FROM content_slice_roots WHERE slice_key = ? ORDER BY ordinal',
      )
      .all(sliceKey) as Array<{ readonly entity_guid: ContentGuid }>;
    const rootKeys = rootRows.map(
      (root) => identityRows.get(root.entity_guid) as ContentKey,
    );
    const allKeys = entityRows.map(
      (row) => identityRows.get(row.entity_guid) as ContentKey,
    );
    const families = this.database
      .prepare(
        'SELECT family_key, display_name FROM content_slice_vocation_families WHERE slice_key = ? ORDER BY family_key',
      )
      .all(sliceKey) as Array<{
      readonly family_key: string;
      readonly display_name: string;
    }>;
    const projectionAudits = this.database
      .prepare(
        'SELECT spell_guid, raw_reference, relation, target_family_key FROM spell_source_vocation_refs WHERE slice_key = ? ORDER BY spell_guid, ordinal',
      )
      .all(sliceKey) as Array<{
      readonly spell_guid: ContentGuid;
      readonly raw_reference: string;
      readonly relation: 'allowed-vocation-family';
      readonly target_family_key: string;
    }>;
    const bundle = {
      schemaVersion: slice.schema_version,
      contentVersion: slice.content_version,
      slice: {
        key: slice.slice_key,
        snapshot: slice.snapshot,
        objective: slice.objective,
        consumer: slice.consumer,
        roots: rootKeys,
        dependencies: allKeys.filter((key) => !rootKeys.includes(key)),
        projections: entityRows.map((row) => projectionFor(row.entity_guid)),
        dependencyMode: slice.dependency_mode,
        curationState: slice.curation_state,
        exportVersion: slice.export_version,
        sourceFiles: entityRows
          .map((row) => row.source_path)
          .filter((path, index, paths) => paths.indexOf(path) === index),
      },
      vocationFamilies: families.map((family) => ({
        key: family.family_key as CatalogContentBundle['vocationFamilies'][number]['key'],
        displayName: family.display_name,
        vocationKeys: vocations
          .filter((vocation) => vocation.familyKey === family.family_key)
          .map((vocation) => vocation.stableKey),
      })),
      projectionAudits: projectionAudits.map((audit) => ({
        entityKey: identityRows.get(audit.spell_guid) as ContentKey,
        rawReference: audit.raw_reference,
        relation: audit.relation,
        targetFamilyKey:
          audit.target_family_key as CatalogContentBundle['vocationFamilies'][number]['key'],
      })),
      vocations,
      creatures,
      items,
      spells,
      characters: this.readCharacters(sliceKey),
    } as unknown as CatalogContentBundle;
    return canonicalizeCatalogBundle(bundle);
  }

  transaction<Operation extends (tx: CatalogMutationTransaction) => unknown>(
    operation: Operation &
      (Extract<ReturnType<Operation>, PromiseLike<unknown>> extends never
        ? unknown
        : never),
  ): ReturnType<Operation> {
    this.assertReady();
    if (this.transactionActive) {
      throw new CatalogError(
        'catalog-nested-transaction',
        'Nested catalog transactions are not allowed',
      );
    }
    let result!: ReturnType<Operation>;
    const run = this.database.transaction(() => {
      this.transactionActive = true;
      let active = true;
      const tx: CatalogMutationTransaction = {
        replaceCatalogBundle: (bundle) => {
          if (!active) {
            throw new CatalogError(
              'catalog-expired-transaction',
              'The catalog transaction handle has expired',
            );
          }
          this.replaceCatalogBundle(bundle);
        },
        listOrphanEntities: () => {
          if (!active) {
            throw new CatalogError(
              'catalog-expired-transaction',
              'The catalog transaction handle has expired',
            );
          }
          return this.listOrphanEntities();
        },
      };
      try {
        result = operation(tx) as ReturnType<Operation>;
        if (result !== null && typeof result === 'object' && 'then' in result) {
          throw new CatalogError(
            'catalog-thenable',
            'Catalog transactions must return synchronously, not a thenable',
          );
        }
        this.assertNoOrphans();
        this.assertSharedFacetPayloadsAgree();
        this.assertForeignKeyCheckIsEmpty();
      } finally {
        active = false;
        this.transactionActive = false;
      }
    });
    run();
    return result;
  }

  listOrphanEntities(): readonly ContentGuid[] {
    this.assertReady();
    return (
      this.database
        .prepare(
          'SELECT guid FROM content_entities WHERE guid NOT IN (SELECT entity_guid FROM content_slice_entities) ORDER BY guid',
        )
        .all() as Array<{ readonly guid: ContentGuid }>
    ).map((row) => row.guid);
  }

  private replaceCatalogBundle(input: CatalogContentBundle): void {
    const bundle = canonicalizeCatalogBundle(validatePersistableBundle(input));
    const existing = this.database
      .prepare('SELECT 1 FROM content_slices WHERE slice_key = ?')
      .get(bundle.slice.key);
    if (
      existing &&
      canonicalJson(this.readCatalogBundle(bundle.slice.key)) ===
        canonicalJson(bundle)
    ) {
      return;
    }
    this.deleteSlice(bundle.slice.key);
    for (const entity of allEntities(bundle)) {
      const kind = entityKind(entity);
      this.database
        .prepare(
          `INSERT INTO content_identity_ledger (guid, stable_key, identity_source_system, entity_kind, source_id, first_seen_slice_key)
           VALUES (?, ?, 'tibia', ?, ?, ?)
           ON CONFLICT(guid) DO NOTHING`,
        )
        .run(
          entity.guid,
          entity.stableKey,
          kind,
          entity.source.sourceId,
          bundle.slice.key,
        );
      this.database
        .prepare(
          `INSERT INTO content_entities (guid, stable_key, entity_kind, identity_source_system, source_id)
           VALUES (?, ?, ?, 'tibia', ?)
           ON CONFLICT(guid) DO NOTHING`,
        )
        .run(entity.guid, entity.stableKey, kind, entity.source.sourceId);
      this.database
        .prepare(
          `INSERT INTO source_snapshots (source_system, snapshot) VALUES ('canary', ?)
           ON CONFLICT(source_system, snapshot) DO NOTHING`,
        )
        .run(entity.source.snapshot);
      this.database
        .prepare(
          `INSERT INTO source_files (source_system, snapshot, source_path, source_id, source_sha256)
           VALUES ('canary', ?, ?, ?, ?)
           ON CONFLICT(source_system, snapshot, source_path) DO NOTHING`,
        )
        .run(
          entity.source.snapshot,
          entity.source.sourcePath,
          entity.source.sourceId,
          entity.source.sourceSha256,
        );
    }
    this.database
      .prepare(
        `INSERT INTO content_slices (slice_key, schema_version, content_version, objective, consumer, snapshot, dependency_mode, curation_state, export_version)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        bundle.slice.key,
        bundle.schemaVersion,
        bundle.contentVersion,
        bundle.slice.objective,
        bundle.slice.consumer,
        bundle.slice.snapshot,
        bundle.slice.dependencyMode,
        bundle.slice.curationState,
        bundle.slice.exportVersion,
      );
    for (const entity of allEntities(bundle)) {
      const kind = entityKind(entity);
      this.database
        .prepare(
          `INSERT INTO content_slice_entities
           (slice_key, entity_guid, entity_kind, display_name, source_system, snapshot, source_path, source_id, source_sha256)
           VALUES (?, ?, ?, ?, 'canary', ?, ?, ?, ?)`,
        )
        .run(
          bundle.slice.key,
          entity.guid,
          kind,
          entity.displayName,
          entity.source.snapshot,
          entity.source.sourcePath,
          entity.source.sourceId,
          entity.source.sourceSha256,
        );
      for (const alias of entity.aliases) {
        this.database
          .prepare(
            `INSERT INTO content_alias_registry (source_system, alias, entity_guid)
             VALUES (?, ?, ?) ON CONFLICT(source_system, alias) DO NOTHING`,
          )
          .run(alias.sourceSystem, alias.alias, entity.guid);
        this.database
          .prepare(
            `INSERT INTO content_aliases (slice_key, source_system, alias, entity_guid) VALUES (?, ?, ?, ?)`,
          )
          .run(bundle.slice.key, alias.sourceSystem, alias.alias, entity.guid);
      }
      const projection = bundle.slice.projections.find(
        (value) => value.entityKey === entity.stableKey,
      );
      if (!projection)
        throw new Error(`Missing projection for ${entity.stableKey}`);
      for (const facet of entity.includedFacets) {
        this.database
          .prepare(
            `INSERT INTO content_entity_facets (slice_key, entity_guid, facet, payload_sha256, consumer, rationale)
             VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            bundle.slice.key,
            entity.guid,
            facet,
            facetPayloadHash(entity, facet),
            projection.consumer,
            projection.rationale,
          );
      }
    }
    for (const [ordinal, root] of bundle.slice.roots.entries()) {
      const entity = allEntities(bundle).find(
        (value) => value.stableKey === root,
      );
      if (!entity) throw new Error(`Missing root entity ${root}`);
      this.database
        .prepare(
          'INSERT INTO content_slice_roots (slice_key, entity_guid, ordinal) VALUES (?, ?, ?)',
        )
        .run(bundle.slice.key, entity.guid, ordinal);
    }
    for (const family of bundle.vocationFamilies) {
      this.database
        .prepare(
          `INSERT INTO vocation_families (family_key) VALUES (?) ON CONFLICT(family_key) DO NOTHING`,
        )
        .run(family.key);
      this.database
        .prepare(
          'INSERT INTO content_slice_vocation_families (slice_key, family_key, display_name) VALUES (?, ?, ?)',
        )
        .run(bundle.slice.key, family.key, family.displayName);
    }
    for (const vocation of bundle.vocations) {
      this.database
        .prepare(
          `INSERT INTO vocations (slice_key, entity_guid, family_key, gain_hp, gain_mana, gain_capacity, base_speed, attack_speed_ms, mana_multiplier)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          bundle.slice.key,
          vocation.guid,
          vocation.familyKey,
          vocation.gainHp,
          vocation.gainMana,
          vocation.gainCapacity,
          vocation.baseSpeed,
          vocation.attackSpeedMs,
          vocation.manaMultiplier,
        );
      for (const [skill, multiplier] of Object.entries(
        vocation.skillMultipliers,
      )) {
        this.database
          .prepare(
            'INSERT INTO vocation_skill_multipliers (slice_key, vocation_guid, skill, multiplier) VALUES (?, ?, ?, ?)',
          )
          .run(bundle.slice.key, vocation.guid, skill, multiplier);
      }
      this.database
        .prepare(
          'INSERT INTO vocation_family_members (slice_key, family_key, vocation_guid) VALUES (?, ?, ?)',
        )
        .run(bundle.slice.key, vocation.familyKey, vocation.guid);
    }
    for (const creature of bundle.creatures) {
      this.database
        .prepare(
          'INSERT INTO creatures (slice_key, entity_guid, health, experience, speed, look_type) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(slice_key, entity_guid) DO NOTHING',
        )
        .run(
          bundle.slice.key,
          creature.guid,
          creature.stats.health,
          creature.stats.experience,
          creature.stats.speed,
          creature.lookType,
        );
    }
    for (const item of bundle.items) {
      this.database
        .prepare(
          'INSERT INTO items (slice_key, entity_guid, stackable, max_stack_size, weight) VALUES (?, ?, ?, ?, ?) ON CONFLICT(slice_key, entity_guid) DO NOTHING',
        )
        .run(
          bundle.slice.key,
          item.guid,
          item.stackable === undefined ? null : item.stackable ? 1 : 0,
          item.maxStackSize ?? null,
          item.weight ?? null,
        );
    }
    for (const creature of bundle.creatures) {
      this.database
        .prepare(
          'INSERT INTO creatures (slice_key, entity_guid, health, experience, speed, look_type) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(slice_key, entity_guid) DO NOTHING',
        )
        .run(
          bundle.slice.key,
          creature.guid,
          creature.stats.health,
          creature.stats.experience,
          creature.stats.speed,
          creature.lookType,
        );
      for (const [ordinal, attack] of creature.attacks.entries()) {
        this.database
          .prepare(
            `INSERT INTO creature_attacks
             (slice_key, creature_guid, ordinal, kind, name, interval_ms, chance_basis_points, damage_type, min_damage, max_damage, range_tiles, projectile, shape, radius_tiles)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(
            bundle.slice.key,
            creature.guid,
            ordinal,
            attack.kind,
            attack.name,
            attack.intervalMs,
            attack.chanceBasisPoints,
            attack.damageType,
            attack.minDamage,
            attack.maxDamage,
            attack.kind === 'ranged' ? attack.rangeTiles : null,
            attack.kind === 'ranged' ? attack.projectile : null,
            attack.kind === 'area' ? attack.shape : null,
            attack.kind === 'area' ? attack.radiusTiles : null,
          );
      }
      for (const [ordinal, defense] of creature.defenses.entries()) {
        this.database
          .prepare(
            'INSERT INTO creature_defenses (slice_key, creature_guid, ordinal, kind, interval_ms, chance_basis_points, min_amount, max_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .run(
            bundle.slice.key,
            creature.guid,
            ordinal,
            defense.kind,
            defense.intervalMs,
            defense.chanceBasisPoints,
            defense.minAmount,
            defense.maxAmount,
          );
      }
      for (const [ordinal, condition] of creature.conditions.entries()) {
        if (condition.kind !== 'poison') {
          continue;
        }
        this.database
          .prepare(
            'INSERT INTO creature_conditions (slice_key, creature_guid, ordinal, kind, total_damage, interval_ms) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .run(
            bundle.slice.key,
            creature.guid,
            ordinal,
            condition.kind,
            condition.totalDamage,
            condition.intervalMs,
          );
      }
      for (const [ordinal, summon] of creature.summons.entries()) {
        const target = bundle.creatures.find(
          (value) => value.stableKey === summon.creatureKey,
        );
        if (!target)
          throw new Error(`Missing summon target ${summon.creatureKey}`);
        this.database
          .prepare(
            'INSERT INTO creature_summons (slice_key, creature_guid, ordinal, target_guid, count, chance_basis_points) VALUES (?, ?, ?, ?, ?, ?)',
          )
          .run(
            bundle.slice.key,
            creature.guid,
            ordinal,
            target.guid,
            summon.count,
            summon.chanceBasisPoints,
          );
      }
      for (const [damageType, value] of Object.entries(creature.resistances)) {
        this.database
          .prepare(
            'INSERT INTO creature_resistances (slice_key, creature_guid, damage_type, value) VALUES (?, ?, ?, ?)',
          )
          .run(bundle.slice.key, creature.guid, damageType, value);
      }
      for (const [ordinal, immunity] of creature.immunities.entries()) {
        this.database
          .prepare(
            'INSERT INTO creature_immunities (slice_key, creature_guid, ordinal, immunity) VALUES (?, ?, ?, ?)',
          )
          .run(bundle.slice.key, creature.guid, ordinal, immunity);
      }
      for (const [ordinal, loot] of creature.loot.entries()) {
        const item = bundle.items.find(
          (value) => value.stableKey === loot.itemKey,
        );
        if (!item) throw new Error(`Missing loot target ${loot.itemKey}`);
        this.database
          .prepare(
            'INSERT INTO loot_entries (slice_key, creature_guid, ordinal, item_guid, chance_per_hundred_thousand, min_count, max_count) VALUES (?, ?, ?, ?, ?, ?, ?)',
          )
          .run(
            bundle.slice.key,
            creature.guid,
            ordinal,
            item.guid,
            loot.chancePerHundredThousand,
            loot.minCount,
            loot.maxCount,
          );
      }
    }
    for (const item of bundle.items) {
      this.database
        .prepare(
          'INSERT INTO items (slice_key, entity_guid, stackable, max_stack_size, weight) VALUES (?, ?, ?, ?, ?) ON CONFLICT(slice_key, entity_guid) DO NOTHING',
        )
        .run(
          bundle.slice.key,
          item.guid,
          item.stackable === undefined ? null : item.stackable ? 1 : 0,
          item.maxStackSize ?? null,
          item.weight ?? null,
        );
    }
    for (const spell of bundle.spells) {
      this.database
        .prepare(
          `INSERT INTO spells
           (slice_key, entity_guid, words, level, mana, cooldown_ms, group_cooldown_ms, damage_type, area_shape, area_radius_tiles, formula_kind, formula_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          bundle.slice.key,
          spell.guid,
          spell.words,
          spell.level,
          spell.mana,
          spell.cooldownMs,
          spell.groupCooldownMs,
          spell.damageType,
          spell.area?.shape ?? null,
          spell.area?.radiusTiles ?? null,
          spell.formula.kind,
          JSON.stringify(spell.formula),
        );
      for (const family of spell.allowedVocationFamilies) {
        this.database
          .prepare(
            'INSERT INTO spell_vocation_families (slice_key, spell_guid, family_key) VALUES (?, ?, ?)',
          )
          .run(bundle.slice.key, spell.guid, family);
      }
    }
    for (const [ordinal, audit] of bundle.projectionAudits.entries()) {
      const spell = bundle.spells.find(
        (value) => value.stableKey === audit.entityKey,
      );
      if (!spell)
        throw new Error(`Missing spell audit target ${audit.entityKey}`);
      this.database
        .prepare(
          'INSERT INTO spell_source_vocation_refs (slice_key, spell_guid, ordinal, raw_reference, relation, target_family_key) VALUES (?, ?, ?, ?, ?, ?)',
        )
        .run(
          bundle.slice.key,
          spell.guid,
          ordinal,
          audit.rawReference,
          audit.relation,
          audit.targetFamilyKey,
        );
    }
    this.writeCharacters(bundle);
    this.cleanupUnreferencedRows();
  }

  private readCharacters(sliceKey: string): CatalogContentBundle['characters'] {
    const rows = this.database
      .prepare(
        'SELECT * FROM characters WHERE slice_key = ? ORDER BY stable_key',
      )
      .all(sliceKey) as Array<{
      readonly stable_key: string;
      readonly vocation_key: string;
      readonly level: number;
      readonly weapon_item_key: string;
      readonly weapon_attack: number;
      readonly max_health: number;
      readonly max_mana: number;
    }>;
    return rows.map((row) => {
      const skills = Object.fromEntries(
        (
          this.database
            .prepare(
              'SELECT skill, value FROM character_skills WHERE slice_key = ? AND character_key = ? ORDER BY skill',
            )
            .all(sliceKey, row.stable_key) as Array<{
            readonly skill: string;
            readonly value: number;
          }>
        ).map((skill) => [skill.skill, skill.value]),
      );
      const spellKeys = (
        this.database
          .prepare(
            'SELECT spell_key FROM character_spells WHERE slice_key = ? AND character_key = ? ORDER BY ordinal',
          )
          .all(sliceKey, row.stable_key) as Array<{
          readonly spell_key: string;
        }>
      ).map((entry) => entry.spell_key);
      return {
        stableKey: row.stable_key,
        vocationKey: row.vocation_key,
        level: row.level,
        skills: skills as CatalogContentBundle['characters'][number]['skills'],
        weaponItemKey: row.weapon_item_key,
        weaponAttack: row.weapon_attack,
        maxHealth: row.max_health,
        maxMana: row.max_mana,
        spellKeys,
      };
    }) as CatalogContentBundle['characters'];
  }

  private writeCharacters(bundle: CatalogContentBundle): void {
    for (const character of bundle.characters) {
      this.database
        .prepare(
          `INSERT INTO characters
           (slice_key, stable_key, vocation_key, level, weapon_item_key, weapon_attack, max_health, max_mana)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          bundle.slice.key,
          character.stableKey,
          character.vocationKey,
          character.level,
          character.weaponItemKey,
          character.weaponAttack,
          character.maxHealth,
          character.maxMana,
        );
      for (const [skill, value] of Object.entries(character.skills)) {
        this.database
          .prepare(
            'INSERT INTO character_skills (slice_key, character_key, skill, value) VALUES (?, ?, ?, ?)',
          )
          .run(bundle.slice.key, character.stableKey, skill, value);
      }
      for (const [ordinal, spellKey] of character.spellKeys.entries()) {
        this.database
          .prepare(
            'INSERT INTO character_spells (slice_key, character_key, ordinal, spell_key) VALUES (?, ?, ?, ?)',
          )
          .run(bundle.slice.key, character.stableKey, ordinal, spellKey);
      }
    }
  }

  private deleteSlice(sliceKey: string): void {
    const statements = [
      'DELETE FROM character_spells WHERE slice_key = ?',
      'DELETE FROM character_skills WHERE slice_key = ?',
      'DELETE FROM characters WHERE slice_key = ?',
      'DELETE FROM spell_source_vocation_refs WHERE slice_key = ?',
      'DELETE FROM spell_vocation_families WHERE slice_key = ?',
      'DELETE FROM spells WHERE slice_key = ?',
      'DELETE FROM loot_entries WHERE slice_key = ?',
      'DELETE FROM creature_immunities WHERE slice_key = ?',
      'DELETE FROM creature_resistances WHERE slice_key = ?',
      'DELETE FROM creature_summons WHERE slice_key = ?',
      'DELETE FROM creature_conditions WHERE slice_key = ?',
      'DELETE FROM creature_defenses WHERE slice_key = ?',
      'DELETE FROM creature_attacks WHERE slice_key = ?',
      'DELETE FROM creatures WHERE slice_key = ?',
      'DELETE FROM vocation_skill_multipliers WHERE slice_key = ?',
      'DELETE FROM vocation_family_members WHERE slice_key = ?',
      'DELETE FROM vocations WHERE slice_key = ?',
      'DELETE FROM items WHERE slice_key = ?',
      'DELETE FROM content_entity_facets WHERE slice_key = ?',
      'DELETE FROM content_aliases WHERE slice_key = ?',
      'DELETE FROM content_slice_roots WHERE slice_key = ?',
      'DELETE FROM content_slice_entities WHERE slice_key = ?',
      'DELETE FROM content_slice_vocation_families WHERE slice_key = ?',
      'DELETE FROM content_slices WHERE slice_key = ?',
    ];
    for (const statement of statements)
      this.database.prepare(statement).run(sliceKey);
  }

  private cleanupUnreferencedRows(): void {
    this.database
      .prepare(
        'DELETE FROM content_entities WHERE NOT EXISTS (SELECT 1 FROM content_slice_entities WHERE content_slice_entities.entity_guid = content_entities.guid)',
      )
      .run();
    this.database
      .prepare(
        'DELETE FROM vocation_families WHERE NOT EXISTS (SELECT 1 FROM content_slice_vocation_families WHERE content_slice_vocation_families.family_key = vocation_families.family_key)',
      )
      .run();
    this.database
      .prepare(
        `DELETE FROM source_files
         WHERE NOT EXISTS (
           SELECT 1 FROM content_slice_entities
           WHERE content_slice_entities.source_system = source_files.source_system
             AND content_slice_entities.snapshot = source_files.snapshot
             AND content_slice_entities.source_path = source_files.source_path
         )`,
      )
      .run();
    this.database
      .prepare(
        `DELETE FROM source_snapshots
         WHERE NOT EXISTS (SELECT 1 FROM source_files WHERE source_files.source_system = source_snapshots.source_system AND source_files.snapshot = source_snapshots.snapshot)
           AND NOT EXISTS (SELECT 1 FROM content_slices WHERE content_slices.source_system = source_snapshots.source_system AND content_slices.snapshot = source_snapshots.snapshot)`,
      )
      .run();
  }

  private assertNoOrphans(): void {
    const orphans = this.listOrphanEntities();
    if (orphans.length > 0) {
      throw new CatalogError(
        'catalog-migration',
        `Catalog contains orphan entities: ${orphans.join(', ')}`,
      );
    }
  }

  private assertSharedFacetPayloadsAgree(): void {
    const rows = this.database
      .prepare(
        `SELECT entity_guid, facet, payload_sha256
         FROM content_entity_facets
         ORDER BY entity_guid, facet, payload_sha256`,
      )
      .all() as Array<{
      readonly entity_guid: ContentGuid;
      readonly facet: ContentFacet;
      readonly payload_sha256: string;
    }>;
    const hashes = new Map<string, Set<string>>();
    for (const row of rows) {
      const key = `${row.entity_guid}\0${row.facet}`;
      const values = hashes.get(key) ?? new Set<string>();
      values.add(row.payload_sha256);
      hashes.set(key, values);
    }
    for (const [key, values] of hashes) {
      if (values.size > 1) {
        throw new CatalogError(
          'catalog-migration',
          `Shared facet payloads disagree for ${key.replace('\0', '/')}`,
        );
      }
    }
  }

  private assertForeignKeyCheckIsEmpty(): void {
    const violations = this.database.pragma('foreign_key_check') as Array<{
      readonly table: string;
      readonly rowid: number;
      readonly parent: string;
      readonly fkid: number;
    }>;
    if (violations.length > 0) {
      const details = violations
        .map(
          (violation) =>
            `${violation.table}:${violation.rowid}->${violation.parent}#${violation.fkid}`,
        )
        .join(', ');
      throw new CatalogError(
        'catalog-migration',
        `SQLite foreign key violations: ${details}`,
      );
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new CatalogError('catalog-closed', 'Catalog connection is closed');
    }
  }

  private assertReady(): void {
    this.assertOpen();
    if (!this.migrated) {
      throw new CatalogError(
        'catalog-not-migrated',
        'Catalog is not migrated; migrations must be applied before use',
      );
    }
  }
}

export function createSqliteContentCatalog(
  path: string,
  migrationsDirectory = defaultMigrationsDirectory,
): SqliteContentCatalog {
  return new SqliteContentCatalog(path, migrationsDirectory);
}
